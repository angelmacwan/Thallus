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

# Create database tables
Base.metadata.create_all(bind=engine)

# ── Lightweight schema migrations (idempotent) ────────────────────────────────
# SQLite does not support ALTER TABLE DROP COLUMN / doesn't auto-add columns.
# These statements are safe to run repeatedly; errors mean the column exists.
_MIGRATIONS = [
    "ALTER TABLE reports ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id)",
    "ALTER TABLE reports ADD COLUMN is_scenario_report BOOLEAN DEFAULT 0",
    "ALTER TABLE users ADD COLUMN credits FLOAT DEFAULT 1.0",
    """CREATE TABLE IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount_usd FLOAT NOT NULL,
        description VARCHAR NOT NULL,
        session_id INTEGER REFERENCES sessions(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS promo_code_usages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        email VARCHAR NOT NULL,
        code VARCHAR NOT NULL,
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    # Small World migrations (idempotent via IF NOT EXISTS)
    """CREATE TABLE IF NOT EXISTS sw_agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id VARCHAR UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR NOT NULL,
        age INTEGER,
        gender VARCHAR,
        location VARCHAR,
        profession VARCHAR,
        job_title VARCHAR,
        organization VARCHAR,
        personality_traits TEXT,
        behavioral_attributes TEXT,
        contextual_state TEXT,
        external_factors TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS sw_agent_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rel_id VARCHAR UNIQUE NOT NULL,
        source_agent_id INTEGER NOT NULL REFERENCES sw_agents(id),
        target_agent_id INTEGER NOT NULL REFERENCES sw_agents(id),
        type VARCHAR NOT NULL,
        strength FLOAT DEFAULT 0.5,
        sentiment VARCHAR DEFAULT 'neutral',
        influence_direction VARCHAR DEFAULT 'both',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS sw_worlds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id VARCHAR UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS sw_world_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id INTEGER NOT NULL REFERENCES sw_worlds(id),
        agent_id INTEGER NOT NULL REFERENCES sw_agents(id)
    )""",
    """CREATE TABLE IF NOT EXISTS sw_world_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id VARCHAR UNIQUE NOT NULL,
        world_id INTEGER NOT NULL REFERENCES sw_worlds(id),
        user_id INTEGER REFERENCES users(id),
        name VARCHAR NOT NULL,
        seed_text TEXT,
        seed_files_path VARCHAR,
        parent_scenario_id INTEGER REFERENCES sw_world_scenarios(id),
        depth INTEGER DEFAULT 0,
        status VARCHAR DEFAULT 'created',
        outputs_path VARCHAR,
        report_path VARCHAR,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    # Add world_id to sw_agents (idempotent — fails silently if column exists)
    "ALTER TABLE sw_agents ADD COLUMN world_id INTEGER REFERENCES sw_worlds(id)",
    """CREATE TABLE IF NOT EXISTS sw_world_scenario_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id INTEGER NOT NULL REFERENCES sw_world_scenarios(id),
        is_user BOOLEAN NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS sw_world_sim_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id INTEGER NOT NULL REFERENCES sw_world_scenarios(id),
        type VARCHAR NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS waitlist_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR NOT NULL,
        ip_address VARCHAR,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    # Add focus_topics to sessions (idempotent — fails silently if column exists)
    "ALTER TABLE sessions ADD COLUMN focus_topics TEXT DEFAULT NULL",
]
with engine.connect() as _conn:
    for _sql in _MIGRATIONS:
        try:
            _conn.execute(text(_sql))
            _conn.commit()
        except Exception as _exc:
            _exc_str = str(_exc).lower()
            if "duplicate column name" in _exc_str or "already exists" in _exc_str:
                logging.debug("Migration already applied: %s...", _sql[:60])
            else:
                logging.warning("Migration failed unexpectedly: %s... | reason: %s", _sql[:60], _exc)

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
