-- ============================================================================
-- TEST DATA SEED SCRIPT
-- BarkBase Ops Center
-- ============================================================================
-- 
-- Target Tenant: 08f6174d-ceb9-4c6a-9cbf-886c8c2698d0
-- Target User: 50f7e3d3-868d-41c3-a926-2e9e9b7d3b00
--
-- Run this script to populate the ops center with realistic test data
-- ============================================================================

-- ============================================================================
-- STEP 1: DELETE ALL EXISTING TEST DATA (in correct order for FK constraints)
-- ============================================================================

-- Webhooks & Integrations
DELETE FROM webhook_deliveries WHERE true;
DELETE FROM webhooks WHERE true;
DELETE FROM integrations WHERE true;

-- Email Templates
DELETE FROM email_template_versions WHERE true;
DELETE FROM email_templates WHERE true;

-- SLA
DELETE FROM sla_alerts WHERE true;
DELETE FROM sla_credits WHERE true;
DELETE FROM uptime_records WHERE true;
DELETE FROM sla_config WHERE true;

-- Customer Health
DELETE FROM tenant_health_history WHERE true;
DELETE FROM churn_alerts WHERE true;
DELETE FROM tenant_health_scores WHERE true;

-- Settings
DELETE FROM api_keys WHERE true;
DELETE FROM ops_settings WHERE true;

-- Tickets
DELETE FROM ticket_activity WHERE true;
DELETE FROM ticket_messages WHERE true;
DELETE FROM support_tickets WHERE true;

-- Customer data
DELETE FROM customer_flags WHERE true;
DELETE FROM customer_notes WHERE true;

-- Feature Flags
DELETE FROM feature_flag_assignments WHERE true;
DELETE FROM feature_flag_history WHERE true;
DELETE FROM feature_flag_overrides WHERE true;
DELETE FROM feature_flags WHERE true;

-- Broadcasts
DELETE FROM broadcast_recipients WHERE true;
DELETE FROM broadcast_analytics WHERE true;
DELETE FROM broadcasts WHERE true;

-- Maintenance (correct table names)
DELETE FROM maintenance_affected_customers WHERE true;
DELETE FROM maintenance_notifications WHERE true;
DELETE FROM maintenance_updates WHERE true;
DELETE FROM maintenance_windows WHERE true;

-- Incidents
DELETE FROM postmortem_action_items WHERE true;
DELETE FROM incident_postmortems WHERE true;
DELETE FROM incident_affected_customers WHERE true;
DELETE FROM incident_updates WHERE true;
DELETE FROM incidents WHERE true;

-- Audit logs (keep recent ones, delete old)
DELETE FROM admin_audit_log WHERE created_at < NOW() - INTERVAL '7 days';

-- White Label (correct table names)
DELETE FROM white_label_history WHERE true;
DELETE FROM white_label_branding WHERE true;

-- ============================================================================
-- STEP 2: INSERT TEST DATA
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '08f6174d-ceb9-4c6a-9cbf-886c8c2698d0';
  v_user_id UUID := '50f7e3d3-868d-41c3-a926-2e9e9b7d3b00';
  v_ticket_id_1 UUID;
  v_ticket_id_2 UUID;
  v_ticket_id_3 UUID;
  v_incident_id_1 UUID;
  v_incident_id_2 UUID;
  v_broadcast_id_1 UUID;
  v_broadcast_id_2 UUID;
  v_flag_id_1 UUID;
  v_flag_id_2 UUID;
  v_flag_id_3 UUID;
  v_maintenance_id UUID;
  v_template_id_1 UUID;
  v_template_id_2 UUID;
  v_webhook_id UUID;
  v_branding_id UUID;
BEGIN

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================

