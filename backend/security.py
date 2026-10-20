import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
import bcrypt
import jwt
from jwt import PyJWKClient, PyJWKClientError
import pyotp
from dotenv import load_dotenv
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

env_name = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").strip().lower()
_raw_secret = os.getenv("SECRET_KEY")
if env_name in ("production", "prod"):
    if not _raw_secret or _raw_secret == "adaptive-zero-trust-ai-framework-secure-signing-key-2026":
        raise RuntimeError("[Security] FATAL: Production environment requires a strong, unique SECRET_KEY environment variable. Default fallback rejected.")
SECRET_KEY = _raw_secret or "adaptive-zero-trust-ai-framework-secure-signing-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = 7
MFA_ISSUER = os.getenv("MFA_ISSUER", "Adaptive Zero Trust AI")

# Neon Auth & JWKS Configuration
NEON_AUTH_URL = os.getenv("NEON_AUTH_URL") or os.getenv("NEON_AUTH_BASE_URL") or os.getenv("NEXT_PUBLIC_NEON_AUTH_URL", "")
NEON_AUTH_JWKS_URL = os.getenv("NEON_AUTH_JWKS_URL", "")
if not NEON_AUTH_JWKS_URL and NEON_AUTH_URL:
    NEON_AUTH_JWKS_URL = f"{NEON_AUTH_URL.rstrip('/')}/.well-known/jwks.json"
NEON_AUTH_ISSUER = os.getenv("NEON_AUTH_ISSUER")
NEON_AUTH_AUDIENCE = os.getenv("NEON_AUTH_AUDIENCE")

_jwks_clients: Dict[str, PyJWKClient] = {}


def get_jwks_client(jwks_url: Optional[str] = None) -> Optional[PyJWKClient]:
    """Get or initialize cached PyJWKClient with key rotation support"""
    target_url = jwks_url or NEON_AUTH_JWKS_URL
    if not target_url:
        return None
    if target_url not in _jwks_clients:
        try:
            _jwks_clients[target_url] = PyJWKClient(target_url, cache_jwk_set=True, lifespan=3600)
        except Exception as e:
            print(f"[Security] Failed to initialize PyJWKClient for {target_url}: {e}")
            return None
    return _jwks_clients.get(target_url)


def get_jwks_status() -> Dict[str, Any]:
    """Diagnostic check for Neon Auth and JWKS configuration"""
    active_keys = 0
    key_ids = []
    supported_algorithms = ["EdDSA", "RS256", "ES256"]
    reachable = False
    
    if NEON_AUTH_JWKS_URL:
        try:
            client = get_jwks_client()
            if client:
                jwk_set = client.get_jwk_set()
                active_keys = len(jwk_set.keys)
                key_ids = [k.key_id for k in jwk_set.keys if getattr(k, "key_id", None)]
                reachable = True
        except Exception as e:
            reachable = False

    return {
        "status": "healthy" if (NEON_AUTH_JWKS_URL and reachable) else ("configured" if NEON_AUTH_JWKS_URL else "unconfigured"),
        "configured": bool(NEON_AUTH_JWKS_URL),
        "jwks_url": NEON_AUTH_JWKS_URL or "Not configured",
        "neon_auth_url": NEON_AUTH_URL or "Not configured",
        "issuer": NEON_AUTH_ISSUER or "Not enforced",
        "audience": NEON_AUTH_AUDIENCE or "Not enforced",
        "algorithm": "RS256",
        "algorithms_supported": supported_algorithms,
        "reachable": reachable,
        "active_keys_count": active_keys,
        "key_ids": key_ids
    }


def verify_neon_jwks_token(token: str) -> Dict[str, Any]:
    """
    Verify an asymmetric token (EdDSA / RS256 / ES256) against hosted Neon Auth JWKS keys.
    Validates key ID (kid), public key signature, expiration (exp), issuer, and audience.
    """
    jwks_client = get_jwks_client()
    if not jwks_client:
        raise HTTPException(status_code=503, detail="Neon Auth JWKS endpoint is not configured")

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        decode_options = {
            "verify_signature": True,
            "verify_exp": True,
            "require": ["exp"]
        }
        decode_kwargs: Dict[str, Any] = {
            "algorithms": ["EdDSA", "RS256", "ES256"],
            "options": decode_options,
        }
        if NEON_AUTH_ISSUER:
            decode_kwargs["issuer"] = NEON_AUTH_ISSUER
        if NEON_AUTH_AUDIENCE:
            decode_kwargs["audience"] = NEON_AUTH_AUDIENCE

        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
        if "sub" not in payload and "id" in payload:
            payload["sub"] = payload["id"]
        if "type" not in payload:
            payload["type"] = "access"
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Neon Auth token has expired")
    except PyJWKClientError as e:
        raise HTTPException(status_code=401, detail=f"JWKS key resolution failed: {str(e)}")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Neon Auth token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Securely hash a plain password using bcrypt with automatic salt generation"""
    if isinstance(password, str):
        password_bytes = password.encode("utf-8")
    else:
        password_bytes = bytes(password)
    # Truncate to 72 bytes if strictly needed by bcrypt spec
    password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash"""
    try:
        if not plain_password or not hashed_password:
            return False
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        print(f"[Security] Password verification error: {e}")
        return False


