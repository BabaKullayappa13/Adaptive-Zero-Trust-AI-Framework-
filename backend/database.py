"""
Universal Database Manager for Adaptive Zero Trust AI Framework
Supports both PostgreSQL (Neon / cloud) and local SQLite fallback for 100% zero-config execution.
"""

import os
import json
import uuid
import datetime
import re
from typing import Optional, List, Dict, Any, Tuple, Union
from contextlib import asynccontextmanager

import sys

if sys.platform == "win32":
    try:
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

DATABASE_URL = next(
    (
        os.getenv(name)
        for name in (
            "DATABASE_URL",
            "DATABASE_URL_3",
            "POSTGRES_URL",
            "POSTGRES_PRISMA_URL",
            "POSTGRES_URL_NON_POOLING",
        )
        if os.getenv(name)
    ),
    None,
)

IS_POSTGRES = bool(DATABASE_URL and DATABASE_URL.startswith(("postgres://", "postgresql://")))

# SQLite database file path when not using PostgreSQL
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "zero_trust.db"))


class DatabaseConnection:
    """Unified interface wrapping PostgreSQL or SQLite async connection"""

    def __init__(self, raw_conn, is_postgres: bool = True):
        self.raw_conn = raw_conn
        self.is_postgres = is_postgres

    def _convert_query(self, query: str) -> str:
        """Convert PostgreSQL syntax/placeholders to SQLite if running in SQLite mode or vice versa"""
        if self.is_postgres:
            converted = re.sub(r"is_active\s*=\s*1\b", "is_active = TRUE", query, flags=re.IGNORECASE)
            converted = re.sub(r"is_active\s*=\s*0\b", "is_active = FALSE", converted, flags=re.IGNORECASE)
            converted = re.sub(r"step_up_required\s*=\s*1\b", "step_up_required = TRUE", converted, flags=re.IGNORECASE)
            converted = re.sub(r"step_up_required\s*=\s*0\b", "step_up_required = FALSE", converted, flags=re.IGNORECASE)
            converted = re.sub(r"mfa_enabled\s*=\s*1\b", "mfa_enabled = TRUE", converted, flags=re.IGNORECASE)
            converted = re.sub(r"mfa_enabled\s*=\s*0\b", "mfa_enabled = FALSE", converted, flags=re.IGNORECASE)
            return converted
        
        # In SQLite, replace %s with ?
        converted = query.replace("%s", "?")
        # Replace TRUE/FALSE literals with 1/0
        converted = re.sub(r"\bTRUE\b", "1", converted, flags=re.IGNORECASE)
        converted = re.sub(r"\bFALSE\b", "0", converted, flags=re.IGNORECASE)
        # Replace NOW() with CURRENT_TIMESTAMP
        converted = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", converted, flags=re.IGNORECASE)
        # Replace INTERVAL 'X hours/minutes/days' with datetime modifiers if needed
        converted = re.sub(r"NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*hours?'", r"datetime('now', '+\1 hours')", converted, flags=re.IGNORECASE)
        converted = re.sub(r"NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*minutes?'", r"datetime('now', '+\1 minutes')", converted, flags=re.IGNORECASE)
        converted = re.sub(r"NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*days?'", r"datetime('now', '+\1 days')", converted, flags=re.IGNORECASE)
        converted = re.sub(r"CURRENT_TIMESTAMP\s*\+\s*INTERVAL\s*'(\d+)\s*hours?'", r"datetime('now', '+\1 hours')", converted, flags=re.IGNORECASE)
        converted = re.sub(r"CURRENT_TIMESTAMP\s*\+\s*INTERVAL\s*'(\d+)\s*minutes?'", r"datetime('now', '+\1 minutes')", converted, flags=re.IGNORECASE)
        # Remove JSON cast like '{}'::jsonb or %s::jsonb
        converted = re.sub(r"::jsonb?", "", converted)
        return converted

    def _convert_params(self, params: Optional[Union[Tuple, List]]) -> Optional[Tuple]:
        if not params:
            return ()
        processed = []
        for p in params:
            if isinstance(p, (dict, list)):
                processed.append(json.dumps(p))
            elif isinstance(p, uuid.UUID):
                processed.append(str(p))
            elif isinstance(p, datetime.datetime):
                processed.append(p.isoformat() if not self.is_postgres else p)
            elif isinstance(p, bool):
                processed.append(p if self.is_postgres else (1 if p else 0))
            else:
                if hasattr(p, "obj"):
                    processed.append(json.dumps(p.obj))
                else:
                    processed.append(p)
        return tuple(processed)

    async def execute(self, query: str, params: Optional[Union[Tuple, List]] = None):
        """Execute a query and return a cursor with fetch methods"""
        converted_query = self._convert_query(query)
        converted_params = self._convert_params(params)

        if self.is_postgres:
            cursor = await self.raw_conn.execute(query, converted_params)
            return cursor
        else:
            cursor = await self.raw_conn.execute(converted_query, converted_params)
            return SQLiteCursorWrapper(cursor)

    async def commit(self):
        await self.raw_conn.commit()

    async def rollback(self):
        await self.raw_conn.rollback()


