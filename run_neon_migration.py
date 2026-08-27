import psycopg
import sys

url = 'postgresql://neondb_owner:npg_6pkZtUuvFwy4@ep-ancient-tree-az419aje.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

stmts = [
    # Clean sequences and defaults for integer PKs
    "CREATE SEQUENCE IF NOT EXISTS federated_models_id_seq",
    "ALTER TABLE federated_models ALTER COLUMN id SET DEFAULT nextval('federated_models_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS federated_rounds_id_seq",
    "ALTER TABLE federated_rounds ALTER COLUMN id SET DEFAULT nextval('federated_rounds_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS federated_participants_id_seq",
    "ALTER TABLE federated_participants ALTER COLUMN id SET DEFAULT nextval('federated_participants_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS user_devices_id_seq",
    "ALTER TABLE user_devices ALTER COLUMN id SET DEFAULT nextval('user_devices_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS user_sessions_id_seq",
    "ALTER TABLE user_sessions ALTER COLUMN id SET DEFAULT nextval('user_sessions_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS behavioral_patterns_id_seq",
    "ALTER TABLE behavioral_patterns ALTER COLUMN id SET DEFAULT nextval('behavioral_patterns_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS cloud_configurations_id_seq",
    "ALTER TABLE cloud_configurations ALTER COLUMN id SET DEFAULT nextval('cloud_configurations_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS cloud_sync_logs_id_seq",
    "ALTER TABLE cloud_sync_logs ALTER COLUMN id SET DEFAULT nextval('cloud_sync_logs_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS cloud_health_metrics_id_seq",
    "ALTER TABLE cloud_health_metrics ALTER COLUMN id SET DEFAULT nextval('cloud_health_metrics_id_seq')",
    "CREATE SEQUENCE IF NOT EXISTS performance_metrics_id_seq",
    "ALTER TABLE performance_metrics ALTER COLUMN id SET DEFAULT nextval('performance_metrics_id_seq')",
]

print("Connecting to Neon to apply PK sequences...")
with psycopg.connect(url, autocommit=True, connect_timeout=10) as conn:
    with conn.cursor() as cur:
        for s in stmts:
            try:
                cur.execute(s)
                print("  Success:", s)
            except Exception as e:
                print("  Failed:", s, "->", e)

print("Migration completed!")
