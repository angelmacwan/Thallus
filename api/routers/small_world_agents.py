"""
small_world_agents.py – CRUD, AI generation, bulk import, and relationship
management for Small World agents.
"""

from __future__ import annotations

import io
import json
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/api/small-world", tags=["small-world-agents"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _agent_to_response(agent: models.SmallWorldAgent, db: Session) -> schemas.AgentResponse:
    rel_count = db.query(models.AgentRelationship).filter(
        (models.AgentRelationship.source_agent_id == agent.id) |
        (models.AgentRelationship.target_agent_id == agent.id)
    ).count()

    def _load(field: str | None) -> dict | None:
        if field is None:
            return None
        try:
            return json.loads(field)
        except Exception:
            return None

    return schemas.AgentResponse(
        id=agent.id,
        agent_id=agent.agent_id,
        name=agent.name,
        age=agent.age,
        gender=agent.gender,
        location=agent.location,
        profession=agent.profession,
        job_title=agent.job_title,
        organization=agent.organization,
        personality_traits=_load(agent.personality_traits),
        behavioral_attributes=_load(agent.behavioral_attributes),
        contextual_state=_load(agent.contextual_state),
        external_factors=_load(agent.external_factors),
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        relationship_count=rel_count,
    )


def _apply_agent_data(agent: models.SmallWorldAgent, data: schemas.AgentCreate | schemas.AgentUpdate) -> None:
    """Apply create/update payload onto an ORM object."""
    simple_fields = ["name", "age", "gender", "location", "profession", "job_title", "organization"]
    for f in simple_fields:
        v = getattr(data, f, None)
        if v is not None:
            setattr(agent, f, v)

    json_fields = ["personality_traits", "behavioral_attributes", "contextual_state", "external_factors"]
    for f in json_fields:
        v = getattr(data, f, None)
        if v is not None:
            setattr(agent, f, json.dumps(v.model_dump(exclude_none=False)))


# ── List agents ───────────────────────────────────────────────────────────────

@router.get("/agents/", response_model=list[schemas.AgentResponse])
def list_agents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agents = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.user_id == current_user.id
    ).order_by(models.SmallWorldAgent.created_at.desc()).all()
    return [_agent_to_response(a, db) for a in agents]


# ── Create agent ──────────────────────────────────────────────────────────────