INSERT INTO support_tickets (
  id, portal_id, customer_name, customer_email, business_name,
  subject, description, status, priority, category, source,
  assigned_to, assigned_to_name, created_at, first_response_at
) VALUES 
(
  gen_random_uuid(), v_tenant_id, 'Josh Demo', 'josh@barkbase.com', 'BarkBase Demo',
  'Cannot add new pet profiles', 'When I try to add a new pet, the form submits but nothing happens. The page just refreshes.',
  'open', 'high', 'bug', 'email',
  'support@barkbase.com', 'Support Team', NOW() - INTERVAL '6 hours', NULL
) RETURNING id INTO v_ticket_id_1;

INSERT INTO support_tickets (
  id, portal_id, customer_name, customer_email, business_name,
  subject, description, status, priority, category, source,
  assigned_to, assigned_to_name, created_at, first_response_at
) VALUES 
(
  gen_random_uuid(), v_tenant_id, 'Josh Demo', 'josh@barkbase.com', 'BarkBase Demo',
  'Question about billing', 'I was charged twice for my subscription this month. Can you check?',
  'in_progress', 'normal', 'billing', 'chat',
  'billing@barkbase.com', 'Billing Team', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours'
) RETURNING id INTO v_ticket_id_2;

INSERT INTO support_tickets (
  id, portal_id, customer_name, customer_email, business_name,
  subject, description, status, priority, category, source,
  assigned_to, assigned_to_name, created_at, first_response_at
) VALUES 
(
  gen_random_uuid(), v_tenant_id, 'Josh Demo', 'josh@barkbase.com', 'BarkBase Demo',
  'Feature request: SMS reminders', 'It would be great to have SMS appointment reminders in addition to email.',
  'open', 'low', 'feature_request', 'manual',
  NULL, NULL, NOW() - INTERVAL '6 hours', NULL
) RETURNING id INTO v_ticket_id_3;

-- Ticket Messages
INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, sender_email, message, is_internal, created_at)
VALUES 
(v_ticket_id_1, 'customer', v_tenant_id::text, 'Josh Demo', 'josh@barkbase.com', 
 'When I try to add a new pet, the form submits but nothing happens. The page just refreshes. I''ve tried multiple browsers.', 
 false, NOW() - INTERVAL '6 hours'),
(v_ticket_id_1, 'agent', 'support@barkbase.com', 'Support Team', 'support@barkbase.com',
 'Thanks for reporting this. Can you tell me what browser and version you''re using? Also, do you see any error messages?',
 false, NOW() - INTERVAL '5 hours'),
(v_ticket_id_1, 'agent', 'support@barkbase.com', 'Support Team', 'support@barkbase.com',
 'Internal note: Checking if this is related to the form validation bug from last week.',
 true, NOW() - INTERVAL '5 hours'),
(v_ticket_id_2, 'customer', v_tenant_id::text, 'Josh Demo', 'josh@barkbase.com',
 'I was charged twice for my subscription this month. Can you check?',
 false, NOW() - INTERVAL '6 hours'),
(v_ticket_id_2, 'agent', 'billing@barkbase.com', 'Billing Team', 'billing@barkbase.com',
 'I''m looking into this now. Can you confirm the last 4 digits of the card that was charged?',
 false, NOW() - INTERVAL '5 hours'),
(v_ticket_id_2, 'customer', v_tenant_id::text, 'Josh Demo', 'josh@barkbase.com',
 'The card ending in 4242.',
 false, NOW() - INTERVAL '4 hours'),
(v_ticket_id_3, 'customer', v_tenant_id::text, 'Josh Demo', 'josh@barkbase.com',
 'It would be great to have SMS appointment reminders in addition to email. Many of our clients prefer text messages.',
 false, NOW() - INTERVAL '6 hours');

-- Ticket Activity
INSERT INTO ticket_activity (ticket_id, action, actor_id, actor_name, old_value, new_value, created_at)
VALUES
(v_ticket_id_1, 'created', 'josh@barkbase.com', 'Josh Demo', NULL, '{"subject": "Cannot add new pet profiles"}', NOW() - INTERVAL '6 hours'),
(v_ticket_id_2, 'created', 'josh@barkbase.com', 'Josh Demo', NULL, '{"subject": "Question about billing"}', NOW() - INTERVAL '6 hours'),
(v_ticket_id_2, 'status_changed', 'billing@barkbase.com', 'Billing Team', 'open', 'in_progress', NOW() - INTERVAL '5 hours'),
(v_ticket_id_2, 'assigned', 'system', 'System', NULL, 'billing@barkbase.com', NOW() - INTERVAL '5 hours'),
(v_ticket_id_3, 'created', 'josh@barkbase.com', 'Josh Demo', NULL, '{"subject": "Feature request: SMS reminders"}', NOW() - INTERVAL '6 hours');

