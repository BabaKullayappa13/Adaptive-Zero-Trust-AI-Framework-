-- Core Infrastructure Schema for 15-Feature Implementation
-- Federated Learning, Hybrid Cloud, Zero Trust Policy, Research Evaluation, Security

-- ============================================================================
-- FEDERATED LEARNING TABLES (Features 1, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS federated_organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS federated_rounds (
    id SERIAL PRIMARY KEY,
    round_number INTEGER NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    model_version VARCHAR(100) NOT NULL,
    aggregation_algorithm VARCHAR(100) DEFAULT 'fedavg',
    target_accuracy FLOAT,
    minimum_participants INTEGER DEFAULT 2,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS federated_participants (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL,
    org_id INTEGER NOT NULL,
    local_model_path VARCHAR(500),
    local_accuracy FLOAT,
    local_loss FLOAT,
    data_samples_count INTEGER,
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES federated_rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES federated_organizations(id) ON DELETE CASCADE,
    UNIQUE(round_id, org_id)
);

CREATE TABLE IF NOT EXISTS federated_models (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL,
    version VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(100),
    global_accuracy FLOAT,
    global_loss FLOAT,
    parameters_count INTEGER,
    model_path VARCHAR(500),
    aggregated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES federated_rounds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_federated_rounds_status ON federated_rounds(status);
CREATE INDEX IF NOT EXISTS idx_federated_rounds_created_at ON federated_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_federated_participants_round ON federated_participants(round_id);
CREATE INDEX IF NOT EXISTS idx_federated_models_round ON federated_models(round_id);

-- ============================================================================
-- HYBRID CLOUD TABLES (Feature 2, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloud_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cloud_type VARCHAR(50) NOT NULL,
    provider VARCHAR(100),
    region VARCHAR(100),
    endpoint VARCHAR(500),
    api_key_encrypted VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloud_sync_logs (
    id SERIAL PRIMARY KEY,
    cloud_id INTEGER NOT NULL,
    sync_type VARCHAR(100),
    status VARCHAR(50),
    records_synced INTEGER,
    duration_ms FLOAT,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cloud_id) REFERENCES cloud_configurations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cloud_health_metrics (
    id SERIAL PRIMARY KEY,
    cloud_id INTEGER NOT NULL,
    latency_ms FLOAT,
    availability_percent FLOAT,
    throughput_mbps FLOAT,
    error_rate FLOAT,
    last_check_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cloud_id) REFERENCES cloud_configurations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cloud_configs_status ON cloud_configurations(status);
CREATE INDEX IF NOT EXISTS idx_cloud_sync_logs_cloud_id ON cloud_sync_logs(cloud_id);
CREATE INDEX IF NOT EXISTS idx_cloud_health_cloud_id ON cloud_health_metrics(cloud_id);

-- ============================================================================
-- ZERO TRUST POLICY TABLES (Feature 3, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(100),
    priority INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policy_rules (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    condition_type VARCHAR(100),
    condition_value VARCHAR(500),
    action VARCHAR(100),
    severity VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES trust_policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policy_evaluations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    policy_id INTEGER NOT NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trust_score FLOAT,
    decision VARCHAR(50),
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (policy_id) REFERENCES trust_policies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trust_policies_enabled ON trust_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policy_rules_policy_id ON policy_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_evals_user_policy ON policy_evaluations(user_id, policy_id);

-- ============================================================================
-- DEVICE MANAGEMENT TABLES (Features 10, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    device_fingerprint VARCHAR(500),
    device_name VARCHAR(255),
    device_type VARCHAR(100),
    os VARCHAR(100),
    browser VARCHAR(100),
    trusted BOOLEAN DEFAULT FALSE,
    revoked BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS device_trust_scores (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    trust_score FLOAT,
    risk_level VARCHAR(50),
    compromised_indicators INTEGER DEFAULT 0,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_revoked ON user_devices(revoked);
CREATE INDEX IF NOT EXISTS idx_device_trust_scores_device_id ON device_trust_scores(device_id);

-- ============================================================================
-- RESEARCH EVALUATION TABLES (Features 4, 6, 8, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value FLOAT,
    evaluation_period VARCHAR(50),
    metric_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authentication_accuracy_metrics (
    id SERIAL PRIMARY KEY,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    true_positives INTEGER,
    true_negatives INTEGER,
    false_positives INTEGER,
    false_negatives INTEGER,
    precision FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    accuracy FLOAT,
    far FLOAT,
    frr FLOAT,
    eer FLOAT,
    auc_roc FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ieee_baseline_comparison (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255),
    our_value FLOAT,
    ieee_baseline FLOAT,
    improvement_percent FLOAT,
    gap_analysis TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_intelligence (
    id SERIAL PRIMARY KEY,
    threat_type VARCHAR(100),
    severity VARCHAR(50),
    detection_count INTEGER,
    detected_at TIMESTAMP,
    mitigated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_research_metrics_name ON research_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_auth_accuracy_date ON authentication_accuracy_metrics(evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_ieee_comparison_metric ON ieee_baseline_comparison(metric_name);
CREATE INDEX IF NOT EXISTS idx_threat_intel_type ON threat_intelligence(threat_type);

-- ============================================================================
-- SECURITY TABLES (Features 10, 11, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(500) NOT NULL UNIQUE,
    rotation_count INTEGER DEFAULT 0,
    last_rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX(user_id)
);

CREATE TABLE IF NOT EXISTS account_lockouts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX(user_id)
);

CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    endpoint VARCHAR(255),
    request_count INTEGER,
    window_start TIMESTAMP,
    window_end TIMESTAMP,
    limited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user ON rate_limit_logs(user_id);

-- ============================================================================
-- REPORTING & AUDIT TABLES (Features 11, 12, 9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS generated_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    report_format VARCHAR(50),
    generated_by VARCHAR(255),
    report_path VARCHAR(500),
    file_size_bytes INTEGER,
    status VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    schedule_frequency VARCHAR(50),
    recipients TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    action_type VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details TEXT,
    status VARCHAR(50),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    INDEX(created_at DESC)
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_status ON generated_reports(status);
CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled ON report_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);

-- ============================================================================
-- GRANTS AND CLEANUP
-- ============================================================================

-- Ensure proper foreign key constraints are applied
ALTER TABLE federated_organizations OWNER TO postgres;
ALTER TABLE federated_rounds OWNER TO postgres;
ALTER TABLE federated_participants OWNER TO postgres;
ALTER TABLE federated_models OWNER TO postgres;
ALTER TABLE cloud_configurations OWNER TO postgres;
ALTER TABLE cloud_sync_logs OWNER TO postgres;
ALTER TABLE cloud_health_metrics OWNER TO postgres;
ALTER TABLE trust_policies OWNER TO postgres;
ALTER TABLE policy_rules OWNER TO postgres;
ALTER TABLE policy_evaluations OWNER TO postgres;
ALTER TABLE user_devices OWNER TO postgres;
ALTER TABLE device_trust_scores OWNER TO postgres;
ALTER TABLE research_metrics OWNER TO postgres;
ALTER TABLE authentication_accuracy_metrics OWNER TO postgres;
ALTER TABLE ieee_baseline_comparison OWNER TO postgres;
ALTER TABLE threat_intelligence OWNER TO postgres;
ALTER TABLE refresh_tokens OWNER TO postgres;
ALTER TABLE account_lockouts OWNER TO postgres;
ALTER TABLE rate_limit_logs OWNER TO postgres;
ALTER TABLE generated_reports OWNER TO postgres;
ALTER TABLE report_schedules OWNER TO postgres;
ALTER TABLE audit_logs OWNER TO postgres;
