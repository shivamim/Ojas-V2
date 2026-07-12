from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)


async def log_audit(
    db: AsyncSession, 
    user_id: str, 
    hospital_id: str | None, 
    action: str, 
    resource: str, 
    resource_id: str = None, 
    ip: str = "", 
    user_agent: str = "", 
    success: bool = True, 
    details: dict = None
):
    """
    Log an audit trail entry for compliance and security monitoring.
    
    Audit logs are critical for DPDPA 2023 compliance and security investigations.
    Failures are logged but don't block the main operation (non-fatal).
    """
    try:
        uid = uuid.UUID(user_id) if user_id else None
    except (ValueError, TypeError):
        uid = None

    hid = None
    if hospital_id:
        try:
            hid = uuid.UUID(hospital_id)
        except (ValueError, TypeError):
            pass

    try:
        log = AuditLog(
            user_id=uid,
            hospital_id=hid,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip,
            user_agent=user_agent,
            success=success,
            details=details or {},
            timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        # Audit logging failures should not block operations, but must be logged
        logger.error(f"Audit log error (non-fatal): {e}")
        await db.rollback()
