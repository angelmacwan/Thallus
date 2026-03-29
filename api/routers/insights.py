"""
Insights router — Agent Debate Pipeline

POST /{session_uuid}/generate          — kick off InsightsEngine.run() as a background task
GET  /{session_uuid}/status            — polling endpoint (returns stage during generation)
GET  /{session_uuid}                   — full InsightsFullResponse

Scenario variants at /scenario/{scenario_uuid}/...
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(
    prefix="/api/insights",
    tags=["insights"],
)

_RESULT_FILENAME = "insights.json"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _result_path(outputs_path: str) -> str:
    return os.path.join(outputs_path, _RESULT_FILENAME)


def _read_raw(outputs_path: str) -> dict:
    path = _result_path(outputs_path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Insights not generated yet")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read insights: {e}")


def _status_from_file(outputs_path: str) -> schemas.InsightsStatusResponse:
    path = _result_path(outputs_path)
    if not os.path.exists(path):
        return schemas.InsightsStatusResponse(available=False, status="pending")
    try:
        with open(path, "r", encoding="utf-8") as f:
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
        # still running
        return schemas.InsightsStatusResponse(
            available=False,
            status="running",
            stage=data.get("stage"),
        )
    except Exception:
        return schemas.InsightsStatusResponse(available=False, status="pending")


def _run_insights_bg(outputs_path: str, query: str, debate_rounds: int) -> None:
    from core.insights_engine import InsightsEngine
    engine = InsightsEngine(outputs_path)
    engine.run(query, debate_rounds)


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


# ── Session endpoints ──────────────────────────────────────────────────────────

@router.get("/{session_uuid}/status", response_model=schemas.InsightsStatusResponse)
def get_insights_status(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return _status_from_file(db_session.outputs_path)


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
    background_tasks.add_task(
        _run_insights_bg, db_session.outputs_path, request.query, debate_rounds
    )
    return {"message": "Insights generation started"}


@router.get("/{session_uuid}", response_model=schemas.InsightsFullResponse)
def get_insights(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _read_raw(db_session.outputs_path)
    return _build_full_response(data)


# ── Scenario endpoints ─────────────────────────────────────────────────────────

@router.get("/scenario/{scenario_uuid}/status", response_model=schemas.InsightsStatusResponse)
def get_scenario_insights_status(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _status_from_file(scenario.outputs_path)


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
    background_tasks.add_task(
        _run_insights_bg, scenario.outputs_path, request.query, debate_rounds
    )
    return {"message": "Insights generation started"}


@router.get("/scenario/{scenario_uuid}", response_model=schemas.InsightsFullResponse)
def get_scenario_insights(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _read_raw(scenario.outputs_path)
    return _build_full_response(data)
