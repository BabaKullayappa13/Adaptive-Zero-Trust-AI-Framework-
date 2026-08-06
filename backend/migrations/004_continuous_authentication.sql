-- Continuous Real-Time Authentication Schema
-- Behavioral, Device, Network, and Location-Based Authentication

-- ============================================================================
-- USER DEVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255),
    browser_name VARCHAR(100),
    browser_version VARCHAR(100),
    os_name VARCHAR(100),
    os_version VARCHAR(100),
    screen_resolution VARCHAR(50),
    language_setting VARCHAR(20),
    timezone VARCHAR(100),
    is_trusted BOOLEAN DEFAULT FALSE,
    trust_score FLOAT DEFAULT 50,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    device_id INTEGER NOT NULL,
    ip_address INET NOT NULL,
    country VARCHAR(100),
    state_region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    vpn_detected BOOLEAN DEFAULT FALSE,
    trust_score FLOAT DEFAULT 50,
    risk_score FLOAT DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- BEHAVIORAL PATTERNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS behavioral_patterns (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id INTEGER NOT NULL,
    keystroke_speed_avg FLOAT,
    keystroke_speed_variance FLOAT,
    mouse_speed_avg FLOAT,
    mouse_distance_traveled FLOAT,
    click_frequency INTEGER,
    scroll_events INTEGER,
    navigation_count INTEGER,
    time_on_page_avg FLOAT,
    idle_time_seconds INTEGER,
    behavior_score FLOAT,
    pattern_anomaly_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_user ON behavioral_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_session ON behavioral_patterns(session_id);

-- ============================================================================
-- LOGIN HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    ip_address INET,
    device_id INTEGER,
    success BOOLEAN,
    failure_reason VARCHAR(255),
    login_time TIMESTAMP,
    login_method VARCHAR(50),
    mfa_used BOOLEAN DEFAULT FALSE,
    mfa_success BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time DESC);

-- ============================================================================
-- TRUST SCORE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_score_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id INTEGER NOT NULL,
    trust_score FLOAT NOT NULL,
    contributing_factors JSONB,
    previous_score FLOAT,
    score_change FLOAT,
    calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trust_score_user ON trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_session ON trust_score_history(session_id);

-- ============================================================================
-- RISK SCORE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_score_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id INTEGER NOT NULL,
    risk_score FLOAT NOT NULL,
    risk_level VARCHAR(50),
    risk_factors JSONB,
    previous_score FLOAT,
    score_change FLOAT,
    calculated_at TIMESTAMP,
    mfa_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_score_user ON risk_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_score_session ON risk_score_history(session_id);

-- ============================================================================
-- ZERO TRUST POLICY DECISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_decisions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id INTEGER NOT NULL,
    policy_id INTEGER,
    decision VARCHAR(50),
    trust_score FLOAT,
    risk_score FLOAT,
    reason VARCHAR(500),
    action_required VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_policy_decisions_user ON policy_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_session ON policy_decisions(session_id);

-- ============================================================================
-- AUTHENTICATION EVENTS TABLE (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS authentication_events (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_detail VARCHAR(500),
    ip_address INET,
    device_id INTEGER,
    session_id INTEGER,
    success BOOLEAN,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user ON authentication_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON authentication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON authentication_events(timestamp DESC);

-- ============================================================================
-- LOCATION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    ip_address INET,
    country VARCHAR(100),
    state_region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_vpn BOOLEAN DEFAULT FALSE,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_ip ON location_history(ip_address);
