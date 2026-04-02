from sqlalchemy.orm import Session
from . import models, schemas
from .auth import get_password_hash

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    from core.config import FREE_CREDITS_ON_SIGNUP_USD
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        credits=FREE_CREDITS_ON_SIGNUP_USD,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def log_action(db: Session, user_id: int, action: str, details: str = None):
    log = models.ActionLog(user_id=user_id, action=action, details=details)
    db.add(log)
    db.commit()
    return log

def log_unauthorized_register(db: Session, email: str):
    attempt = models.UnauthorizedRegisterAttempt(email=email)
    db.add(attempt)
    db.commit()
    return attempt


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


# ── Scenario operations ────────────────────────────────────────────────────────

def create_scenario(db: Session, session_db_id: int, user_id: int, name: str, description: str, rounds: int = 1) -> models.Scenario:
    import uuid as _uuid
    scenario = models.Scenario(
        scenario_id=str(_uuid.uuid4()),
        session_id=session_db_id,
        user_id=user_id,
        name=name,
        description=description,
        rounds=rounds,
        status="created",
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def get_scenario_by_uuid(db: Session, scenario_uuid: str) -> models.Scenario | None:
    return db.query(models.Scenario).filter(models.Scenario.scenario_id == scenario_uuid).first()


def get_scenarios_for_session(db: Session, session_db_id: int) -> list[models.Scenario]:
    return (
        db.query(models.Scenario)
        .filter(models.Scenario.session_id == session_db_id)
        .order_by(models.Scenario.created_at.asc())
        .all()
    )


def update_scenario_status(db: Session, scenario: models.Scenario, status: str, outputs_path: str = None):
    scenario.status = status
    if outputs_path is not None:
        scenario.outputs_path = outputs_path
    db.commit()
    db.refresh(scenario)
    return scenario


# ── Insight operations ─────────────────────────────────────────────────────────

def create_insight_record(
    db: Session,
    session_db_id: int | None,
    scenario_db_id: int | None,
    user_id: int,
    query: str,
    debate_rounds: int,
    file_path: str,
    insight_id: str,
) -> models.InsightRecord:
    record = models.InsightRecord(
        insight_id=insight_id,
        session_id=session_db_id,
        scenario_id=scenario_db_id,
        user_id=user_id,
        query=query,
        debate_rounds=debate_rounds,
        status="pending",
        file_path=file_path,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_insights_for_session(db: Session, session_db_id: int) -> list[models.InsightRecord]:
    return (
        db.query(models.InsightRecord)
        .filter(models.InsightRecord.session_id == session_db_id)
        .order_by(models.InsightRecord.created_at.desc())
        .all()
    )


def get_insights_for_scenario(db: Session, scenario_db_id: int) -> list[models.InsightRecord]:
    return (
        db.query(models.InsightRecord)
        .filter(models.InsightRecord.scenario_id == scenario_db_id)
        .order_by(models.InsightRecord.created_at.desc())
        .all()
    )


def get_insight_by_uuid(db: Session, insight_uuid: str) -> models.InsightRecord | None:
    return db.query(models.InsightRecord).filter(models.InsightRecord.insight_id == insight_uuid).first()


def update_insight_status(db: Session, insight: models.InsightRecord, status: str) -> models.InsightRecord:
    insight.status = status
    db.commit()
    db.refresh(insight)
    return insight


def add_scenario_event(db: Session, scenario_db_id: int, event_type: str, message: str):
    ev = models.ScenarioEvent(scenario_id=scenario_db_id, type=event_type, message=message)
    db.add(ev)
    db.commit()
    return ev


def get_scenario_events(db: Session, scenario_db_id: int):
    return (
        db.query(models.ScenarioEvent)
        .filter(models.ScenarioEvent.scenario_id == scenario_db_id)
        .order_by(models.ScenarioEvent.id)
        .all()
    )
