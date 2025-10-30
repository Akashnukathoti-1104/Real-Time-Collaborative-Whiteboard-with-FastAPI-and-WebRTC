import asyncio
import json
import logging
from typing import Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from ..models.whiteboard import DrawingElement

logger = logging.getLogger(__name__)

class WebRTCManager:
    def __init__(self):
        # Store active connections and peer connections
        self.active_connections: Dict[str, WebSocket] = {}
        self.whiteboard_sessions: Dict[str, Set[str]] = set()  # whiteboard_id -> set of user_ids
        self.user_sessions: Dict[str, str] = {}  # user_id -> whiteboard_id
        self.user_info: Dict[str, Dict] = {}  # user_id -> user info

    async def connect(self, websocket: WebSocket, user_id: str, user_info: Dict = None):
        """Connect a user to the WebSocket"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_info[user_id] = user_info or {"username": user_id}
        logger.info(f"User {user_id} connected")

    def disconnect(self, user_id: str):
        """Disconnect a user from the WebSocket"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Remove from any whiteboard session
        if user_id in self.user_sessions:
            whiteboard_id = self.user_sessions[user_id]
            if whiteboard_id in self.whiteboard_sessions:
                self.whiteboard_sessions[whiteboard_id].discard(user_id)
                if not self.whiteboard_sessions[whiteboard_id]:
                    del self.whiteboard_sessions[whiteboard_id]
            del self.user_sessions[user_id]
        
        if user_id in self.user_info:
            del self.user_info[user_id]
        
        logger.info(f"User {user_id} disconnected")

    async def join_whiteboard(self, user_id: str, whiteboard_id: str):
        """Join a whiteboard session"""
        # Leave current session if in one
        if user_id in self.user_sessions:
            current_whiteboard = self.user_sessions[user_id]
            if current_whiteboard in self.whiteboard_sessions:
                self.whiteboard_sessions[current_whiteboard].discard(user_id)
                if not self.whiteboard_sessions[current_whiteboard]:
                    del self.whiteboard_sessions[current_whiteboard]
        
        # Join new session
        if whiteboard_id not in self.whiteboard_sessions:
            self.whiteboard_sessions[whiteboard_id] = set()
        
        self.whiteboard_sessions[whiteboard_id].add(user_id)
        self.user_sessions[user_id] = whiteboard_id
        
        # Notify other users in the session
        await self.broadcast_to_whiteboard(
            whiteboard_id, 
            {
                "type": "user_joined", 
                "user_id": user_id,
                "user_info": self.user_info.get(user_id, {})
            },
            exclude_user=user_id
        )
        
        # Send current users list to the new user
        current_users = list(self.whiteboard_sessions[whiteboard_id])
        await self.send_to_user(user_id, {
            "type": "current_users",
            "users": [
                {
                    "user_id": uid,
                    "user_info": self.user_info.get(uid, {})
                }
                for uid in current_users if uid != user_id
            ]
        })
        
        logger.info(f"User {user_id} joined whiteboard {whiteboard_id}")

    async def leave_whiteboard(self, user_id: str):
        """Leave a whiteboard session"""
        if user_id in self.user_sessions:
            whiteboard_id = self.user_sessions[user_id]
            
            # Notify other users
            await self.broadcast_to_whiteboard(
                whiteboard_id,
                {
                    "type": "user_left", 
                    "user_id": user_id,
                    "user_info": self.user_info.get(user_id, {})
                },
                exclude_user=user_id
            )
            
            # Remove from session
            if whiteboard_id in self.whiteboard_sessions:
                self.whiteboard_sessions[whiteboard_id].discard(user_id)
                if not self.whiteboard_sessions[whiteboard_id]:
                    del self.whiteboard_sessions[whiteboard_id]
            
            del self.user_sessions[user_id]
            logger.info(f"User {user_id} left whiteboard {whiteboard_id}")

    async def broadcast_to_whiteboard(self, whiteboard_id: str, message: dict, exclude_user: Optional[str] = None):
        """Broadcast a message to all users in a whiteboard session"""
        if whiteboard_id in self.whiteboard_sessions:
            disconnected_users = []
            for user_id in self.whiteboard_sessions[whiteboard_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_text(json.dumps(message))
                    except Exception as e:
                        logger.error(f"Error sending message to user {user_id}: {e}")
                        disconnected_users.append(user_id)
            
            # Clean up disconnected users
            for user_id in disconnected_users:
                self.disconnect(user_id)

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)

    async def handle_webrtc_signaling(self, user_id: str, data: dict):
        """Handle WebRTC signaling messages"""
        message_type = data.get("type")
        target_user_id = data.get("target_user_id")
        
        if not target_user_id or target_user_id not in self.active_connections:
            return
        
        # Forward the message to the target user
        message = data.copy()
        message["source_user_id"] = user_id
        
        await self.send_to_user(target_user_id, message)

    async def broadcast_drawing_data(self, user_id: str, drawing_data: dict):
        """Broadcast drawing data to all users in the same whiteboard session"""
        if user_id not in self.user_sessions:
            return
        
        whiteboard_id = self.user_sessions[user_id]
        
        # Broadcast to all users in the session except the sender
        await self.broadcast_to_whiteboard(
            whiteboard_id,
            {
                "type": "drawing_data",
                "user_id": user_id,
                "data": drawing_data,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )

    def get_session_users(self, whiteboard_id: str) -> List[str]:
        """Get list of users in a whiteboard session"""
        if whiteboard_id in self.whiteboard_sessions:
            return list(self.whiteboard_sessions[whiteboard_id])
        return []

    def get_user_session(self, user_id: str) -> Optional[str]:
        """Get the whiteboard session a user is in"""
        return self.user_sessions.get(user_id)

# Create a singleton instance
webrtc_manager = WebRTCManager()