def validate_secure_pin_strength(pin: str) -> tuple[bool, str]:
    """
    Validate that the Secret PIN is secure and meets zero-trust requirements.
    - Exactly 6 numeric digits (or between 4-8 digits)
    - Rejects common weak sequences: 123456, 654321, 000000, 111111, 123123, etc.
    """
    if not pin or not isinstance(pin, str):
        return False, "Secret PIN cannot be empty."
    
    pin_clean = pin.strip()
    if not pin_clean.isdigit():
        return False, "Secret PIN must contain only numeric digits."
    
    if len(pin_clean) < 4 or len(pin_clean) > 8:
        return False, "Secret PIN must be between 4 and 8 digits (recommended: 6 digits)."
    
    # Check for all identical digits (e.g. 000000, 111111)
    if len(set(pin_clean)) == 1:
        return False, "Insecure PIN: PIN cannot consist of identical repeated digits."
    
    # Common blacklisted insecure PIN patterns
    weak_patterns = {
        "123456", "654321", "000000", "111111", "222222", "333333", "444444", 
        "555555", "666666", "777777", "888888", "999999", "123123", "121212", 
        "012345", "987654", "112233", "1234", "0000", "1111", "4321", "9999"
    }
    if pin_clean in weak_patterns:
        return False, "Insecure PIN: This sequence is too common and easily guessed. Please choose a stronger PIN."
    
    return True, "Valid Secure PIN."


def hash_secret_pin(pin: str) -> str:
    """Securely hash a Secret PIN using salted bcrypt"""
    if isinstance(pin, str):
        pin_bytes = pin.strip().encode("utf-8")
    else:
        pin_bytes = bytes(pin)
    pin_bytes = pin_bytes[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pin_bytes, salt).decode("utf-8")


