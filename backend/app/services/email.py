"""
Email service using Resend for transactional emails.

Production Requirements:
- Set RESEND_API_KEY environment variable
- Configure verified sender domain in Resend dashboard
- For high volume, consider email queue with retry logic
"""
import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_invite_email(email: str, invite_link: str, hospital_name: str) -> dict:
    """
    Send hospital invitation email via Resend.
    
    Args:
        email: Recipient email address
        invite_link: URL to accept the invitation
        hospital_name: Name of the inviting hospital
        
    Returns:
        Response dict with status and message ID or error details
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            f"RESEND_API_KEY not configured. Email invite to {email} for {hospital_name} skipped."
        )
        return {
            "status": "skipped", 
            "reason": "RESEND_API_KEY not configured",
            "email": email, 
            "link": invite_link
        }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to Ojas</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Ojas</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Post-Discharge Recovery Monitoring</p>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hi,</p>
            <p>You've been invited to join <strong>{hospital_name}</strong> on the Ojas platform.</p>
            <p>Ojas helps hospitals monitor patient recovery after discharge, reducing readmissions and improving outcomes through AI-powered insights.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a>
            </div>
            <p style="font-size: 14px; color: #666;">This invitation link will expire in 48 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">If you have any questions, please contact your hospital administrator.</p>
        </div>
    </body>
    </html>
    """
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Ojas HealthTech <noreply@ojas.care>",
                    "to": [email],
                    "subject": f"You're invited to join {hospital_name} on Ojas",
                    "html": html_content
                }
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Invite email sent successfully to {email}: {result.get('id')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"Failed to send invite email (HTTP {e.response.status_code}): {e}")
        return {"status": "failed", "error": f"HTTP {e.response.status_code}: {str(e)}"}
    except httpx.HTTPError as e:
        logger.error(f"Failed to send invite email (network error): {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error sending invite email: {e}")
        return {"status": "failed", "error": str(e)}


async def send_password_reset_email(email: str, reset_link: str) -> dict:
    """
    Send password reset email via Resend.
    
    Args:
        email: User's email address
        reset_link: Password reset URL with token
        
    Returns:
        Response dict with status and message ID or error details
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            f"RESEND_API_KEY not configured. Password reset email to {email} skipped."
        )
        return {
            "status": "skipped", 
            "reason": "RESEND_API_KEY not configured",
            "email": email, 
            "link": reset_link
        }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </body>
    </html>
    """
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Ojas HealthTech <noreply@ojas.care>",
                    "to": [email],
                    "subject": "Password Reset Request",
                    "html": html_content
                }
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Password reset email sent successfully to {email}: {result.get('id')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"Failed to send password reset email (HTTP {e.response.status_code}): {e}")
        return {"status": "failed", "error": f"HTTP {e.response.status_code}: {str(e)}"}
    except httpx.HTTPError as e:
        logger.error(f"Failed to send password reset email (network error): {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error sending password reset email: {e}")
        return {"status": "failed", "error": str(e)}


async def send_breach_alert_email(admin_email: str, details: str) -> dict:
    """
    Send security breach alert email to administrators.
    
    Args:
        admin_email: Administrator's email address
        details: Description of the security incident
        
    Returns:
        Response dict with status and message ID or error details
    """
    if not settings.RESEND_API_KEY:
        logger.critical(
            f"RESEND_API_KEY not configured. Breach alert to {admin_email} skipped. DETAILS: {details}"
        )
        return {
            "status": "skipped", 
            "reason": "RESEND_API_KEY not configured",
            "email": admin_email
        }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;\">Security Alert</h2>
        <p>A potential security breach has been detected:</p>
        <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <pre style="margin: 0; white-space: pre-wrap;">{details}</pre>
        </div>
        <p>Please investigate immediately.</p>
    </body>
    </html>
    """
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Ojas Security <security@ojas.care>",
                    "to": [admin_email],
                    "subject": "Security Breach Alert - Immediate Action Required",
                    "html": html_content
                }
            )
            response.raise_for_status()
            result = response.json()
            logger.critical(f"Breach alert sent to {admin_email}: {result.get('id')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.critical(f"Failed to send breach alert (HTTP {e.response.status_code}): {e}")
        return {"status": "failed", "error": f"HTTP {e.response.status_code}: {str(e)}"}
    except httpx.HTTPError as e:
        logger.critical(f"Failed to send breach alert (network error): {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.critical(f"Unexpected error sending breach alert: {e}")
        return {"status": "failed", "error": str(e)}


async def send_email(to: str, subject: str, body: str, html: Optional[str] = None) -> dict:
    """
    Generic email sender for any transactional email.
    
    Args:
        to: Recipient email address
        subject: Email subject line
        body: Plain text or HTML body content
        html: Optional separate HTML content (if not provided, body is treated as HTML)
        
    Returns:
        Response dict with status and message ID or error details
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            f"RESEND_API_KEY not configured. Email to {to} with subject '{subject}' skipped."
        )
        return {
            "status": "skipped", 
            "reason": "RESEND_API_KEY not configured",
            "email": to, 
            "subject": subject
        }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Ojas HealthTech <noreply@ojas.care>",
                    "to": [to],
                    "subject": subject,
                    "html": html or body.replace("\n", "<br>")
                }
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Email sent successfully to {to} ({subject}): {result.get('id')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"Failed to send email (HTTP {e.response.status_code}): {e}")
        return {"status": "failed", "error": f"HTTP {e.response.status_code}: {str(e)}"}
    except httpx.HTTPError as e:
        logger.error(f"Failed to send email (network error): {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error sending email: {e}")
        return {"status": "failed", "error": str(e)}
