-- ============================================================================
-- MASTER BACKFILL SCRIPT
-- ============================================================================
-- Run this once to backfill all missing tables for BarkBase Ops Center
-- 
-- This script includes:
--   1. Support Tickets (SupportDesk.tsx)
--   2. Customer Notes & Flags (Customers.tsx)
--   3. Email Templates (EmailTemplates.tsx)
--   4. Integrations & Webhooks (Integrations.tsx)
--   5. Settings & API Keys (Settings.tsx)
--   6. SLA Tracking (SLA.tsx)
--   7. Customer Health Scores (CustomerHealth.tsx)
--
-- Prerequisites: Run migrations 001-006 first
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SUPPORT TICKETS (SupportDesk.tsx)
-- ============================================================================

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number SERIAL UNIQUE,
  
  -- Customer Info (from BarkBase tenant)
  portal_id UUID NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  
  -- Ticket Details
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'normal',
  category VARCHAR(100),
  
  -- Assignment
  assigned_to VARCHAR(255),
  assigned_to_name VARCHAR(255),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Source
  source VARCHAR(50) DEFAULT 'manual',
  
  CONSTRAINT valid_ticket_status CHECK (status IN ('open', 'in_progress', 'pending_customer', 'resolved', 'closed')),
  CONSTRAINT valid_ticket_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Ticket Messages/Thread
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  sender_type VARCHAR(20) NOT NULL,
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_sender_type CHECK (sender_type IN ('customer', 'agent', 'system'))
);

