from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..services.auth_service import get_current_user
from ..database.mongodb import get_db

security = HTTPBearer()

async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    """Get current user optionally (doesn't raise exception if not authenticated)"""
    try:
        return await get_current_user(credentials.credentials, db)
    except HTTPException:
        return None

async def verify_websocket_token(token: str, db=Depends(get_db)):
    """Verify WebSocket token"""
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None