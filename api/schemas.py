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
    description: str
    severity: str  # 'info', 'warning', 'critical', 'success'
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


