"""
WebAuthn & Passkey Service for Adaptive Zero-Trust AI Framework
Standards-based FIDO2 / WebAuthn implementation supporting device biometric authentication
(Windows Hello, Apple Face ID / Touch ID, Android Biometrics, FIDO2 security keys).

CRITICAL SECURITY RULE:
Never store or compare raw face images or biometric templates.
Biometric verification is performed locally by the platform authenticator.
The server verifies standards-compliant cryptographic signatures (assertions)
and stores standard public keys, credential IDs, and sign counters.
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import HTTPException, Request

import webauthn
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes
)
from webauthn.helpers import bytes_to_base64url
from webauthn.helpers.structs import (
    UserVerificationRequirement,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    PublicKeyCredentialDescriptor
)

from database import DatabaseConnection


def get_rp_id(request: Optional[Request] = None) -> str:
    """Get the Relying Party ID (domain / hostname)."""
    env_rp_id = os.getenv("WEBAUTHN_RP_ID")
    if env_rp_id:
        return env_rp_id.strip()

    if request and request.headers.get("host"):
        host = request.headers["host"].split(":")[0]
        if host in ("localhost", "127.0.0.1"):
            return "localhost"
        return host

    return "localhost"


def get_rp_name() -> str:
    """Get the Relying Party Name."""
    return os.getenv("WEBAUTHN_RP_NAME", "Adaptive Zero-Trust AI Framework")


def get_allowed_origins(request: Optional[Request] = None) -> List[str]:
    """Collect valid allowed origins for WebAuthn ceremony verification."""
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://localhost:3000",
        "https://127.0.0.1:3000"
    ]

    for env_var in ("FRONTEND_URL", "APP_URL", "NEXTAUTH_URL"):
        val = os.getenv(env_var, "").strip().rstrip("/")
        if val and val not in origins:
            origins.append(val)

    if request:
        origin_header = request.headers.get("origin")
        if origin_header and origin_header not in origins:
            origins.append(origin_header)
        referer = request.headers.get("referer")
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                ref_origin = f"{parsed.scheme}://{parsed.netloc}"
                if ref_origin and ref_origin not in origins:
                    origins.append(ref_origin)
            except Exception:
                pass

    return origins


async def generate_registration_challenge(
    user_id: str,
    email: str,
    name: str,
    request: Request,
    conn: DatabaseConnection
) -> Dict[str, Any]:
    """
    Generate WebAuthn registration options for enrolling a new passkey / biometric authenticator.
    Saves challenge in database with 5-minute expiration.
    """
    rp_id = get_rp_id(request)
    rp_name = get_rp_name()

    # Query any existing credentials to exclude from re-registration
    c_res = await conn.execute(
        "SELECT id FROM webauthn_credentials WHERE user_id = %s",
        (user_id,)
    )
    existing_creds = await c_res.fetchall()
    exclude_credentials = []
    for cred in existing_creds:
        try:
            cred_id_bytes = base64url_to_bytes(cred[0])
            exclude_credentials.append(PublicKeyCredentialDescriptor(id=cred_id_bytes))
        except Exception:
            continue

    user_bytes = user_id.encode("utf-8")[:64]

    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_id=user_bytes,
        user_name=email,
        user_display_name=name or email,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        ),
        exclude_credentials=exclude_credentials,
        timeout=60000
    )

    challenge_b64 = bytes_to_base64url(options.challenge)

    # Store challenge in database
    challenge_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # Clean up old registration challenges for this user
    await conn.execute(
        "DELETE FROM webauthn_challenges WHERE user_id = %s AND ceremony_type = 'REGISTRATION'",
        (user_id,)
    )

    await conn.execute(
        """INSERT INTO webauthn_challenges 
           (id, user_id, challenge, ceremony_type, expires_at, created_at)
           VALUES (%s, %s, %s, 'REGISTRATION', %s, NOW())""",
        (challenge_id, user_id, challenge_b64, expires_at)
    )
    await conn.commit()

    return json.loads(options_to_json(options))


async def verify_registration_credential(
    user_id: str,
    credential: Dict[str, Any],
    request: Request,
    conn: DatabaseConnection,
    nickname: Optional[str] = None
) -> Dict[str, Any]:
    """
    Verify WebAuthn registration credential from client platform authenticator.
    Stores public key, sign count, and credential ID without touching raw biometrics.
    """
    # 1. Retrieve pending challenge for user
    now = datetime.utcnow()
    c_res = await conn.execute(
        """SELECT id, challenge, expires_at FROM webauthn_challenges 
           WHERE user_id = %s AND ceremony_type = 'REGISTRATION' AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1""",
        (user_id,)
    )
    challenge_row = await c_res.fetchone()
    if not challenge_row:
        raise HTTPException(
            status_code=400,
            detail="Registration session expired or invalid. Please restart passkey enrollment."
        )

    challenge_record_id, stored_challenge_b64, _ = challenge_row
    expected_challenge_bytes = base64url_to_bytes(stored_challenge_b64)

    rp_id = get_rp_id(request)
    allowed_origins = get_allowed_origins(request)

    try:
        verified_reg = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge_bytes,
            expected_rp_id=rp_id,
            expected_origin=allowed_origins,
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Passkey biometric registration verification failed: {str(exc)}"
        )

    # 2. Extract verified parameters
    cred_id_b64 = bytes_to_base64url(verified_reg.credential_id)
    public_key_b64 = bytes_to_base64url(verified_reg.credential_public_key)
    sign_count = verified_reg.sign_count
    aaguid = str(verified_reg.aaguid or "")

    transports_list = credential.get("response", {}).get("transports", [])
    transports_str = json.dumps(transports_list) if transports_list else None

    chosen_nickname = (nickname or "Biometric Passkey").strip()[:100]

    # 3. Store credential in database
    await conn.execute(
        """INSERT INTO webauthn_credentials 
           (id, user_id, public_key, sign_count, transports, nickname, aaguid, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())""",
        (cred_id_b64, user_id, public_key_b64, sign_count, transports_str, chosen_nickname, aaguid)
    )

    # 4. Mark user account as having passkey and biometric MFA enrolled
    await conn.execute(
        """UPDATE users 
           SET passkey_enrolled = TRUE, face_enrolled = TRUE, mfa_enabled = TRUE, updated_at = NOW()
           WHERE id = %s""",
        (user_id,)
    )

    # 5. Consume challenge
    await conn.execute(
        "DELETE FROM webauthn_challenges WHERE id = %s",
        (challenge_record_id,)
    )

    # 6. Record audit log
    await conn.execute(
        """INSERT INTO audit_logs 
           (id, user_id, action_type, status, details, created_at)
           VALUES (%s, %s, 'PASSKEY_REGISTERED', 'SUCCESS', %s, NOW())""",
        (
            str(uuid.uuid4()),
            user_id,
            {"credential_id": cred_id_b64, "nickname": chosen_nickname, "aaguid": aaguid}
        )
    )
    await conn.commit()

    return {
        "success": True,
        "credential_id": cred_id_b64,
        "nickname": chosen_nickname,
        "message": "Biometric Passkey registered successfully."
    }


async def generate_authentication_challenge(
    email: Optional[str],
    request: Request,
    conn: DatabaseConnection
) -> Dict[str, Any]:
    """
    Generate WebAuthn authentication options for passkey / biometric login.
    """
    rp_id = get_rp_id(request)
    allow_credentials = []
    user_id_found = None

    if email:
        email_clean = email.strip().lower()
        u_res = await conn.execute("SELECT id FROM users WHERE email = %s", (email_clean,))
        u_row = await u_res.fetchone()
        if u_row:
            user_id_found = str(u_row[0])
            c_res = await conn.execute(
                "SELECT id, transports FROM webauthn_credentials WHERE user_id = %s",
                (user_id_found,)
            )
            rows = await c_res.fetchall()
            for r in rows:
                try:
                    cred_id_bytes = base64url_to_bytes(r[0])
                    allow_credentials.append(PublicKeyCredentialDescriptor(id=cred_id_bytes))
                except Exception:
                    continue

    options = generate_authentication_options(
        rp_id=rp_id,
        user_verification=UserVerificationRequirement.PREFERRED,
        allow_credentials=allow_credentials or None,
        timeout=60000
    )

    challenge_b64 = bytes_to_base64url(options.challenge)
    challenge_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    await conn.execute(
        """INSERT INTO webauthn_challenges 
           (id, user_id, challenge, ceremony_type, expires_at, created_at)
           VALUES (%s, %s, %s, 'AUTHENTICATION', %s, NOW())""",
        (challenge_id, user_id_found, challenge_b64, expires_at)
    )
    await conn.commit()

    return json.loads(options_to_json(options))


async def verify_authentication_credential(
    credential: Dict[str, Any],
    request: Request,
    conn: DatabaseConnection
) -> Dict[str, Any]:
    """
    Verify WebAuthn authentication assertion from client platform authenticator.
    Enforces account active state, email verification, and cryptographic signature check.
    """
    cred_id_raw = credential.get("id")
    if not cred_id_raw:
        raise HTTPException(status_code=400, detail="Missing credential ID in authentication response.")

    # 1. Find credential in database
    c_res = await conn.execute(
        """SELECT c.id, c.user_id, c.public_key, c.sign_count, c.nickname,
                  u.email, u.name, u.role, u.is_active, u.email_verified,
                  u.is_blocked, u.block_reason, u.is_suspended, u.suspended_until, u.suspension_reason
           FROM webauthn_credentials c
           JOIN users u ON u.id = c.user_id
           WHERE c.id = %s""",
        (cred_id_raw,)
    )
    cred_row = await c_res.fetchone()

    if not cred_row:
        raise HTTPException(
            status_code=401,
            detail="Passkey credential not recognized. Please sign in with email and password first, or enroll a passkey."
        )

    (cred_id, user_id, pub_key_b64, stored_sign_count, nickname,
     email, name, role, is_active, email_verified,
     is_blocked, block_reason, is_suspended, suspended_until, suspension_reason) = cred_row

    # 2. Account state checks
    if not is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact system administrator.")

    if is_blocked:
        raise HTTPException(
            status_code=403,
            detail=f"Account has been blocked by administrator. Reason: {block_reason or 'Security policy enforcement'}"
        )

    if is_suspended:
        now_utc = datetime.utcnow()
        is_still_suspended = True
        if suspended_until:
            try:
                if isinstance(suspended_until, str):
                    s_dt = datetime.fromisoformat(suspended_until.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    s_dt = suspended_until.replace(tzinfo=None) if hasattr(suspended_until, "replace") else suspended_until
                if s_dt <= now_utc:
                    is_still_suspended = False
                    await conn.execute(
                        "UPDATE users SET is_suspended = FALSE, suspended_until = NULL, suspension_reason = NULL WHERE id = %s",
                        (user_id,)
                    )
                    await conn.commit()
            except Exception:
                is_still_suspended = True

        if is_still_suspended:
            until_str = f" until {suspended_until}" if suspended_until else ""
            raise HTTPException(
                status_code=403,
                detail=f"Account is temporarily suspended{until_str}. Reason: {suspension_reason or 'Administrative review'}"
            )

    # 3. Mandatory Email Verification check (Neon Auth source of truth or users table)
    is_email_verified = bool(email_verified)
    try:
        na_res = await conn.execute('SELECT "emailVerified" FROM neon_auth."user" WHERE email = %s', (email,))
        na_row = await na_res.fetchone()
        if na_row and na_row[0]:
            is_email_verified = True
            if not email_verified:
                await conn.execute("UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = %s", (user_id,))
                await conn.commit()
    except Exception:
        pass

    if not is_email_verified:
        raise HTTPException(
            status_code=403,
            detail="Your email address is not verified yet. Please check your email inbox and click the verification link before logging in."
        )

    # 4. Find valid authentication challenge
    ch_res = await conn.execute(
        """SELECT id, challenge FROM webauthn_challenges
           WHERE ceremony_type = 'AUTHENTICATION' AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1"""
    )
    challenge_row = await ch_res.fetchone()
    if not challenge_row:
        raise HTTPException(
            status_code=400,
            detail="Authentication session expired or challenge not found. Please try again."
        )

    challenge_record_id, stored_challenge_b64 = challenge_row
    expected_challenge_bytes = base64url_to_bytes(stored_challenge_b64)

    rp_id = get_rp_id(request)
    allowed_origins = get_allowed_origins(request)
    pub_key_bytes = base64url_to_bytes(pub_key_b64)

    # 5. Verify cryptographic assertion signature
    try:
        verified_auth = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge_bytes,
            expected_rp_id=rp_id,
            expected_origin=allowed_origins,
            credential_public_key=pub_key_bytes,
            credential_current_sign_count=stored_sign_count,
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Passkey biometric signature verification failed: {str(exc)}"
        )

    # 6. Update sign count & last used timestamp
    await conn.execute(
        "UPDATE webauthn_credentials SET sign_count = %s, last_used_at = NOW() WHERE id = %s",
        (verified_auth.new_sign_count, cred_id)
    )

    # 7. Consume challenge
    await conn.execute("DELETE FROM webauthn_challenges WHERE id = %s", (challenge_record_id,))

    # 8. Record audit log
    await conn.execute(
        """INSERT INTO audit_logs 
           (id, user_id, action_type, status, details, created_at)
           VALUES (%s, %s, 'PASSKEY_LOGIN_SUCCESS', 'SUCCESS', %s, NOW())""",
        (
            str(uuid.uuid4()),
            user_id,
            {"credential_id": cred_id, "nickname": nickname, "method": "WEBAUTHN_BIOMETRIC"}
        )
    )
    await conn.commit()

    return {
        "user_id": str(user_id),
        "email": email,
        "name": name,
        "role": role,
        "credential_id": cred_id,
        "nickname": nickname
    }


async def list_user_credentials(user_id: str, conn: DatabaseConnection) -> List[Dict[str, Any]]:
    """List registered WebAuthn credentials for a user."""
    c_res = await conn.execute(
        """SELECT id, nickname, aaguid, created_at, last_used_at 
           FROM webauthn_credentials 
           WHERE user_id = %s 
           ORDER BY created_at DESC""",
        (user_id,)
    )
    rows = await c_res.fetchall()
    return [
        {
            "id": r[0],
            "nickname": r[1] or "Biometric Passkey",
            "aaguid": r[2],
            "created_at": r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
            "last_used_at": r[4].isoformat() if hasattr(r[4], "isoformat") and r[4] else (str(r[4]) if r[4] else None)
        }
        for r in rows
    ]


async def delete_user_credential(user_id: str, credential_id: str, conn: DatabaseConnection) -> bool:
    """Delete a registered WebAuthn credential."""
    check_res = await conn.execute(
        "SELECT id FROM webauthn_credentials WHERE id = %s AND user_id = %s",
        (credential_id, user_id)
    )
    row = await check_res.fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail="Biometric credential not found or not owned by user."
        )

    await conn.execute(
        "DELETE FROM webauthn_credentials WHERE id = %s AND user_id = %s",
        (credential_id, user_id)
    )
    
    # Check if user has any remaining credentials
    count_res = await conn.execute(
        "SELECT COUNT(*) FROM webauthn_credentials WHERE user_id = %s",
        (user_id,)
    )
    count_row = await count_res.fetchone()
    remaining = count_row[0] if count_row else 0

    if remaining == 0:
        try:
            await conn.execute(
                "UPDATE users SET passkey_enrolled = FALSE, face_enrolled = FALSE WHERE id = %s",
                (user_id,)
            )
        except Exception:
            pass

    try:
        await conn.execute(
            """INSERT INTO audit_logs 
               (id, user_id, action_type, status, details, created_at)
               VALUES (%s, %s, 'PASSKEY_DELETED', 'SUCCESS', %s, NOW())""",
            (str(uuid.uuid4()), user_id, {"credential_id": credential_id, "remaining": remaining})
        )
    except Exception:
        pass
    await conn.commit()
    return True
