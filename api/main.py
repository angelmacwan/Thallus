from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base
from .deps import get_current_user
from . import models

from .routers import auth, sessions, simulation, reports
from .routers import scenarios, metrics

# Create database tables
Base.metadata.create_all(bind=engine)

# ── Lightweight schema migrations (idempotent) ────────────────────────────────
# SQLite does not support ALTER TABLE DROP COLUMN / doesn't auto-add columns.
# These statements are safe to run repeatedly; errors mean the column exists.
_MIGRATIONS = [
    "ALTER TABLE reports ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id)",
    "ALTER TABLE reports ADD COLUMN is_scenario_report BOOLEAN DEFAULT 0",
]
with engine.connect() as _conn:
    for _sql in _MIGRATIONS:
        try:
            _conn.execute(text(_sql))
            _conn.commit()
        except Exception:
            pass  # column already exists

app = FastAPI(title="Thallus API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(simulation.router)
app.include_router(reports.router)
app.include_router(scenarios.router)
app.include_router(metrics.router)

APP_VERSION = "internal alpha 1.3"

@app.get("/")
def read_root():
    return {"message": "Thallus API is running"}

@app.get("/api/version")
def get_version(current_user: models.User = Depends(get_current_user)):
    return {"version": APP_VERSION}
