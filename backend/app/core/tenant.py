from fastapi import Request
from app.core.rbac import CurrentUser

def require_tenant(request: Request) -> str | None:
    user: CurrentUser = getattr(request.state, "user", None)
    if user:
        return user.require_hospital()
    
    hospital_id = getattr(request.state, "hospital_id", None)
    role = getattr(request.state, "role", None)
    
    if role == "SUPER_ADMIN":
        return hospital_id
    
    if not hospital_id:
        from fastapi import HTTPException
        raise HTTPException(403, "Hospital context required")
    
    return hospital_id
