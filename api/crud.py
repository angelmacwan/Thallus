from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def log_action(db: Session, user_id: int, action: str, details: str = None):
    log = models.ActionLog(user_id=user_id, action=action, details=details)
    db.add(log)
    db.commit()
    return log

def get_sessions_for_user(db: Session, user_id: int):
    return db.query(models.Session).filter(models.Session.user_id == user_id).order_by(models.Session.created_at.desc()).all()

def create_session(db: Session, user_id: int, inputs_path: str, outputs_path: str):
    db_session = models.Session(user_id=user_id, inputs_path=inputs_path, outputs_path=outputs_path)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session(db: Session, session_id: str):
    return db.query(models.Session).filter(models.Session.session_id == session_id).first()


def add_simulation_event(db: Session, session_id: int, event_type: str, message: str):
    ev = models.SimulationEvent(session_id=session_id, type=event_type, message=message)
    db.add(ev)
    db.commit()
    return ev


def get_simulation_events(db: Session, session_id: int):
    return db.query(models.SimulationEvent).filter(
        models.SimulationEvent.session_id == session_id
    ).order_by(models.SimulationEvent.id).all()
