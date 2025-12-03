-- Customer Notes Migration
-- Internal notes system for customer intelligence
-- NOTE: These tables are created in the OPS database, not BarkBase
-- portal_id references BarkBase Tenant.id but no FK constraint across databases

-- Customer internal notes table
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL,  -- References BarkBase Tenant.id (no FK - cross-database)
    author_id VARCHAR(255) NOT NULL,  -- Admin user email
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',  -- general, escalation, billing, technical, onboarding
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer flags/tags for VIP status etc
CREATE TABLE IF NOT EXISTS customer_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL,  -- References BarkBase Tenant.id (no FK - cross-database)
    flag_type VARCHAR(50) NOT NULL,  -- vip, at_risk, churned, enterprise, beta_tester
    flag_value BOOLEAN DEFAULT TRUE,
    set_by VARCHAR(255),
    set_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(portal_id, flag_type)
);

-- Indexes
CREATE INDEX idx_customer_notes_portal ON customer_notes(portal_id);
CREATE INDEX idx_customer_notes_created ON customer_notes(created_at DESC);
CREATE INDEX idx_customer_notes_pinned ON customer_notes(portal_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_customer_flags_portal ON customer_flags(portal_id);
CREATE INDEX idx_customer_flags_type ON customer_flags(flag_type);

-- Update trigger for notes
CREATE OR REPLACE FUNCTION update_customer_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_notes_updated
    BEFORE UPDATE ON customer_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_note_timestamp();
