from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base

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

@app.get("/")
def read_root():
    return {"message": "MiroFish API is running"}