def verify_secret_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a plain Secret PIN against its bcrypt hash"""
    try:
        if not plain_pin or not hashed_pin:
            return False
        pin_bytes = plain_pin.strip().encode("utf-8")[:72]
        hash_bytes = hashed_pin.encode("utf-8")
        return bcrypt.checkpw(pin_bytes, hash_bytes)
    except Exception as e:
        print(f"[Security] Secret PIN verification error: {e}")
        return False


def create_access_token(
    user_id: str,
    email: str = "",
    role: str = "operator",
    session_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Issue a signed JWT access token"""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "sid": session_id,
        "type": "access",
        "exp": expire,
        "iat": now,
        "jti": secrets.token_hex(16)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    user_id: str,
    session_id: Optional[str] = None
) -> str:
    """Issue a signed JWT refresh token"""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "sid": session_id,
        "type": "refresh",
        "exp": expire,
        "iat": now,
        "jti": secrets.token_hex(16)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_challenge_token(
    user_id: str,
    email: str,
    challenge_id: Optional[str] = None,
    challenge_type: str = "PIN_OR_TOTP",
    risk_score: float = 50.0,
    session_id: Optional[str] = None
) -> str:
    """Issue a short-lived token for multi-factor or step-up challenge verification (valid 5 min)"""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=5)
    payload = {
        "sub": str(user_id),
        "email": email,
        "cid": challenge_id,
        "challenge_type": challenge_type,
        "risk_score": risk_score,
        "sid": session_id,
        "type": "challenge",
        "exp": expire,
        "iat": now
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: Optional[str] = "access") -> Dict[str, Any]:
    """
    Decode and validate a signed JWT token.
    Automatically detects asymmetric RS256 (Neon Auth JWKS) vs symmetric HS256 tokens.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token_str = token.strip()
    
    # Inspect unverified header to determine signing algorithm and kid
    try:
        unverified_header = jwt.get_unverified_header(token_str)
        alg = unverified_header.get("alg", "HS256")
        has_kid = bool(unverified_header.get("kid"))
    except Exception:
        alg = "HS256"
        has_kid = False

    # Route to JWKS verification if RS256, EdDSA, ES256 or kid is present
    if alg in ["RS256", "EdDSA", "ES256"] or has_kid:
        payload = verify_neon_jwks_token(token_str)
        payload["_auth_source"] = "neon_auth_jwks"
        return payload

    # Symmetric HS256 token verification
    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        if expected_type and payload.get("type") != expected_type:
            raise HTTPException(status_code=401, detail=f"Expected token of type '{expected_type}'")
        payload["_auth_source"] = "adaptive_zero_trust"
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def verify_token(token: str, expected_type: str = "access") -> Optional[str]:
    """Verify token and return user_id if valid"""
    try:
        payload = decode_token(token, expected_type=expected_type)
        return payload.get("sub") or payload.get("id")
    except Exception:
        return None


def generate_totp_secret() -> str:
    """Generate base32 TOTP secret"""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """Get otpauth URI for QR code generation"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=MFA_ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code against the secret key (window=1 allows ±30 sec clock drift)"""
    if not secret or not code:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code.strip(), valid_window=1)
    except Exception as e:
        print(f"[Security] TOTP verification error: {e}")
        return False


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency to authenticate requests with a Bearer JWT.
    Enforces active session status, locked session rejection, authoritative DB role resolution,
    and blocks deleted, suspended, or blocked accounts (Fail-Closed).
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials required")
    
    token = credentials.credentials
    payload = decode_token(token, expected_type="access")
    user_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload: missing user identifier")

    session_id = payload.get("sid") or payload.get("session_id")
    role = payload.get("role", "operator")
    user_email = payload.get("email", "")

    # Validate user_id format
    import uuid as _uuid_mod
    try:
        valid_user_uuid = str(_uuid_mod.UUID(str(user_id)))
    except (ValueError, AttributeError):
        if str(user_id) == "admin" and payload.get("role") == "admin":
            return {
                "id": "admin",
                "email": user_email or os.getenv("ADMIN_EMAIL", "admin@gateway.internal"),
                "role": "admin",
                "session_id": str(session_id) if session_id else None,
                "auth_source": "admin_jwt"
            }
        raise HTTPException(status_code=401, detail="Invalid user identifier format.")

    # Authoritative account state validation & role enforcement from Database
    from database import db_manager
    async with db_manager.get_connection() as conn:
        # 1. Authoritative check: User MUST exist in database (Fail-Closed against deleted users)
        u_res = await conn.execute(
            """SELECT role, is_active, email, is_suspended, suspended_until, 
                      suspension_reason, is_blocked, block_reason 
               FROM users WHERE id = %s""",
            (valid_user_uuid,)
        )
        u_row = await u_res.fetchone()
        if not u_row:
            raise HTTPException(
                status_code=401,
                detail="User account no longer exists or has been deleted."
            )

        (db_role, is_user_active, db_email, is_suspended, suspended_until,
         suspension_reason, is_blocked, block_reason) = u_row

        if not is_user_active:
            raise HTTPException(
                status_code=403,
                detail="Account is disabled. Contact system administrator."
            )

        if is_blocked:
            raise HTTPException(
                status_code=403,
                detail=f"Account has been blocked by administrator. Reason: {block_reason or 'Security policy enforcement'}"
            )

        if is_suspended:
            now_utc = datetime.now(timezone.utc)
            is_still_suspended = True
            if suspended_until:
                try:
                    if isinstance(suspended_until, str):
                        s_dt = datetime.fromisoformat(suspended_until.replace("Z", "+00:00"))
                    else:
                        s_dt = suspended_until
                    if s_dt.tzinfo is None:
                        s_dt = s_dt.replace(tzinfo=timezone.utc)
                    if s_dt <= now_utc:
                        is_still_suspended = False
                        await conn.execute(
                            "UPDATE users SET is_suspended = FALSE, suspended_until = NULL, suspension_reason = NULL WHERE id = %s",
                            (valid_user_uuid,)
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

        if db_role:
            role = db_role
        if db_email:
            user_email = db_email

        # 2. Verify session status if session_id is bound
        if session_id:
            try:
                s_id_int = int(session_id)
                s_res = await conn.execute(
                    "SELECT is_active, session_status, locked_at, expires_at FROM user_sessions WHERE id = %s",
                    (s_id_int,)
                )
            except ValueError:
                s_res = await conn.execute(
                    "SELECT is_active, session_status, locked_at, expires_at FROM user_sessions WHERE session_token = %s",
                    (str(session_id),)
                )
            s_row = await s_res.fetchone()
            if s_row:
                is_active_session, session_status, locked_at, expires_at = s_row
                if session_status == "LOCKED":
                    raise HTTPException(
                        status_code=423,
                        detail="Session is locked due to inactivity. Re-authentication with Secure PIN required."
                    )
                if not is_active_session or session_status in ("REVOKED", "EXPIRED"):
                    raise HTTPException(
                        status_code=401,
                        detail="Session has been revoked or expired. Please re-authenticate."
                    )
                if expires_at:
                    try:
                        if isinstance(expires_at, str):
                            exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                        else:
                            exp_dt = expires_at
                        if exp_dt.tzinfo is None:
                            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                        if exp_dt <= datetime.now(timezone.utc):
                            raise HTTPException(
                                status_code=401,
                                detail="Session has expired. Please re-authenticate."
                            )
                    except HTTPException:
                        raise
                    except Exception:
                        pass
    
    return {
        "id": valid_user_uuid,
        "email": user_email,
        "role": role,
        "session_id": str(session_id) if session_id else None,
        "auth_source": payload.get("_auth_source", "unknown")
    }


def ensure_owner(requested_user_id: str, current_user: Union[Dict[str, Any], str]) -> None:
    """
    Enforce strict resource authorization.
    Verifies that the requested resource belongs to the current user, or the user possesses admin privileges.
    """
    if isinstance(current_user, dict):
        current_user_id = current_user.get("id", "")
        role = current_user.get("role", "")
        if str(requested_user_id) != str(current_user_id) and role != "admin":
            raise HTTPException(status_code=403, detail="Access denied: You are not authorized to view or modify this resource.")
    else:
        current_user_id = str(current_user)
        if str(requested_user_id) != current_user_id and current_user_id != "admin":
            raise HTTPException(status_code=403, detail="Access denied: You are not authorized to view or modify this resource.")


async def get_current_admin_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency to authenticate and verify administrative privileges:
    1. Authoritative JWT bearer check: queries database to confirm user has role == 'admin' and active
    2. Administrative access key header: constant-time comparison against ADMIN_ACCESS_KEY
    3. Signed Next.js admin session cookie
    """
    admin_access_key = (os.getenv("ADMIN_ACCESS_KEY") or "").strip()
    session_secret = os.getenv("ADMIN_SESSION_SECRET") or os.getenv("SECRET_KEY") or admin_access_key

    # 1. Bearer token with authoritative database role verification
    if credentials and credentials.credentials:
        try:
            payload = decode_token(credentials.credentials, expected_type="access")
            user_id = payload.get("sub") or payload.get("id")
            user_email = payload.get("email", "")

            is_admin = False
            # Check if this is the authenticated system admin token issued by admin_login
            if str(user_id) == "admin" and payload.get("role") == "admin":
                is_admin = True
            elif user_id:
                try:
                    import uuid as _uuid_mod
                    valid_uid = str(_uuid_mod.UUID(str(user_id)))
                    from database import db_manager
                    async with db_manager.get_connection() as conn:
                        res = await conn.execute(
                            """SELECT role, email, is_active, is_blocked, is_suspended 
                               FROM users WHERE id = %s""",
                            (valid_uid,)
                        )
                        row = await res.fetchone()
                        if row:
                            u_role, db_email, u_active, u_blocked, u_suspended = row
                            if u_role == "admin" and u_active and not u_blocked and not u_suspended:
                                is_admin = True
                                user_email = db_email or user_email
                except Exception:
                    pass

            if is_admin:
                return {
                    "id": str(user_id),
                    "email": user_email or os.getenv("ADMIN_EMAIL", "admin@gateway.internal"),
                    "role": "admin",
                    "auth_source": "admin_jwt"
                }
        except HTTPException:
            raise
        except Exception:
            pass

    # 2. X-Admin-Access-Key / X-Admin-Key header (Constant-time comparison)
    header_key = (request.headers.get("x-admin-access-key") or request.headers.get("x-admin-key") or "").strip()
    if header_key and admin_access_key and secrets.compare_digest(header_key, admin_access_key):
        return {
            "id": "admin",
            "email": os.getenv("ADMIN_EMAIL", "admin@gateway.internal"),
            "role": "admin",
            "auth_source": "admin_access_key"
        }

    # 3. Signed Next.js admin_session cookie
    cookie_val = request.cookies.get("admin_session")
    if cookie_val and "." in cookie_val:
        parts = cookie_val.split(".", 1)
        if len(parts) == 2:
            issued_at_str, provided_sig = parts
            try:
                ts = int(issued_at_str)
                now_ts = datetime.now(timezone.utc).timestamp()
                if abs(now_ts - ts) < 8 * 3600:
                    computed_sig = hmac.new(
                        session_secret.encode("utf-8"),
                        issued_at_str.encode("utf-8"),
                        hashlib.sha256
                    ).hexdigest()
                    if secrets.compare_digest(provided_sig, computed_sig):
                        return {
                            "id": "admin",
                            "email": os.getenv("ADMIN_EMAIL", "admin@gateway.internal"),
                            "role": "admin",
                            "auth_source": "admin_session_cookie"
                        }
            except Exception:
                pass

    raise HTTPException(
        status_code=401,
        detail="Admin authentication required. Provide valid admin credentials."
    )

