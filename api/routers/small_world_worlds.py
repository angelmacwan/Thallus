"""
small_world_worlds.py – World CRUD, scenario management, SSE streaming,
health check, and scenario diff endpoints for Small World.
"""

from __future__ import annotations

import json
import os
import queue as _queue
import re
import shutil
import sqlite3
import threading
import uuid as _uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db, require_credits

router = APIRouter(prefix="/api/small-world", tags=["small-world-worlds"])

# Per-scenario SSE queues
_scenario_queues: dict[str, _queue.Queue] = {}


# ── Auth helper for EventSource (JWT via query param) ─────────────────────────

def _get_current_user_query(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    from jose import JWTError, jwt
    from .. import auth as _auth

    err = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, _auth.SECRET_KEY, algorithms=[_auth.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise err
    except JWTError:
        raise err
    from .. import crud
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise err
    return user


# ── Helpers ───────────────────────────────────────────────────────────────────

def _world_response(world: models.SmallWorld, db: Session) -> schemas.WorldResponse:
    agent_count = db.query(models.SmallWorldAgent).filter(models.SmallWorldAgent.world_id == world.id).count()
    scenario_count = db.query(models.WorldScenario).filter(models.WorldScenario.world_id == world.id).count()
    return schemas.WorldResponse(
        id=world.id,
        world_id=world.world_id,
        name=world.name,
        description=world.description,
        created_at=world.created_at,
        agent_count=agent_count,
        scenario_count=scenario_count,
    )


def _scenario_response(scenario: models.WorldScenario, db: Session, include_children: bool = True) -> schemas.WorldScenarioResponse:
    parent_uuid = None
    if scenario.parent_scenario_id:
        parent = db.query(models.WorldScenario).get(scenario.parent_scenario_id)
        if parent:
            parent_uuid = parent.scenario_id

    world = db.query(models.SmallWorld).get(scenario.world_id)

    children = []
    if include_children:
        child_records = db.query(models.WorldScenario).filter(
            models.WorldScenario.parent_scenario_id == scenario.id
        ).all()
        children = [_scenario_response(c, db, include_children=True) for c in child_records]

    return schemas.WorldScenarioResponse(
        id=scenario.id,
        scenario_id=scenario.scenario_id,
        world_id=world.world_id if world else "",
        name=scenario.name,
        seed_text=scenario.seed_text,
        parent_scenario_id=parent_uuid,
        depth=scenario.depth,
        status=scenario.status,
        outputs_path=scenario.outputs_path,
        report_path=scenario.report_path,
        created_at=scenario.created_at,
        children=children,
    )


def _get_world_or_404(world_id: str, user_id: int, db: Session) -> models.SmallWorld:
    world = db.query(models.SmallWorld).filter(
        models.SmallWorld.world_id == world_id,
        models.SmallWorld.user_id == user_id,
    ).first()
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    return world


def _get_scenario_or_404(scenario_id: str, world_db_id: int, db: Session) -> models.WorldScenario:
    scenario = db.query(models.WorldScenario).filter(
        models.WorldScenario.scenario_id == scenario_id,
        models.WorldScenario.world_id == world_db_id,
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


def _get_user_data_base(user_email: str) -> str:
    safe_email = user_email.replace("@", "_at_").replace(".", "_")
    safe_email = re.sub(r'[^a-zA-Z0-9_]', '_', safe_email)
    return os.path.join("users_data", safe_email)


# ── World CRUD ────────────────────────────────────────────────────────────────

@router.post("/worlds/", response_model=schemas.WorldResponse, status_code=201)
def create_world(
    body: schemas.WorldCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = models.SmallWorld(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
    )
    db.add(world)
    db.commit()
    db.refresh(world)
    return _world_response(world, db)


@router.get("/worlds/", response_model=list[schemas.WorldResponse])
def list_worlds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    worlds = db.query(models.SmallWorld).filter(
        models.SmallWorld.user_id == current_user.id
    ).order_by(models.SmallWorld.created_at.desc()).all()
    return [_world_response(w, db) for w in worlds]


@router.get("/worlds/{world_id}", response_model=schemas.WorldResponse)
def get_world(
    world_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    return _world_response(world, db)


@router.get("/worlds/{world_id}/agents", response_model=list[schemas.AgentResponse])
def get_world_agents(
    world_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    agents = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.world_id == world.id
    ).order_by(models.SmallWorldAgent.created_at.desc()).all()

    from .small_world_agents import _agent_to_response
    return [_agent_to_response(agent, db, world_uuid=world.world_id) for agent in agents]


@router.put("/worlds/{world_id}", response_model=schemas.WorldResponse)
def update_world(
    world_id: str,
    body: schemas.WorldUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)

    if body.name is not None:
        world.name = body.name
    if body.description is not None:
        world.description = body.description

    db.commit()
    db.refresh(world)
    return _world_response(world, db)


@router.delete("/worlds/{world_id}", status_code=204)
def delete_world(
    world_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    db.delete(world)
    db.commit()


# ── Scenarios ────────────────────────────────────────────────────────────────

@router.post("/worlds/{world_id}/scenarios/", response_model=schemas.WorldScenarioResponse, status_code=201)
def create_scenario(
    world_id: str,
    body: schemas.WorldScenarioCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)

    parent_db_id: int | None = None
    depth = 0
    if body.parent_scenario_id:
        parent = db.query(models.WorldScenario).filter(
            models.WorldScenario.scenario_id == body.parent_scenario_id,
            models.WorldScenario.world_id == world.id,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent scenario not found")
        if parent.status != "completed":
            raise HTTPException(status_code=400, detail="Parent scenario must be completed before branching")
        parent_db_id = parent.id
        depth = parent.depth + 1

    scenario = models.WorldScenario(
        world_id=world.id,
        user_id=current_user.id,
        name=body.name,
        seed_text=body.seed_text,
        parent_scenario_id=parent_db_id,
        depth=depth,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return _scenario_response(scenario, db)


@router.get("/worlds/{world_id}/scenarios/", response_model=list[schemas.WorldScenarioResponse])
def list_scenarios(
    world_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return only root scenarios (depth=0); children are nested within each."""
    world = _get_world_or_404(world_id, current_user.id, db)
    roots = db.query(models.WorldScenario).filter(
        models.WorldScenario.world_id == world.id,
        models.WorldScenario.parent_scenario_id == None,  # noqa: E711
    ).order_by(models.WorldScenario.created_at).all()
    return [_scenario_response(s, db, include_children=True) for s in roots]


@router.get("/worlds/{world_id}/scenarios/{scenario_id}", response_model=schemas.WorldScenarioResponse)
def get_scenario(
    world_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)
    return _scenario_response(scenario, db)


# ── Run Scenario ──────────────────────────────────────────────────────────────

@router.post("/worlds/{world_id}/scenarios/{scenario_id}/run", status_code=202)
def run_scenario(
    world_id: str,
    scenario_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    if scenario.status == "running":
        raise HTTPException(status_code=400, detail="Scenario is already running")

    agents = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.world_id == world.id
    ).all()
    if not agents:
        raise HTTPException(status_code=400, detail="World has no agents")

    # Collect agent data
    agent_dicts = []
    agent_db_ids = []
    for agent in agents:
        agent_dicts.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "age": agent.age,
            "gender": agent.gender,
            "location": agent.location,
            "profession": agent.profession,
            "job_title": agent.job_title,
            "organization": agent.organization,
            "personality_traits": agent.personality_traits,
            "behavioral_attributes": agent.behavioral_attributes,
            "contextual_state": agent.contextual_state,
            "external_factors": agent.external_factors,
        })
        agent_db_ids.append(agent.id)

    # Collect user-defined relationships for this world's agents
    rel_records = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.source_agent_id.in_(agent_db_ids)
    ).all()
    agent_by_db_id = {
        a.id: a
        for a in db.query(models.SmallWorldAgent).filter(
            models.SmallWorldAgent.world_id == world.id
        ).all()
    }
    relationship_dicts = []
    for r in rel_records:
        src = agent_by_db_id.get(r.source_agent_id)
        tgt = db.query(models.SmallWorldAgent).get(r.target_agent_id)
        if src and tgt:
            relationship_dicts.append({
                "source_agent_id": src.agent_id,
                "source_name": src.name,
                "target_agent_id": tgt.agent_id,
                "target_name": tgt.name,
                "type": r.type,
                "strength": r.strength,
                "sentiment": r.sentiment,
                "influence_direction": r.influence_direction,
            })

    # Compute output path
    base = _get_user_data_base(current_user.email)
    output_dir = os.path.join(base, "worlds", world.world_id, "scenarios", scenario.scenario_id, "output")
    os.makedirs(output_dir, exist_ok=True)

    # Parent output dir for branching
    parent_output_dir: str | None = None
    if scenario.parent_scenario_id:
        parent = db.query(models.WorldScenario).get(scenario.parent_scenario_id)
        if parent and parent.outputs_path:
            parent_output_dir = parent.outputs_path

    # Clear old events so a re-run starts with a clean stream
    db.query(models.WorldSimEvent).filter(
        models.WorldSimEvent.scenario_id == scenario.id
    ).delete()
    # Remove stale report so the old data isn't served during the new run
    if scenario.report_path and os.path.exists(scenario.report_path):
        try:
            os.remove(scenario.report_path)
        except OSError:
            pass
    scenario.report_path = None
    scenario.status = "running"
    scenario.outputs_path = output_dir
    db.commit()

    # Queue for SSE
    q: _queue.Queue = _queue.Queue()
    _scenario_queues[scenario.scenario_id] = q

    background_tasks.add_task(
        _run_scenario_background,
        scenario_db_id=scenario.id,
        scenario_uuid=scenario.scenario_id,
        world_description=world.description or "",
        scenario_name=scenario.name,
        seed_text=scenario.seed_text or "",
        agents=agent_dicts,
        relationships=relationship_dicts,
        output_dir=output_dir,
        parent_output_dir=parent_output_dir,
        q=q,
        user_id=current_user.id,
    )

    return {"status": "started", "scenario_id": scenario.scenario_id}


# ── Resimulate (cascade) ──────────────────────────────────────────────────────

def _collect_cascade_order(root_db_id: int, db: Session) -> list[int]:
    """
    BFS traversal of the scenario tree rooted at root_db_id.
    Returns DB ids in execution order: root first, then each generation
    of children sorted by created_at ASC (preserving creation order).
    """
    ordered: list[int] = []
    queue: list[int] = [root_db_id]
    while queue:
        current_id = queue.pop(0)
        ordered.append(current_id)
        children = (
            db.query(models.WorldScenario)
            .filter(models.WorldScenario.parent_scenario_id == current_id)
            .order_by(models.WorldScenario.created_at)
            .all()
        )
        for child in children:
            queue.append(child.id)
    return ordered


@router.post("/worlds/{world_id}/scenarios/{scenario_id}/resimulate", status_code=202)
def resimulate_scenario(
    world_id: str,
    scenario_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_credits),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    if scenario.status == "running":
        raise HTTPException(status_code=400, detail="Scenario is already running")

    agents = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.world_id == world.id
    ).all()
    if not agents:
        raise HTTPException(status_code=400, detail="World has no agents")

    # Collect agent data
    agent_dicts = []
    agent_db_ids = []
    for agent in agents:
        agent_dicts.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "age": agent.age,
            "gender": agent.gender,
            "location": agent.location,
            "profession": agent.profession,
            "job_title": agent.job_title,
            "organization": agent.organization,
            "personality_traits": agent.personality_traits,
            "behavioral_attributes": agent.behavioral_attributes,
            "contextual_state": agent.contextual_state,
            "external_factors": agent.external_factors,
        })
        agent_db_ids.append(agent.id)

    # Collect user-defined relationships
    rel_records = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.source_agent_id.in_(agent_db_ids)
    ).all()
    agent_by_db_id = {
        a.id: a
        for a in db.query(models.SmallWorldAgent).filter(
            models.SmallWorldAgent.world_id == world.id
        ).all()
    }
    relationship_dicts = []
    for r in rel_records:
        src = agent_by_db_id.get(r.source_agent_id)
        tgt = db.query(models.SmallWorldAgent).get(r.target_agent_id)
        if src and tgt:
            relationship_dicts.append({
                "source_agent_id": src.agent_id,
                "source_name": src.name,
                "target_agent_id": tgt.agent_id,
                "target_name": tgt.name,
                "type": r.type,
                "strength": r.strength,
                "sentiment": r.sentiment,
                "influence_direction": r.influence_direction,
            })

    # Determine BFS execution order for entire subtree
    ordered_ids = _collect_cascade_order(scenario.id, db)

    # Reset all scenarios in the cascade
    base = _get_user_data_base(current_user.email)
    for sid in ordered_ids:
        s = db.query(models.WorldScenario).get(sid)
        if not s:
            continue
        # Clear events
        db.query(models.WorldSimEvent).filter(
            models.WorldSimEvent.scenario_id == s.id
        ).delete()
        # Remove stale report file
        if s.report_path and os.path.exists(s.report_path):
            try:
                os.remove(s.report_path)
            except OSError:
                pass
        s.report_path = None
        s.status = "created"

    # Mark root as running and create its SSE queue immediately
    scenario.status = "running"
    output_dir = os.path.join(base, "worlds", world.world_id, "scenarios", scenario.scenario_id, "output")
    os.makedirs(output_dir, exist_ok=True)
    scenario.outputs_path = output_dir
    db.commit()

    root_q: _queue.Queue = _queue.Queue()
    _scenario_queues[scenario.scenario_id] = root_q

    background_tasks.add_task(
        _resimulate_cascade_background,
        ordered_ids=ordered_ids,
        world_uuid=world.world_id,
        world_description=world.description or "",
        agent_dicts=agent_dicts,
        relationship_dicts=relationship_dicts,
        user_email=current_user.email,
        user_id=current_user.id,
        root_q=root_q,
    )

    return {
        "status": "started",
        "scenario_id": scenario.scenario_id,
        "scenario_count": len(ordered_ids),
    }


def _resimulate_cascade_background(
    ordered_ids: list[int],
    world_uuid: str,
    world_description: str,
    agent_dicts: list[dict],
    relationship_dicts: list[dict],
    user_email: str,
    user_id: int,
    root_q: _queue.Queue,
) -> None:
    from ..database import SessionLocal

    base = _get_user_data_base(user_email)
    is_first = True

    for scenario_db_id in ordered_ids:
        db = SessionLocal()
        try:
            scenario = db.query(models.WorldScenario).get(scenario_db_id)
            if not scenario:
                continue

            output_dir = os.path.join(
                base, "worlds", world_uuid, "scenarios", scenario.scenario_id, "output"
            )
            os.makedirs(output_dir, exist_ok=True)

            # Resolve parent output dir if this is a child scenario
            parent_output_dir: str | None = None
            if scenario.parent_scenario_id:
                parent = db.query(models.WorldScenario).get(scenario.parent_scenario_id)
                if parent and parent.outputs_path:
                    parent_output_dir = parent.outputs_path

            # SSE queue: root reuses root_q; children get their own queue
            if is_first:
                q = root_q
                is_first = False
            else:
                q = _queue.Queue()
                _scenario_queues[scenario.scenario_id] = q
                scenario.status = "running"
                scenario.outputs_path = output_dir
                db.commit()

            # Run synchronously so ordering is preserved
            _run_scenario_background(
                scenario_db_id=scenario_db_id,
                scenario_uuid=scenario.scenario_id,
                world_description=world_description,
                scenario_name=scenario.name,
                seed_text=scenario.seed_text or "",
                agents=agent_dicts,
                relationships=relationship_dicts,
                output_dir=output_dir,
                parent_output_dir=parent_output_dir,
                q=q,
                user_id=user_id,
            )
        except Exception as exc:
            print(f"[resimulate_cascade] error on scenario {scenario_db_id}: {exc}")
        finally:
            db.close()


def _run_scenario_background(
    scenario_db_id: int,
    scenario_uuid: str,
    world_description: str,
    scenario_name: str,
    seed_text: str,
    agents: list[dict],
    relationships: list[dict],
    output_dir: str,
    parent_output_dir: str | None,
    q: _queue.Queue,
    user_id: int | None = None,
) -> None:
    from ..database import SessionLocal
    from ..billing import UsageSummary, deduct_credits

    db = SessionLocal()
    usage = UsageSummary()
    try:
        scenario = db.query(models.WorldScenario).get(scenario_db_id)

        def emit(etype: str, msg: str) -> None:
            event = models.WorldSimEvent(
                scenario_id=scenario_db_id,
                type=etype,
                message=msg,
            )
            db.add(event)
            db.commit()
            q.put_nowait({"type": etype, "message": msg})

        from core.small_world_runner import SmallWorldRunner

        runner = SmallWorldRunner(
            agents=agents,
            relationships=relationships,
            world_description=world_description,
            scenario_name=scenario_name,
            seed_text=seed_text,
            output_dir=output_dir,
            emit_event=emit,
            parent_output_dir=parent_output_dir,
            rounds=2,
        )
        runner.run()
        usage = runner._usage

        # Generate report inline so scenario is only marked complete once it's ready
        emit("stage", "Generating report…")
        try:
            from core.small_world_report import generate_report as _gen_report
            agent_profiles = [
                {
                    "name": a.get("name", ""),
                    "job_title": a.get("job_title", ""),
                    "profession": a.get("profession", ""),
                }
                for a in agents
            ]
            report, report_usage = _gen_report(
                output_dir=output_dir,
                world_description=world_description,
                scenario_name=scenario_name,
                seed_text=seed_text,
                agent_profiles=agent_profiles,
            )
            usage += report_usage
            report_path = os.path.join(output_dir, "report.json")
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            if scenario:
                scenario.report_path = report_path
            emit("stage", "Report ready")
        except Exception as rep_exc:
            emit("warning", f"Report generation failed: {rep_exc}")

        if scenario:
            scenario.status = "completed"
            scenario.outputs_path = output_dir
            db.commit()

        emit("done", "Simulation complete")

    except Exception as exc:
        db_inner = SessionLocal()
        try:
            s = db_inner.query(models.WorldScenario).get(scenario_db_id)
            if s:
                s.status = "error"
                db_inner.commit()
            ev = models.WorldSimEvent(
                scenario_id=scenario_db_id,
                type="error",
                message=str(exc),
            )
            db_inner.add(ev)
            db_inner.commit()
            q.put_nowait({"type": "error", "message": str(exc)})
        finally:
            db_inner.close()
        emit("done", "Simulation complete")
    finally:
        # Deduct credits regardless of success/failure
        if user_id and (usage.input_tokens > 0 or usage.output_tokens > 0):
            try:
                deduct_credits(db, user_id, usage, description=f"Small World scenario {scenario_uuid}")
            except Exception as billing_exc:
                print(f"[billing] deduct_credits failed: {billing_exc}")
        db.close()


# ── SSE Stream ────────────────────────────────────────────────────────────────

@router.get("/worlds/{world_id}/scenarios/{scenario_id}/stream")
def stream_scenario_events(
    world_id: str,
    scenario_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(_get_current_user_query),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    # Replay stored events first
    stored = db.query(models.WorldSimEvent).filter(
        models.WorldSimEvent.scenario_id == scenario.id
    ).order_by(models.WorldSimEvent.id).all()

    def _generate():
        for ev in stored:
            data = json.dumps({"type": ev.type, "message": ev.message})
            yield f"data: {data}\n\n"

        if scenario.status in ("completed", "error"):
            yield f"data: {json.dumps({'type': 'done', 'message': 'stream_end'})}\n\n"
            return

        q = _scenario_queues.get(scenario.scenario_id)
        if not q:
            yield f"data: {json.dumps({'type': 'done', 'message': 'stream_end'})}\n\n"
            return

        while True:
            try:
                event = q.get(timeout=30)
                data = json.dumps(event)
                yield f"data: {data}\n\n"
                if event.get("type") == "done":
                    break
            except _queue.Empty:
                yield "data: {\"type\": \"ping\", \"message\": \"\"}\n\n"

    return StreamingResponse(_generate(), media_type="text/event-stream")


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/worlds/{world_id}/scenarios/{scenario_id}/chat")
def post_chat_message(
    world_id: str,
    scenario_id: str,
    body: schemas.WorldScenarioChatMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    if scenario.status != "completed":
        raise HTTPException(status_code=400, detail="Chat is only available after simulation completes")

    # Store user message
    user_msg = models.WorldScenarioChat(
        scenario_id=scenario.id,
        is_user=True,
        text=body.text,
    )
    db.add(user_msg)
    db.flush()

    # Generate AI response
    ai_text, ai_usage = _generate_chat_response(scenario, body.text, db)

    ai_msg = models.WorldScenarioChat(
        scenario_id=scenario.id,
        is_user=False,
        text=ai_text,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    try:
        from ..billing import deduct_credits
        deduct_credits(db, current_user.id, ai_usage, description=f"Small World chat {scenario.scenario_id}")
    except Exception as billing_exc:
        print(f"[billing] deduct_credits failed: {billing_exc}")

    return schemas.WorldScenarioChatResponse(
        id=ai_msg.id,
        is_user=False,
        text=ai_msg.text,
        timestamp=ai_msg.timestamp,
    )


def _generate_chat_response(
    scenario: models.WorldScenario,
    question: str,
    db: Session,
) -> tuple[str, "UsageSummary"]:
    """Use Gemini to answer a question about a completed scenario. Returns (text, UsageSummary)."""
    import os
    from google import genai as _genai
    from core.config import MODEL_NAME
    from ..billing import UsageSummary

    # Load report if available
    report_context = ""
    if scenario.report_path and os.path.exists(scenario.report_path):
        try:
            with open(scenario.report_path, encoding="utf-8") as f:
                report_data = json.load(f)
            report_context = json.dumps(report_data, indent=2)[:3000]
        except Exception:
            pass

    # Load recent actions
    actions_context = ""
    if scenario.outputs_path:
        log_path = os.path.join(scenario.outputs_path, "actions.jsonl")
        if os.path.exists(log_path):
            lines = []
            with open(log_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        lines.append(line)
            actions_context = "\n".join(lines[:50])

    # Load previous chat history
    history = db.query(models.WorldScenarioChat).filter(
        models.WorldScenarioChat.scenario_id == scenario.id
    ).order_by(models.WorldScenarioChat.id.desc()).limit(10).all()
    history_text = "\n".join(
        f"{'User' if m.is_user else 'Assistant'}: {m.text}"
        for m in reversed(history)
    )

    prompt = f"""You are an expert analyst for a multi-agent simulation called "{scenario.name}".

Scenario seed: {scenario.seed_text or 'No seed provided'}

Simulation report:
{report_context or 'No report generated yet'}

Recent simulation activity (sample):
{actions_context or 'No activity data'}

Conversation history:
{history_text}

User question: {question}

Answer specifically about this scenario's simulation results. Be concise, insightful, and grounded in the data.
"""

    client = _genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(model=MODEL_NAME, contents=prompt)

    usage = UsageSummary()
    if response.usage_metadata:
        usage.add(
            input_tokens=response.usage_metadata.prompt_token_count or 0,
            output_tokens=response.usage_metadata.candidates_token_count or 0,
        )
    return response.text.strip(), usage


@router.get("/worlds/{world_id}/scenarios/{scenario_id}/chat", response_model=list[schemas.WorldScenarioChatResponse])
def get_chat_history(
    world_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)
    messages = db.query(models.WorldScenarioChat).filter(
        models.WorldScenarioChat.scenario_id == scenario.id
    ).order_by(models.WorldScenarioChat.id).all()
    return [
        schemas.WorldScenarioChatResponse(id=m.id, is_user=m.is_user, text=m.text, timestamp=m.timestamp)
        for m in messages
    ]


# ── Report ────────────────────────────────────────────────────────────────────

@router.post("/worlds/{world_id}/scenarios/{scenario_id}/report")
def generate_report(
    world_id: str,
    scenario_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    if scenario.status != "completed":
        raise HTTPException(status_code=400, detail="Scenario must be completed before generating a report")
    if not scenario.outputs_path:
        raise HTTPException(status_code=400, detail="Scenario output not found")

    members = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.world_id == world.id
    ).all()
    agent_profiles = []
    for agent in members:
        agent_profiles.append({"name": agent.name, "job_title": agent.job_title, "profession": agent.profession})

    background_tasks.add_task(
        _generate_report_background,
        scenario_db_id=scenario.id,
        output_dir=scenario.outputs_path,
        world_description=world.description or "",
        scenario_name=scenario.name,
        seed_text=scenario.seed_text or "",
        agent_profiles=agent_profiles,
    )

    return {"status": "generating"}


def _generate_report_background(
    scenario_db_id: int,
    output_dir: str,
    world_description: str,
    scenario_name: str,
    seed_text: str,
    agent_profiles: list[dict],
) -> None:
    from ..database import SessionLocal
    from core.small_world_report import generate_report

    db = SessionLocal()
    try:
        report, _usage = generate_report(
            output_dir=output_dir,
            world_description=world_description,
            scenario_name=scenario_name,
            seed_text=seed_text,
            agent_profiles=agent_profiles,
        )
        report_path = os.path.join(output_dir, "report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        scenario = db.query(models.WorldScenario).get(scenario_db_id)
        if scenario:
            scenario.report_path = report_path
            db.commit()
    except Exception as exc:
        print(f"Report generation failed: {exc}")
    finally:
        db.close()


@router.get("/worlds/{world_id}/scenarios/{scenario_id}/events", response_model=list[schemas.WorldScenarioEventResponse])
def get_scenario_events(
    world_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)
    return (
        db.query(models.WorldSimEvent)
        .filter(models.WorldSimEvent.scenario_id == scenario.id)
        .order_by(models.WorldSimEvent.id)
        .all()
    )


@router.get("/worlds/{world_id}/scenarios/{scenario_id}/feed")
def get_scenario_feed(
    world_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return social-media feed (posts + comments) from the OASIS simulation DB."""
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    agents: list[dict] = []
    result: dict = {"posts": [], "comments": [], "agents": agents}

    if not scenario.outputs_path:
        return result

    sim_db_path = os.path.join(scenario.outputs_path, "simulation.db")
    agents_path = os.path.join(scenario.outputs_path, "agents.json")

    if os.path.exists(agents_path):
        with open(agents_path, encoding="utf-8") as fh:
            agents = json.load(fh)
        result["agents"] = agents

    agent_by_id: dict = {}
    for i, a in enumerate(agents):
        agent_by_id[i] = a
        agent_by_id[str(i)] = a

    if not os.path.exists(sim_db_path):
        return result

    try:
        conn = sqlite3.connect(sim_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0].lower() for row in cursor.fetchall()}

        def _read_table(candidates: list[str]) -> list[dict]:
            for tbl in candidates:
                if tbl in tables:
                    cursor.execute(f"SELECT * FROM {tbl}")  # noqa: S608
                    cols = [d[0] for d in cursor.description]
                    rows = []
                    for row in cursor.fetchall():
                        entry = dict(zip(cols, row))
                        uid = entry.get("user_id", entry.get("agent_id"))
                        if uid is not None:
                            agent = agent_by_id.get(uid) or agent_by_id.get(str(uid))
                            if agent is None and isinstance(uid, int):
                                agent = agent_by_id.get(uid - 1)
                            if agent:
                                entry["_agent"] = agent
                        rows.append(entry)
                    return rows
            return []

        result["posts"] = _read_table(["post", "posts"])
        result["comments"] = _read_table(["comment", "comments"])
        conn.close()
    except Exception as exc:
        print(f"SW feed read error: {exc}")

    return result


@router.get("/worlds/{world_id}/scenarios/{scenario_id}/report")
def get_report(
    world_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    world = _get_world_or_404(world_id, current_user.id, db)
    scenario = _get_scenario_or_404(scenario_id, world.id, db)

    if not scenario.report_path or not os.path.exists(scenario.report_path):
        return {"available": False}

    with open(scenario.report_path, encoding="utf-8") as f:
        report = json.load(f)
    report["available"] = True
    return report


# ── Health Check ──────────────────────────────────────────────────────────────

@router.get("/worlds/{world_id}/health-check", response_model=list[schemas.HealthCheckItem])
def health_check(
    world_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from core.world_health_check import run_health_check

    world = _get_world_or_404(world_id, current_user.id, db)
    world_agents = db.query(models.SmallWorldAgent).filter(
        models.SmallWorldAgent.world_id == world.id
    ).all()

    agents_data = []
    for agent in world_agents:
        agents_data.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "profession": agent.profession,
            "job_title": agent.job_title,
            "organization": agent.organization,
            "location": agent.location,
            "personality_traits": agent.personality_traits,
        })

    # Get all relationships for these agents
    agent_db_ids = [a.id for a in world_agents]
    rels = db.query(models.AgentRelationship).filter(
        models.AgentRelationship.source_agent_id.in_(agent_db_ids)
    ).all()
    agent_by_id = {a.id: a for a in world_agents}
    rels_data = [
        {
            "source_agent_id": agent_by_id[r.source_agent_id].agent_id if r.source_agent_id in agent_by_id else "",
            "target_agent_id": db.query(models.SmallWorldAgent).get(r.target_agent_id).agent_id if db.query(models.SmallWorldAgent).get(r.target_agent_id) else "",
            "sentiment": r.sentiment,
        }
        for r in rels
    ]

    items = run_health_check(agents_data, rels_data)
    return [schemas.HealthCheckItem(**item) for item in items]


# ── Scenario Diff ─────────────────────────────────────────────────────────────

@router.post("/worlds/{world_id}/scenarios/diff")
def scenario_diff(
    world_id: str,
    body: schemas.ScenarioDiffRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from core.scenario_diff import compute_diff

    world = _get_world_or_404(world_id, current_user.id, db)

    scenario_a = _get_scenario_or_404(body.scenario_id_a, world.id, db)
    scenario_b = _get_scenario_or_404(body.scenario_id_b, world.id, db)

    if not scenario_a.outputs_path or not scenario_b.outputs_path:
        raise HTTPException(status_code=400, detail="Both scenarios must have completed before diffing")

    # Load reports if available
    def _load_report(path: str | None) -> dict | None:
        if not path:
            return None
        report_file = os.path.join(path, "report.json")
        if os.path.exists(report_file):
            with open(report_file, encoding="utf-8") as f:
                return json.load(f)
        return None

    report_a = _load_report(scenario_a.outputs_path)
    report_b = _load_report(scenario_b.outputs_path)

    return compute_diff(
        output_dir_a=scenario_a.outputs_path,
        output_dir_b=scenario_b.outputs_path,
        scenario_name_a=scenario_a.name,
        scenario_name_b=scenario_b.name,
        report_a=report_a,
        report_b=report_b,
    )
