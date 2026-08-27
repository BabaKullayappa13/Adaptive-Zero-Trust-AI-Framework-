-- Phase 4 reporting and audit storage for PostgreSQL/Neon.
-- Apply this migration with the backend migration process before enabling reporting.

CREATE TABLE IF NOT EXISTS public.generated_reports (
  id BIGSERIAL PRIMARY KEY,
  report_type VARCHAR(100) NOT NULL,
  report_format VARCHAR(50) NOT NULL,
  generated_by VARCHAR(255),
  report_path VARCHAR(500),
  file_size_bytes INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id BIGSERIAL PRIMARY KEY,
  report_type VARCHAR(100) NOT NULL,
  schedule_frequency VARCHAR(50) NOT NULL,
  recipients TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.threat_intelligence (
  id BIGSERIAL PRIMARY KEY,
  threat_type VARCHAR(100),
  mitigated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON public.generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_at ON public.generated_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled ON public.report_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_created_at ON public.threat_intelligence(created_at DESC);

-- Authorization is enforced by the FastAPI backend; application roles remain server-side.
