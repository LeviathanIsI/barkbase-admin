-- Enhanced Incidents Management Schema
-- Enterprise-grade incident tracking with postmortems and affected customer tracking

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS postmortem_action_items CASCADE;
-- DROP TABLE IF EXISTS incident_postmortems CASCADE;
-- DROP TABLE IF EXISTS incident_affected_customers CASCADE;
-- DROP TABLE IF EXISTS incident_updates CASCADE;
-- DROP TABLE IF EXISTS incident_components CASCADE;
-- DROP TABLE IF EXISTS incidents CASCADE;

-- Main incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'low')),
    status VARCHAR(20) NOT NULL DEFAULT 'investigating'
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    affected_service VARCHAR(100) NOT NULL,
    impact_scope VARCHAR(20) DEFAULT 'all' CHECK (impact_scope IN ('all', 'specific')),
    affected_customers_count INTEGER DEFAULT 0,
    assigned_to VARCHAR(255),
    assigned_to_name VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),
    customer_message TEXT,  -- Public message for status page
    internal_notes TEXT,    -- Internal notes not shown to customers
    started_at TIMESTAMPTZ DEFAULT NOW(),
    identified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident timeline/updates
CREATE TABLE IF NOT EXISTS incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    update_type VARCHAR(20) NOT NULL
        CHECK (update_type IN ('created', 'status_change', 'update', 'resolved', 'reopened', 'assigned', 'severity_change')),
    message TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    previous_severity VARCHAR(20),
    new_severity VARCHAR(20),
    is_internal BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affected customers tracking
CREATE TABLE IF NOT EXISTS incident_affected_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,  -- References BarkBase Tenant.id
    tenant_name VARCHAR(255),
    tenant_slug VARCHAR(255),
    tenant_plan VARCHAR(50),
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    notified_by VARCHAR(255),
    ticket_id UUID,  -- Link to support ticket if created
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, tenant_id)
);

-- Postmortems
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

-- Postmortem action items
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(affected_service);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_number ON incidents(incident_number);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_created ON incident_updates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_affected_incident ON incident_affected_customers(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_affected_tenant ON incident_affected_customers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_postmortem_incident ON incident_postmortems(incident_id);
CREATE INDEX IF NOT EXISTS idx_postmortem_status ON incident_postmortems(status);

CREATE INDEX IF NOT EXISTS idx_action_items_postmortem ON postmortem_action_items(postmortem_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON postmortem_action_items(completed);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON postmortem_action_items(due_date);

-- Set incident_number sequence to start at 1000
SELECT setval('incidents_incident_number_seq', 1000, false);

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