-- ============================================================================
-- INCIDENTS
-- ============================================================================

INSERT INTO incidents (
  id, title, description, customer_message, severity, status, 
  affected_service, started_at, resolved_at,
  created_by_id, created_by_email, created_by, created_by_name, created_at
) VALUES (
  gen_random_uuid(),
  'API Gateway Latency Spike',
  'Users experiencing slow response times on booking API endpoints. P95 latency increased from 200ms to 2s.',
  'We are experiencing slow response times on some API endpoints. Our team is investigating.',
  'major',
  'resolved',
  'API',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days' + INTERVAL '2 hours',
  'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team',
  NOW() - INTERVAL '3 days'
) RETURNING id INTO v_incident_id_1;

INSERT INTO incidents (
  id, title, description, customer_message, severity, status,
  affected_service, started_at,
  created_by_id, created_by_email, created_by, created_by_name, created_at
) VALUES (
  gen_random_uuid(),
  'Database Connection Pool Exhaustion',
  'Investigating intermittent 503 errors. Database connection pool reaching max capacity during peak hours.',
  'Some users may experience intermittent errors. We are actively investigating.',
  'minor',
  'monitoring',
  'Database',
  NOW() - INTERVAL '2 hours',
  'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team',
  NOW() - INTERVAL '2 hours'
) RETURNING id INTO v_incident_id_2;

