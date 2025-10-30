from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DrawingElement(BaseModel):
    type: str = Field(..., regex="^(pen|line|rectangle|circle|eraser|clear)$")
    coordinates: List[Dict[str, float]]
    style: Dict[str, Any] = Field(default_factory=dict)

class WhiteboardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class WhiteboardCreate(WhiteboardBase):
    pass

class WhiteboardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    elements: Optional[List[DrawingElement]] = None

class Whiteboard(WhiteboardBase):
    id: str
    owner_id: str
    elements: List[DrawingElement] = Field(default_factory=list)
    collaborators: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WhiteboardSession(BaseModel):
    whiteboard_id: str
    user_id: str
    joined_at: datetim