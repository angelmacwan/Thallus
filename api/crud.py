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

def create_session(db: Session, user_id: int, inputs_path: str, outputs_path: str, rounds: int = 1, title: str = None):
    db_session = models.Session(user_id=user_id, inputs_path=inputs_path, outputs_path=outputs_path, rounds=rounds, title=title)
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


def create_report(db: Session, session_db_id: int, user_id: int, title: str, description: str, file_path: str, report_uuid: str):
    report = models.Report(
        report_id=report_uuid,
        session_id=session_db_id,
        user_id=user_id,
        title=title,
        description=description,
        file_path=file_path,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_reports_for_user(db: Session, user_id: int):
    return (
        db.query(models.Report)
        .filter(models.Report.user_id == user_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )


def get_report_by_uuid(db: Session, report_id: str):
    return db.query(models.Report).filter(models.Report.report_id == report_id).first()


def get_reports_for_session(db: Session, session_uuid: str):
    db_session = db.query(models.Session).filter(models.Session.session_id == session_uuid).first()
    if not db_session:
        return []
    return (
        db.query(models.Report)
        .filter(models.Report.session_id == db_session.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )


def delete_report(db: Session, report: models.Report):
    db.delete(report)
    db.commit()
