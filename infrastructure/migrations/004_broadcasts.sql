-- Migration: 004_broadcasts.sql
-- Enterprise Broadcast / Announcement System
-- Created: 2025-12-03

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BROADCASTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  broadcast_type VARCHAR(30) NOT NULL
    CHECK (broadcast_type IN ('feature', 'update', 'tips', 'policy', 'beta', 'promo', 'general')),
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),

  -- Audience targeting
  audience_type VARCHAR(20) DEFAULT 'all'
    CHECK (audience_type IN ('all', 'tier', 'activity', 'age', 'specific', 'segment')),
  audience_config JSONB DEFAULT '{}',
  estimated_recipients INTEGER DEFAULT 0,

  -- Channels
  channels TEXT[] DEFAULT ARRAY['in_app'],

  -- In-app banner content
  banner_style VARCHAR(20) DEFAULT 'info'
    CHECK (banner_style IN ('info', 'success', 'warning', 'promo')),
  banner_headline VARCHAR(255),
  banner_body TEXT,
  banner_cta_text VARCHAR(50),
  banner_cta_url VARCHAR(500),
  banner_dismissable BOOLEAN DEFAULT true,

  -- Email content
  email_subject VARCHAR(255),
  email_body TEXT,

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- BROADCAST RECIPIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),

  -- Email engagement
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  email_clicked_at TIMESTAMP WITH TIME ZONE,
  email_bounced_at TIMESTAMP WITH TIME ZONE,

  -- Banner engagement
  banner_viewed_at TIMESTAMP WITH TIME ZONE,
  banner_clicked_at TIMESTAMP WITH TIME ZONE,
  banner_dismissed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, tenant_id)
);

