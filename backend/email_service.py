"""Backend-only transactional email delivery using SMTP.

Credentials are read exclusively from the backend environment. OTPs and reset
secrets are never logged or returned by this module.
"""

import asyncio
import os
import smtplib
from email.message import EmailMessage


class EmailDeliveryError(RuntimeError):
    pass


def email_service_configured() -> bool:
    return all(os.getenv(name) for name in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"))


def _send_message(message: EmailMessage) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.environ["SMTP_USERNAME"]
    password = os.environ["SMTP_PASSWORD"]
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

    client = smtplib.SMTP_SSL(host, port, timeout=15) if use_ssl else smtplib.SMTP(host, port, timeout=15)
    try:
        if not use_ssl:
            client.starttls()
        client.login(username, password)
        client.send_message(message)
    finally:
        client.quit()


async def send_email(*, recipient: str, subject: str, text: str, html: str | None = None) -> None:
    if not email_service_configured():
        raise EmailDeliveryError("Email service is not configured")

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM_NAME", "Adaptive Zero Trust AI") + f" <{os.environ['SMTP_FROM_EMAIL']}>"
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send_message, message)
    except Exception as exc:
        raise EmailDeliveryError("Email provider rejected the message") from exc


def reset_email_content(*, recipient: str, token: str) -> tuple[str, str, str]:
    frontend_url = (os.getenv("FRONTEND_URL") or os.getenv("APP_URL") or "").rstrip("/")
    if not frontend_url:
        raise EmailDeliveryError("FRONTEND_URL is not configured")
    link = f"{frontend_url}/auth/reset-password?email={recipient}&token={token}"
    subject = "Your Adaptive Zero Trust password reset"
    text = (
        "Hello,\n\n"
        "Use the secure link below to reset your password. This link expires in one hour.\n\n"
        f"{link}\n\n"
        "If you did not request this, ignore this email. Never share this link with anyone."
    )
    html = f"<p>Hello,</p><p>Use the secure link below to reset your password. This link expires in one hour.</p><p><a href=\"{link}\">Reset your password</a></p><p>If you did not request this, ignore this email. Never share this link with anyone.</p>"
    return subject, text, html


async def send_password_reset_email(*, recipient: str, token: str) -> None:
    subject, text, html = reset_email_content(recipient=recipient, token=token)
    await send_email(recipient=recipient, subject=subject, text=text, html=html)


def email_status() -> str:
    return "configured" if email_service_configured() else "unconfigured"


async def send_verification_email(*, recipient: str, otp: str) -> None:
    """Reserved for a future custom flow; never returns or logs the OTP."""
    await send_email(
        recipient=recipient,
        subject="Your Adaptive Zero Trust verification code",
        text=f"Hello,\n\nYour verification code is: {otp}\n\nThis code expires in a few minutes. If you did not request this code, ignore this email. Never share this verification code with anyone.",
    )


__all__ = ["EmailDeliveryError", "email_service_configured", "email_status", "send_password_reset_email", "send_verification_email"]


