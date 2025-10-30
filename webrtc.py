from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from ..services.webrtc_service import webrtc_manager
from ..services.auth_service import get_current_user
from ..database.mongodb import get_db
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str,
    whiteboard_id: str = Query(...),
    db=Depends(get_db)
):
    """WebSocket endpoint for WebRTC signaling and real-time updates"""
    try:
        # Connect to WebSocket
        await webrtc_manager.connect(websocket, token)
        
        # Join whiteboard session
        await webrtc_manager.join_whiteboard(token, whiteboard_id)
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get("type")
                
                if message_type == "drawing_data":
                    # Broadcast drawing data to other users in the session
                    await webrtc_manager.broadcast_drawing_data(token, message.get("data", {}))
                elif message_type in ["offer", "answer", "ice_candidate"]:
                    # Handle WebRTC signaling
                    await webrtc_manager.handle_webrtc_signaling(token, message)
                elif message_type == "join_session":
                    # Join a whiteboard session
                    await webrtc_manager.join_whiteboard(token, message.get("whiteboard_id"))
                elif message_type == "leave_session":
                    # Leave current whiteboard session
                    await webrtc_manager.leave_whiteboard(token)
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    
        except WebSocketDisconnect:
            # Handle disconnection
            webrtc_manager.disconnect(token)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        webrtc_manager.disconnect(token)

@router.get("/sessions/{session_id}/users")
async def get_active_users(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get list of active users in a whiteboard session"""
    active_users = webrtc_manager.get_session_users(session_id)
    return {"session_id": session_id, "active_users": active_users}