-- ============================================================================
-- BROADCAST ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS broadcast_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Email metrics
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,

  -- Banner metrics
  banner_views INTEGER DEFAULT 0,
  banner_clicks INTEGER DEFAULT 0,
  banner_dismissals INTEGER DEFAULT 0
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON broadcasts(broadcast_type);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at ON broadcasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_tenant_id ON broadcast_recipients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_engagement ON broadcast_recipients(broadcast_id, email_opened_at, email_clicked_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_analytics_broadcast_id ON broadcast_analytics(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_analytics_recorded_at ON broadcast_analytics(recorded_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_broadcasts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS broadcasts_updated_at ON broadcasts;
CREATE TRIGGER broadcasts_updated_at
  BEFORE UPDATE ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcasts_updated_at();

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample broadcasts (skip if already exists)
INSERT INTO broadcasts (
  id, title, broadcast_type, status, audience_type, audience_config,
  estimated_recipients, channels, banner_style, banner_headline, banner_body,
  banner_cta_text, banner_cta_url, banner_dismissable,
  email_subject, email_body, scheduled_at, started_at, expires_at,
  created_by, created_by_name
) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  'New Feature: Automated Vaccination Reminders',
  'feature',
  'active',
  'tier',
  '{"tiers": ["pro", "enterprise"]}',
  23,
  ARRAY['in_app', 'email'],
  'success',
  'New: Automated Vaccination Reminders',
  'Never miss a vaccination deadline! Set up automatic reminders for pet owners when their pets'' vaccines are expiring.',
  'Learn More',
  '/settings/notifications',
  true,
  'New Feature: Automated Vaccination Reminders',
  E'Hi {{tenant_name}},\n\nWe''re excited to announce a new feature that your pet parents are going to love: **Automated Vaccination Reminders**!\n\n## What''s New\n- Automatic email reminders when vaccines are expiring\n- Customizable reminder timing (30, 14, 7 days before)\n- Easy setup in your notification settings\n\n[Set Up Reminders →]({{cta_url}})\n\nQuestions? Reply to this email!',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '10 days',
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000002-0000-0000-0000-000000000002',
  'Holiday Hours Reminder',
  'general',
  'scheduled',
  'all',
  '{}',
  47,
  ARRAY['email'],
  'info',
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  'BarkBase Holiday Hours',
  E'Hi {{tenant_name}},\n\nJust a friendly reminder about our holiday hours:\n\n**December 24-25**: Closed\n**December 31**: Limited support (9am-3pm EST)\n**January 1**: Closed\n\nOur systems will remain fully operational. Happy holidays!\n\nThe BarkBase Team',
  NOW() + INTERVAL '17 days',
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000003-0000-0000-0000-000000000003',
  'Year in Review: Your 2025 Stats',
  'promo',
  'scheduled',
  'activity',
  '{"activity": "active_180d"}',
  31,
  ARRAY['email'],
  'promo',
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  'Your 2025 Year in Review',
  E'Hi {{tenant_name}},\n\nWhat a year it''s been! Here''s your BarkBase 2025 recap:\n\n**Your Stats**\n- Pets managed: {{stats.pets}}\n- Appointments scheduled: {{stats.appointments}}\n- Happy pet parents served: {{stats.customers}}\n\nThank you for being part of the BarkBase family!\n\nHere''s to an amazing 2026,\nThe BarkBase Team',
  NOW() + INTERVAL '25 days',
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000004-0000-0000-0000-000000000004',
  'November Product Update',
  'update',
  'completed',
  'all',
  '{}',
  47,
  ARRAY['in_app', 'email'],
  'info',
  'November Updates Are Here!',
  'Check out the latest improvements to BarkBase including faster scheduling and new reporting features.',
  'See What''s New',
  '/changelog',
  true,
  'November Product Update: What''s New in BarkBase',
  E'Hi {{tenant_name}},\n\nHere''s what''s new in BarkBase this month:\n\n## Improvements\n- **Faster Scheduling**: 40% performance improvement\n- **New Reports**: Revenue by service type\n- **Mobile**: Better responsiveness on tablets\n\n## Bug Fixes\n- Fixed calendar sync issues\n- Resolved email notification delays\n\n[View Full Changelog →]({{cta_url}})\n\nBest,\nThe BarkBase Team',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '5 days',
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000005-0000-0000-0000-000000000005',
  'Pro Tip: Batch Scheduling',
  'tips',
  'draft',
  'tier',
  '{"tiers": ["free"]}',
  24,
  ARRAY['in_app', 'email'],
  'info',
  'Pro Tip: Save Time with Batch Scheduling',
  'Did you know you can schedule multiple appointments at once? Learn how to boost your efficiency!',
  'Learn How',
  '/help/batch-scheduling',
  true,
  'Pro Tip: Batch Scheduling Can Save You Hours',
  E'Hi {{tenant_name}},\n\nWant to save time on scheduling? Try our batch scheduling feature!\n\n**How It Works**\n1. Select multiple time slots\n2. Choose the service type\n3. BarkBase fills them automatically\n\nPro users report saving 2+ hours per week!\n\n[Try Batch Scheduling →]({{cta_url}})\n\nHappy scheduling,\nThe BarkBase Team',
  NULL,
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample recipients for active broadcast
INSERT INTO broadcast_recipients (
  broadcast_id, tenant_id, tenant_name,
  email_sent_at, email_opened_at, email_clicked_at,
  banner_viewed_at, banner_clicked_at, banner_dismissed_at
) VALUES
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Paws & Claws Pet Spa', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '2 minutes', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '1 minute', NULL),
('b0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Happy Tails Grooming', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '15 minutes', NULL, NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days' + INTERVAL '30 seconds'),
('b0000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'Pet Paradise', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '90 minutes', NOW() - INTERVAL '5 days' + INTERVAL '92 minutes', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NULL),
('b0000001-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'Barks & Recreation', NOW() - INTERVAL '5 days', NULL, NULL, NULL, NULL, NULL),
('b0000001-0000-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000005', 'Furry Friends Daycare', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '3 minutes', NOW() - INTERVAL '4 days', NULL, NULL),
('b0000001-0000-0000-0000-000000000001', 'a0000006-0000-0000-0000-000000000006', 'The Dog House', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days' + INTERVAL '6 hours', NULL, NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000007-0000-0000-0000-000000000007', 'Whiskers & Wags', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 minute', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL)
ON CONFLICT (broadcast_id, tenant_id) DO NOTHING;

-- Insert sample recipients for completed broadcast
INSERT INTO broadcast_recipients (
  broadcast_id, tenant_id, tenant_name,
  email_sent_at, email_opened_at, email_clicked_at,
  banner_viewed_at, banner_clicked_at, banner_dismissed_at
) VALUES
('b0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Paws & Claws Pet Spa', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '5 minutes', NOW() - INTERVAL '20 days' + INTERVAL '7 minutes', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', NULL),
('b0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Happy Tails Grooming', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '1 hour', NULL, NOW() - INTERVAL '18 days', NULL, NOW() - INTERVAL '18 days'),
('b0000004-0000-0000-0000-000000000004', 'a0000003-0000-0000-0000-000000000003', 'Pet Paradise', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days' + INTERVAL '2 minutes', NOW() - INTERVAL '17 days', NULL, NULL)
ON CONFLICT (broadcast_id, tenant_id) DO NOTHING;

-- Insert analytics snapshots (delete existing sample data first to avoid duplicates)
DELETE FROM broadcast_analytics WHERE broadcast_id IN (
  'b0000001-0000-0000-0000-000000000001',
  'b0000004-0000-0000-0000-000000000004'
);
INSERT INTO broadcast_analytics (
  broadcast_id, recorded_at,
  emails_sent, emails_opened, emails_clicked, emails_bounced,
  banner_views, banner_clicks, banner_dismissals
) VALUES
('b0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days', 23, 5, 2, 0, 12, 3, 1),
('b0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days', 23, 12, 4, 0, 45, 12, 5),
('b0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days', 23, 16, 6, 0, 89, 24, 10),
('b0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', 23, 17, 7, 0, 120, 35, 14),
('b0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 23, 18, 8, 0, 145, 40, 17),
('b0000001-0000-0000-0000-000000000001', NOW(), 23, 18, 8, 0, 156, 42, 18),
('b0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '20 days', 47, 10, 3, 1, 25, 8, 2),
('b0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '15 days', 47, 28, 10, 1, 89, 25, 12),
('b0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '10 days', 47, 34, 13, 1, 134, 38, 22),
('b0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '5 days', 47, 34, 13, 1, 156, 42, 28);

COMMENT ON TABLE broadcasts IS 'Enterprise broadcast/announcement system for tenant communication';
COMMENT ON TABLE broadcast_recipients IS 'Tracks broadcast recipients and their engagement';
COMMENT ON TABLE broadcast_analytics IS 'Time-series analytics snapshots for broadcast performance';
