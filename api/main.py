from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .deps import get_current_user
from . import models

from .routers import auth, sessions, simulation, reports

# Create database tables
Base.metadata.create_all(bind=engine)

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

APP_VERSION = "internal alpha 1"

@app.get("/")
def read_root():
    return {"message": "MiroFish API is running"}

@app.get("/api/version")
def get_version(current_user: models.User = Depends(get_current_user)):
    return {"version": APP_VERSION}
