"""Email verification service"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

class EmailVerificationService:
    """Handle email verification flow"""

    def __init__(self, db_connect):
        self.db_connect = db_connect

    async def generate_verification_token(self, user_id: str, email: str) -> str:
        """Generate email verification token"""
        try:
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expires_at = datetime.utcnow() + timedelta(hours=24)
            
            async with await self.db_connect() as conn:
                await conn.execute(
                    """INSERT INTO email_verification_tokens 
                       (user_id, email, token_hash, expires_at, created_at)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (user_id, email, token_hash, expires_at, datetime.utcnow())
                )
                await conn.commit()
            
            return token
        except Exception as e:
            print(f"[v0] Email verification error: {e}")
            return None

    async def verify_email(self, user_id: str, token: str) -> bool:
        """Verify email with token"""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            async with await self.db_connect() as conn:
                # Find valid token
                result = await conn.execute(
                    """SELECT email FROM email_verification_tokens
                       WHERE user_id = %s AND token_hash = %s 
                       AND expires_at > NOW() AND verified_at IS NULL""",
                    (user_id, token_hash)
                )
                token_record = await result.fetchone()
                
                if not token_record:
                    return False
                
                email = token_record[0]
                
                # Mark email as verified
                await conn.execute(
                    "UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = %s",
                    (user_id,)
                )
                
                # Mark token as used
                await conn.execute(
                    """UPDATE email_verification_tokens 
                       SET verified_at = NOW() 
                       WHERE user_id = %s AND token_hash = %s""",
                    (user_id, token_hash)
                )
                
                await conn.commit()
                return True
        except Exception as e:
            print(f"[v0] Email verification error: {e}")
            return False

    async def is_email_verified(self, user_id: str) -> bool:
        """Check if user's email is verified"""
        try:
            async with await self.db_connect() as conn:
                result = await conn.execute(
                    "SELECT email_verified FROM users WHERE id = %s",
                    (user_id,)
                )
                user = await result.fetchone()
                return user and user[0] if user else False
        except Exception as e:
            print(f"[v0] Email verification check error: {e}")
            return False
