-- BarkBase Ops Center - Support Tickets Schema
-- Run this against the barkbase_ops database

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,  -- Human-readable: #1001, #1002, etc.

  -- Customer Info (from BarkBase tenant)
  portal_id UUID NOT NULL,      -- References BarkBase tenant ID
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
  assigned_to VARCHAR(255),     -- Ops admin email
  assigned_to_name VARCHAR(255),
  assigned_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  first_response_at TIMESTAMP,  -- SLA tracking
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,

  -- Source
  source VARCHAR(50) DEFAULT 'manual',  -- manual, email, chat, api

  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'pending_customer', 'resolved', 'closed')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Ticket Messages/Thread
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Who sent it
  sender_type VARCHAR(20) NOT NULL,  -- customer, agent, system
  sender_id VARCHAR(255),            -- customer user ID or ops admin email
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),

  -- Content
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,  -- Internal notes (customer can't see)

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_sender_type CHECK (sender_type IN ('customer', 'agent', 'system'))
);

-- Ticket Activity Log
CREATE TABLE IF NOT EXISTS ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  action VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255),
  actor_name VARCHAR(255),

  old_value TEXT,
  new_value TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
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
ALTER SEQUENCE support_tickets_ticket_number_seq RESTART WITH 1000;
