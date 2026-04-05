from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    credits: float = 1.0

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    pass # Add fields if needed on creation

class SessionResponse(BaseModel):
    id: int
    session_id: str
    created_at: datetime
    status: str
    title: Optional[str]
    rounds: int
    inputs_path: str
    outputs_path: str

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    text: str
    is_user: bool

class ChatMessageResponse(ChatMessageBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class SimulationEventResponse(BaseModel):
    id: int
    type: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    description: str


class ReportResponse(BaseModel):
    id: int
    report_id: str
    session_id: int
    title: str
    description: str
    file_path: str
    created_at: datetime
    session_title: Optional[str] = None
    session_uuid: Optional[str] = None
    is_scenario_report: bool = False
    scenario_id: Optional[str] = None
    scenario_name: Optional[str] = None

    class Config:
        from_attributes = True


class ScenarioCreate(BaseModel):
    name: str
    description: str
    rounds: int = 1


class ScenarioResponse(BaseModel):
    id: int
    scenario_id: str
    session_id: int
    name: str
    description: str
    rounds: int
    status: str
    outputs_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScenarioChatMessageResponse(BaseModel):
    id: int
    is_user: bool
    text: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ScenarioEventResponse(BaseModel):
    id: int
    type: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class MetricsStatusResponse(BaseModel):
    available: bool
    generated_at: Optional[str] = None
    num_rounds: Optional[int] = None


class InfluenceDetails(BaseModel):
    total_influence: float
    amplification_factor: float
    growth_rate: float
    reach: int
    top_post_ids: List[int]


class AgentMetricsResponse(BaseModel):
    influence: dict
    dominance: dict
    drift: dict
    influence_details: Optional[dict] = None  # Maps agent -> InfluenceDetails


class EngagementMetrics(BaseModel):
    avg_engagement_rate: float
    max_engagement_rate: float
    consistency: float


class EngagementMetricsResponse(BaseModel):
    engagement: dict  # Maps agent -> EngagementMetrics


class NetworkMetricsResponse(BaseModel):
    pagerank: dict
    density: float
    density_by_round: Optional[dict] = None
    echo_chamber_index: float
    homophily_score: Optional[float] = None


class SpreadMetricsResponse(BaseModel):
    adoption_curves: dict
    half_life: dict
    co_occurrence: list


class NarrativeTransition(BaseModel):
    from_concept: str = None
    to_concept: str = None
    count: int
    
    class Config:
        # Allow field names with 'from' keyword
        populate_by_name = True
        
    def __init__(self, **data):
        # Handle 'from' field mapping
        if 'from' in data:
            data['from_concept'] = data.pop('from')
        if 'to' in data:
            data['to_concept'] = data.pop('to')
        super().__init__(**data)


class NarrativeMetricsResponse(BaseModel):
    top_transitions: List[dict]
    total_chains: int


class TemporalMetricPoint(BaseModel):
    round: int
    value: float


class TemporalMetricsResponse(BaseModel):
    metric_name: str
    agent_id: Optional[str] = None
    data: List[TemporalMetricPoint]


class InsightItem(BaseModel):
    type: str  # 'agent_growth', 'echo_chamber', 'concept_momentum', etc.
    title: str


# ── Insights / Agent Debate schemas ──────────────────────────────────────────

class InsightsGenerateRequest(BaseModel):
    query: str
    debate_rounds: int = 3


class InsightSummary(BaseModel):
    insight_id: str
    query: str
    debate_rounds: int
    status: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class InsightObservation(BaseModel):
    id: str
    text: str
    answer_text: str


class AgentRoundPosition(BaseModel):
    round: int
    position: str
    reasoning: str


class AgentDebateRecord(BaseModel):
    agent_id: str
    agent_name: str
    influence_score: float
    position_history: List[AgentRoundPosition]
    final_position: str
    final_reasoning: str


class AnswerGroup(BaseModel):
    group_id: str
    label: str
    summary: str
    agent_ids: List[str]
    agent_count: int
    percentage: float


class InsightsScore(BaseModel):
    agree: float
    disagree: float
    other: float


class InsightsStatusResponse(BaseModel):
    available: bool
    generated_at: Optional[str] = None
    status: str = "pending"
    stage: Optional[str] = None
    error: Optional[str] = None


class InsightsFullResponse(BaseModel):
    available: bool
    generated_at: Optional[str] = None
    query: Optional[str] = None
    debate_rounds: Optional[int] = None
    insights: List[InsightObservation] = []
    overall_verdict: Optional[str] = None
    score: Optional[InsightsScore] = None
    answer_groups: List[AnswerGroup] = []
    agents: List[AgentDebateRecord] = []
    aggregate: Optional[dict] = None
    error: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None  # 'info', 'warning', 'critical', 'success'
    key_finding: Optional[str] = None  # One sentence summary/takeaway
    related_entities: Optional[dict] = None  # agent_ids, concept names, etc.


class MetricsSummaryResponse(BaseModel):
    insights: List[InsightItem]
    key_metrics: dict  # Top-level KPIs


class MetricsFullResponse(BaseModel):
    """Unified response containing all metrics data plus status"""
    available: bool
    generated_at: Optional[str] = None
    num_rounds: Optional[int] = None
    agents: Optional[dict] = None  # AgentMetricsResponse structure
    network: Optional[dict] = None  # NetworkMetricsResponse structure
    spread: Optional[dict] = None  # SpreadMetricsResponse structure
    engagement: Optional[dict] = None  # EngagementMetricsResponse structure
    narratives: Optional[dict] = None  # NarrativeMetricsResponse structure
    summary: Optional[dict] = None  # MetricsSummaryResponse structure


class CreditsResponse(BaseModel):
    email: str
    credits_usd: float
    display_credits: int   # credits_usd * CREDITS_PER_USD
    initial_credits: int   # FREE_CREDITS_ON_SIGNUP_USD * CREDITS_PER_USD


class PromoCodeRedeemRequest(BaseModel):
    code: str


class PromoCodeRedeemResponse(BaseModel):
    success: bool
    message: str
    credits_added: int = 0       # display credits added


# ── Question-Based Metrics (Idea #2) ─────────────────────────────────────────

class EvidenceResponse(BaseModel):
    agent_id: str
    agent_name: str
    action_description: str
    relevance_to_answer: str
    weight: float  # 0.0–1.0


class QuestionAnswerResponse(BaseModel):
    question_id: str
    question: str
    answer: str           # "YES" | "NO" | "MAYBE"
    confidence: float     # 0.0–1.0
    reasoning: str
    evidence: List[EvidenceResponse]
    caveats: str


class QAMetricsFullResponse(BaseModel):
    """Complete question-based metrics payload returned by the unified endpoint."""
    available: bool
    generated_at: Optional[str] = None
    objective: Optional[str] = None
    questions: List[str] = []
    answers: List[QuestionAnswerResponse] = []
    aggregate: Optional[dict] = None
    error: Optional[str] = None


# ── Small World schemas ───────────────────────────────────────────────────────

class PersonalityTraits(BaseModel):
    openness: Optional[float] = None          # 0-1
    conscientiousness: Optional[float] = None
    extraversion: Optional[float] = None
    agreeableness: Optional[float] = None
    neuroticism: Optional[float] = None
    risk_tolerance: Optional[float] = None
    decision_style: Optional[str] = None      # analytical, emotional, impulsive
    motivation_drivers: Optional[List[str]] = None
    core_beliefs: Optional[str] = None
    biases: Optional[List[str]] = None


class BehavioralAttributes(BaseModel):
    communication_style: Optional[str] = None  # direct, passive, aggressive
    influence_level: Optional[float] = None    # 0-1
    adaptability: Optional[float] = None       # 0-1
    loyalty: Optional[float] = None            # 0-1
    stress_response: Optional[str] = None


class ContextualState(BaseModel):
    current_goals: Optional[List[str]] = None
    current_frustrations: Optional[List[str]] = None
    incentives: Optional[List[str]] = None
    constraints: Optional[List[str]] = None


class ExternalFactors(BaseModel):
    salary: Optional[str] = None
    work_environment: Optional[str] = None
    market_exposure: Optional[str] = None


class AgentCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    profession: Optional[str] = None
    job_title: Optional[str] = None
    organization: Optional[str] = None
    personality_traits: Optional[PersonalityTraits] = None
    behavioral_attributes: Optional[BehavioralAttributes] = None
    contextual_state: Optional[ContextualState] = None
    external_factors: Optional[ExternalFactors] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    profession: Optional[str] = None
    job_title: Optional[str] = None
    organization: Optional[str] = None
    personality_traits: Optional[PersonalityTraits] = None
    behavioral_attributes: Optional[BehavioralAttributes] = None
    contextual_state: Optional[ContextualState] = None
    external_factors: Optional[ExternalFactors] = None


class AgentRelationshipCreate(BaseModel):
    target_agent_id: str   # agent_id UUID of target
    type: str
    strength: Optional[float] = 0.5
    sentiment: Optional[str] = "neutral"
    influence_direction: Optional[str] = "both"


class AgentRelationshipUpdate(BaseModel):
    type: Optional[str] = None
    strength: Optional[float] = None
    sentiment: Optional[str] = None
    influence_direction: Optional[str] = None


class AgentRelationshipResponse(BaseModel):
    id: int
    rel_id: str
    source_agent_id: str
    target_agent_id: str
    source_agent_name: Optional[str] = None
    target_agent_name: Optional[str] = None
    type: str
    strength: float
    sentiment: str
    influence_direction: str

    class Config:
        from_attributes = True


class AgentResponse(BaseModel):
    id: int
    agent_id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    profession: Optional[str] = None
    job_title: Optional[str] = None
    organization: Optional[str] = None
    personality_traits: Optional[dict] = None
    behavioral_attributes: Optional[dict] = None
    contextual_state: Optional[dict] = None
    external_factors: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    relationship_count: Optional[int] = 0

    class Config:
        from_attributes = True


class AgentGraphResponse(BaseModel):
    agents: List[AgentResponse]
    relationships: List[AgentRelationshipResponse]


class AgentGenerateRequest(BaseModel):
    name: str
    profession: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None
    age: Optional[int] = None
    description: str   # free-text natural language description


class AutoSuggestRelationshipsRequest(BaseModel):
    agent_ids: List[str]   # list of agent_id UUIDs


class WorldCreate(BaseModel):
    name: str
    description: Optional[str] = None
    agent_ids: List[str] = []   # list of agent_id UUIDs


class WorldUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    agent_ids: Optional[List[str]] = None


class WorldResponse(BaseModel):
    id: int
    world_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    agent_count: int = 0
    scenario_count: int = 0

    class Config:
        from_attributes = True


class WorldScenarioCreate(BaseModel):
    name: str
    seed_text: Optional[str] = None
    parent_scenario_id: Optional[str] = None   # scenario_id UUID


class WorldScenarioResponse(BaseModel):
    id: int
    scenario_id: str
    world_id: str
    name: str
    seed_text: Optional[str] = None
    parent_scenario_id: Optional[str] = None
    depth: int
    status: str
    outputs_path: Optional[str] = None
    report_path: Optional[str] = None
    created_at: datetime
    children: List['WorldScenarioResponse'] = []

    class Config:
        from_attributes = True


WorldScenarioResponse.model_rebuild()


class WorldScenarioChatMessage(BaseModel):
    text: str


class WorldScenarioChatResponse(BaseModel):
    id: int
    is_user: bool
    text: str
    timestamp: datetime

    class Config:
        from_attributes = True


class WorldScenarioEventResponse(BaseModel):
    id: int
    type: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class HealthCheckItem(BaseModel):
    level: str       # warning, error, info
    message: str
    affected_agents: List[str] = []


class ScenarioDiffRequest(BaseModel):
    scenario_id_a: str
    scenario_id_b: str


