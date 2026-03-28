import asyncio
import json as _json
import os
import queue as _queue
import sqlite3
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

# Per-scenario SSE queues (thread-safe)
_scenario_queues: dict[str, _queue.Queue] = {}


def _get_current_user_query(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """JWT auth via query param — required for EventSource (SSE)."""
    from jose import JWTError, jwt
    from .. import auth as _auth

    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, _auth.SECRET_KEY, algorithms=[_auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user


# ── Create scenario ──────────────────────────────────────────────────────────

@router.post("/session/{session_uuid}", response_model=schemas.ScenarioResponse)
def create_scenario(
    session_uuid: str,
    body: schemas.ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    if db_session.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="The parent simulation must be completed before creating a scenario",
        )

    scenario = crud.create_scenario(
        db,
        session_db_id=db_session.id,
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        rounds=body.rounds,
    )
    crud.log_action(db, current_user.id, "create_scenario", f"Scenario: {scenario.scenario_id}")
    return schemas.ScenarioResponse(
        id=scenario.id,
        scenario_id=scenario.scenario_id,
        session_id=scenario.session_id,
        name=scenario.name,
        description=scenario.description,
        rounds=scenario.rounds,
        status=scenario.status,
        outputs_path=scenario.outputs_path,
        created_at=scenario.created_at,
    )


# ── List scenarios for session ───────────────────────────────────────────────

@router.get("/session/{session_uuid}", response_model=list[schemas.ScenarioResponse])
def list_scenarios(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    scenarios = crud.get_scenarios_for_session(db, db_session.id)
    return [
        schemas.ScenarioResponse(
            id=s.id,
            scenario_id=s.scenario_id,
            session_id=s.session_id,
            name=s.name,
            description=s.description,
            rounds=s.rounds,
            status=s.status,
            outputs_path=s.outputs_path,
            created_at=s.created_at,
        )
        for s in scenarios
    ]


# ── Run scenario (background) ────────────────────────────────────────────────

def _run_scenario_task(
    scenario_db_id: int,
    scenario_uuid: str,
    session_outputs_path: str,
    scenario_outputs_path: str,
    rounds: int,
    description: str,
    emit,
):
    from ..database import SessionLocal

    db = SessionLocal()
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_db_id).first()
    if not scenario:
        db.close()
        return

    scenario.status = "running"
    scenario.outputs_path = scenario_outputs_path
    db.commit()

    try:
        from core.graph_memory import LocalGraphMemory
        from core.scenario_runner import ScenarioRunner

        os.makedirs(scenario_outputs_path, exist_ok=True)

        # Store the scenario description as the investigation objective
        objective_path = os.path.join(scenario_outputs_path, "objective.txt")
        with open(objective_path, "w", encoding="utf-8") as _f:
            _f.write(description.strip() if description else "")

        graph = LocalGraphMemory(
            storage_path=os.path.join(session_outputs_path, "graph.json")
        )
        agents_path = os.path.join(session_outputs_path, "agents.json")
        db_path = os.path.join(scenario_outputs_path, "simulation.db")
        log_path = os.path.join(scenario_outputs_path, "actions.jsonl")

        sr = ScenarioRunner(
            graph=graph,
            agents_path=agents_path,
            db_path=db_path,
            log_path=log_path,
            scenario_description=description,
            emit_event=emit,
        )
        sr.run(rounds)

        scenario.status = "completed"
        db.commit()

    except Exception as exc:
        scenario.status = "error"
        db.commit()
        emit("error", f"Scenario failed: {exc}")
        print(f"Scenario error: {exc}")
    finally:
        emit("done", "Scenario stream closed")
        _scenario_queues.pop(scenario_uuid, None)
        db.close()


@router.post("/{scenario_uuid}/run", response_model=schemas.ScenarioResponse)
def run_scenario(
    scenario_uuid: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario.status == "running":
        raise HTTPException(status_code=400, detail="Scenario is already running")

    db_session = db.query(models.Session).filter(models.Session.id == scenario.session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Parent session not found")

    # Build output path: <session_outputs_path>/scenarios/<scenario_uuid>/
    scenario_outputs_path = os.path.join(
        db_session.outputs_path, "scenarios", scenario_uuid
    )

    q: _queue.Queue = _queue.Queue()
    _scenario_queues[scenario_uuid] = q
    _scenario_db_id = scenario.id

    def emit(event_type: str, message: str):
        q.put({"type": event_type, "message": message})
        try:
            from ..database import SessionLocal as _SL
            _db = _SL()
            crud.add_scenario_event(_db, _scenario_db_id, event_type, message)
            _db.close()
        except Exception:
            pass

    background_tasks.add_task(
        _run_scenario_task,
        scenario.id,
        scenario_uuid,
        db_session.outputs_path,
        scenario_outputs_path,
        scenario.rounds,
        scenario.description,
        emit,
    )

    crud.log_action(db, current_user.id, "run_scenario", f"Scenario: {scenario_uuid}")

    # Return fresh copy with updated status (task may not have started yet,
    # but status will be set to "running" shortly by the background thread)
    return schemas.ScenarioResponse(
        id=scenario.id,
        scenario_id=scenario.scenario_id,
        session_id=scenario.session_id,
        name=scenario.name,
        description=scenario.description,
        rounds=scenario.rounds,
        status="running",
        outputs_path=scenario_outputs_path,
        created_at=scenario.created_at,
    )


# ── SSE stream ───────────────────────────────────────────────────────────────

@router.get("/{scenario_uuid}/stream")
async def stream_scenario_events(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(_get_current_user_query),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    async def event_generator():
        for _ in range(30):
            if scenario_uuid in _scenario_queues:
                break
            await asyncio.sleep(0.2)

        q = _scenario_queues.get(scenario_uuid)
        if q is None:
            yield 'data: {"type":"error","message":"No active stream for this scenario"}\n\n'
            return

        while True:
            try:
                event = q.get_nowait()
                yield f"data: {_json.dumps(event)}\n\n"
                if event.get("type") in ("done", "error"):
                    break
            except _queue.Empty:
                await asyncio.sleep(0.15)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Scenario events (persisted) ──────────────────────────────────────────────

@router.get("/{scenario_uuid}/events", response_model=list[schemas.ScenarioEventResponse])
def get_scenario_events(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return crud.get_scenario_events(db, scenario.id)


# ── Scenario feed (original + scenario posts combined) ───────────────────────

@router.get("/{scenario_uuid}/feed")
def get_scenario_feed(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    db_session = db.query(models.Session).filter(models.Session.id == scenario.session_id).first()

    agents: list[dict] = []
    agents_path = os.path.join(db_session.outputs_path, "agents.json")
    if os.path.exists(agents_path):
        with open(agents_path, encoding="utf-8") as fh:
            agents = _json.load(fh)

    agent_by_id: dict = {}
    for i, a in enumerate(agents):
        agent_by_id[i] = a
        agent_by_id[str(i)] = a

    result: dict = {"posts": [], "comments": [], "agents": agents}

    def _read_sim_db(db_path: str, source_tag: str) -> tuple[list, list]:
        posts, comments = [], []
        if not os.path.exists(db_path):
            return posts, comments
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row[0].lower() for row in cursor.fetchall()}

            def _read_table(candidates):
                for tbl in candidates:
                    if tbl in tables:
                        cursor.execute(f"SELECT * FROM {tbl}")
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
                            entry["_source"] = source_tag
                            rows.append(entry)
                        return rows
                return []

            posts = _read_table(["post", "posts"])
            comments = _read_table(["comment", "comments"])
            conn.close()
        except Exception as exc:
            print(f"Feed read error ({source_tag}): {exc}")
        return posts, comments

    # Main simulation DB
    main_db = os.path.join(db_session.outputs_path, "simulation.db")
    main_posts, main_comments = _read_sim_db(main_db, "main")

    # Scenario simulation DB
    scenario_db = ""
    if scenario.outputs_path:
        scenario_db = os.path.join(scenario.outputs_path, "simulation.db")
    scen_posts, scen_comments = _read_sim_db(scenario_db, "scenario")

    result["posts"] = main_posts + scen_posts
    result["comments"] = main_comments + scen_comments
    return result


# ── Scenario chat ────────────────────────────────────────────────────────────

@router.post("/{scenario_uuid}/chat", response_model=schemas.ScenarioChatMessageResponse)
def chat_with_scenario(
    scenario_uuid: str,
    query: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario.status != "completed":
        raise HTTPException(status_code=400, detail="Scenario must be completed before chatting")

    db_session = db.query(models.Session).filter(models.Session.id == scenario.session_id).first()

    from core.graph_memory import LocalGraphMemory
    from core.report_agent import ReportAgent

    graph = LocalGraphMemory(
        storage_path=os.path.join(db_session.outputs_path, "graph.json")
    )
    # Use scenario-specific log if available, fall back to main session log
    scenario_log = os.path.join(scenario.outputs_path, "actions.jsonl") if scenario.outputs_path else None
    main_log = os.path.join(db_session.outputs_path, "actions.jsonl")
    log_path = scenario_log if scenario_log and os.path.exists(scenario_log) else main_log

    ra = ReportAgent(graph, log_path=log_path)

    enriched_query = (
        f"SCENARIO CONTEXT: {scenario.name} — {scenario.description}\n\n"
        f"USER QUESTION: {query}"
    )

    # Save user message
    user_msg = models.ScenarioChatMessage(
        scenario_id=scenario.id, is_user=True, text=query
    )
    db.add(user_msg)
    db.commit()

    response_text = ra.generate_report(enriched_query, output_path=None)

    agent_msg = models.ScenarioChatMessage(
        scenario_id=scenario.id, is_user=False, text=response_text
    )
    db.add(agent_msg)
    db.commit()
    db.refresh(agent_msg)

    crud.log_action(db, current_user.id, "scenario_chat", f"Scenario: {scenario_uuid}")
    return schemas.ScenarioChatMessageResponse(
        id=agent_msg.id,
        is_user=agent_msg.is_user,
        text=agent_msg.text,
        timestamp=agent_msg.timestamp,
    )


@router.get("/{scenario_uuid}/chat", response_model=list[schemas.ScenarioChatMessageResponse])
def get_scenario_chat(
    scenario_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    msgs = (
        db.query(models.ScenarioChatMessage)
        .filter(models.ScenarioChatMessage.scenario_id == scenario.id)
        .order_by(models.ScenarioChatMessage.id)
        .all()
    )
    return [
        schemas.ScenarioChatMessageResponse(
            id=m.id, is_user=m.is_user, text=m.text, timestamp=m.timestamp
        )
        for m in msgs
    ]


# ── Generate scenario report ─────────────────────────────────────────────────

@router.post("/{scenario_uuid}/report", response_model=schemas.ReportResponse)
def generate_scenario_report(
    scenario_uuid: str,
    body: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or scenario.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Scenario must be completed before generating a report",
        )

    db_session = db.query(models.Session).filter(models.Session.id == scenario.session_id).first()

    from core.graph_memory import LocalGraphMemory
    from core.report_agent import ReportAgent

    graph = LocalGraphMemory(
        storage_path=os.path.join(db_session.outputs_path, "graph.json")
    )
    log_path = os.path.join(scenario.outputs_path, "actions.jsonl") if scenario.outputs_path else os.path.join(db_session.outputs_path, "actions.jsonl")

    # Include scenario chat history for context
    chat_messages = [
        {"is_user": m.is_user, "text": m.text}
        for m in scenario.chat_messages
    ]

    ra = ReportAgent(graph, log_path=log_path)

    report_uuid = uuid.uuid4().hex
    output_dir = scenario.outputs_path or db_session.outputs_path
    file_path = os.path.join(output_dir, f"scenario_report_{report_uuid}.md")

    scenario_description = (
        f"SCENARIO REPORT: {scenario.name}\n\n"
        f"Scenario Details: {scenario.description}\n\n"
        f"Analysis Focus: {body.description}\n\n"
        f"Analyse how this scenario changes the dynamics compared to the base simulation. "
        f"Include what changed, what improved or worsened, how real-world users might react, "
        f"and the broader implications of this hypothetical situation."
    )

    title, report_text = ra.generate_structured_report(
        description=scenario_description,
        chat_messages=chat_messages,
        output_path=file_path,
    )

    # Tag title clearly as scenario report
    if not title.startswith("[Scenario]"):
        title = f"[Scenario] {scenario.name}: {title}"[:120]

    db_report = crud.create_report(
        db=db,
        session_db_id=db_session.id,
        user_id=current_user.id,
        title=title,
        description=scenario_description,
        file_path=file_path,
        report_uuid=report_uuid,
    )

    # Tag it as a scenario report
    db_report.is_scenario_report = True
    db_report.scenario_id = scenario.id
    db.commit()
    db.refresh(db_report)

    crud.log_action(db, current_user.id, "generate_scenario_report", f"Scenario: {scenario_uuid}")

    return schemas.ReportResponse(
        id=db_report.id,
        report_id=db_report.report_id,
        session_id=db_report.session_id,
        title=db_report.title,
        description=db_report.description,
        file_path=db_report.file_path,
        created_at=db_report.created_at,
        session_title=db_session.title,
        session_uuid=db_session.session_id,
        is_scenario_report=True,
        scenario_id=scenario.scenario_id,
        scenario_name=scenario.name,
    )
