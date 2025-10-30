from typing import List, Optional
from datetime import datetime
from ..models.whiteboard import Whiteboard, WhiteboardCreate, WhiteboardUpdate, DrawingElement
from ..database.mongodb import get_db
from bson import ObjectId

async def create_whiteboard(db, whiteboard: WhiteboardCreate, owner_id: str) -> Whiteboard:
    """Create a new whiteboard"""
    whiteboard_dict = whiteboard.dict()
    whiteboard_dict["owner_id"] = owner_id
    whiteboard_dict["elements"] = []
    whiteboard_dict["collaborators"] = []
    whiteboard_dict["created_at"] = datetime.utcnow()
    whiteboard_dict["updated_at"] = datetime.utcnow()
    
    result = db.whiteboards.insert_one(whiteboard_dict)
    whiteboard_dict["id"] = str(result.inserted_id)
    
    return Whiteboard(**whiteboard_dict)

async def get_whiteboard(db, whiteboard_id: str) -> Optional[Whiteboard]:
    """Get a whiteboard by ID"""
    if not ObjectId.is_valid(whiteboard_id):
        return None
        
    whiteboard_data = db.whiteboards.find_one({"_id": ObjectId(whiteboard_id)})
    if whiteboard_data:
        whiteboard_data["id"] = str(whiteboard_data.pop("_id"))
        return Whiteboard(**whiteboard_data)
    return None

async def get_user_whiteboards(db, user_id: str) -> List[Whiteboard]:
    """Get all whiteboards owned by or accessible to a user"""
    whiteboards = []
    
    # Get whiteboards owned by user
    for wb in db.whiteboards.find({"owner_id": user_id}):
        wb["id"] = str(wb.pop("_id"))
        whiteboards.append(Whiteboard(**wb))
    
    # Get whiteboards where user is a collaborator
    for wb in db.whiteboards.find({"collaborators": user_id}):
        wb["id"] = str(wb.pop("_id"))
        whiteboards.append(Whiteboard(**wb))
    
    # Sort by updated_at descending
    whiteboards.sort(key=lambda x: x.updated_at, reverse=True)
    
    return whiteboards

async def update_whiteboard(db, whiteboard_id: str, whiteboard_update: WhiteboardUpdate) -> Optional[Whiteboard]:
    """Update a whiteboard"""
    if not ObjectId.is_valid(whiteboard_id):
        return None
    
    update_data = {k: v for k, v in whiteboard_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.whiteboards.update_one(
        {"_id": ObjectId(whiteboard_id)},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        return await get_whiteboard(db, whiteboard_id)
    return None

async def add_drawing_element(db, whiteboard_id: str, element: DrawingElement) -> bool:
    """Add a drawing element to a whiteboard"""
    if not ObjectId.is_valid(whiteboard_id):
        return False
    
    result = db.whiteboards.update_one(
        {"_id": ObjectId(whiteboard_id)},
        {
            "$push": {"elements": element.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return result.modified_count > 0

async def add_collaborator(db, whiteboard_id: str, user_id: str) -> bool:
    """Add a collaborator to a whiteboard"""
    if not ObjectId.is_valid(whiteboard_id):
        return False
    
    result = db.whiteboards.update_one(
        {"_id": ObjectId(whiteboard_id)},
        {
            "$addToSet": {"collaborators": user_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return result.modified_count > 0

async def delete_whiteboard(db, whiteboard_id: str, owner_id: str) -> bool:
    """Delete a whiteboard (only by owner)"""
    if not ObjectId.is_valid(whiteboard_id):
        return False
    
    result = db.whiteboards.delete_one({
        "_id": ObjectId(whiteboard_id),
        "owner_id": owner_id
    })
    
    return result.deleted_count > 0