@router.post("/agents/", response_model=schemas.AgentResponse, status_code=201)
def create_agent(
    body: schemas.AgentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = models.SmallWorldAgent(user_id=current_user.id, name=body.name)
    _apply_agent_data(agent, body)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _agent_to_response(agent, db)


# ── Download Template ─────────────────────────────────────────────────────────

@router.get("/agents/template")
def download_template():
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Agents"

    columns = [
        "name", "age", "gender", "location", "profession", "job_title", "organization",
        "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism",
        "risk_tolerance", "decision_style", "core_beliefs",
        "communication_style", "influence_level", "adaptability", "loyalty", "stress_response",
        "salary", "work_environment", "market_exposure",
    ]

    header_fill = PatternFill(start_color="1e3a5f", end_color="1e3a5f", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_idx, col_name in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        ws.column_dimensions[cell.column_letter].width = max(len(col_name) + 4, 14)

    ws.row_dimensions[1].height = 32

    # Example row
    example = [
        "Jane Smith", 34, "Female", "New York, USA", "Product Management", "Senior PM", "Acme Corp",
        0.7, 0.8, 0.6, 0.7, 0.4,
        0.5, "analytical", "Innovation drives progress",
        "direct", 0.7, 0.8, 0.6, "Seeks clarity", 
        "$120,000", "Hybrid remote", "SaaS B2B",
    ]
    for col_idx, val in enumerate(example, start=1):
        ws.cell(row=2, column=col_idx, value=val)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=small_world_agents_template.xlsx"},
    )


# ── Get single agent ──────────────────────────────────────────────────────────

@router.get("/agents/{agent_id}", response_model=schemas.AgentResponse)
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.agent_id == agent_id,
        models.SmallWorldAgent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _agent_to_response(agent, db)


# ── Update agent ──────────────────────────────────────────────────────────────

@router.put("/agents/{agent_id}", response_model=schemas.AgentResponse)
def update_agent(
    agent_id: str,
    body: schemas.AgentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.agent_id == agent_id,
        models.SmallWorldAgent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    _apply_agent_data(agent, body)
    db.commit()
    db.refresh(agent)
    return _agent_to_response(agent, db)


# ── Delete agent ──────────────────────────────────────────────────────────────

@router.delete("/agents/{agent_id}", status_code=204)
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.agent_id == agent_id,
        models.SmallWorldAgent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()


# ── AI Agent Generation ───────────────────────────────────────────────────────

@router.post("/agents/generate", response_model=schemas.AgentCreate)
def generate_agent(
    body: schemas.AgentGenerateRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Take sparse fields + natural language description and use Gemini to produce
    a complete AgentCreate payload. The frontend shows this for user review
    before calling POST /agents/ to save.
    """
    from core.agent_generator import generate_agent_profile

    sparse = {
        "name": body.name,
        "profession": body.profession,
        "organization": body.organization,
        "location": body.location,
        "age": body.age,
        "description": body.description,
    }
    try:
        profile = generate_agent_profile(sparse)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Validate and return
    try:
        return schemas.AgentCreate(**profile)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"AI returned invalid profile: {exc}")


# ── Bulk Import (Excel / CSV) ─────────────────────────────────────────────────

@router.post("/agents/bulk-import", response_model=list[schemas.AgentResponse], status_code=201)
async def bulk_import_agents(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import pandas as pd

    content = await file.read()
    buf = io.BytesIO(content)

    filename = (file.filename or "").lower()
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(buf)
        else:
            df = pd.read_excel(buf)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}")

    required_column = "name"
    if required_column not in df.columns:
        raise HTTPException(status_code=422, detail="File must contain a 'name' column")

    created = []
    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        if not name:
            continue

        def _safe(col: str) -> str | None:
            v = row.get(col)
            if v is None or (isinstance(v, float) and str(v) == "nan"):
                return None
            return str(v).strip() or None

        def _safe_int(col: str) -> int | None:
            v = row.get(col)
            try:
                return int(v)
            except Exception:
                return None

        def _safe_float(col: str) -> float | None:
            v = row.get(col)
            try:
                return float(v)
            except Exception:
                return None

        personality_traits = schemas.PersonalityTraits(
            openness=_safe_float("openness"),
            conscientiousness=_safe_float("conscientiousness"),
            extraversion=_safe_float("extraversion"),
            agreeableness=_safe_float("agreeableness"),
            neuroticism=_safe_float("neuroticism"),
            risk_tolerance=_safe_float("risk_tolerance"),
            decision_style=_safe("decision_style"),
            core_beliefs=_safe("core_beliefs"),
        )
        behavioral_attributes = schemas.BehavioralAttributes(
            communication_style=_safe("communication_style"),
            influence_level=_safe_float("influence_level"),
            adaptability=_safe_float("adaptability"),
            loyalty=_safe_float("loyalty"),
            stress_response=_safe("stress_response"),
        )
        contextual_state = schemas.ContextualState()
        external_factors = schemas.ExternalFactors(
            salary=_safe("salary"),
            work_environment=_safe("work_environment"),
            market_exposure=_safe("market_exposure"),
        )

        agent = models.SmallWorldAgent(
            user_id=current_user.id,
            name=name,
            age=_safe_int("age"),
            gender=_safe("gender"),
            location=_safe("location"),
            profession=_safe("profession"),
            job_title=_safe("job_title"),
            organization=_safe("organization"),
            personality_traits=json.dumps(personality_traits.model_dump()),
            behavioral_attributes=json.dumps(behavioral_attributes.model_dump()),
            contextual_state=json.dumps(contextual_state.model_dump()),
            external_factors=json.dumps(external_factors.model_dump()),
        )
        db.add(agent)
        db.flush()
        created.append(agent)

    db.commit()
    for a in created:
        db.refresh(a)
    return [_agent_to_response(a, db) for a in created]


# ── Relationships ─────────────────────────────────────────────────────────────

def _get_agent_or_404(agent_id: str, user_id: int, db: Session) -> models.SmallWorldAgent:
    agent = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.agent_id == agent_id,
        models.SmallWorldAgent.user_id == user_id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/agents/{agent_id}/relationships", response_model=list[schemas.AgentRelationshipResponse])
def list_relationships(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = _get_agent_or_404(agent_id, current_user.id, db)
    rels = db.query(models.AgentRelationship).filter(
        (models.AgentRelationship.source_agent_id == agent.id) |
        (models.AgentRelationship.target_agent_id == agent.id)
    ).all()

    result = []
    for r in rels:
        src = db.query(models.SmallWorldAgent).get(r.source_agent_id)
        tgt = db.query(models.SmallWorldAgent).get(r.target_agent_id)
        result.append(schemas.AgentRelationshipResponse(
            id=r.id,
            rel_id=r.rel_id,
            source_agent_id=src.agent_id if src else "",
            target_agent_id=tgt.agent_id if tgt else "",
            source_agent_name=src.name if src else None,
            target_agent_name=tgt.name if tgt else None,
            type=r.type,
            strength=r.strength,
            sentiment=r.sentiment,
            influence_direction=r.influence_direction,
        ))
    return result


@router.post("/agents/{agent_id}/relationships", response_model=schemas.AgentRelationshipResponse, status_code=201)
def create_relationship(
    agent_id: str,
    body: schemas.AgentRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    source = _get_agent_or_404(agent_id, current_user.id, db)
    target = _get_agent_or_404(body.target_agent_id, current_user.id, db)

    if source.id == target.id:
        raise HTTPException(status_code=400, detail="Cannot create self-relationship")

    # Check duplicate
    existing = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.source_agent_id == source.id,
        models.AgentRelationship.target_agent_id == target.id,
        models.AgentRelationship.type == body.type,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Relationship already exists")

    rel = models.AgentRelationship(
        source_agent_id=source.id,
        target_agent_id=target.id,
        type=body.type,
        strength=body.strength or 0.5,
        sentiment=body.sentiment or "neutral",
        influence_direction=body.influence_direction or "both",
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    return schemas.AgentRelationshipResponse(
        id=rel.id,
        rel_id=rel.rel_id,
        source_agent_id=source.agent_id,
        target_agent_id=target.agent_id,
        source_agent_name=source.name,
        target_agent_name=target.name,
        type=rel.type,
        strength=rel.strength,
        sentiment=rel.sentiment,
        influence_direction=rel.influence_direction,
    )


@router.delete("/agents/{agent_id}/relationships/{rel_id}", status_code=204)
def delete_relationship(
    agent_id: str,
    rel_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    agent = _get_agent_or_404(agent_id, current_user.id, db)
    rel = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.rel_id == rel_id,
        (
            (models.AgentRelationship.source_agent_id == agent.id) |
            (models.AgentRelationship.target_agent_id == agent.id)
        ),
    ).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    db.delete(rel)
    db.commit()


# ── All relationships for user (used by graph view) ───────────────────────────

@router.get("/agents-relationships/all", response_model=list[schemas.AgentRelationshipResponse])
def list_all_relationships(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all relationships between this user's agents (for graph view)."""
    user_agent_ids = [
        a.id for a in db.query(models.SmallWorldAgent).filter(
            models.SmallWorldAgent.user_id == current_user.id
        ).all()
    ]
    if not user_agent_ids:
        return []

    rels = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.source_agent_id.in_(user_agent_ids)
    ).all()

    result = []
    for r in rels:
        src = db.query(models.SmallWorldAgent).get(r.source_agent_id)
        tgt = db.query(models.SmallWorldAgent).get(r.target_agent_id)
        result.append(schemas.AgentRelationshipResponse(
            id=r.id,
            rel_id=r.rel_id,
            source_agent_id=src.agent_id if src else "",
            target_agent_id=tgt.agent_id if tgt else "",
            source_agent_name=src.name if src else None,
            target_agent_name=tgt.name if tgt else None,
            type=r.type,
            strength=r.strength,
            sentiment=r.sentiment,
            influence_direction=r.influence_direction,
        ))
    return result


# ── Auto-suggest relationships ────────────────────────────────────────────────

@router.post("/agents/auto-suggest-relationships", response_model=list[schemas.AgentRelationshipResponse])
def auto_suggest_relationships(
    body: schemas.AutoSuggestRelationshipsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from core.agent_generator import suggest_relationships

    agents_db = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.agent_id.in_(body.agent_ids),
        models.SmallWorldAgent.user_id == current_user.id,
    ).all()

    if len(agents_db) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 agents to suggest relationships")

    agent_summaries = [
        {
            "agent_id": a.agent_id,
            "name": a.name,
            "job_title": a.job_title,
            "profession": a.profession,
            "organization": a.organization,
        }
        for a in agents_db
    ]

    try:
        suggestions = suggest_relationships(agent_summaries)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {exc}")

    # Build a lookup from agent_id (UUID str) -> db id
    id_map = {a.agent_id: a for a in agents_db}

    created_rels = []
    for s in suggestions:
        src_uuid = s.get("source_agent_id")
        tgt_uuid = s.get("target_agent_id")
        if not src_uuid or not tgt_uuid or src_uuid == tgt_uuid:
            continue
        src = id_map.get(src_uuid)
        tgt = id_map.get(tgt_uuid)
        if not src or not tgt:
            continue

        # Skip if already exists
        existing = db.query(models.AgentRelationship).filter(
            models.AgentRelationship.source_agent_id == src.id,
            models.AgentRelationship.target_agent_id == tgt.id,
            models.AgentRelationship.type == s.get("type", "peer"),
        ).first()
        if existing:
            continue

        rel = models.AgentRelationship(
            source_agent_id=src.id,
            target_agent_id=tgt.id,
            type=s.get("type", "peer"),
            strength=float(s.get("strength", 0.5)),
            sentiment=s.get("sentiment", "neutral"),
            influence_direction=s.get("influence_direction", "both"),
        )
        db.add(rel)
        db.flush()
        created_rels.append((rel, src, tgt))

    db.commit()

    result = []
    for rel, src, tgt in created_rels:
        db.refresh(rel)
        result.append(schemas.AgentRelationshipResponse(
            id=rel.id,
            rel_id=rel.rel_id,
            source_agent_id=src.agent_id,
            target_agent_id=tgt.agent_id,
            source_agent_name=src.name,
            target_agent_name=tgt.name,
            type=rel.type,
            strength=rel.strength,
            sentiment=rel.sentiment,
            influence_direction=rel.influence_direction,
        ))
    return result
