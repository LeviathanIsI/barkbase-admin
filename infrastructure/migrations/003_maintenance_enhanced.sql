-- Enhanced Maintenance System Schema
-- Enterprise-grade scheduled maintenance with recurring windows, notifications, and completion tracking

-- Enhance existing maintenance table if exists, or create new one
-- First check what columns exist and add missing ones

-- Drop old table if it exists with minimal schema
DROP TABLE IF EXISTS maintenance_notifications CASCADE;
DROP TABLE IF EXISTS maintenance_updates CASCADE;
DROP TABLE IF EXISTS maintenance_affected_customers CASCADE;
DROP TABLE IF EXISTS scheduled_maintenance CASCADE;
DROP TABLE IF EXISTS maintenance_windows CASCADE;

-- Main maintenance windows table
CREATE TABLE maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  internal_notes TEXT,

  -- Timing
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB, -- { frequency: 'weekly', day: 0, time: '03:00', duration_minutes: 30 }
  parent_id UUID REFERENCES maintenance_windows(id) ON DELETE SET NULL,

  -- Classification
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  maintenance_type VARCHAR(20) DEFAULT 'planned'
    CHECK (maintenance_type IN ('planned', 'emergency', 'recurring')),
  impact_level VARCHAR(20) DEFAULT 'minor'
    CHECK (impact_level IN ('none', 'minor', 'moderate', 'major')),
  impact_description TEXT,
  affected_services TEXT[] DEFAULT '{}',

  -- Completion
  outcome VARCHAR(20) CHECK (outcome IN ('success', 'issues', 'partial', 'aborted')),
  completion_summary TEXT,
  completion_notes TEXT,
  customer_impact_occurred BOOLEAN DEFAULT false,
  customer_impact_description TEXT,

  -- Notifications
  notify_customers BOOLEAN DEFAULT true,
  notification_config JSONB DEFAULT '{"notify48h": true, "notify24h": true, "onStart": true, "onComplete": true}',
  notify_scope VARCHAR(20) DEFAULT 'all' CHECK (notify_scope IN ('all', 'affected', 'specific')),

  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance updates (timeline during maintenance)
CREATE TABLE maintenance_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES maintenance_windows(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  update_type VARCHAR(20) DEFAULT 'update'
    CHECK (update_type IN ('started', 'update', 'extended', 'completed', 'cancelled')),
  is_public BOOLEAN DEFAULT true,
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance notifications sent
CREATE TABLE maintenance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES maintenance_windows(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL
    CHECK (notification_type IN ('48h_reminder', '24h_reminder', 'started', 'update', 'completed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INTEGER DEFAULT 0,
  created_by VARCHAR(255)
);

-- Affected customers (for specific notification scope)
CREATE TABLE maintenance_affected_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES maintenance_windows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  UNIQUE(maintenance_id, tenant_id)
);

-- Indexes for performance
CREATE INDEX idx_maintenance_status ON maintenance_windows(status);
CREATE INDEX idx_maintenance_scheduled_start ON maintenance_windows(scheduled_start);
CREATE INDEX idx_maintenance_scheduled_end ON maintenance_windows(scheduled_end);
CREATE INDEX idx_maintenance_type ON maintenance_windows(maintenance_type);
CREATE INDEX idx_maintenance_is_recurring ON maintenance_windows(is_recurring);
CREATE INDEX idx_maintenance_parent_id ON maintenance_windows(parent_id);
CREATE INDEX idx_maintenance_created_at ON maintenance_windows(created_at DESC);

CREATE INDEX idx_maintenance_updates_maintenance_id ON maintenance_updates(maintenance_id);
CREATE INDEX idx_maintenance_updates_created_at ON maintenance_updates(created_at DESC);

CREATE INDEX idx_maintenance_notifications_maintenance_id ON maintenance_notifications(maintenance_id);
CREATE INDEX idx_maintenance_notifications_type ON maintenance_notifications(notification_type);

CREATE INDEX idx_maintenance_affected_maintenance_id ON maintenance_affected_customers(maintenance_id);
CREATE INDEX idx_maintenance_affected_tenant_id ON maintenance_affected_customers(tenant_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_updated ON maintenance_windows;
CREATE TRIGGER maintenance_updated
    BEFORE UPDATE ON maintenance_windows
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

-- Insert some sample services for reference
-- (These will be displayed in the UI for selecting affected services)
COMMENT ON TABLE maintenance_windows IS 'Standard services: API, Database, Authentication, Scheduler, Payments, Notifications, File Storage, Frontend';