-- Ticket Activity Log
CREATE TABLE IF NOT EXISTS ticket_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  action VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255),
  actor_name VARCHAR(255),
  
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for support tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_portal_id ON support_tickets(portal_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON ticket_activity(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_created_at ON ticket_activity(created_at);

-- Start ticket numbers at 1000
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM support_tickets LIMIT 1) THEN
    ALTER SEQUENCE support_tickets_ticket_number_seq RESTART WITH 1000;
  END IF;
END $$;

-- ============================================================================
-- 2. CUSTOMER NOTES & FLAGS (Customers.tsx)
-- ============================================================================

-- Customer internal notes
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id UUID NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general'
    CHECK (note_type IN ('general', 'escalation', 'billing', 'technical', 'onboarding')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer flags/tags
CREATE TABLE IF NOT EXISTS customer_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id UUID NOT NULL,
  flag_type VARCHAR(50) NOT NULL
    CHECK (flag_type IN ('vip', 'at_risk', 'churned', 'enterprise', 'beta_tester')),
  flag_value BOOLEAN DEFAULT TRUE,
  set_by VARCHAR(255),
  set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(portal_id, flag_type)
);

-- Indexes for customer notes
CREATE INDEX IF NOT EXISTS idx_customer_notes_portal ON customer_notes(portal_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created ON customer_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notes_pinned ON customer_notes(portal_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_flags_portal ON customer_flags(portal_id);
CREATE INDEX IF NOT EXISTS idx_customer_flags_type ON customer_flags(flag_type);

-- Update trigger for notes
CREATE OR REPLACE FUNCTION update_customer_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_notes_updated ON customer_notes;
CREATE TRIGGER customer_notes_updated
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_note_timestamp();

-- ============================================================================
-- 3. EMAIL TEMPLATES (EmailTemplates.tsx)
-- ============================================================================

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255),
  blocks JSONB DEFAULT '[]'::jsonb,
  
  -- Tenant override (NULL = default template)
  tenant_id UUID,
  
  -- Version control
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by VARCHAR(255),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_by_name VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email template versions (for version history/rollback)
CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255),
  blocks JSONB,
  created_by VARCHAR(255),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template ON email_template_versions(template_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_template_updated ON email_templates;
CREATE TRIGGER email_template_updated
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_timestamp();

-- Default email templates
INSERT INTO email_templates (template_key, name, description, subject, preview_text, blocks, created_by, created_by_name)
VALUES
  ('booking_confirmation', 'Booking Confirmation', 'Sent when a booking is confirmed', 'Your booking is confirmed! - {{business_name}}', 'Your appointment for {{pet_name}} is all set.', '[{"id":"1","type":"header","content":"","settings":{"logo":true}},{"id":"2","type":"text","content":"Hi {{owner_name}},\n\nYour booking has been confirmed!","settings":{}},{"id":"3","type":"text","content":"**Pet:** {{pet_name}}\n**Service:** {{service_name}}\n**Date:** {{booking_date}}\n**Time:** {{booking_time}}","settings":{"background":"#f3f4f6"}},{"id":"4","type":"button","content":"View Booking Details","settings":{"url":"{{booking_url}}","color":"#3b82f6"}},{"id":"5","type":"divider","content":"","settings":{}},{"id":"6","type":"footer","content":"{{business_name}} | {{business_address}}","settings":{}}]'::jsonb, 'system', 'System'),
  ('reminder_24h', '24-Hour Reminder', 'Sent 24 hours before appointment', 'Reminder: {{pet_name}}''s appointment tomorrow', 'Don''t forget about your appointment tomorrow!', '[]'::jsonb, 'system', 'System'),
  ('reminder_1h', '1-Hour Reminder', 'Sent 1 hour before appointment', 'Starting soon: {{pet_name}}''s appointment', 'Your appointment starts in 1 hour!', '[]'::jsonb, 'system', 'System'),
  ('payment_receipt', 'Payment Receipt', 'Sent after successful payment', 'Receipt for your payment - {{business_name}}', 'Thank you for your payment of {{amount}}', '[]'::jsonb, 'system', 'System'),
  ('welcome', 'Welcome Email', 'Sent to new users', 'Welcome to {{business_name}}!', 'We''re excited to have you!', '[]'::jsonb, 'system', 'System'),
  ('password_reset', 'Password Reset', 'Sent when user requests password reset', 'Reset your password', 'Click to reset your password', '[]'::jsonb, 'system', 'System'),
  ('vaccination_reminder', 'Vaccination Reminder', 'Sent when vaccinations are due', '{{pet_name}}''s vaccination reminder', 'Time to update vaccinations!', '[]'::jsonb, 'system', 'System')
ON CONFLICT (template_key) DO NOTHING;

-- ============================================================================
-- 4. INTEGRATIONS & WEBHOOKS (Integrations.tsx)
-- ============================================================================

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Stats
  last_delivery_status INTEGER,
  last_delivery_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by VARCHAR(255),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook deliveries (delivery log)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third-party integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('communication', 'automation', 'finance', 'calendar', 'marketing')),
  is_connected BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  
  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  connected_by VARCHAR(255),
  connected_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrations_key ON integrations(integration_key);
CREATE INDEX IF NOT EXISTS idx_integrations_connected ON integrations(is_connected);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_updated ON webhooks;
CREATE TRIGGER webhook_updated
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_timestamp();

-- Default integrations
INSERT INTO integrations (integration_key, name, description, category)
VALUES
  ('slack', 'Slack', 'Send notifications to Slack channels', 'communication'),
  ('zapier', 'Zapier', 'Connect to 5000+ apps via Zapier', 'automation'),
  ('quickbooks', 'QuickBooks', 'Sync invoices and payments', 'finance'),
  ('mailchimp', 'Mailchimp', 'Sync customer emails for marketing', 'marketing'),
  ('twilio', 'Twilio', 'SMS notifications for bookings', 'communication'),
  ('google_calendar', 'Google Calendar', 'Sync bookings to Google Calendar', 'calendar')
ON CONFLICT (integration_key) DO NOTHING;

-- ============================================================================
-- 5. SETTINGS & API KEYS (Settings.tsx)
-- ============================================================================

-- Ops Center Settings
CREATE TABLE IF NOT EXISTS ops_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read'],
  
  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(revoked_at) WHERE revoked_at IS NULL;

-- Default settings
INSERT INTO ops_settings (key, value, description)
VALUES
  ('general', '{"opsCenterName": "BarkBase Ops Center", "supportEmail": "support@barkbase.com", "defaultTimezone": "America/New_York"}'::jsonb, 'General settings'),
  ('notifications', '{"slackWebhookUrl": "", "alertEmailRecipients": "", "errorRateThreshold": 5, "responseTimeThreshold": 2000}'::jsonb, 'Notification settings'),
  ('security', '{"sessionTimeout": 30, "impersonationTimeLimit": 30, "requireReasonForSensitiveActions": true, "ipWhitelist": ""}'::jsonb, 'Security settings'),
  ('appearance', '{"primaryColor": "#3b82f6"}'::jsonb, 'Appearance settings')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 6. SLA TRACKING (SLA.tsx)
-- ============================================================================

-- SLA Configuration
CREATE TABLE IF NOT EXISTS sla_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  target_uptime DECIMAL(5,2) DEFAULT 99.90,
  alert_threshold DECIMAL(5,4) DEFAULT 0.05,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily uptime records
CREATE TABLE IF NOT EXISTS uptime_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_name VARCHAR(100) NOT NULL,
  record_date DATE NOT NULL,
  uptime_percentage DECIMAL(6,4) NOT NULL,
  downtime_minutes INTEGER DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(component_name, record_date)
);