-- Incident Updates
INSERT INTO incident_updates (incident_id, status, message, is_internal, created_by_id, created_by_email, created_by, created_by_name, created_at)
VALUES
(v_incident_id_1, 'investigating', 'We are investigating reports of slow API responses.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '3 days'),
(v_incident_id_1, 'identified', 'Root cause identified: Lambda cold starts due to VPC configuration. Implementing fix.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),
(v_incident_id_1, 'monitoring', 'Fix deployed. Monitoring for stability.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
(v_incident_id_1, 'resolved', 'Issue fully resolved. P95 latency back to normal levels.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
(v_incident_id_2, 'investigating', 'Investigating increased error rates.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '2 hours'),
(v_incident_id_2, 'identified', 'Identified connection pool saturation during peak. Increasing pool size.', false, 'ops@barkbase.com', 'ops@barkbase.com', 'ops@barkbase.com', 'Ops Team', NOW() - INTERVAL '1 hour');

-- Incident Affected Customers
INSERT INTO incident_affected_customers (incident_id, tenant_id, tenant_name, notified, notified_at, created_at)
VALUES
(v_incident_id_1, v_tenant_id, 'BarkBase Demo', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(v_incident_id_2, v_tenant_id, 'BarkBase Demo', false, NULL, NOW() - INTERVAL '2 hours');

-- ============================================================================
-- BROADCASTS
-- ============================================================================

INSERT INTO broadcasts (
  id, title, broadcast_type, status,
  audience_type, audience_config, estimated_recipients,
  channels, banner_style, banner_headline, banner_body, banner_cta_text, banner_cta_url,
  email_subject, email_body,
  started_at, expires_at,
  created_by, created_by_name, created_at
) VALUES (
  gen_random_uuid(),
  'New Feature: Advanced Reporting',
  'feature',
  'active',
  'tier',
  '{"tiers": ["pro", "enterprise"]}'::jsonb,
  150,
  ARRAY['in_app', 'email'],
  'info',
  'New Feature Available!',
  'We''re excited to announce our new Advanced Reporting feature! Generate custom reports, export to PDF, and schedule automated reports.',
  'Learn More',
  '/features/reporting',
  'New Feature: Advanced Reporting',
  'We''re excited to announce our new Advanced Reporting feature! Generate custom reports, export to PDF, and schedule automated reports. Available now for Pro and Enterprise plans.',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '6 days',
  'product@barkbase.com', 'Product Team', NOW() - INTERVAL '1 day'
) RETURNING id INTO v_broadcast_id_1;

INSERT INTO broadcasts (
  id, title, broadcast_type, status,
  audience_type, estimated_recipients,
  channels, banner_style, banner_headline, banner_body, banner_dismissable,
  email_subject, email_body,
  scheduled_at, expires_at,
  created_by, created_by_name, created_at
) VALUES (
  gen_random_uuid(),
  'Scheduled Maintenance - Dec 7th',
  'update',
  'scheduled',
  'all',
  500,
  ARRAY['in_app', 'email'],
  'warning',
  'Scheduled Maintenance',
  'We will be performing scheduled maintenance on December 7th from 2:00 AM to 4:00 AM EST. The service may be temporarily unavailable.',
  false,
  'Scheduled Maintenance - Dec 7th',
  'We will be performing scheduled maintenance on December 7th from 2:00 AM to 4:00 AM EST. The service may be temporarily unavailable during this time.',
  NOW() + INTERVAL '4 days',
  NOW() + INTERVAL '4 days' + INTERVAL '2 hours',
  'ops@barkbase.com', 'Ops Team', NOW()
) RETURNING id INTO v_broadcast_id_2;

-- Broadcast Analytics
INSERT INTO broadcast_analytics (broadcast_id, banner_views, banner_clicks, banner_dismissals, emails_sent, emails_opened, emails_clicked)
VALUES
(v_broadcast_id_1, 1247, 342, 89, 1000, 856, 234);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

INSERT INTO feature_flags (
  id, flag_key, display_name, description, category,
  enabled, rollout_strategy, rollout_percentage, rollout_sticky,
  allowed_tiers, is_kill_switch, environments,
  created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'vaccination_reminders',
  'Automated Vaccination Reminders',
  'Send automated reminders when pet vaccinations are due or expiring',
  'core',
  true,
  'all_or_nothing',
  100,
  true,
  ARRAY['free', 'pro', 'enterprise'],
  false,
  ARRAY['production', 'staging'],
  'product@barkbase.com', 'Product Team'
) RETURNING id INTO v_flag_id_1;

INSERT INTO feature_flags (
  id, flag_key, display_name, description, category,
  enabled, rollout_strategy, rollout_percentage, rollout_sticky,
  allowed_tiers, is_kill_switch, environments,
  created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'ai_scheduling_v2',
  'AI-Powered Smart Scheduling',
  'Uses ML to suggest optimal booking times based on historical data and staff availability',
  'beta',
  true,
  'percentage',
  25,
  true,
  ARRAY['pro', 'enterprise'],
  false,
  ARRAY['production', 'staging'],
  'product@barkbase.com', 'Product Team'
) RETURNING id INTO v_flag_id_2;

INSERT INTO feature_flags (
  id, flag_key, display_name, description, category,
  enabled, rollout_strategy, rollout_percentage, rollout_sticky,
  allowed_tiers, is_kill_switch, environments,
  created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'legacy_api_v1',
  'Legacy API v1 Endpoints',
  'Kill switch for legacy API v1 endpoints - disable in case of security issues',
  'kill_switch',
  true,
  'all_or_nothing',
  100,
  true,
  ARRAY['free', 'pro', 'enterprise'],
  true,
  ARRAY['production', 'staging'],
  'engineering@barkbase.com', 'Engineering Team'
) RETURNING id INTO v_flag_id_3;

-- Feature Flag Override for our test tenant (give them AI scheduling)
INSERT INTO feature_flag_overrides (flag_id, tenant_id, tenant_name, enabled, reason, created_by, created_by_name)
VALUES (v_flag_id_2, v_tenant_id, 'BarkBase Demo', true, 'Beta tester - early access', 'product@barkbase.com', 'Product Team');

-- Feature Flag History
INSERT INTO feature_flag_history (flag_id, change_type, previous_value, new_value, reason, created_by, created_by_name, created_at)
VALUES
(v_flag_id_2, 'rollout_change', '{"percentage": 10}', '{"percentage": 25}', 'Expanding beta to 25% after successful initial rollout', 'product@barkbase.com', 'Product Team', NOW() - INTERVAL '2 days'),
(v_flag_id_2, 'rollout_change', '{"percentage": 0}', '{"percentage": 10}', 'Starting beta rollout with 10% of eligible tenants', 'product@barkbase.com', 'Product Team', NOW() - INTERVAL '7 days'),
(v_flag_id_2, 'created', NULL, '{"enabled": true, "strategy": "percentage"}', 'Initial creation', 'product@barkbase.com', 'Product Team', NOW() - INTERVAL '14 days');

-- Feature Flag Assignments (for sticky rollout)
INSERT INTO feature_flag_assignments (flag_id, tenant_id, assigned_bucket, in_rollout, assigned_at)
VALUES (v_flag_id_2, v_tenant_id, 15, true, NOW() - INTERVAL '7 days');

-- ============================================================================
-- SCHEDULED MAINTENANCE (using correct table: maintenance_windows)
-- ============================================================================

INSERT INTO maintenance_windows (
  id, title, description, status,
  scheduled_start, scheduled_end, actual_start, actual_end,
  affected_services, impact_level,
  notify_customers,
  created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'Database Migration - Performance Optimization',
  'We will be performing database migrations to improve query performance. Some features may be temporarily unavailable.',
  'scheduled',
  NOW() + INTERVAL '4 days',
  NOW() + INTERVAL '4 days' + INTERVAL '2 hours',
  NULL, NULL,
  ARRAY['database', 'api', 'bookings'],
  'moderate',
  true,
  'ops@barkbase.com', 'Ops Team'
) RETURNING id INTO v_maintenance_id;

-- Maintenance Affected Customers
INSERT INTO maintenance_affected_customers (maintenance_id, tenant_id, tenant_name, notified)
VALUES (v_maintenance_id, v_tenant_id, 'BarkBase Demo', false);

-- ============================================================================
-- WHITE LABEL SETTINGS (using correct table: white_label_branding)
-- ============================================================================

INSERT INTO white_label_branding (
  id, tenant_id, tenant_name, tenant_subdomain,
  primary_color, secondary_color, accent_color,
  custom_domain, domain_verified, domain_ssl_status,
  email_from_name, email_reply_to,
  login_welcome_message,
  created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  v_tenant_id,
  'BarkBase Demo',
  'demo',
  '#3b82f6', '#64748b', '#8b5cf6',
  NULL, false, 'pending',
  'BarkBase Demo', 'demo@barkbase.com',
  'Welcome to BarkBase Demo! Manage your pet care business with ease.',
  'josh@barkbase.com', 'Josh Demo'
) RETURNING id INTO v_branding_id;

-- White Label History (with correct schema)
INSERT INTO white_label_history (branding_id, tenant_id, field_name, old_value, new_value, changed_by, changed_by_name)
VALUES
(v_branding_id, v_tenant_id, 'primary_color', '#2563eb', '#3b82f6', 'josh@barkbase.com', 'Josh Demo');

-- ============================================================================
-- CUSTOMER HEALTH SCORES
-- ============================================================================

INSERT INTO tenant_health_scores (
  tenant_id, tenant_name, tenant_subdomain, plan,
  health_score, previous_score, trend, trend_change,
  login_frequency_score, feature_adoption_score, booking_trend_score, support_sentiment_score, payment_history_score, user_engagement_score,
  days_since_login, risk_factors, calculated_at
) VALUES (
  v_tenant_id,
  'BarkBase Demo',
  'demo',
  'enterprise',
  78,
  75,
  'up',
  3,
  85, 72, 80, 75, 100, 68,
  1,
  ARRAY[]::text[],
  NOW()
);

-- Health History
INSERT INTO tenant_health_history (tenant_id, health_score, breakdown_scores, recorded_at)
VALUES
(v_tenant_id, 78, '{"login_frequency_score": 85, "feature_adoption_score": 72}', NOW() - INTERVAL '1 day'),
(v_tenant_id, 75, '{"login_frequency_score": 80, "feature_adoption_score": 70}', NOW() - INTERVAL '7 days');

-- ============================================================================
-- CUSTOMER NOTES & FLAGS
-- ============================================================================

INSERT INTO customer_notes (portal_id, content, note_type, author_id, author_name, is_pinned)
VALUES
(v_tenant_id, 'Demo account for testing - has full feature access', 'general', 'admin@barkbase.com', 'Admin', true),
(v_tenant_id, 'Interested in enterprise features - follow up next week', 'onboarding', 'sales@barkbase.com', 'Sales Team', false);

INSERT INTO customer_flags (portal_id, flag_type, flag_value, set_by)
VALUES
(v_tenant_id, 'vip', true, 'admin@barkbase.com'),
(v_tenant_id, 'beta_tester', true, 'product@barkbase.com');

-- ============================================================================
-- SLA DATA
-- ============================================================================

INSERT INTO sla_config (component_name, display_name, target_uptime, is_active)
VALUES
('api', 'API', 99.90, true),
('web', 'Web App', 99.90, true),
('database', 'Database', 99.90, true),
('auth', 'Authentication', 99.90, true)
ON CONFLICT (component_name) DO NOTHING;

-- Uptime Records (last 30 days sample)
-- Note: DECIMAL(6,4) max is 99.9999
INSERT INTO uptime_records (component_name, record_date, uptime_percentage, downtime_minutes, incident_count)
SELECT 
  component,
  (NOW() - (n || ' days')::interval)::date as record_date,
  CASE 
    WHEN n = 5 THEN 99.8500
    WHEN n = 12 THEN 99.9000
    ELSE 99.9000 + (random() * 0.0999)
  END as uptime_percentage,
  CASE 
    WHEN n = 5 THEN 2
    WHEN n = 12 THEN 1
    ELSE 0
  END as downtime_minutes,
  CASE 
    WHEN n IN (5, 12) THEN 1
    ELSE 0
  END as incident_count
FROM generate_series(0, 29) as n, (VALUES ('api'), ('web'), ('database'), ('auth')) as c(component)
ON CONFLICT (component_name, record_date) DO NOTHING;

-- SLA Credits
INSERT INTO sla_credits (tenant_id, tenant_name, period_start, period_end, actual_uptime, target_uptime, credit_percentage, credit_amount, status, notes)
VALUES
(v_tenant_id, 'BarkBase Demo', '2024-11-01', '2024-11-30', 99.8500, 99.90, 5.00, 25.00, 'pending', 'November SLA breach - 99.85% uptime');

-- SLA Alerts
INSERT INTO sla_alerts (threshold_percent, notification_channels, is_active)
VALUES
(0.0500, ARRAY['email', 'slack'], true);

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================

INSERT INTO email_templates (
  id, template_key, name, description,
  subject, preview_text, blocks,
  is_active, version, created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'booking_confirmation',
  'Booking Confirmation',
  'Sent when a booking is confirmed',
  'Your booking is confirmed! - {{business_name}}',
  'Your appointment for {{pet_name}} is all set.',
  '[
    {"id": "1", "type": "header", "content": "", "settings": {"logo": true}},
    {"id": "2", "type": "text", "content": "Hi {{owner_name}},\n\nYour booking has been confirmed!", "settings": {}},
    {"id": "3", "type": "text", "content": "**Pet:** {{pet_name}}\n**Service:** {{service_name}}\n**Date:** {{booking_date}}\n**Time:** {{booking_time}}", "settings": {"background": "#f3f4f6"}},
    {"id": "4", "type": "button", "content": "View Booking Details", "settings": {"url": "{{booking_url}}", "color": "#3b82f6"}},
    {"id": "5", "type": "divider", "content": "", "settings": {}},
    {"id": "6", "type": "footer", "content": "{{business_name}} | {{business_address}}", "settings": {}}
  ]'::jsonb,
  true, 3, 'admin@barkbase.com', 'Admin'
) RETURNING id INTO v_template_id_1;

INSERT INTO email_templates (
  id, template_key, name, description,
  subject, preview_text, blocks,
  is_active, version, created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'reminder_24h',
  '24-Hour Reminder',
  'Sent 24 hours before appointment',
  'Reminder: {{pet_name}}''s appointment tomorrow',
  'Don''t forget about your appointment tomorrow!',
  '[
    {"id": "1", "type": "header", "content": "", "settings": {"logo": true}},
    {"id": "2", "type": "text", "content": "Hi {{owner_name}},\n\nThis is a friendly reminder about your upcoming appointment.", "settings": {}},
    {"id": "3", "type": "text", "content": "**Tomorrow at {{booking_time}}**\n{{pet_name}} - {{service_name}}", "settings": {"background": "#fef3c7"}},
    {"id": "4", "type": "button", "content": "View Appointment", "settings": {"url": "{{booking_url}}", "color": "#3b82f6"}},
    {"id": "5", "type": "footer", "content": "{{business_name}}", "settings": {}}
  ]'::jsonb,
  true, 2, 'admin@barkbase.com', 'Admin'
) RETURNING id INTO v_template_id_2;

-- Template Versions
INSERT INTO email_template_versions (template_id, version, subject, blocks, created_by, created_by_name)
VALUES
(v_template_id_1, 2, 'Booking confirmed - {{business_name}}', '[]'::jsonb, 'admin@barkbase.com', 'Admin'),
(v_template_id_1, 1, 'Your booking is confirmed', '[]'::jsonb, 'admin@barkbase.com', 'Admin');

-- ============================================================================
-- WEBHOOKS & INTEGRATIONS
-- ============================================================================

INSERT INTO webhooks (
  id, name, url, secret, events, headers, tenant_id, is_active,
  last_delivery_status, last_delivery_at, created_by, created_by_name
) VALUES (
  gen_random_uuid(),
  'Production Notifications',
  'https://hooks.example.com/barkbase',
  'whsec_' || md5(random()::text || clock_timestamp()::text),
  ARRAY['booking.created', 'booking.cancelled', 'payment.received']::text[],
  '{"X-Custom-Header": "barkbase"}'::jsonb,
  NULL,
  true,
  200,
  NOW() - INTERVAL '2 hours',
  'admin@barkbase.com', 'Admin'
) RETURNING id INTO v_webhook_id;

-- Webhook Deliveries
INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_status, response_body, attempts, delivered_at)
VALUES
(v_webhook_id, 'booking.created', '{"booking_id": "book_123", "pet_name": "Max"}'::jsonb, 200, '{"success": true}', 1, NOW() - INTERVAL '2 hours'),
(v_webhook_id, 'payment.received', '{"payment_id": "pay_456", "amount": 75.00}'::jsonb, 200, '{"success": true}', 1, NOW() - INTERVAL '4 hours');

-- Integrations
INSERT INTO integrations (integration_key, name, description, category, is_connected, connected_by, connected_at)
VALUES
('slack', 'Slack', 'Send notifications to Slack channels', 'communication', true, 'admin@barkbase.com', NOW() - INTERVAL '30 days'),
('mailchimp', 'Mailchimp', 'Sync customer emails for marketing', 'marketing', true, 'marketing@barkbase.com', NOW() - INTERVAL '60 days'),
('zapier', 'Zapier', 'Connect to 5000+ apps via Zapier', 'automation', false, NULL, NULL),
('quickbooks', 'QuickBooks', 'Sync invoices and payments', 'finance', false, NULL, NULL),
('twilio', 'Twilio', 'SMS notifications for bookings', 'communication', false, NULL, NULL),
('google-calendar', 'Google Calendar', 'Sync bookings to Google Calendar', 'calendar', false, NULL, NULL);

-- ============================================================================
-- OPS SETTINGS & API KEYS
-- ============================================================================

INSERT INTO ops_settings (key, value, description, updated_by)
VALUES
('general', '{"opsCenterName": "BarkBase Ops Center", "supportEmail": "support@barkbase.com", "defaultTimezone": "America/New_York"}'::jsonb, 'General settings', 'admin@barkbase.com'),
('notifications', '{"slackWebhookUrl": "https://hooks.slack.com/services/xxx", "alertEmailRecipients": "ops@barkbase.com", "errorRateThreshold": 5, "responseTimeThreshold": 2000}'::jsonb, 'Notification settings', 'admin@barkbase.com'),
('security', '{"sessionTimeout": 480, "impersonationTimeLimit": 30, "requireReasonForSensitiveActions": true, "require2fa": true}'::jsonb, 'Security settings', 'admin@barkbase.com'),
('appearance', '{"primaryColor": "#3b82f6"}'::jsonb, 'Appearance settings', 'admin@barkbase.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO api_keys (name, key_prefix, key_hash, scopes, created_by, created_by_name, last_used_at)
VALUES
('Production API Key', 'bb_prod_', encode(sha256('test-key-1'::bytea), 'hex'), ARRAY['read', 'write'], 'admin@barkbase.com', 'Admin', NOW() - INTERVAL '1 hour'),
('Read-Only Key', 'bb_ro_', encode(sha256('test-key-2'::bytea), 'hex'), ARRAY['read'], 'admin@barkbase.com', 'Admin', NOW() - INTERVAL '1 day');

-- ============================================================================
-- AUDIT LOG ENTRIES (using correct table: admin_audit_log)
-- ============================================================================

INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
VALUES
('admin@barkbase.com', 'admin@barkbase.com', 'login', 'session', gen_random_uuid()::text, '{"method": "password"}', '192.168.1.1', NOW() - INTERVAL '1 hour'),
('admin@barkbase.com', 'admin@barkbase.com', 'tenant_viewed', 'tenant', v_tenant_id::text, '{"tenant_name": "BarkBase Demo"}', '192.168.1.1', NOW() - INTERVAL '30 minutes'),
('ops@barkbase.com', 'ops@barkbase.com', 'incident_created', 'incident', v_incident_id_2::text, '{"title": "Database Connection Pool Exhaustion"}', '192.168.1.2', NOW() - INTERVAL '2 hours'),
('support@barkbase.com', 'support@barkbase.com', 'ticket_updated', 'ticket', v_ticket_id_1::text, '{"action": "message_sent"}', '192.168.1.3', NOW() - INTERVAL '5 hours');

RAISE NOTICE 'Test data seed completed successfully!';
RAISE NOTICE 'Tenant ID: %', v_tenant_id;
RAISE NOTICE 'Created 3 support tickets, 2 incidents, 2 broadcasts, 3 feature flags, 1 maintenance window';

END $$;

-- ============================================================================
-- VERIFY DATA
-- ============================================================================

SELECT 'Support Tickets' as table_name, COUNT(*) as count FROM support_tickets
UNION ALL SELECT 'Ticket Messages', COUNT(*) FROM ticket_messages
UNION ALL SELECT 'Incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'Broadcasts', COUNT(*) FROM broadcasts
UNION ALL SELECT 'Feature Flags', COUNT(*) FROM feature_flags
UNION ALL SELECT 'Maintenance Windows', COUNT(*) FROM maintenance_windows
UNION ALL SELECT 'White Label Branding', COUNT(*) FROM white_label_branding
UNION ALL SELECT 'Email Templates', COUNT(*) FROM email_templates
UNION ALL SELECT 'Webhooks', COUNT(*) FROM webhooks
UNION ALL SELECT 'Integrations', COUNT(*) FROM integrations
UNION ALL SELECT 'Health Scores', COUNT(*) FROM tenant_health_scores;
