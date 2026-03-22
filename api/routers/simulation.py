import asyncio
import json as _json
import os
import queue as _queue
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models
from ..deps import get_db, get_current_user

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# Per-session event queues (thread-safe — background tasks run in a thread pool)
_session_queues: dict[str, _queue.Queue] = {}

def _get_current_user_query(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Auth dependency that reads JWT from a query param (needed for EventSource)."""
    from jose import jwt, JWTError
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


def run_simulation_task(session_id: int, session_uuid: str, inputs_path: str, outputs_path: str, rounds: int, emit):
    # Runs in background task thread
    from ..database import SessionLocal
    db = SessionLocal()
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not db_session:
        db.close()
        return

    db_session.status = "running"
    db.commit()

    try:
        from core.graph_memory import LocalGraphMemory
        from core.text_processor import TextProcessor
        from core.ontology_generator import OntologyGenerator
        from core.profile_generator import ProfileGenerator
        from core.simulation_runner import SimulationRunner

        os.makedirs(outputs_path, exist_ok=True)
        emit("stage", "Processing input documents…")
        graph = LocalGraphMemory(storage_path=os.path.join(outputs_path, "graph.json"))

        tp = TextProcessor(graph)
        tp.ingest_folder(inputs_path)
        emit("stage", "Text ingestion complete")

        emit("stage", "Generating ontology…")
        og = OntologyGenerator(graph)
        og.generate(output_path=os.path.join(outputs_path, "ontology.json"))
        emit("stage", "Ontology generated")

        emit("stage", "Generating agent profiles…")
        agents_path = os.path.join(outputs_path, "agents.json")
        pg = ProfileGenerator(graph)
        profiles = pg.generate_profiles(output_path=agents_path)
        n_agents = len(profiles) if isinstance(profiles, list) else "?"
        emit("stage", f"{n_agents} agent profile(s) generated")

        db_path = os.path.join(outputs_path, "simulation.db")
        log_path = os.path.join(outputs_path, "actions.jsonl")
        sr = SimulationRunner(
            graph,
            agents_path=agents_path,
            db_path=db_path,
            log_path=log_path,
            emit_event=emit,
        )
        sr.run(rounds)

        db_session.status = "completed"
        db.commit()

    except Exception as e:
        db_session.status = "error"
        db.commit()
        emit("error", f"Simulation failed: {e}")
        print(f"Simulation error: {e}")
    finally:
        emit("done", "Stream closed")
        _session_queues.pop(session_uuid, None)
        db.close()


@router.post("/upload", response_model=schemas.SessionResponse)
async def upload_and_simulate(
    background_tasks: BackgroundTasks,
    rounds: int = Form(...),
    title: str = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    email_safe = current_user.email.replace("@", "_at_").replace(".", "_")
    session_uuid = str(uuid.uuid4())
    base_dir = os.path.join("users_data", email_safe, f"session_{session_uuid}")
    inputs_path = os.path.join(base_dir, "input")
    outputs_path = os.path.join(base_dir, "output")

    os.makedirs(inputs_path, exist_ok=True)

    # Save files
    for file in files:
        file_location = os.path.join(inputs_path, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())

    # Create session
    db_session = crud.create_session(db, current_user.id, inputs_path, outputs_path, rounds, title)
    db_session.session_id = session_uuid
    db.commit()
    db.refresh(db_session)

    crud.log_action(db, current_user.id, "start_simulation", f"Session: {session_uuid}, Rounds: {rounds}")

    # Create the event queue before starting the background task so the SSE
    # endpoint can start listening immediately.
    q: _queue.Queue = _queue.Queue()
    _session_queues[session_uuid] = q
    _db_session_id = db_session.id

    def emit(event_type: str, message: str):
        q.put({"type": event_type, "message": message})
        # Persist to DB using a short-lived session (background thread context)
        try:
            from ..database import SessionLocal as _SL
            _db = _SL()
            crud.add_simulation_event(_db, _db_session_id, event_type, message)
            _db.close()
        except Exception:
            pass  # never let persistence failure crash the simulation

    background_tasks.add_task(
        run_simulation_task,
        db_session.id,
        session_uuid,
        inputs_path,
        outputs_path,
        rounds,
        emit,
    )

    return db_session


@router.post("/chat/{session_uuid}", response_model=schemas.ChatMessageResponse)
def chat_with_report_agent(
    session_uuid: str,
    query: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if db_session.status != "completed":
        raise HTTPException(status_code=400, detail="Simulation must be completed before chatting")

    from core.graph_memory import LocalGraphMemory
    from core.report_agent import ReportAgent

    outputs_path = db_session.outputs_path
    graph = LocalGraphMemory(storage_path=os.path.join(outputs_path, "graph.json"))
    log_path = os.path.join(outputs_path, "actions.jsonl")

    ra = ReportAgent(graph, log_path=log_path)
    
    # Save user message
    user_msg = models.ChatMessage(session_id=db_session.id, is_user=True, text=query)
    db.add(user_msg)
    db.commit()
    
    # Generate report
    report_output_path = os.path.join(outputs_path, f"report_{uuid.uuid4().hex[:8]}.md")
    report_text = ra.generate_report(query, output_path=report_output_path)

    # Save agent message
    agent_msg = models.ChatMessage(session_id=db_session.id, is_user=False, text=report_text)
    db.add(agent_msg)
    db.commit()
    db.refresh(agent_msg)

    crud.log_action(db, current_user.id, "chat_query", f"Session: {session_uuid}")

    return agent_msg

@router.get("/events/{session_uuid}", response_model=list[schemas.SimulationEventResponse])
def get_simulation_events(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all persisted simulation events for a session."""
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return crud.get_simulation_events(db, db_session.id)


@router.get("/chat/{session_uuid}")
def get_chat_history(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session.chat_messages


@router.get("/artifacts/{session_uuid}")
def get_session_artifacts(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return agents.json and graph.json for a completed session."""
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    outputs_path = db_session.outputs_path
    result: dict = {}

    agents_path = os.path.join(outputs_path, "agents.json")
    result["agents"] = _json.load(open(agents_path, encoding="utf-8")) if os.path.exists(agents_path) else []

    graph_path = os.path.join(outputs_path, "graph.json")
    result["graph"] = _json.load(open(graph_path, encoding="utf-8")) if os.path.exists(graph_path) else {"entities": {}, "relations": []}

    return result


@router.get("/stream/{session_uuid}")
async def stream_simulation_events(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(_get_current_user_query),
):
    """SSE endpoint — streams live simulation events to the browser."""
    # Verify ownership
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        # Wait briefly for the queue to be registered (race against background start)
        for _ in range(30):
            if session_uuid in _session_queues:
                break
            await asyncio.sleep(0.2)

        q = _session_queues.get(session_uuid)
        if q is None:
            yield 'data: {"type":"error","message":"No active stream for this session"}\n\n'
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