-- SLA credits owed
CREATE TABLE IF NOT EXISTS sla_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_uptime DECIMAL(6,4) NOT NULL,
  target_uptime DECIMAL(5,2) NOT NULL,
  credit_percentage DECIMAL(5,2) DEFAULT 0,
  credit_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'applied', 'waived')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by VARCHAR(255)
);

-- SLA Alert settings
CREATE TABLE IF NOT EXISTS sla_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  threshold_percent DECIMAL(5,4) NOT NULL,
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SLA
CREATE INDEX IF NOT EXISTS idx_uptime_records_component ON uptime_records(component_name);
CREATE INDEX IF NOT EXISTS idx_uptime_records_date ON uptime_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_sla_credits_tenant ON sla_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_credits_period ON sla_credits(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sla_credits_status ON sla_credits(status);

-- Default SLA components
INSERT INTO sla_config (component_name, display_name, target_uptime)
VALUES
  ('api', 'API', 99.90),
  ('web', 'Web App', 99.90),
  ('database', 'Database', 99.90),
  ('auth', 'Authentication', 99.90)
ON CONFLICT (component_name) DO NOTHING;

-- ============================================================================
-- 7. CUSTOMER HEALTH SCORES (CustomerHealth.tsx)
-- ============================================================================

-- Tenant health scores
CREATE TABLE IF NOT EXISTS tenant_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  tenant_subdomain VARCHAR(100),
  plan VARCHAR(50),
  
  -- Overall score
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  previous_score INTEGER,
  trend VARCHAR(10) CHECK (trend IN ('up', 'down', 'stable')),
  trend_change INTEGER DEFAULT 0,
  
  -- Breakdown scores
  login_frequency_score INTEGER DEFAULT 0,
  feature_adoption_score INTEGER DEFAULT 0,
  booking_trend_score INTEGER DEFAULT 0,
  support_sentiment_score INTEGER DEFAULT 0,
  payment_history_score INTEGER DEFAULT 0,
  user_engagement_score INTEGER DEFAULT 0,
  
  -- Activity
  days_since_login INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  -- Risk factors (stored as array)
  risk_factors TEXT[] DEFAULT '{}',
  
  -- Timestamps
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

-- Churn alerts
CREATE TABLE IF NOT EXISTS churn_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  alert_type VARCHAR(50) NOT NULL
    CHECK (alert_type IN ('score_drop', 'no_login', 'payment_failed', 'feature_decline', 'support_negative')),
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health score history (for trend analysis)
CREATE TABLE IF NOT EXISTS tenant_health_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  health_score INTEGER NOT NULL,
  breakdown_scores JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for health scores
CREATE INDEX IF NOT EXISTS idx_health_scores_tenant ON tenant_health_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_score ON tenant_health_scores(health_score);
CREATE INDEX IF NOT EXISTS idx_health_scores_updated ON tenant_health_scores(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_tenant ON churn_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_acknowledged ON churn_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_created ON churn_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_history_tenant ON tenant_health_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_history_recorded ON tenant_health_history(recorded_at DESC);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_health_score_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_score_updated ON tenant_health_scores;
CREATE TRIGGER health_score_updated
  BEFORE UPDATE ON tenant_health_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_health_score_timestamp();

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Sample support tickets
INSERT INTO support_tickets (portal_id, customer_name, customer_email, business_name, subject, description, status, priority, category, source)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'John Smith', 'john@happypaws.com', 'Happy Paws Grooming', 'Cannot add new pet profiles', 'When I try to add a new pet, the form just spins and nothing happens.', 'open', 'high', 'technical', 'manual'),
  ('a0000002-0000-0000-0000-000000000002', 'Sarah Jones', 'sarah@doggydaycare.com', 'Doggy Daycare Plus', 'Question about billing', 'I need to understand how the pro plan billing works.', 'in_progress', 'normal', 'billing', 'email'),
  ('a0000003-0000-0000-0000-000000000003', 'Mike Brown', 'mike@petparadise.com', 'Pet Paradise Resort', 'Feature request: SMS reminders', 'Would love to have SMS appointment reminders for customers.', 'open', 'low', 'feature_request', 'manual')
ON CONFLICT DO NOTHING;

-- Sample tenant health scores
INSERT INTO tenant_health_scores (tenant_id, tenant_name, tenant_subdomain, plan, health_score, trend, trend_change, login_frequency_score, feature_adoption_score, booking_trend_score, support_sentiment_score, payment_history_score, user_engagement_score, days_since_login, risk_factors)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Happy Paws Grooming', 'happypaws', 'enterprise', 92, 'up', 5, 95, 88, 92, 90, 100, 85, 0, '{}'),
  ('a0000002-0000-0000-0000-000000000002', 'Doggy Daycare Plus', 'doggydaycare', 'pro', 67, 'down', -8, 60, 72, 55, 70, 100, 45, 3, ARRAY['Booking volume declining', 'Low user engagement']),
  ('a0000003-0000-0000-0000-000000000003', 'Pet Paradise Resort', 'petparadise', 'pro', 34, 'down', -18, 20, 45, 30, 40, 80, 25, 16, ARRAY['No login in 14+ days', 'Score dropped 18 points', 'Booking volume -45%']),
  ('a0000004-0000-0000-0000-000000000004', 'Paws & Claws Spa', 'pawsclaws', 'enterprise', 78, 'stable', 0, 85, 70, 80, 75, 100, 60, 1, '{}'),
  ('a0000005-0000-0000-0000-000000000005', 'Furry Friends Boarding', 'furryfriends', 'free', 45, 'down', -12, 40, 30, 50, 60, 100, 35, 8, ARRAY['Low feature adoption', 'Declining engagement'])
ON CONFLICT (tenant_id) DO NOTHING;

-- Sample churn alerts
INSERT INTO churn_alerts (tenant_id, tenant_name, alert_type, message, severity, acknowledged)
VALUES
  ('a0000003-0000-0000-0000-000000000003', 'Pet Paradise Resort', 'score_drop', 'Health score dropped 18 points in the last 7 days', 'critical', false),
  ('a0000003-0000-0000-0000-000000000003', 'Pet Paradise Resort', 'no_login', 'No user logins in 16 days', 'critical', false),
  ('a0000005-0000-0000-0000-000000000005', 'Furry Friends Boarding', 'score_drop', 'Health score dropped 12 points in the last 7 days', 'warning', true)
ON CONFLICT DO NOTHING;

-- Sample uptime records (last 7 days)
INSERT INTO uptime_records (component_name, record_date, uptime_percentage, downtime_minutes, incident_count)
SELECT 
  component,
  date_series::date,
  99.9 + (random() * 0.1),
  CASE WHEN random() > 0.9 THEN floor(random() * 10) ELSE 0 END,
  CASE WHEN random() > 0.9 THEN 1 ELSE 0 END
FROM 
  generate_series(NOW() - INTERVAL '7 days', NOW(), INTERVAL '1 day') AS date_series,
  (VALUES ('api'), ('web'), ('database'), ('auth')) AS components(component)
ON CONFLICT (component_name, record_date) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MASTER BACKFILL COMPLETE!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ support_tickets, ticket_messages, ticket_activity';
  RAISE NOTICE '  ✓ customer_notes, customer_flags';
  RAISE NOTICE '  ✓ email_templates, email_template_versions';
  RAISE NOTICE '  ✓ webhooks, webhook_deliveries, integrations';
  RAISE NOTICE '  ✓ ops_settings, api_keys';
  RAISE NOTICE '  ✓ sla_config, uptime_records, sla_credits, sla_alerts';
  RAISE NOTICE '  ✓ tenant_health_scores, churn_alerts, tenant_health_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Sample data inserted for development/testing.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Update backend API handlers and wire up frontend hooks.';
  RAISE NOTICE '============================================================';
END $$;

