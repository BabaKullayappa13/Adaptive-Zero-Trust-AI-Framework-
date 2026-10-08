"""
Safe Administrator Bootstrap Utility for Adaptive Zero Trust AI Framework
Allows administrators to securely provision or reset an authoritative admin account in the Neon PostgreSQL database.
Usage:
    python -m bootstrap_admin --email admin@organization.com --password <SECURE_PASSWORD> --pin <6_DIGIT_PIN>
Or via environment variables:
    BOOTSTRAP_ADMIN_EMAIL=admin@organization.com
    BOOTSTRAP_ADMIN_PASSWORD=StrongPassword123!
    BOOTSTRAP_ADMIN_PIN=854921
    python -m bootstrap_admin
"""

import os
import sys
import uuid
import asyncio
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

load_dotenv()

from database import db_manager
from security import hash_password, hash_secret_pin, validate_secure_pin_strength


async def bootstrap_admin(email: str, password: str, pin: str = None, name: str = "System Administrator"):
    """Provision or update administrative credentials directly in database"""
    clean_email = email.strip().lower()

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    pin_hash = None
    pin_configured = False
    if pin:
        is_valid, pin_msg = validate_secure_pin_strength(pin)
        if not is_valid:
            raise ValueError(f"PIN Validation Error: {pin_msg}")
        pin_hash = hash_secret_pin(pin)
        pin_configured = True

    pwd_hash = hash_password(password)

    await db_manager.initialize()
    async with db_manager.get_connection() as conn:
        res = await conn.execute("SELECT id FROM users WHERE email = %s", (clean_email,))
        existing = await res.fetchone()

        if existing:
            user_id = existing[0]
            if pin_hash:
                await conn.execute(
                    """UPDATE users 
                       SET password_hash = %s, pin_hash = %s, role = 'admin', 
                           secure_pin_configured = TRUE, is_active = TRUE, updated_at = NOW()
                       WHERE id = %s""",
                    (pwd_hash, pin_hash, user_id)
                )
            else:
                await conn.execute(
                    """UPDATE users 
                       SET password_hash = %s, role = 'admin', is_active = TRUE, updated_at = NOW()
                       WHERE id = %s""",
                    (pwd_hash, user_id)
                )
            print(f"[Bootstrap] Administrator account updated successfully: {clean_email} (ID: {user_id})")
        else:
            user_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO users 
                   (id, email, password_hash, pin_hash, name, mfa_enabled, role, secure_pin_configured, is_active, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, 'admin', %s, TRUE, NOW(), NOW())""",
                (user_id, clean_email, pwd_hash, pin_hash, name, pin_configured, pin_configured)
            )
            print(f"[Bootstrap] Administrator account created successfully: {clean_email} (ID: {user_id})")

        # Audit event
        await conn.execute(
            """INSERT INTO audit_logs 
               (id, user_id, action_type, status, risk_level, trust_level, details, created_at)
               VALUES (%s, %s, 'ADMIN_BOOTSTRAP', 'SUCCESS', 'LOW', 'TRUSTED', %s, NOW())""",
            (str(uuid.uuid4()), user_id, {"email": clean_email, "role": "admin"})
        )
        await conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Bootstrap Administrator Account for Zero Trust Gateway")
    parser.add_argument("--email", default=os.getenv("BOOTSTRAP_ADMIN_EMAIL"), help="Admin email address")
    parser.add_argument("--password", default=os.getenv("BOOTSTRAP_ADMIN_PASSWORD"), help="Admin password")
    parser.add_argument("--pin", default=os.getenv("BOOTSTRAP_ADMIN_PIN"), help="6-digit Secure PIN")
    parser.add_argument("--name", default="System Administrator", help="Admin display name")

    args = parser.parse_args()

    if not args.email or not args.password:
        print("[Bootstrap] Error: Admin email and password are required.")
        print("Provide via arguments --email and --password, or environment variables BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.")
        sys.exit(1)

    asyncio.run(bootstrap_admin(args.email, args.password, args.pin, args.name))


if __name__ == "__main__":
    main()
