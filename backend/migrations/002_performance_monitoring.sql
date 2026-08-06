-- Performance Monitoring Schema
-- Tracks response times, database queries, and authentication metrics

CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    metric_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    duration_ms FLOAT NOT NULL,
    status_code INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);

CREATE TABLE IF NOT EXISTS authentication_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    duration_ms FLOAT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON authentication_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON authentication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_success ON authentication_events(success);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON authentication_events(created_at);

CREATE TABLE IF NOT EXISTS metric_aggregates (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(100) NOT NULL,
    aggregation_period VARCHAR(20) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    min_duration_ms FLOAT,
    max_duration_ms FLOAT,
    avg_duration_ms FLOAT,
    p95_duration_ms FLOAT,
    p99_duration_ms FLOAT,
    request_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_type, aggregation_period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_metric_aggregates_type_period ON metric_aggregates(metric_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metric_aggregates_period_start ON metric_aggregates(period_start DESC);
