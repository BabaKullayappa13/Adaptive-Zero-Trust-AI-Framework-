"""Password reset service"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple

class PasswordResetService:
    """Handle password reset flow"""

    def __init__(self, db_connect):
        self.db_connect = db_connect

    async def generate_reset_token(self, email: str) -> Optional[Tuple[str, str]]:
        """Generate password reset token for email"""
        try:
            async with await self.db_connect() as conn:
                # Find user by email
                result = await conn.execute(
                    "SELECT id FROM users WHERE email = %s",
                    (email,)
                )
                user = await result.fetchone()
                
                if not user:
                    # Return fake token to prevent email enumeration
                    return secrets.token_urlsafe(32), None
                
                user_id = user[0]
                
                # Generate reset token
                token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(token.encode()).hexdigest()
                expires_at = datetime.utcnow() + timedelta(hours=1)
                
                # Store reset token
                await conn.execute(
                    """INSERT INTO password_reset_tokens 
                       (user_id, token_hash, expires_at, created_at)
                       VALUES (%s, %s, %s, %s)""",
                    (user_id, token_hash, expires_at, datetime.utcnow())
                )
                await conn.commit()
                
                return token, user_id
        except Exception as e:
            print(f"[v0] Password reset error: {e}")
            return None, None

    async def verify_reset_token(self, email: str, token: str) -> Optional[str]:
        """Verify password reset token and return user_id if valid"""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            async with await self.db_connect() as conn:
                # Find user by email
                result = await conn.execute(
                    "SELECT id FROM users WHERE email = %s",
                    (email,)
                )
                user = await result.fetchone()
                
                if not user:
                    return None
                
                user_id = user[0]
                
                # Find valid reset token
                result = await conn.execute(
                    """SELECT user_id FROM password_reset_tokens
                       WHERE user_id = %s AND token_hash = %s 
                       AND expires_at > NOW() AND used_at IS NULL""",
                    (user_id, token_hash)
                )
                token_record = await result.fetchone()
                
                if token_record:
                    return str(user_id)
                
                return None
        except Exception as e:
            print(f"[v0] Token verification error: {e}")
            return None

    async def reset_password(self, email: str, token: str, new_password: str) -> bool:
        """Reset user password"""
        try:
            from auth import hash_password
            
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            password_hash = hash_password(new_password)
            
            async with await self.db_connect() as conn:
                # Find user by email
                result = await conn.execute(
                    "SELECT id FROM users WHERE email = %s",
                    (email,)
                )
                user = await result.fetchone()
                
                if not user:
                    return False
                
                user_id = user[0]
                
                # Find valid reset token
                result = await conn.execute(
                    """SELECT id FROM password_reset_tokens
                       WHERE user_id = %s AND token_hash = %s 
                       AND expires_at > NOW() AND used_at IS NULL""",
                    (user_id, token_hash)
                )
                token_record = await result.fetchone()
                
                if not token_record:
                    return False
                
                # Update password
                await conn.execute(
                    "UPDATE users SET password_hash = %s WHERE id = %s",
                    (password_hash, user_id)
                )
                
                # Mark token as used
                await conn.execute(
                    "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = %s",
                    (token_record[0],)
                )
                
                await conn.commit()
                return True
        except Exception as e:
            print(f"[v0] Password reset error: {e}")
            return False
