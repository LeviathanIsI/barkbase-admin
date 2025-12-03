-- Migration: 006_white_label.sql
-- Enterprise White-Label Configuration System
-- Created: 2025-12-03

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- WHITE-LABEL BRANDING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS white_label_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  tenant_name VARCHAR(255),
  tenant_subdomain VARCHAR(100),

  -- Logos
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,

  -- Brand Colors
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_color VARCHAR(7) DEFAULT '#64748b',
  accent_color VARCHAR(7) DEFAULT '#8b5cf6',

  -- Custom Domain
  custom_domain VARCHAR(255),
  domain_verified BOOLEAN DEFAULT false,
  domain_verified_at TIMESTAMP WITH TIME ZONE,
  domain_ssl_status VARCHAR(20) DEFAULT 'pending'
    CHECK (domain_ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  domain_ssl_provisioned_at TIMESTAMP WITH TIME ZONE,

  -- Email Branding
  email_from_name VARCHAR(255),
  email_reply_to VARCHAR(255),
  email_header_logo_url TEXT,
  email_footer_markdown TEXT,

  -- Login Page
  login_background_url TEXT,
  login_welcome_message TEXT,
  custom_css TEXT,

  -- Mobile App
  app_icon_url TEXT,
  splash_screen_url TEXT,
  mobile_theme_colors JSONB,

  -- Configuration Status
  config_status VARCHAR(20) DEFAULT 'not_started'
    CHECK (config_status IN ('not_started', 'partial', 'complete')),
  completeness_percentage INTEGER DEFAULT 0 CHECK (completeness_percentage >= 0 AND completeness_percentage <= 100),

  -- Metadata
  created_by VARCHAR(255),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_by_name VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WHITE-LABEL CHANGE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS white_label_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branding_id UUID NOT NULL REFERENCES white_label_branding(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255) NOT NULL,
  changed_by_name VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_white_label_branding_tenant_id ON white_label_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_branding_custom_domain ON white_label_branding(custom_domain);
CREATE INDEX IF NOT EXISTS idx_white_label_branding_domain_verified ON white_label_branding(domain_verified);
CREATE INDEX IF NOT EXISTS idx_white_label_branding_config_status ON white_label_branding(config_status);
CREATE INDEX IF NOT EXISTS idx_white_label_branding_updated_at ON white_label_branding(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_white_label_history_branding_id ON white_label_history(branding_id);
CREATE INDEX IF NOT EXISTS idx_white_label_history_tenant_id ON white_label_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_history_changed_at ON white_label_history(changed_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_white_label_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS white_label_branding_updated_at ON white_label_branding;
CREATE TRIGGER white_label_branding_updated_at
  BEFORE UPDATE ON white_label_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_white_label_branding_updated_at();

-- Auto-calculate completeness percentage and status
CREATE OR REPLACE FUNCTION calculate_white_label_completeness()
RETURNS TRIGGER AS $$
DECLARE
  total_fields INTEGER := 10;
  completed_fields INTEGER := 0;
  new_status VARCHAR(20);
BEGIN
  -- Count completed fields
  IF NEW.logo_light_url IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.logo_dark_url IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.favicon_url IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.primary_color != '#3b82f6' THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.domain_verified = true THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.email_from_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.email_reply_to IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.login_welcome_message IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.app_icon_url IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.splash_screen_url IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;

  -- Calculate percentage
  NEW.completeness_percentage := (completed_fields * 100) / total_fields;

  -- Determine status
  IF NEW.completeness_percentage = 0 THEN
    new_status := 'not_started';
  ELSIF NEW.completeness_percentage = 100 THEN
    new_status := 'complete';
  ELSE
    new_status := 'partial';
  END IF;

  NEW.config_status := new_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS white_label_branding_completeness ON white_label_branding;
CREATE TRIGGER white_label_branding_completeness
  BEFORE INSERT OR UPDATE ON white_label_branding
  FOR EACH ROW
  EXECUTE FUNCTION calculate_white_label_completeness();

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

INSERT INTO white_label_branding (
  id, tenant_id, tenant_name, tenant_subdomain,
  logo_light_url, logo_dark_url, favicon_url,
  primary_color, secondary_color, accent_color,
  custom_domain, domain_verified, domain_ssl_status,
  email_from_name, email_reply_to, email_header_logo_url,
  login_welcome_message, app_icon_url,
  created_by, created_by_name
) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001',
  'Happy Paws Grooming',
  'happypaws',
  '/logos/happypaws-light.png',
  '/logos/happypaws-dark.png',
  '/favicons/happypaws.ico',
  '#1e40af',
  '#334155',
  '#0ea5e9',
  'booking.happypaws.com',
  true,
  'active',
  'Happy Paws Grooming',
  'hello@happypaws.com',
  '/logos/happypaws-email.png',
  'Welcome back to Happy Paws! Sign in to manage your appointments.',
  '/icons/happypaws-app.png',
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000002-0000-0000-0000-000000000002',
  'a0000002-0000-0000-0000-000000000002',
  'Doggy Daycare Plus',
  'doggydaycare',
  '/logos/doggydaycare-light.png',
  NULL,
  NULL,
  '#059669',
  '#64748b',
  '#14b8a6',
  'app.doggydaycare.com',
  false,
  'pending',
  'Doggy Daycare Plus',
  'support@doggydaycare.com',
  NULL,
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000003-0000-0000-0000-000000000003',
  'a0000003-0000-0000-0000-000000000003',
  'Pet Paradise Resort',
  'petparadise',
  NULL,
  NULL,
  NULL,
  '#dc2626',
  '#f97316',
  '#facc15',
  NULL,
  false,
  'pending',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000004-0000-0000-0000-000000000004',
  'a0000004-0000-0000-0000-000000000004',
  'Paws & Claws Spa',
  'pawsclaws',
  '/logos/pawsclaws-light.png',
  '/logos/pawsclaws-dark.png',
  '/favicons/pawsclaws.ico',
  '#6366f1',
  '#475569',
  '#a855f7',
  'portal.pawsclaws.com',
  true,
  'active',
  'Paws & Claws Spa',
  'info@pawsclaws.com',
  '/logos/pawsclaws-email.png',
  'Welcome to Paws & Claws! Your pets deserve the best.',
  '/icons/pawsclaws-app.png',
  'admin@barkbase.io',
  'Admin User'
),
(
  'b0000005-0000-0000-0000-000000000005',
  'a0000005-0000-0000-0000-000000000005',
  'Furry Friends Boarding',
  'furryfriends',
  '/logos/furryfriends-light.png',
  NULL,
  NULL,
  '#3b82f6',
  '#64748b',
  '#8b5cf6',
  NULL,
  false,
  'pending',
  'Furry Friends',
  NULL,
  NULL,
  NULL,
  NULL,
  'admin@barkbase.io',
  'Admin User'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample history
INSERT INTO white_label_history (
  branding_id, tenant_id, field_name, old_value, new_value,
  changed_by, changed_by_name, changed_at
) VALUES
-- Happy Paws history
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Primary Color', '#3b82f6', '#1e40af', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '2 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Logo (Light Mode)', NULL, '/logos/happypaws-light.png', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '5 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Custom Domain', NULL, 'booking.happypaws.com', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '7 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Domain Verification', 'pending', 'verified', 'System', 'System', NOW() - INTERVAL '6 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Email From Name', NULL, 'Happy Paws Grooming', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '10 days'),
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Login Welcome Message', NULL, 'Welcome back to Happy Paws!', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '14 days'),
-- Doggy Daycare history
('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Primary Color', '#3b82f6', '#059669', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '3 days'),
('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Custom Domain', NULL, 'app.doggydaycare.com', 'admin@barkbase.io', 'Admin User', NOW() - INTERVAL '4 days');

COMMENT ON TABLE white_label_branding IS 'White-label branding configuration for tenants';
COMMENT ON TABLE white_label_history IS 'Audit trail of all white-label branding changes';

