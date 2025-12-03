-- Migration: Enhance incidents table with additional columns
-- This adds the columns expected by the enhanced incidents management system

-- Add new columns to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_number SERIAL;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS affected_service VARCHAR(100);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS impact_scope VARCHAR(20) DEFAULT 'all';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS affected_customers_count INTEGER DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS identified_at TIMESTAMPTZ;

-- Update severity check constraint to include new values
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
    CHECK (severity IN ('critical', 'major', 'minor', 'low', 'degraded', 'partial_outage', 'major_outage'));

-- Add impact_scope check constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_impact_scope_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_impact_scope_check
    CHECK (impact_scope IS NULL OR impact_scope IN ('all', 'specific'));

-- Migrate existing data
UPDATE incidents SET
    affected_service = 'API',
    started_at = COALESCE(created_at, NOW()),
    created_by = COALESCE(created_by_id, 'system'),
    created_by_name = COALESCE(created_by_email, 'System')
WHERE affected_service IS NULL;

-- Now make affected_service NOT NULL after migration
-- (commenting out for safety - run manually after verifying data)
-- ALTER TABLE incidents ALTER COLUMN affected_service SET NOT NULL;

-- Update incident_updates table structure
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS update_type VARCHAR(20);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS previous_status VARCHAR(20);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS new_status VARCHAR(20);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS previous_severity VARCHAR(20);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS new_severity VARCHAR(20);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

-- Add check constraint for update_type
ALTER TABLE incident_updates DROP CONSTRAINT IF EXISTS incident_updates_update_type_check;
ALTER TABLE incident_updates ADD CONSTRAINT incident_updates_update_type_check
    CHECK (update_type IS NULL OR update_type IN ('created', 'status_change', 'update', 'resolved', 'reopened', 'assigned', 'severity_change'));

-- Migrate existing incident_updates data
UPDATE incident_updates SET
    update_type = 'update',
    created_by = COALESCE(created_by_id, 'system'),
    created_by_name = COALESCE(created_by_email, 'System')
WHERE update_type IS NULL;

-- Create affected customers tracking table
CREATE TABLE IF NOT EXISTS incident_affected_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    tenant_name VARCHAR(255),
    tenant_slug VARCHAR(255),
    tenant_plan VARCHAR(50),
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    notified_by VARCHAR(255),
    ticket_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, tenant_id)
);

-- Create postmortems table
CREATE TABLE IF NOT EXISTS incident_postmortems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    summary TEXT,
    root_cause TEXT,
    impact_duration_minutes INTEGER,
    impact_customers_count INTEGER,
    impact_bookings_count INTEGER,
    impact_revenue_estimate DECIMAL(10,2),
    impact_description TEXT,
    lessons_learned TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create postmortem action items table
CREATE TABLE IF NOT EXISTS postmortem_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postmortem_id UUID NOT NULL REFERENCES incident_postmortems(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to VARCHAR(255),
    assigned_to_name VARCHAR(255),
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(affected_service);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_number ON incidents(incident_number);

CREATE INDEX IF NOT EXISTS idx_incident_affected_incident ON incident_affected_customers(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_affected_tenant ON incident_affected_customers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_postmortem_incident ON incident_postmortems(incident_id);
CREATE INDEX IF NOT EXISTS idx_postmortem_status ON incident_postmortems(status);

CREATE INDEX IF NOT EXISTS idx_action_items_postmortem ON postmortem_action_items(postmortem_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON postmortem_action_items(completed);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON postmortem_action_items(due_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_updated ON incidents;
CREATE TRIGGER incidents_updated
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamp();

DROP TRIGGER IF EXISTS postmortems_updated ON incident_postmortems;
CREATE TRIGGER postmortems_updated
    BEFORE UPDATE ON incident_postmortems
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamp();

DROP TRIGGER IF EXISTS action_items_updated ON postmortem_action_items;
CREATE TRIGGER action_items_updated
    BEFORE UPDATE ON postmortem_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamp();

-- Function to calculate affected customers count
CREATE OR REPLACE FUNCTION update_incident_affected_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE incidents
        SET affected_customers_count = (
            SELECT COUNT(*) FROM incident_affected_customers
            WHERE incident_id = COALESCE(NEW.incident_id, OLD.incident_id)
        )
        WHERE id = COALESCE(NEW.incident_id, OLD.incident_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affected_count ON incident_affected_customers;
CREATE TRIGGER update_affected_count
    AFTER INSERT OR DELETE ON incident_affected_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_affected_count();