class SQLiteCursorWrapper:
    """Wraps an aiosqlite cursor to mimic psycopg cursor fetch operations"""

    def __init__(self, cursor):
        self.cursor = cursor

    async def fetchone(self):
        row = await self.cursor.fetchone()
        if row is None:
            return None
        return list(row)

    async def fetchall(self):
        rows = await self.cursor.fetchall()
        return [list(r) for r in rows]

    @property
    def rowcount(self):
        return self.cursor.rowcount

    @property
    def lastrowid(self):
        return self.cursor.lastrowid


class DatabaseManager:
    """Manages pool/connections and schema initialization with zero-leak async queue"""

    def __init__(self):
        self.is_postgres = IS_POSTGRES
        self._pool_queue: Optional[asyncio.Queue] = None
        self._max_size = int(os.getenv("DB_POOL_MAX_SIZE", "10"))
        self._conn_url = None

    async def _create_pg_connection(self):
        """Create a single healthy psycopg.AsyncConnection"""
        import psycopg
        conn = await psycopg.AsyncConnection.connect(self._conn_url, connect_timeout=15, autocommit=True)
        return conn

    async def initialize(self):
        """Initialize database connection pool and schema"""
        if self.is_postgres and DATABASE_URL:
            try:
                import psycopg
                if any(h in DATABASE_URL for h in ("neon.tech", "neon.database")) and "sslmode=" not in DATABASE_URL:
                    self._conn_url = DATABASE_URL + ("&sslmode=require" if "?" in DATABASE_URL else "?sslmode=require")
                else:
                    self._conn_url = DATABASE_URL

                # Test initial connection
                test_conn = await self._create_pg_connection()
                async with test_conn.cursor() as cur:
                    await cur.execute("SELECT 1;")
                
                self._pool_queue = asyncio.Queue(maxsize=self._max_size)
                await self._pool_queue.put(test_conn)
                print(f"[Database] Connected to PostgreSQL (Neon Cloud) successfully.")
            except Exception as e:
                print(f"[Database] PostgreSQL connection failed ({e}). Falling back to local SQLite.")
                self.is_postgres = False

        if not self.is_postgres:
            import aiosqlite
            os.makedirs(os.path.dirname(os.path.abspath(SQLITE_DB_PATH)), exist_ok=True)
            print(f"[Database] Using SQLite at: {SQLITE_DB_PATH}")

        # Run schema migrations / table setup
        await self._ensure_tables()

    async def close(self):
        """Close all connections in pool"""
        if self.is_postgres and self._pool_queue:
            while not self._pool_queue.empty():
                try:
                    conn = self._pool_queue.get_nowait()
                    await conn.close()
                except Exception:
                    pass

    @asynccontextmanager
    async def get_connection(self):
        """Context manager for acquiring and returning a database connection"""
        if self.is_postgres and self._conn_url:
            raw_conn = None
            try:
                if self._pool_queue and not self._pool_queue.empty():
                    raw_conn = self._pool_queue.get_nowait()
                else:
                    raw_conn = await self._create_pg_connection()

                if raw_conn.closed:
                    raw_conn = await self._create_pg_connection()

                yield DatabaseConnection(raw_conn, is_postgres=True)

                if self._pool_queue and not self._pool_queue.full() and not raw_conn.closed:
                    self._pool_queue.put_nowait(raw_conn)
                else:
                    await raw_conn.close()
            except Exception as e:
                if raw_conn and not raw_conn.closed:
                    try:
                        await raw_conn.close()
                    except Exception:
                        pass
                raise e
        else:
            import aiosqlite
            async with aiosqlite.connect(SQLITE_DB_PATH) as raw_conn:
                raw_conn.row_factory = aiosqlite.Row
                yield DatabaseConnection(raw_conn, is_postgres=False)

    async def _ensure_tables(self):
        """Create all required tables, indexes, and initial records"""
        if getattr(self, "_initialized", False):
            return

        async with self.get_connection() as conn:
            if self.is_postgres:
                # Fast check if tables are already created
                try:
                    check = await conn.execute("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1")
                    has_users = await check.fetchone()
                except Exception:
                    has_users = None

                if has_users:
                    self._initialized = True
                    return

                await conn.execute("""
                    CREATE EXTENSION IF NOT EXISTS pgcrypto;
                    
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY,
                        email VARCHAR(320) NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        pin_hash TEXT,
                        pin_failed_attempts INTEGER DEFAULT 0,
                        pin_locked_until TIMESTAMPTZ,
                        name VARCHAR(255),
                        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                        mfa_secret TEXT,
                        secure_pin_configured BOOLEAN DEFAULT FALSE,
                        pin_created_at TIMESTAMPTZ DEFAULT NOW(),
                        pin_updated_at TIMESTAMPTZ DEFAULT NOW(),
                        email_verified BOOLEAN DEFAULT TRUE,
                        email_verified_at TIMESTAMPTZ,
                        last_login TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS email_verification_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        email VARCHAR(320) NOT NULL,
                        token_hash TEXT NOT NULL,
                        verification_code VARCHAR(10),
                        expires_at TIMESTAMPTZ NOT NULL,
                        verified_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS pin_reset_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        email VARCHAR(320) NOT NULL,
                        token_hash TEXT NOT NULL,
                        recovery_code VARCHAR(10),
                        expires_at TIMESTAMPTZ NOT NULL,
                        used_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS otp_challenges (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        email VARCHAR(320) NOT NULL,
                        challenge_id VARCHAR(100) NOT NULL UNIQUE,
                        otp_code VARCHAR(10) NOT NULL,
                        attempts INTEGER DEFAULT 0,
                        expires_at TIMESTAMPTZ NOT NULL,
                        verified_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS captcha_challenges (
                        id SERIAL PRIMARY KEY,
                        challenge_id VARCHAR(100) NOT NULL UNIQUE,
                        captcha_text VARCHAR(50) NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL,
                        solved BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS auth_sessions (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        token_hash TEXT NOT NULL,
                        ip_address VARCHAR(100),
                        user_agent TEXT,
                        expires_at TIMESTAMPTZ NOT NULL,
                        revoked_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS user_devices (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
                        last_seen TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_token VARCHAR(500) NOT NULL UNIQUE,
                        device_id INTEGER REFERENCES user_devices(id) ON DELETE CASCADE,
                        ip_address VARCHAR(100),
                        country VARCHAR(100),
                        state_region VARCHAR(100),
                        city VARCHAR(100),
                        latitude DECIMAL(10, 8),
                        longitude DECIMAL(11, 8),
                        vpn_detected BOOLEAN DEFAULT FALSE,
                        trust_score FLOAT DEFAULT 50,
                        risk_score FLOAT DEFAULT 50,
                        is_active BOOLEAN DEFAULT TRUE,
                        step_up_required BOOLEAN DEFAULT FALSE,
                        last_activity TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        expires_at TIMESTAMPTZ
                    );

                    CREATE TABLE IF NOT EXISTS behavioral_patterns (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_id INTEGER REFERENCES user_sessions(id) ON DELETE CASCADE,
                        keystroke_speed_avg FLOAT DEFAULT 0,
                        keystroke_speed_variance FLOAT DEFAULT 0,
                        mouse_speed_avg FLOAT DEFAULT 0,
                        mouse_distance_traveled FLOAT DEFAULT 0,
                        click_frequency INTEGER DEFAULT 0,
                        scroll_events INTEGER DEFAULT 0,
                        navigation_count INTEGER DEFAULT 0,
                        time_on_page_avg FLOAT DEFAULT 0,
                        idle_time_seconds INTEGER DEFAULT 0,
                        behavior_score FLOAT DEFAULT 50,
                        pattern_anomaly_detected BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS login_history (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        ip_address VARCHAR(100),
                        device_id INTEGER,
                        success BOOLEAN,
                        failure_reason VARCHAR(255),
                        login_time TIMESTAMPTZ DEFAULT NOW(),
                        login_method VARCHAR(50)
                    );

                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id UUID PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        action_type VARCHAR(100) NOT NULL,
                        resource_type VARCHAR(100),
                        resource_id VARCHAR(255),
                        details JSONB,
                        status VARCHAR(50),
                        risk_level VARCHAR(50),
                        trust_level VARCHAR(50),
                        ip_address VARCHAR(100),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS trust_score_history (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_id INTEGER REFERENCES user_sessions(id) ON DELETE CASCADE,
                        trust_score FLOAT NOT NULL,
                        contributing_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
                        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS risk_score_history (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_id INTEGER REFERENCES user_sessions(id) ON DELETE CASCADE,
                        risk_score FLOAT NOT NULL,
                        risk_level VARCHAR(50) NOT NULL,
                        risk_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
                        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS policy_decisions (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        session_id INTEGER,
                        decision VARCHAR(50) NOT NULL,
                        trust_score FLOAT,
                        risk_score FLOAT,
                        reason TEXT,
                        action_required VARCHAR(100),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS trust_policies (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        policy_type VARCHAR(100),
                        priority INTEGER DEFAULT 10,
                        enabled BOOLEAN DEFAULT TRUE,
                        created_by VARCHAR(255),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS policy_rules (
                        id SERIAL PRIMARY KEY,
                        policy_id INTEGER REFERENCES trust_policies(id) ON DELETE CASCADE,
                        rule_name VARCHAR(255) NOT NULL,
                        condition_type VARCHAR(100) NOT NULL,
                        condition_value TEXT NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        severity VARCHAR(50) NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS policy_evaluations (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        policy_id INTEGER REFERENCES trust_policies(id) ON DELETE CASCADE,
                        trust_score FLOAT,
                        decision VARCHAR(50),
                        evaluated_at TIMESTAMPTZ DEFAULT NOW(),
                        reason TEXT
                    );

                    CREATE TABLE IF NOT EXISTS federated_rounds (
                        id SERIAL PRIMARY KEY,
                        round_number INTEGER NOT NULL,
                        model_version VARCHAR(100) NOT NULL,
                        target_accuracy FLOAT DEFAULT 0.95,
                        minimum_participants INTEGER DEFAULT 2,
                        status VARCHAR(50) DEFAULT 'pending',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS federated_participants (
                        id SERIAL PRIMARY KEY,
                        round_id INTEGER REFERENCES federated_rounds(id) ON DELETE CASCADE,
                        org_id VARCHAR(100) NOT NULL,
                        local_accuracy FLOAT,
                        local_loss FLOAT,
                        data_samples_count INTEGER,
                        uploaded_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS federated_models (
                        id SERIAL PRIMARY KEY,
                        round_id INTEGER REFERENCES federated_rounds(id) ON DELETE CASCADE,
                        version VARCHAR(100) NOT NULL,
                        global_accuracy FLOAT NOT NULL,
                        global_loss FLOAT NOT NULL,
                        aggregated_at TIMESTAMPTZ DEFAULT NOW(),
                        model_type VARCHAR(50) DEFAULT 'fedavg'
                    );

                    CREATE TABLE IF NOT EXISTS cloud_configurations (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        cloud_type VARCHAR(50) NOT NULL,
                        provider VARCHAR(100) NOT NULL,
                        region VARCHAR(100) NOT NULL,
                        endpoint VARCHAR(500) NOT NULL,
                        api_key_encrypted TEXT,
                        is_primary BOOLEAN DEFAULT FALSE,
                        status VARCHAR(50) DEFAULT 'active',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS cloud_sync_logs (
                        id SERIAL PRIMARY KEY,
                        cloud_id INTEGER REFERENCES cloud_configurations(id) ON DELETE CASCADE,
                        sync_type VARCHAR(100),
                        status VARCHAR(50),
                        records_synced INTEGER,
                        duration_ms FLOAT,
                        last_synced_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS cloud_health_metrics (
                        id SERIAL PRIMARY KEY,
                        cloud_id INTEGER REFERENCES cloud_configurations(id) ON DELETE CASCADE,
                        latency_ms FLOAT,
                        availability_percent FLOAT,
                        throughput_mbps FLOAT,
                        error_rate FLOAT,
                        last_check_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS performance_metrics (
                        id SERIAL PRIMARY KEY,
                        operation_type VARCHAR(100) NOT NULL,
                        duration_ms FLOAT NOT NULL,
                        endpoint VARCHAR(255),
                        status_code INTEGER,
                        recorded_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
            else:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        pin_hash TEXT,
                        pin_failed_attempts INTEGER DEFAULT 0,
                        pin_locked_until TEXT,
                        name TEXT,
                        mfa_enabled INTEGER NOT NULL DEFAULT 0,
                        mfa_secret TEXT,
                        last_login TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS auth_sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token_hash TEXT NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        expires_at TEXT NOT NULL,
                        revoked_at TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS user_devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        device_fingerprint TEXT NOT NULL UNIQUE,
                        device_name TEXT,
                        browser_name TEXT,
                        browser_version TEXT,
                        os_name TEXT,
                        os_version TEXT,
                        screen_resolution TEXT,
                        language_setting TEXT,
                        timezone TEXT,
                        is_trusted INTEGER DEFAULT 0,
                        trust_score REAL DEFAULT 50,
                        last_seen TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        session_token TEXT NOT NULL UNIQUE,
                        device_id INTEGER,
                        ip_address TEXT,
                        country TEXT,
                        state_region TEXT,
                        city TEXT,
                        latitude REAL,
                        longitude REAL,
                        vpn_detected INTEGER DEFAULT 0,
                        trust_score REAL DEFAULT 50,
                        risk_score REAL DEFAULT 50,
                        is_active INTEGER DEFAULT 1,
                        step_up_required INTEGER DEFAULT 0,
                        last_activity TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        expires_at TEXT,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS behavioral_patterns (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        session_id INTEGER,
                        keystroke_speed_avg REAL DEFAULT 0,
                        keystroke_speed_variance REAL DEFAULT 0,
                        mouse_speed_avg REAL DEFAULT 0,
                        mouse_distance_traveled REAL DEFAULT 0,
                        click_frequency INTEGER DEFAULT 0,
                        scroll_events INTEGER DEFAULT 0,
                        navigation_count INTEGER DEFAULT 0,
                        time_on_page_avg REAL DEFAULT 0,
                        idle_time_seconds INTEGER DEFAULT 0,
                        behavior_score REAL DEFAULT 50,
                        pattern_anomaly_detected INTEGER DEFAULT 0,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS login_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        ip_address TEXT,
                        device_id INTEGER,
                        success INTEGER,
                        failure_reason TEXT,
                        login_time TEXT DEFAULT CURRENT_TIMESTAMP,
                        login_method TEXT,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        action_type TEXT NOT NULL,
                        resource_type TEXT,
                        resource_id TEXT,
                        details TEXT,
                        status TEXT,
                        risk_level TEXT,
                        trust_level TEXT,
                        ip_address TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS trust_score_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        session_id INTEGER,
                        trust_score REAL NOT NULL,
                        contributing_factors TEXT DEFAULT '{}',
                        calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS risk_score_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        session_id INTEGER,
                        risk_score REAL NOT NULL,
                        risk_level TEXT NOT NULL,
                        risk_factors TEXT DEFAULT '{}',
                        calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS policy_decisions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT,
                        session_id INTEGER,
                        decision TEXT NOT NULL,
                        trust_score REAL,
                        risk_score REAL,
                        reason TEXT,
                        action_required TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS trust_policies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        policy_type TEXT,
                        priority INTEGER DEFAULT 10,
                        enabled INTEGER DEFAULT 1,
                        created_by TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS policy_rules (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        policy_id INTEGER,
                        rule_name TEXT NOT NULL,
                        condition_type TEXT NOT NULL,
                        condition_value TEXT NOT NULL,
                        action TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        FOREIGN KEY (policy_id) REFERENCES trust_policies(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS policy_evaluations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT,
                        policy_id INTEGER,
                        trust_score REAL,
                        decision TEXT,
                        evaluated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        reason TEXT
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS federated_rounds (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        round_number INTEGER NOT NULL,
                        model_version TEXT NOT NULL,
                        target_accuracy REAL DEFAULT 0.95,
                        minimum_participants INTEGER DEFAULT 2,
                        status TEXT DEFAULT 'pending',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS federated_participants (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        round_id INTEGER,
                        org_id TEXT NOT NULL,
                        local_accuracy REAL,
                        local_loss REAL,
                        data_samples_count INTEGER,
                        uploaded_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (round_id) REFERENCES federated_rounds(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS federated_models (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        round_id INTEGER,
                        version TEXT NOT NULL,
                        global_accuracy REAL NOT NULL,
                        global_loss REAL NOT NULL,
                        aggregated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        model_type TEXT DEFAULT 'fedavg',
                        FOREIGN KEY (round_id) REFERENCES federated_rounds(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS cloud_configurations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        cloud_type TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        region TEXT NOT NULL,
                        endpoint TEXT NOT NULL,
                        api_key_encrypted TEXT,
                        is_primary INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'active',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS cloud_sync_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cloud_id INTEGER,
                        sync_type TEXT,
                        status TEXT,
                        records_synced INTEGER,
                        duration_ms REAL,
                        last_synced_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (cloud_id) REFERENCES cloud_configurations(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS cloud_health_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cloud_id INTEGER,
                        latency_ms REAL,
                        availability_percent REAL,
                        throughput_mbps REAL,
                        error_rate REAL,
                        last_check_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (cloud_id) REFERENCES cloud_configurations(id) ON DELETE CASCADE
                    );
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS performance_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        operation_type TEXT NOT NULL,
                        duration_ms REAL NOT NULL,
                        endpoint TEXT,
                        status_code INTEGER,
                        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                """)

            if self.is_postgres:
                migration_statements = [
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER DEFAULT 0",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ",
                    
                    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS step_up_required BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 50",
                    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS risk_score FLOAT DEFAULT 50",

                    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'LOW'",
                    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS trust_level VARCHAR(50) DEFAULT 'NORMAL'",
                    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB",
                    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100)",

                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS round_id INTEGER",
                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS version VARCHAR(100)",
                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS global_accuracy FLOAT",
                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS global_loss FLOAT",
                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS aggregated_at TIMESTAMPTZ DEFAULT NOW()",
                    "ALTER TABLE federated_models ADD COLUMN IF NOT EXISTS model_type VARCHAR(50) DEFAULT 'fedavg'",

                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS round_number INTEGER",
                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS model_version VARCHAR(100)",
                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS target_accuracy FLOAT DEFAULT 0.95",
                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS minimum_participants INTEGER DEFAULT 2",
                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'",
                    "ALTER TABLE federated_rounds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",

                    "ALTER TABLE federated_participants DROP CONSTRAINT IF EXISTS federated_participants_org_id_fkey",
                    "ALTER TABLE federated_participants ALTER COLUMN org_id TYPE VARCHAR(255) USING org_id::text",
                    "ALTER TABLE federated_participants ADD COLUMN IF NOT EXISTS round_id INTEGER",
                    "ALTER TABLE federated_participants ADD COLUMN IF NOT EXISTS local_accuracy FLOAT",
                    "ALTER TABLE federated_participants ADD COLUMN IF NOT EXISTS local_loss FLOAT",
                    "ALTER TABLE federated_participants ADD COLUMN IF NOT EXISTS data_samples_count INTEGER",
                    "ALTER TABLE federated_participants ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ",

                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS endpoint VARCHAR(500)",
                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT",
                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS region VARCHAR(100)",
                    "ALTER TABLE cloud_configurations ADD COLUMN IF NOT EXISTS provider VARCHAR(100)",

                    "ALTER TABLE cloud_sync_logs ADD COLUMN IF NOT EXISTS cloud_id INTEGER",
                    "ALTER TABLE cloud_sync_logs ADD COLUMN IF NOT EXISTS sync_type VARCHAR(100)",
                    "ALTER TABLE cloud_sync_logs ADD COLUMN IF NOT EXISTS records_synced INTEGER",
                    "ALTER TABLE cloud_sync_logs ADD COLUMN IF NOT EXISTS duration_ms FLOAT",
                    "ALTER TABLE cloud_sync_logs ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ",

                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS cloud_id INTEGER",
                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS latency_ms FLOAT",
                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS availability_percent FLOAT",
                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS throughput_mbps FLOAT",
                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS error_rate FLOAT",
                    "ALTER TABLE cloud_health_metrics ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMPTZ",

                    "ALTER TABLE trust_policies ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 10",
                    "ALTER TABLE trust_policies ADD COLUMN IF NOT EXISTS policy_type VARCHAR(50) DEFAULT 'adaptive_mfa'",
                    "ALTER TABLE trust_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
                    "ALTER TABLE trust_policies ADD COLUMN IF NOT EXISTS min_trust_score FLOAT DEFAULT 60.0",
                    "ALTER TABLE trust_policies ADD COLUMN IF NOT EXISTS max_risk_score FLOAT DEFAULT 40.0",

                    "ALTER TABLE federated_models ALTER COLUMN id SET DEFAULT gen_random_uuid()",
                    "CREATE SEQUENCE IF NOT EXISTS federated_rounds_id_seq",
                    "ALTER TABLE federated_rounds ALTER COLUMN id SET DEFAULT nextval('federated_rounds_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS federated_participants_id_seq",
                    "ALTER TABLE federated_participants ALTER COLUMN id SET DEFAULT nextval('federated_participants_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS user_sessions_id_seq",
                    "ALTER TABLE user_sessions ALTER COLUMN id SET DEFAULT nextval('user_sessions_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS user_devices_id_seq",
                    "ALTER TABLE user_devices ALTER COLUMN id SET DEFAULT nextval('user_devices_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS behavioral_patterns_id_seq",
                    "ALTER TABLE behavioral_patterns ALTER COLUMN id SET DEFAULT nextval('behavioral_patterns_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS trust_scores_id_seq",
                    "ALTER TABLE trust_scores ALTER COLUMN id SET DEFAULT nextval('trust_scores_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS risk_scores_id_seq",
                    "ALTER TABLE risk_scores ALTER COLUMN id SET DEFAULT nextval('risk_scores_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS trust_policies_id_seq",
                    "ALTER TABLE trust_policies ALTER COLUMN id SET DEFAULT nextval('trust_policies_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS cloud_configurations_id_seq",
                    "ALTER TABLE cloud_configurations ALTER COLUMN id SET DEFAULT nextval('cloud_configurations_id_seq')",
                    "CREATE SEQUENCE IF NOT EXISTS performance_metrics_id_seq",
                    "ALTER TABLE performance_metrics ALTER COLUMN id SET DEFAULT nextval('performance_metrics_id_seq')"
                ]
                for stmt in migration_statements:
                    try:
                        await conn.execute(stmt)
                    except Exception:
                        pass

            await conn.commit()

            # Seed default records if empty
            await self._seed_defaults(conn)

    async def _seed_defaults(self, conn: DatabaseConnection):
        """Seed default admin account, policies, federated rounds, and cloud topology if not present"""
        from security import hash_password, hash_secret_pin

        # 1. Seed demo/admin user
        check_user = await conn.execute("SELECT id FROM users WHERE email = %s", ("admin@zerotrust.ai",))
        if not await check_user.fetchone():
            admin_id = str(uuid.uuid4())
            admin_pwd_hash = hash_password("Admin@123456")
            admin_pin_hash = hash_secret_pin("123456")
            await conn.execute(
                """INSERT INTO users (id, email, password_hash, pin_hash, name, mfa_enabled, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())""",
                (admin_id, "admin@zerotrust.ai", admin_pwd_hash, admin_pin_hash, "Security Administrator", True)
            )

        # Seed standard operator user
        check_op = await conn.execute("SELECT id FROM users WHERE email = %s", ("operator@zerotrust.ai",))
        if not await check_op.fetchone():
            op_id = str(uuid.uuid4())
            op_pwd_hash = hash_password("Operator@123456")
            op_pin_hash = hash_secret_pin("654321")
            await conn.execute(
                """INSERT INTO users (id, email, password_hash, pin_hash, name, mfa_enabled, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())""",
                (op_id, "operator@zerotrust.ai", op_pwd_hash, op_pin_hash, "Security Operator", False)
            )

        # 2. Seed Default Policies
        check_policy = await conn.execute("SELECT id FROM trust_policies LIMIT 1")
        if not await check_policy.fetchone():
            await conn.execute("""
                INSERT INTO trust_policies (name, description, policy_type, priority, enabled, created_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, ("Default Zero Trust Access Policy", "Baseline adaptive access policy evaluating device trust, behavioral cadence, and anomaly scores.", "adaptive_mfa", 1, True, "system"))

            p_id_res = await conn.execute("SELECT id FROM trust_policies WHERE name = %s", ("Default Zero Trust Access Policy",))
            p_row = await p_id_res.fetchone()
            if p_row:
                p_id = p_row[0]
                await conn.execute("""
                    INSERT INTO policy_rules (policy_id, rule_name, condition_type, condition_value, action, severity)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (p_id, "High Risk Anomaly Rule", "risk_score_threshold", "60", "REQUIRE_STEP_UP_PIN", "high"))
                await conn.execute("""
                    INSERT INTO policy_rules (policy_id, rule_name, condition_type, condition_value, action, severity)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (p_id, "Critical Threat Isolation", "risk_score_threshold", "80", "REVOKE_SESSION", "critical"))
                await conn.execute("""
                    INSERT INTO policy_rules (policy_id, rule_name, condition_type, condition_value, action, severity)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (p_id, "Unrecognized Device Check", "device_mismatch", "true", "CHALLENGE_PIN", "medium"))

        # 3. Seed Cloud Configurations (Hybrid Cloud Topology)
        check_clouds = await conn.execute("SELECT id FROM cloud_configurations LIMIT 1")
        if not await check_clouds.fetchone():
            await conn.execute("""
                INSERT INTO cloud_configurations (name, cloud_type, provider, region, endpoint, is_primary, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, ("Private Identity Datacenter", "private", "On-Premises VMware/K8s", "us-west-priv-1", "https://id-private.internal.cloud", True, "active"))
            await conn.execute("""
                INSERT INTO cloud_configurations (name, cloud_type, provider, region, endpoint, is_primary, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, ("Public Edge Application Gateway", "public", "AWS us-east-1", "us-east-1", "https://edge.aws.zerotrust.io", True, "active"))
            await conn.execute("""
                INSERT INTO cloud_configurations (name, cloud_type, provider, region, endpoint, is_primary, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, ("Public Analytics & Compute Cluster", "public", "GCP us-central1", "us-central1", "https://compute.gcp.zerotrust.io", False, "active"))

        # 4. Seed Initial Federated Learning Simulation Round
        check_fl = await conn.execute("SELECT id FROM federated_rounds LIMIT 1")
        if not await check_fl.fetchone():
            await conn.execute("""
                INSERT INTO federated_rounds (round_number, model_version, target_accuracy, minimum_participants, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (1, "v1.0.0-fedavg", 0.96, 3, "completed"))
            r_res = await conn.execute("SELECT id FROM federated_rounds WHERE round_number = 1")
            r_row = await r_res.fetchone()
            if r_row:
                r_id = r_row[0]
                await conn.execute("""
                    INSERT INTO federated_participants (round_id, org_id, local_accuracy, local_loss, data_samples_count, uploaded_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (r_id, "Client-A (Private Cloud DC-West)", 0.972, 0.041, 1420))
                await conn.execute("""
                    INSERT INTO federated_participants (round_id, org_id, local_accuracy, local_loss, data_samples_count, uploaded_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (r_id, "Client-B (Public Cloud AWS-East)", 0.965, 0.052, 2180))
                await conn.execute("""
                    INSERT INTO federated_participants (round_id, org_id, local_accuracy, local_loss, data_samples_count, uploaded_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (r_id, "Client-C (Edge Gateway Central)", 0.958, 0.061, 980))

                await conn.execute("""
                    INSERT INTO federated_models (round_id, version, global_accuracy, global_loss, model_type)
                    VALUES (%s, %s, %s, %s, %s)
                """, (r_id, "v1.0.0-fedavg", 0.966, 0.050, "fedavg"))

        await conn.commit()


# Singleton instance
db_manager = DatabaseManager()


async def get_db():
    """Dependency for FastAPI route handlers"""
    async with db_manager.get_connection() as conn:
        yield conn
