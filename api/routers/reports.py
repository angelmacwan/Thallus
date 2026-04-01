import json
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..deps import get_db, get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate/{session_uuid}", response_model=schemas.ReportResponse)
def generate_report(
    session_uuid: str,
    body: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    if db_session.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Simulation must be completed before generating a report",
        )

    from core.graph_memory import LocalGraphMemory
    from core.report_agent import ReportAgent

    outputs_path = db_session.outputs_path
    graph = LocalGraphMemory(storage_path=os.path.join(outputs_path, "graph.json"))
    log_path = os.path.join(outputs_path, "actions.jsonl")

    # Load investigation objective
    objective = ""
    objective_path = os.path.join(outputs_path, "objective.txt")
    if os.path.exists(objective_path):
        with open(objective_path, encoding="utf-8") as fh:
            objective = fh.read().strip()

    # Gather chat history for this session
    chat_messages = [
        {"is_user": m.is_user, "text": m.text}
        for m in db_session.chat_messages
    ]

    # Gather completed insights for this session
    insight_records = crud.get_insights_for_session(db, db_session.id)
    insights = []
    for record in insight_records:
        if record.status == "complete" and record.file_path and os.path.exists(record.file_path):
            try:
                with open(record.file_path, encoding="utf-8") as fh:
                    data = json.load(fh)
                insights.append({
                    "query": record.query,
                    "overall_verdict": data.get("overall_verdict", ""),
                    "insights": data.get("insights", []),
                })
            except Exception:
                pass

    ra = ReportAgent(graph, log_path=log_path)

    report_uuid = uuid.uuid4().hex
    file_name = f"report_{report_uuid}.md"
    file_path = os.path.join(outputs_path, file_name)

    title, report_text = ra.generate_structured_report(
        description=body.description,
        chat_messages=chat_messages,
        output_path=file_path,
        objective=objective,
        insights=insights if insights else None,
    )

    db_report = crud.create_report(
        db=db,
        session_db_id=db_session.id,
        user_id=current_user.id,
        title=title,
        description=body.description,
        file_path=file_path,
        report_uuid=report_uuid,
    )

    return schemas.ReportResponse(
        id=db_report.id,
        report_id=db_report.report_id,
        session_id=db_report.session_id,
        title=db_report.title,
        description=db_report.description,
        file_path=db_report.file_path,
        created_at=db_report.created_at,
        session_title=db_session.title,
        session_uuid=session_uuid,
    )


@router.get("/session/{session_uuid}", response_model=list[schemas.ReportResponse])
def list_session_reports(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    reports = crud.get_reports_for_session(db, session_uuid)
    return [
        schemas.ReportResponse(
            id=r.id,
            report_id=r.report_id,
            session_id=r.session_id,
            title=r.title,
            description=r.description,
            file_path=r.file_path,
            created_at=r.created_at,
            session_title=db_session.title,
            session_uuid=session_uuid,
        )
        for r in reports
    ]


@router.get("/", response_model=list[schemas.ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reports = crud.get_reports_for_user(db, current_user.id)
    result = []
    for r in reports:
        result.append(
            schemas.ReportResponse(
                id=r.id,
                report_id=r.report_id,
                session_id=r.session_id,
                title=r.title,
                description=r.description,
                file_path=r.file_path,
                created_at=r.created_at,
                session_title=r.session.title if r.session else None,
                session_uuid=r.session.session_id if r.session else None,
            )
        )
    return result


@router.get("/{report_id}/content", response_class=PlainTextResponse)
def get_report_content(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = crud.get_report_by_uuid(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")

    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    with open(report.file_path, "r", encoding="utf-8") as fh:
        return fh.read()


@router.get("/{report_id}", response_model=schemas.ReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = crud.get_report_by_uuid(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")

    return schemas.ReportResponse(
        id=report.id,
        report_id=report.report_id,
        session_id=report.session_id,
        title=report.title,
        description=report.description,
        file_path=report.file_path,
        created_at=report.created_at,
        session_title=report.session.title if report.session else None,
        session_uuid=report.session.session_id if report.session else None,
    )


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = crud.get_report_by_uuid(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")

    # Remove file from disk if it exists
    if os.path.exists(report.file_path):
        os.remove(report.file_path)

    crud.delete_report(db, report)
