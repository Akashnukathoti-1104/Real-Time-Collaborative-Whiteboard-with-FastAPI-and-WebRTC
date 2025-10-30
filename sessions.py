from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from ..models.whiteboard import Whiteboard, WhiteboardCreate, WhiteboardUpdate, DrawingElement
from ..models.user import User
from ..services.whiteboard_service import (
    create_whiteboard,
    get_whiteboard,
    get_user_whiteboards,
    update_whiteboard,
    add_drawing_element,
    add_collaborator
)
from ..services.auth_service import get_current_user
from ..database.mongodb import get_db

router = APIRouter()

@router.post("/", response_model=Whiteboard, status_code=status.HTTP_201_CREATED)
async def create_whiteboard_session(
    whiteboard: WhiteboardCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Create a new whiteboard session"""
    try:
        return await create_whiteboard(db, whiteboard, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create whiteboard: {str(e)}"
        )

@router.get("/", response_model=List[Whiteboard])
async def get_user_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get all whiteboard sessions for the current user"""
    try:
        whiteboards = await get_user_whiteboards(db, current_user.id)
        return whiteboards[skip:skip + limit]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch whiteboards: {str(e)}"
        )

@router.get("/{session_id}", response_model=Whiteboard)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get a specific whiteboard session"""
    whiteboard = await get_whiteboard(db, session_id)
    if not whiteboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Whiteboard not found"
        )
    
    # Check if user has access to this whiteboard
    if whiteboard.owner_id != current_user.id and current_user.id not in whiteboard.collaborators:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this whiteboard"
        )
    
    return whiteboard

@router.put("/{session_id}", response_model=Whiteboard)
async def update_session(
    session_id: str,
    whiteboard_update: WhiteboardUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Update a whiteboard session"""
    whiteboard = await get_whiteboard(db, session_id)
    if not whiteboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Whiteboard not found"
        )
    
    # Check if user is the owner
    if whiteboard.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update the whiteboard"
        )
    
    updated_whiteboard = await update_whiteboard(db, session_id, whiteboard_update)
    if not updated_whiteboard:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update whiteboard"
        )
    
    return updated_whiteboard

@router.post("/{session_id}/elements", status_code=status.HTTP_201_CREATED)
async def add_element(
    session_id: str,
    element: DrawingElement,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Add a drawing element to a whiteboard"""
    whiteboard = await get_whiteboard(db, session_id)
    if not whiteboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Whiteboard not found"
        )
    
    # Check if user has access to this whiteboard
    if whiteboard.owner_id != current_user.id and current_user.id not in whiteboard.collaborators:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this whiteboard"
        )
    
    success = await add_drawing_element(db, session_id, element)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add element to whiteboard"
        )
    
    return {"status": "success", "message": "Element added successfully"}

@router.post("/{session_id}/collaborators")
async def add_collaborator_to_session(
    session_id: str,
    collaborator_username: str = Query(..., min_length=3),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Add a collaborator to a whiteboard session"""
    whiteboard = await get_whiteboard(db, session_id)
    if not whiteboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Whiteboard not found"
        )
    
    # Check if user is the owner
    if whiteboard.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can add collaborators"
        )
    
    # For simplicity, we're using username as user_id
    # In a real implementation, you'd want to look up the user ID
    success = await add_collaborator(db, session_id, collaborator_username)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add collaborator"
        )
    
    return {"status": "success", "message": "Collaborator added successfully"}