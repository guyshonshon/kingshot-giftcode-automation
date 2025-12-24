-- Supabase Database Schema for Kingshot Giftcode Automation
-- Run this in your Supabase SQL Editor

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_claimed TIMESTAMPTZ,
  total_claims INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  verification_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on player_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on timestamp for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable Row Level Security (RLS) - optional, adjust as needed
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (your backend)
-- Adjust these policies based on your security needs
CREATE POLICY "Allow all for service role" ON players
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Or if you want to use anon key, create more restrictive policies:
-- CREATE POLICY "Allow insert for anon" ON players
--   FOR INSERT
--   WITH CHECK (true);
-- 
-- CREATE POLICY "Allow select for anon" ON players
--   FOR SELECT
--   USING (true);

