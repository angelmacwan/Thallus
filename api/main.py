from dotenv import load_dotenv
load_dotenv()

import logging
import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base
from .deps import get_current_user
from . import models

from .routers import auth, sessions, simulation, reports
from .routers import scenarios, insights, users, admin
from .routers import small_world_agents, small_world_worlds

# Create all database tables directly from ORM models
Base.metadata.create_all(bind=engine)

# ── Schema migrations for existing databases (idempotent) ───────────────────
# Run column additions conditionally for backward compatibility with older DB files.
_COLUMN_MIGRATIONS = [
    ("reports", "scenario_id", "ALTER TABLE reports ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id)"),
    ("reports", "is_scenario_report", "ALTER TABLE reports ADD COLUMN is_scenario_report BOOLEAN DEFAULT 0"),
    ("users", "credits", "ALTER TABLE users ADD COLUMN credits FLOAT DEFAULT 1.0"),
    ("users", "gemini_api_key", "ALTER TABLE users ADD COLUMN gemini_api_key VARCHAR"),
    ("sw_agents", "world_id", "ALTER TABLE sw_agents ADD COLUMN world_id INTEGER REFERENCES sw_worlds(id)"),
    ("sessions", "focus_topics", "ALTER TABLE sessions ADD COLUMN focus_topics TEXT DEFAULT NULL"),
]

with engine.connect() as conn:
    for table_name, column_name, stmt in _COLUMN_MIGRATIONS:
        try:
            # Check if column already exists before attempting ALTER TABLE
            result = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            existing_cols = [row[1] for row in result]
            if column_name not in existing_cols:
                conn.execute(text(stmt))
                conn.commit()
        except Exception as exc:
            logging.debug("Column migration skipped for %s.%s: %s", table_name, column_name, exc)

# ── Seed allowed_emails from static config (one-time) ───────────────────────
def _seed_initial_data() -> None:
    from .database import SessionLocal
    from . import models as _m
    from core.config import _INITIAL_ALLOWED_EMAILS

    db = SessionLocal()
    try:
        # Seed allowed emails if table is empty
        if db.query(_m.AllowedEmail).count() == 0:
            for email_str in _INITIAL_ALLOWED_EMAILS:
                db.add(_m.AllowedEmail(email=email_str.lower(), promoted_from_waitlist=False))
            db.commit()
    finally:
        db.close()

_seed_initial_data()

app = FastAPI(title="Thallus API")

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://thallus.staticalabs.com",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(simulation.router)
app.include_router(reports.router)
app.include_router(scenarios.router)
app.include_router(insights.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(small_world_agents.router)
app.include_router(small_world_worlds.router)

APP_VERSION = "internal alpha 1.3"

@app.get("/")
def read_root():
    return {"message": "Thallus API is running"}

@app.get("/api/version")
def get_version(current_user: models.User = Depends(get_current_user)):
    return {"version": APP_VERSION}
