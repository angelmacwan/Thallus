"""
Insights router — Multi-Dashboard Support

Session endpoints:
  GET  /{session_uuid}/                            — list all insight records
  POST /{session_uuid}/generate                    — start a new insight (returns insight_id)
  GET  /{session_uuid}/{insight_id}/status         — polling endpoint for a specific insight
  GET  /{session_uuid}/{insight_id}                — full InsightsFullResponse for a specific insight

Scenario variants at /scenario/{scenario_uuid}/...
"""

import os
import json
import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..database import SessionLocal, get_db
from ..deps import get_current_user

router = APIRouter(
    prefix="/api/insights",
    tags=["insights"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _insight_file_path(outputs_path: str, insight_id: str) -> str:
    return os.path.join(outputs_path, f"insight_{insight_id}.json")


def _read_raw(file_path: str) -> dict:
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Insight not generated yet")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read insight: {e}")


def _status_from_file(file_path: str) -> schemas.InsightsStatusResponse:
    if not os.path.exists(file_path):
        return schemas.InsightsStatusResponse(available=False, status="pending")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        file_status = data.get("status", "running")
        if file_status == "complete":
            return schemas.InsightsStatusResponse(
                available=True,
                status="complete",
                generated_at=data.get("generated_at"),
            )
        if file_status == "error":
            return schemas.InsightsStatusResponse(
                available=False,
                status="error",
                error=data.get("error"),
            )
        return schemas.InsightsStatusResponse(
            available=False,
            status="running",
            stage=data.get("stage"),
        )
    except Exception:
        return schemas.InsightsStatusResponse(available=False, status="pending")


def _run_insights_bg(outputs_path: str, query: str, debate_rounds: int, insight_id: str) -> None:
    """Background task: run InsightsEngine and update DB status when done."""
    from core.insights_engine import InsightsEngine

    file_path = _insight_file_path(outputs_path, insight_id)

    # Mark running in DB
    db = SessionLocal()
    try:
        record = crud.get_insight_by_uuid(db, insight_id)
        if record:
            crud.update_insight_status(db, record, "running")
    finally:
        db.close()

    engine = InsightsEngine(outputs_path, result_file=file_path)
    engine.run(query, debate_rounds)

    # Update DB status from final file
    db = SessionLocal()
    try:
        record = crud.get_insight_by_uuid(db, insight_id)
        if record:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                final_status = data.get("status", "error")
            except Exception:
                final_status = "error"
            crud.update_insight_status(db, record, final_status)
    finally:
        db.close()


def _build_full_response(data: dict) -> schemas.InsightsFullResponse:
    if data.get("status") == "error":
        return schemas.InsightsFullResponse(available=False, error=data.get("error"))
    if data.get("status") != "complete":
        return schemas.InsightsFullResponse(available=False)

    score_raw = data.get("score") or {}
    score = schemas.InsightsScore(
        agree=float(score_raw.get("agree", 0)),
        disagree=float(score_raw.get("disagree", 0)),
        other=float(score_raw.get("other", 0)),
    ) if score_raw else None

    insights = [
        schemas.InsightObservation(
            id=item.get("id", f"i_{i}"),
            text=item.get("text", ""),
            answer_text=item.get("answer_text", ""),
        )
        for i, item in enumerate(data.get("insights", []))
    ]

    answer_groups = [
        schemas.AnswerGroup(
            group_id=grp.get("group_id", f"g_{i}"),
            label=grp.get("label", ""),
            summary=grp.get("summary", ""),
            agent_ids=grp.get("agent_ids", []),
            agent_count=grp.get("agent_count", 0),
            percentage=float(grp.get("percentage", 0)),
        )
        for i, grp in enumerate(data.get("answer_groups", []))
    ]

    agents = []
    for rec in data.get("agents", []):
        history = [
            schemas.AgentRoundPosition(
                round=ph.get("round", 0),
                position=ph.get("position", ""),
                reasoning=ph.get("reasoning", ""),
            )
            for ph in rec.get("position_history", [])
        ]
        agents.append(schemas.AgentDebateRecord(
            agent_id=rec.get("agent_id", ""),
            agent_name=rec.get("agent_name", ""),
            influence_score=float(rec.get("influence_score", 0)),
            position_history=history,
            final_position=rec.get("final_position", ""),
            final_reasoning=rec.get("final_reasoning", ""),
        ))

    return schemas.InsightsFullResponse(
        available=True,
        generated_at=data.get("generated_at"),
        query=data.get("query"),
        debate_rounds=data.get("debate_rounds"),
        insights=insights,
        overall_verdict=data.get("overall_verdict"),
        score=score,
        answer_groups=answer_groups,
        agents=agents,
        aggregate=data.get("aggregate"),
    )


def _record_to_summary(record: models.InsightRecord) -> schemas.InsightSummary:
    return schemas.InsightSummary(
        insight_id=record.insight_id,
        query=record.query,
        debate_rounds=record.debate_rounds,
        status=record.status,
        created_at=record.created_at.isoformat() if record.created_at else None,
    )


# ── Session endpoints ──────────────────────────────────────────────────────────

@router.get("/{session_uuid}/", response_model=List[schemas.InsightSummary])
def list_insights(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    records = crud.get_insights_for_session(db, db_session.id)
    return [_record_to_summary(r) for r in records]


@router.post("/{session_uuid}/generate", status_code=202)
def generate_insights(
    session_uuid: str,
    request: schemas.InsightsGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Session must be completed before generating insights",
        )
    debate_rounds = max(1, min(10, request.debate_rounds))
    insight_id = str(_uuid.uuid4())
    file_path = _insight_file_path(db_session.outputs_path, insight_id)

    crud.create_insight_record(
        db=db,
        session_db_id=db_session.id,
        scenario_db_id=None,
        user_id=current_user.id,
        query=request.query,
        debate_rounds=debate_rounds,
        file_path=file_path,
        insight_id=insight_id,
    )

    background_tasks.add_task(
        _run_insights_bg, db_session.outputs_path, request.query, debate_rounds, insight_id
    )
    return {"message": "Insights generation started", "insight_id": insight_id}


@router.get("/{session_uuid}/{insight_id}/status", response_model=schemas.InsightsStatusResponse)
def get_insight_status(
    session_uuid: str,
    insight_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    record = crud.get_insight_by_uuid(db, insight_id)
    if not record or record.session_id != db_session.id:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _status_from_file(record.file_path)


@router.get("/{session_uuid}/{insight_id}", response_model=schemas.InsightsFullResponse)
def get_insight(
    session_uuid: str,
    insight_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    record = crud.get_insight_by_uuid(db, insight_id)
    if not record or record.session_id != db_session.id:
        raise HTTPException(status_code=404, detail="Insight not found")
    data = _read_raw(record.file_path)
    return _build_full_response(data)


# ── Scenario endpoints ─────────────────────────────────────────────────────────

@router.get("/scenario/{scenario_uuid}/", response_model=List[schemas.InsightSummary])
def list_scenario_insights(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    records = crud.get_insights_for_scenario(db, scenario.id)
    return [_record_to_summary(r) for r in records]


@router.post("/scenario/{scenario_uuid}/generate", status_code=202)
def generate_scenario_insights(
    scenario_uuid: str,
    request: schemas.InsightsGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    debate_rounds = max(1, min(10, request.debate_rounds))
    insight_id = str(_uuid.uuid4())
    file_path = _insight_file_path(scenario.outputs_path, insight_id)

    crud.create_insight_record(
        db=db,
        session_db_id=None,
        scenario_db_id=scenario.id,
        user_id=current_user.id,
        query=request.query,
        debate_rounds=debate_rounds,
        file_path=file_path,
        insight_id=insight_id,
    )

    background_tasks.add_task(
        _run_insights_bg, scenario.outputs_path, request.query, debate_rounds, insight_id
    )
    return {"message": "Insights generation started", "insight_id": insight_id}


@router.get("/scenario/{scenario_uuid}/{insight_id}/status", response_model=schemas.InsightsStatusResponse)
def get_scenario_insight_status(
    scenario_uuid: str,
    insight_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    record = crud.get_insight_by_uuid(db, insight_id)
    if not record or record.scenario_id != scenario.id:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _status_from_file(record.file_path)


@router.get("/scenario/{scenario_uuid}/{insight_id}", response_model=schemas.InsightsFullResponse)
def get_scenario_insight(
    scenario_uuid: str,
    insight_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    record = crud.get_insight_by_uuid(db, insight_id)
    if not record or record.scenario_id != scenario.id:
        raise HTTPException(status_code=404, detail="Insight not found")
    data = _read_raw(record.file_path)
    return _build_full_response(data)
