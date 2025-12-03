-- Migration: 005_feature_flags.sql
-- Enterprise Feature Flag Management System
-- Created: 2025-12-03

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(30) DEFAULT 'core'
    CHECK (category IN ('core', 'beta', 'experiment', 'tier_gate', 'kill_switch', 'ops')),

  -- State
  enabled BOOLEAN DEFAULT false,

  -- Rollout strategy
  rollout_strategy VARCHAR(20) DEFAULT 'all_or_nothing'
    CHECK (rollout_strategy IN ('all_or_nothing', 'percentage', 'tier', 'specific', 'custom')),
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rollout_sticky BOOLEAN DEFAULT true,
  allowed_tiers TEXT[],
  specific_tenant_ids UUID[],
  custom_rules JSONB,

  -- Options
  is_kill_switch BOOLEAN DEFAULT false,
  require_confirmation BOOLEAN DEFAULT false,
  log_checks BOOLEAN DEFAULT false,

  -- Environments
  environments TEXT[] DEFAULT ARRAY['production', 'staging'],

  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TENANT-SPECIFIC FLAG OVERRIDES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255),
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flag_id, tenant_id)
);

-- ============================================================================
-- FEATURE FLAG CHANGE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  change_type VARCHAR(30) NOT NULL
    CHECK (change_type IN ('created', 'enabled', 'disabled', 'rollout_change',
                           'targeting_change', 'tenant_override', 'override_removed', 'archived', 'updated')),
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROLLOUT ASSIGNMENT TABLE (for sticky percentage rollouts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  assigned_bucket INTEGER NOT NULL CHECK (assigned_bucket >= 0 AND assigned_bucket <= 99),
  in_rollout BOOLEAN NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flag_id, tenant_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_archived ON feature_flags(archived_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_created_at ON feature_flags(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_id ON feature_flag_overrides(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_tenant_id ON feature_flag_overrides(tenant_id);

CREATE INDEX IF NOT EXISTS idx_feature_flag_history_flag_id ON feature_flag_history(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_history_created_at ON feature_flag_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flag_assignments_flag_id ON feature_flag_assignments(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_assignments_tenant_id ON feature_flag_assignments(tenant_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for feature_flags
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Auto-update updated_at timestamp for feature_flag_overrides
CREATE OR REPLACE FUNCTION update_feature_flag_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flag_overrides_updated_at ON feature_flag_overrides;
CREATE TRIGGER feature_flag_overrides_updated_at
  BEFORE UPDATE ON feature_flag_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_overrides_updated_at();

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample feature flags
INSERT INTO feature_flags (
  id, flag_key, display_name, description, category,
  enabled, rollout_strategy, rollout_percentage, rollout_sticky,
  allowed_tiers, is_kill_switch, require_confirmation, log_checks,
  environments, created_by, created_by_name
) VALUES
(
  'f0000001-0000-0000-0000-000000000001',
  'vaccination_reminders',
  'Automated Vaccination Reminders',
  'Sends automated email reminders to pet owners when their pets'' vaccines are expiring. Includes customizable timing (30, 14, 7 days before expiry).',
  'core',
  true,
  'all_or_nothing',
  100,
  true,
  NULL,
  false,
  false,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000002-0000-0000-0000-000000000002',
  'ai_scheduling_v2',
  'AI-Powered Smart Scheduling',
  'Uses machine learning to suggest optimal booking times based on historical data, staff availability patterns, and customer preferences.',
  'beta',
  true,
  'percentage',
  25,
  true,
  NULL,
  false,
  false,
  true,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000003-0000-0000-0000-000000000003',
  'advanced_reporting',
  'Advanced Analytics & Custom Reports',
  'Unlocks advanced reporting features including custom report builder, revenue forecasting, and trend analysis dashboards.',
  'tier_gate',
  true,
  'tier',
  0,
  true,
  ARRAY['pro', 'enterprise'],
  false,
  false,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000004-0000-0000-0000-000000000004',
  'new_booking_flow',
  'Redesigned Booking Creation Flow',
  'Experimental new booking creation flow with streamlined UI and fewer steps. Testing with select customers before wider rollout.',
  'experiment',
  true,
  'specific',
  0,
  true,
  NULL,
  false,
  true,
  true,
  ARRAY['production'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000005-0000-0000-0000-000000000005',
  'legacy_api_v1',
  'Legacy API v1 Endpoints',
  'Maintains backward compatibility with API v1 endpoints. Can be disabled to force migration to v2 API.',
  'kill_switch',
  true,
  'all_or_nothing',
  100,
  true,
  NULL,
  true,
  true,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000006-0000-0000-0000-000000000006',
  'batch_scheduling',
  'Batch Scheduling Feature',
  'Allows scheduling multiple appointments at once. Select multiple time slots and BarkBase fills them automatically.',
  'core',
  true,
  'tier',
  0,
  true,
  ARRAY['pro', 'enterprise'],
  false,
  false,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000007-0000-0000-0000-000000000007',
  'debug_mode',
  'Debug Mode',
  'Enables verbose logging and debug information in the application. For internal use only.',
  'ops',
  false,
  'specific',
  0,
  true,
  NULL,
  false,
  true,
  true,
  ARRAY['staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000008-0000-0000-0000-000000000008',
  'customer_portal_v2',
  'Customer Portal Redesign',
  'New customer-facing portal with modern UI, improved mobile experience, and self-service features.',
  'beta',
  true,
  'percentage',
  50,
  true,
  NULL,
  false,
  false,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000009-0000-0000-0000-000000000009',
  'sms_notifications',
  'SMS Notifications',
  'Send SMS reminders and notifications to pet owners. Requires SMS credits.',
  'tier_gate',
  true,
  'tier',
  0,
  true,
  ARRAY['enterprise'],
  false,
  false,
  false,
  ARRAY['production'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000010-0000-0000-0000-000000000010',
  'payment_processor_v2',
  'New Payment Processor Integration',
  'Upgraded payment processing with lower fees and faster payouts. Rollout in progress.',
  'core',
  false,
  'percentage',
  10,
  true,
  NULL,
  true,
  true,
  false,
  ARRAY['production'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000011-0000-0000-0000-000000000011',
  'dark_mode',
  'Dark Mode Theme',
  'Enables dark mode theme option for users who prefer reduced eye strain.',
  'experiment',
  true,
  'all_or_nothing',
  100,
  true,
  NULL,
  false,
  false,
  false,
  ARRAY['production', 'staging'],
  'admin@barkbase.io',
  'Admin User'
),
(
  'f0000012-0000-0000-0000-000000000012',
  'inventory_management',
  'Inventory Management Module',
  'Track and manage inventory for pet supplies, grooming products, and retail items.',
  'beta',
  false,
  'specific',
  0,
  true,
  NULL,
  false,
  false,
  false,
  ARRAY['staging'],
  'admin@barkbase.io',
  'Admin User'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample overrides for specific tenant flags
INSERT INTO feature_flag_overrides (
  flag_id, tenant_id, tenant_name, enabled, reason, created_by, created_by_name
) VALUES
-- new_booking_flow specific tenants
('f0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Paws & Claws Pet Spa', true, 'Early adopter beta tester', 'admin@barkbase.io', 'Admin User'),
('f0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Happy Tails Grooming', true, 'Requested early access', 'admin@barkbase.io', 'Admin User'),
('f0000004-0000-0000-0000-000000000004', 'a0000003-0000-0000-0000-000000000003', 'Pet Paradise', true, 'High volume customer for testing', 'admin@barkbase.io', 'Admin User'),
-- debug_mode for specific internal testing tenants
('f0000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'Paws & Claws Pet Spa', true, 'Internal testing account', 'admin@barkbase.io', 'Admin User'),
-- inventory_management beta testers
('f0000012-0000-0000-0000-000000000012', 'a0000005-0000-0000-0000-000000000005', 'Furry Friends Daycare', true, 'Beta testing inventory module', 'admin@barkbase.io', 'Admin User'),
('f0000012-0000-0000-0000-000000000012', 'a0000006-0000-0000-0000-000000000006', 'The Dog House', true, 'Beta testing inventory module', 'admin@barkbase.io', 'Admin User')
ON CONFLICT (flag_id, tenant_id) DO NOTHING;

-- Insert sample history
DELETE FROM feature_flag_history WHERE flag_id IN (
  'f0000001-0000-0000-0000-000000000001',
  'f0000002-0000-0000-0000-000000000002',
  'f0000003-0000-0000-0000-000000000003',
  'f0000004-0000-0000-0000-000000000004',
  'f0000005-0000-0000-0000-000000000005'
);

INSERT INTO feature_flag_history (
  flag_id, change_type, previous_value, new_value, reason, created_by, created_by_name, created_at
) VALUES
-- vaccination_reminders history
('f0000001-0000-0000-0000-000000000001', 'created', NULL, '{"flag_key": "vaccination_reminders", "enabled": false}', 'Initial creation', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '60 days'),
('f0000001-0000-0000-0000-000000000001', 'enabled', '{"enabled": false}', '{"enabled": true}', 'Feature ready for production', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '45 days'),

-- ai_scheduling_v2 history
('f0000002-0000-0000-0000-000000000002', 'created', NULL, '{"flag_key": "ai_scheduling_v2", "enabled": false}', 'Initial creation', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '30 days'),
('f0000002-0000-0000-0000-000000000002', 'enabled', '{"enabled": false}', '{"enabled": true, "rollout_percentage": 5}', 'Starting beta rollout', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '14 days'),
('f0000002-0000-0000-0000-000000000002', 'rollout_change', '{"rollout_percentage": 5}', '{"rollout_percentage": 10}', 'Initial rollout successful, expanding', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '7 days'),
('f0000002-0000-0000-0000-000000000002', 'rollout_change', '{"rollout_percentage": 10}', '{"rollout_percentage": 25}', 'Positive feedback, continuing expansion', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '2 days'),

-- advanced_reporting history
('f0000003-0000-0000-0000-000000000003', 'created', NULL, '{"flag_key": "advanced_reporting", "enabled": false}', 'Initial creation', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '90 days'),
('f0000003-0000-0000-0000-000000000003', 'enabled', '{"enabled": false}', '{"enabled": true}', 'Feature complete for Pro tier', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '75 days'),
('f0000003-0000-0000-0000-000000000003', 'targeting_change', '{"allowed_tiers": ["pro"]}', '{"allowed_tiers": ["pro", "enterprise"]}', 'Extended to Enterprise tier', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '30 days'),

-- new_booking_flow history
('f0000004-0000-0000-0000-000000000004', 'created', NULL, '{"flag_key": "new_booking_flow", "enabled": false}', 'Initial creation', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '21 days'),
('f0000004-0000-0000-0000-000000000004', 'enabled', '{"enabled": false}', '{"enabled": true}', 'Ready for testing', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '14 days'),
('f0000004-0000-0000-0000-000000000004', 'tenant_override', NULL, '{"tenant": "Paws & Claws Pet Spa", "enabled": true}', 'Added as beta tester', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '14 days'),
('f0000004-0000-0000-0000-000000000004', 'tenant_override', NULL, '{"tenant": "Happy Tails Grooming", "enabled": true}', 'Added as beta tester', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '10 days'),
('f0000004-0000-0000-0000-000000000004', 'tenant_override', NULL, '{"tenant": "Pet Paradise", "enabled": true}', 'Added as beta tester', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '5 days'),

-- legacy_api_v1 history
('f0000005-0000-0000-0000-000000000005', 'created', NULL, '{"flag_key": "legacy_api_v1", "enabled": true, "is_kill_switch": true}', 'Created as kill switch for API v1', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '180 days');

-- Insert sample assignments for percentage rollout flags
INSERT INTO feature_flag_assignments (flag_id, tenant_id, assigned_bucket, in_rollout, assigned_at)
SELECT
  'f0000002-0000-0000-0000-000000000002',
  ('a000000' || n || '-0000-0000-0000-00000000000' || n)::UUID,
  (n * 7) % 100,
  (n * 7) % 100 < 25,
  NOW()
FROM generate_series(1, 9) AS n
ON CONFLICT (flag_id, tenant_id) DO NOTHING;

INSERT INTO feature_flag_assignments (flag_id, tenant_id, assigned_bucket, in_rollout, assigned_at)
SELECT
  'f0000008-0000-0000-0000-000000000008',
  ('a000000' || n || '-0000-0000-0000-00000000000' || n)::UUID,
  (n * 11) % 100,
  (n * 11) % 100 < 50,
  NOW()
FROM generate_series(1, 9) AS n
ON CONFLICT (flag_id, tenant_id) DO NOTHING;

COMMENT ON TABLE feature_flags IS 'Feature flag definitions for controlling feature rollout';
COMMENT ON TABLE feature_flag_overrides IS 'Tenant-specific feature flag overrides';
COMMENT ON TABLE feature_flag_history IS 'Audit trail of all feature flag changes';
COMMENT ON TABLE feature_flag_assignments IS 'Sticky rollout assignments for percentage-based flags';
