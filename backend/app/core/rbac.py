from enum import Enum
from fastapi import HTTPException, Request, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import decode_token
from app.core.database import get_db
from app.models.user import User
import uuid

class Permission(Enum):
    PATIENT_CREATE = "patient:create"
    PATIENT_READ = "patient:read"
    PATIENT_UPDATE = "patient:update"
    PATIENT_DELETE = "patient:delete"
    REPORT_GENERATE = "report:generate"
    USER_MANAGE = "user:manage"
    HOSPITAL_MANAGE = "hospital:manage"

PERMISSION_MAP = {
    "SUPER_ADMIN": list(Permission),
    "HOSPITAL_ADMIN": [
        Permission.PATIENT_CREATE, Permission.PATIENT_READ,
        Permission.PATIENT_UPDATE, Permission.REPORT_GENERATE,
        Permission.USER_MANAGE
    ],
    "COORDINATOR": [
        Permission.PATIENT_CREATE, Permission.PATIENT_READ, Permission.PATIENT_UPDATE
    ],
    "DOCTOR": [Permission.PATIENT_READ, Permission.REPORT_GENERATE]
}


class CurrentUser:
    def __init__(self, user_id: str, email: str, role: str, hospital_id: str | None):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.hospital_id = hospital_id
    
    def has_permission(self, permission: Permission) -> bool:
        perms = PERMISSION_MAP.get(self.role, [])
        return permission in perms
    
    def is_superadmin(self) -> bool:
        return self.role == "SUPER_ADMIN"
    
    def require_hospital(self) -> str | None:
        if self.is_superadmin():
            return self.hospital_id
        if not self.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hospital context required for this operation"
            )
        return self.hospital_id


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> CurrentUser:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = auth.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("user_id")
    role = payload.get("role")
    
    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload"
        )
    
    # Verify user exists and is active in database
    try:
        uid = uuid.UUID(user_id)
        result = await db.execute(select(User).where(User.id == uid))
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not db_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive or suspended"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format"
        )
    
    user = CurrentUser(
        user_id=user_id,
        email=payload.get("email", ""),
        role=role,
        hospital_id=payload.get("hospital_id")
    )
    
    request.state.user_id = user_id
    request.state.role = role
    request.state.hospital_id = user.hospital_id
    request.state.user = user
    
    return user


def require_permission(permission: Permission):
    async def checker(current_user: CurrentUser = Depends(get_current_user)):
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user
    return checker


def require_superadmin(current_user: CurrentUser = Depends(get_current_user)):
    if not current_user.is_superadmin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user
