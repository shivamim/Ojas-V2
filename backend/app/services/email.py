"""
Email service using Resend for transactional emails.
Falls back to logging if RESEND_API_KEY is not configured.
"""
import httpx
from app.core.config import settings


async def send_invite_email(email: str, invite_link: str, hospital_name: str) -> dict:
    """
    Send hospital invitation email via Resend.
    Returns response dict or simulation notice.
    """
    if not settings.RESEND_API_KEY:
        print(f"[SIMULATION] Email invite to {email} for {hospital_name}")
        print(f"[SIMULATION] Invite link: {invite_link}")
        return {"status": "simulated", "email": email, "link": invite_link}
    
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
        async with httpx.AsyncClient() as client:
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
            return response.json()
    except httpx.HTTPError as e:
        print(f"[ERROR] Failed to send invite email: {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        print(f"[ERROR] Unexpected error sending invite email: {e}")
        return {"status": "failed", "error": str(e)}


async def send_password_reset_email(email: str, reset_link: str) -> dict:
    """Send password reset email via Resend."""
    if not settings.RESEND_API_KEY:
        print(f"[SIMULATION] Password reset email to {email}")
        print(f"[SIMULATION] Reset link: {reset_link}")
        return {"status": "simulated", "email": email, "link": reset_link}
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
    </body>
    </html>
    """
    
    try:
        async with httpx.AsyncClient() as client:
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
            return response.json()
    except Exception as e:
        print(f"[ERROR] Failed to send password reset email: {e}")
        return {"status": "failed", "error": str(e)}


async def send_breach_alert_email(admin_email: str, details: str) -> dict:
    """Send security breach alert email to administrators."""
    if not settings.RESEND_API_KEY:
        print(f"[SIMULATION] Breach alert to {admin_email}: {details}")
        return {"status": "simulated", "email": admin_email}
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Security Alert</h2>
        <p>A potential security breach has been detected:</p>
        <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <pre style="margin: 0; white-space: pre-wrap;">{details}</pre>
        </div>
        <p>Please investigate immediately.</p>
    </body>
    </html>
    """
    
    try:
        async with httpx.AsyncClient() as client:
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
            return response.json()
    except Exception as e:
        print(f"[ERROR] Failed to send breach alert: {e}")
        return {"status": "failed", "error": str(e)}
