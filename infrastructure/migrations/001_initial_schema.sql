-- BarkBase Ops Center - Initial Schema
-- Run this against the barkbase_ops database

-- System components for status tracking
CREATE TABLE IF NOT EXISTS system_components (
  name VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0
);

INSERT INTO system_components (name, display_name, display_order) VALUES
  ('auth', 'Authentication', 1),
  ('booking', 'Booking System', 2),
  ('payments', 'Payments', 3),
  ('notifications', 'Notifications', 4),
  ('reports', 'Reports & Analytics', 5),
  ('api', 'API', 6)
ON CONFLICT (name) DO NOTHING;

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('degraded', 'partial_outage', 'major_outage')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  customer_message TEXT NOT NULL,
  internal_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_by_id VARCHAR(255) NOT NULL,
  created_by_email VARCHAR(255) NOT NULL
);

-- Components affected by each incident
CREATE TABLE IF NOT EXISTS incident_components (
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  component_name VARCHAR(100) REFERENCES system_components(name),
  PRIMARY KEY (incident_id, component_name)
);

-- Incident timeline updates
CREATE TABLE IF NOT EXISTS incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_id VARCHAR(255) NOT NULL,
  created_by_email VARCHAR(255) NOT NULL
);

-- Audit log for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(255) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);
