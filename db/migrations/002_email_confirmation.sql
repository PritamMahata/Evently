-- Migration 002: Supabase / Postgres Email Confirmation Feature

-- 1. Add email_confirmed_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz DEFAULT now();

-- 2. Create email_confirmations table to store secure token hashes
CREATE TABLE IF NOT EXISTS email_confirmations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookups and token validation
CREATE INDEX IF NOT EXISTS email_confirmations_user_id_idx ON email_confirmations (user_id);
CREATE INDEX IF NOT EXISTS email_confirmations_token_hash_idx ON email_confirmations (token_hash);
CREATE INDEX IF NOT EXISTS email_confirmations_expires_at_idx ON email_confirmations (expires_at);

