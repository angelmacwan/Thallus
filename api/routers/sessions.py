from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models
from ..deps import get_db, get_current_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("/", response_model=List[schemas.SessionResponse])
def get_user_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_sessions_for_user(db, current_user.id)

@router.get("/{session_id}", response_model=schemas.SessionResponse)
def get_session_details(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    crud.log_action(db, current_user.id, "view_session", session_id)
    return session

@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    crud.log_action(db, current_user.id, "delete_session", session_id)
    crud.delete_session_all(db, session)
    return Response(status_code=204)
