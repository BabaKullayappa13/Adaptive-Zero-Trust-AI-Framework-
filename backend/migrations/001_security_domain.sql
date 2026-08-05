-- Additive migration for adaptive zero-trust telemetry and policy state.
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  label TEXT,
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('device','geography','time','risk','network','behavior')),
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS behavior_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID,
  features JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'demo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS federated_models (
  id UUID PRIMARY KEY,
  model_version TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  participating_clients INTEGER NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  simulation BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_user_created ON trust_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_user_created ON risk_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_user_created ON behavior_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policies_user_priority ON policies(user_id, priority, enabled);
