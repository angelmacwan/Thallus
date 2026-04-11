from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, Float
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
    credits = Column(Float, default=1.0)  # stored in USD; display = credits * CREDITS_PER_USD

    sessions = relationship("Session", back_populates="owner")
    logs = relationship("ActionLog", back_populates="user")
    reports = relationship("Report", back_populates="owner")
    scenarios = relationship("Scenario", back_populates="owner")
    insights = relationship("InsightRecord", back_populates="owner")
    credit_transactions = relationship("CreditTransaction", back_populates="user")
    promo_code_usages = relationship("PromoCodeUsage", back_populates="user")


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
    focus_topics = Column(Text, nullable=True)  # JSON-encoded list of user-defined search topics

    owner = relationship("User", back_populates="sessions")
    chat_messages = relationship("ChatMessage", back_populates="session")
    events = relationship("SimulationEvent", back_populates="session", order_by="SimulationEvent.id")
    reports = relationship("Report", back_populates="session")
    scenarios = relationship("Scenario", back_populates="session")
    insights = relationship("InsightRecord", back_populates="session", foreign_keys="InsightRecord.session_id")


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


class UnauthorizedRegisterAttempt(Base):
    __tablename__ = "unauthorized_register_attempts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(Integer, ForeignKey("sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)       # user-supplied prompt/focus
    file_path = Column(String)       # absolute-ish path to the .md file on disk
    created_at = Column(DateTime, default=datetime.utcnow)

    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    is_scenario_report = Column(Boolean, default=False)

    session = relationship("Session", back_populates="reports")
    owner = relationship("User", back_populates="reports")
    scenario = relationship("Scenario", back_populates="reports", foreign_keys=[scenario_id])


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(Integer, ForeignKey("sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(Text)
    rounds = Column(Integer, default=1)
    status = Column(String, default="created")  # created, running, completed, error
    outputs_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="scenarios")
    owner = relationship("User", back_populates="scenarios")
    chat_messages = relationship("ScenarioChatMessage", back_populates="scenario")
    events = relationship("ScenarioEvent", back_populates="scenario", order_by="ScenarioEvent.id")
    reports = relationship("Report", back_populates="scenario", foreign_keys="Report.scenario_id")
    insights = relationship("InsightRecord", back_populates="scenario", foreign_keys="InsightRecord.scenario_id")


class ScenarioChatMessage(Base):
    __tablename__ = "scenario_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    is_user = Column(Boolean)
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("Scenario", back_populates="chat_messages")


class ScenarioEvent(Base):
    __tablename__ = "scenario_events"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    type = Column(String)   # stage, agent, action, round, error, done
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("Scenario", back_populates="events")


class InsightRecord(Base):
    __tablename__ = "insight_records"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query = Column(Text)
    debate_rounds = Column(Integer, default=3)
    status = Column(String, default="pending")  # pending, running, complete, error
    file_path = Column(String)  # absolute path to insight_{insight_id}.json
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="insights", foreign_keys=[session_id])
    scenario = relationship("Scenario", back_populates="insights", foreign_keys=[scenario_id])
    owner = relationship("User", back_populates="insights")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    # negative = spend, positive = top-up/grant
    amount_usd = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="credit_transactions")
    session = relationship("Session")


class PromoCodeUsage(Base):
    __tablename__ = "promo_code_usages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False, index=True)
    redeemed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="promo_code_usages")


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    ip_address = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # "signup" | "password_reset"
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)


# ── Small World ───────────────────────────────────────────────────────────────

class SmallWorldAgent(Base):
    __tablename__ = "sw_agents"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    world_id = Column(Integer, ForeignKey("sw_worlds.id"), nullable=True, index=True)
    # Core Identity
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    location = Column(String, nullable=True)
    profession = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    # Complex fields stored as JSON strings
    personality_traits = Column(Text, nullable=True)       # {openness, conscientiousness, extraversion, agreeableness, neuroticism, risk_tolerance, decision_style, motivation_drivers, core_beliefs, biases}
    behavioral_attributes = Column(Text, nullable=True)    # {communication_style, influence_level, adaptability, loyalty, stress_response}
    contextual_state = Column(Text, nullable=True)         # {current_goals, current_frustrations, incentives, constraints}
    external_factors = Column(Text, nullable=True)         # {salary, work_environment, market_exposure}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    world = relationship("SmallWorld", back_populates="agents")
    relationships_from = relationship("AgentRelationship", foreign_keys="AgentRelationship.source_agent_id", back_populates="source_agent", cascade="all, delete-orphan")
    relationships_to = relationship("AgentRelationship", foreign_keys="AgentRelationship.target_agent_id", back_populates="target_agent", cascade="all, delete-orphan")


class AgentRelationship(Base):
    __tablename__ = "sw_agent_relationships"

    id = Column(Integer, primary_key=True, index=True)
    rel_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    source_agent_id = Column(Integer, ForeignKey("sw_agents.id"), nullable=False, index=True)
    target_agent_id = Column(Integer, ForeignKey("sw_agents.id"), nullable=False, index=True)
    type = Column(String, nullable=False)                  # manager, peer, competitor, customer, etc.
    strength = Column(Float, default=0.5)                  # 0.0 (weak) to 1.0 (strong)
    sentiment = Column(String, default="neutral")          # positive, neutral, negative
    influence_direction = Column(String, default="both")   # source_to_target, target_to_source, both
    created_at = Column(DateTime, default=datetime.utcnow)

    source_agent = relationship("SmallWorldAgent", foreign_keys=[source_agent_id], back_populates="relationships_from")
    target_agent = relationship("SmallWorldAgent", foreign_keys=[target_agent_id], back_populates="relationships_to")


class SmallWorld(Base):
    __tablename__ = "sw_worlds"

    id = Column(Integer, primary_key=True, index=True)
    world_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    agents = relationship("SmallWorldAgent", back_populates="world", cascade="all, delete-orphan")
    scenarios = relationship("WorldScenario", back_populates="world", cascade="all, delete-orphan")


class WorldScenario(Base):
    __tablename__ = "sw_world_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    world_id = Column(Integer, ForeignKey("sw_worlds.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String, nullable=False)
    seed_text = Column(Text, nullable=True)
    seed_files_path = Column(String, nullable=True)
    parent_scenario_id = Column(Integer, ForeignKey("sw_world_scenarios.id"), nullable=True)
    depth = Column(Integer, default=0)
    status = Column(String, default="created")  # created, running, completed, error
    outputs_path = Column(String, nullable=True)
    report_path = Column(String, nullable=True)  # path to report JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    world = relationship("SmallWorld", back_populates="scenarios")
    user = relationship("User")
    parent = relationship("WorldScenario", remote_side=[id], back_populates="children")
    children = relationship("WorldScenario", back_populates="parent")
    chat_messages = relationship("WorldScenarioChat", back_populates="scenario", cascade="all, delete-orphan")
    events = relationship("WorldSimEvent", back_populates="scenario", order_by="WorldSimEvent.id", cascade="all, delete-orphan")


class WorldScenarioChat(Base):
    __tablename__ = "sw_world_scenario_chats"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("sw_world_scenarios.id"), nullable=False, index=True)
    is_user = Column(Boolean, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("WorldScenario", back_populates="chat_messages")


class WorldSimEvent(Base):
    __tablename__ = "sw_world_sim_events"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("sw_world_scenarios.id"), nullable=False, index=True)
    type = Column(String, nullable=False)   # stage, agent, action, round, error, done
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("WorldScenario", back_populates="events")
