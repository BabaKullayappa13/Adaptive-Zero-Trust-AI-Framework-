-- Enforce case-insensitive email uniqueness for registrations.
-- This is safe for the existing schema because the application normalizes new emails.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized ON users (lower(email));

-- Only one unconsumed reset request per user is allowed at a time.
-- Expired requests are cleaned up by the reset service before issuing a new one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_active_user
  ON password_reset_tokens (user_id)
  WHERE used_at IS NULL;
