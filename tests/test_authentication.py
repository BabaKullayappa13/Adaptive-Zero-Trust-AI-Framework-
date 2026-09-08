"""
Authentication, Token Validation, Secret PIN, and Neon Auth JWKS Tests
"""

import sys
import uuid
from pathlib import Path
import pytest
from datetime import timedelta

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from security import (
    hash_password, verify_password,
    hash_secret_pin, verify_secret_pin,
    create_access_token, decode_token,
    get_jwks_status
)


def test_password_hashing():
    """Verify Argon2 / Bcrypt password hashing and verification"""
    password = "ZeroTrustSecurity2026!#"
    pwd_hash = hash_password(password)
    assert pwd_hash != password
    assert verify_password(password, pwd_hash) is True
    assert verify_password("WrongPassword!", pwd_hash) is False


def test_secret_pin_hashing():
    """Verify 6-digit Secret PIN hashing and constant-time verification"""
    pin = "854921"
    pin_hash = hash_secret_pin(pin)
    assert pin_hash != pin
    assert verify_secret_pin(pin, pin_hash) is True
    assert verify_secret_pin("123456", pin_hash) is False


def test_jwt_creation_and_decoding():
    """Verify internal HMAC HS256 token generation and decoding"""
    user_id = str(uuid.uuid4())
    token = create_access_token(
        user_id=user_id,
        email="operator@zerotrust.cloud",
        role="admin",
        expires_delta=timedelta(minutes=30)
    )
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_id
    assert decoded["role"] == "admin"
    assert decoded["email"] == "operator@zerotrust.cloud"


def test_neon_jwks_status():
    """Verify Neon Auth JWKS status endpoint reports configuration cleanly"""
    status = get_jwks_status()
    assert "jwks_url" in status
    assert "configured" in status
    assert "algorithm" in status
    assert status["algorithm"] == "RS256"
