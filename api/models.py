from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    sessions = relationship("Session", back_populates="owner")
    logs = relationship("ActionLog", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="created")  # created, running, completed, error
    title = Column(String, nullable=True)
    rounds = Column(Integer, default=1)
    inputs_path = Column(String)  # path to seed documents
    outputs_path = Column(String) # path to simulation outputs

    owner = relationship("User", back_populates="sessions")
    chat_messages = relationship("ChatMessage", back_populates="session")
    events = relationship("SimulationEvent", back_populates="session", order_by="SimulationEvent.id")


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # e.g., "login", "create_session", "run_simulation"
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)

    user = relationship("User", back_populates="logs")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    is_user = Column(Boolean) # True for user query, False for agent response
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="chat_messages")


class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    type = Column(String)   # stage, agent, action, round, error, done
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="events")
