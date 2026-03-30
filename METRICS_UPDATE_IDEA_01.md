# Metrics Implementation Overhaul

## Vision

Rebuild metrics system to be user-defined, AI-standardized, and fully traceable.

### Core Flow

1. **User Input (Plain Language)**: In simulation creation form, user defines what to track
    - Example product launch: "how many people like the product", "how many wanna buy", etc.
    - Example government sim: "how will employees react to policy change", "will people resign", etc.

2. **AI Standardization**: LLM converts natural language → standardized metric keys
    - "people like the product" → `likes_product` (metric_type: counter, scope: per_agent)
    - "will people resign" → `resign` (metric_type: boolean, scope: per_agent)

3. **Metric Tagging**: Each standardized metric is tagged to all agents in simulation

4. **Live Tracking**: Metric values update each time an agent takes an action

5. **Aggregation**: Per-agent metrics aggregated into composite metrics for simulation-level insights

6. **Scenario Metrics**: Users can define new metrics for individual scenarios

---

## Architectural Decisions & Fixes

### 1. Metric Normalization Robustness

**Problem**: User defines "positive sentiment" on day 1, then "people are happy" on day 3—are these the same metric?

**Solution**: Two-phase normalization with user review

- **Phase 1 (Auto)**: LLM standardizes user input + detects semantic duplicates
    ```
    User input: ["people like the product", "positive reactions", "customer satisfaction"]
    LLM output: {
      metrics: [
        { user_text: "people like the product", key: "likes_product", confidence: 0.95 },
        { user_text: "positive reactions", key: "likes_product", confidence: 0.88 },
        { user_text: "customer satisfaction", key: "satisfaction_level", confidence: 0.92 }
      ],
      duplicates: [
        { metrics: ["likes_product"], detected_from: ["user_text[0]", "user_text[1]"] }
      ]
    }
    ```
- **Phase 2 (User Review)**: Before simulation starts, show user the standardized metrics and proposed merges with checkboxes to accept/reject
- **Metric Versioning**: Store metric schema version with each simulation for reproducibility

### 2. Measurement Mechanism (Critical)

**Problem**: How do agents actually change metric values?

**Solution**: Multi-strategy approach depending on metric type

**Strategy A - Action-Inferred Updates** (for most metrics)

- Agent takes action → action description is evaluated by LLM
- LLM determines which metrics to update and by how much
- Required: Define action evaluation template
    ```
    Agent: "Reduced product price by 10%"
    Metric context: "likes_product", "intent_to_buy", "resign"
    LLM evaluates: +5 likes_product, +3 intent_to_buy, 0 resign
    ```

**Strategy B - Agent Self-Report** (for subjective metrics)

- Agent action includes explicit metric updates in structured format
- Example: `{"action": "join team", "metrics_update": {"resignation_likelihood": -2}}`
- Requires agent prompt engineering to output this structure

**Strategy C - Rule-Based Updates** (for simple cause-effect)

- User can define rules: "If action contains 'fired', then resign += 1"
- Good for template scenarios

**Recommendation**: Default to Strategy A (action-inferred), allow users to override with Rules for predictable scenarios

### 3. Metric Schema Definition

**Problem**: Are metrics counters, percentages, booleans, or time-series?

**Solution**: Explicit schema per metric

```python
@dataclass
class MetricDefinition:
    key: str                              # "likes_product"
    user_description: str                 # "how many people like the product"
    standardized_description: str         # Elaborated by LLM
    metric_type: str                      # "counter" | "percentage" | "boolean" | "categorical" | "timeseries"
    scope: str                            # "per_agent" | "aggregate" | "both"
    initial_value: int | float | bool     # How to initialize (0, 50%, False, etc.)
    aggregation_method: str               # For aggregates: "sum" | "average" | "majority" | "custom"
    unit: str | None                      # "people", "%", "count", None
    tags: list[str]                       # ["sentiment", "behavior", "business_metric"]
```

### 4. Explainability & Audit Trail

**Problem**: When likes_product goes 25% → 30%, why?

**Solution**: Metric change logging

```python
@dataclass
class MetricUpdate:
    agent_id: str
    metric_key: str
    old_value: int | float | bool
    new_value: int | float | bool
    change_magnitude: int | float
    action_id: str                        # Which agent action caused this
    action_description: str               # "Launched marketing campaign"
    llm_reasoning: str                    # Why the LLM made this choice
    timestamp: datetime
    confidence: float                     # 0.0-1.0, LLM confidence in update
```

- Store all updates in audit log
- Visualize: "Your likes_product increased by +5 because: [list of contributing agent actions]"
- Track confidence scores to flag uncertain metric updates

### 5. Metric Cardinality & Performance

**Problem**: With many agents × many custom metrics, how to handle scale?

**Solution**: Efficient storage & computation

- **Storage**: Per-agent metric values stored per simulation (normalize metrics by scenario)
- **Indexing**: Primary index: (simulation_id, agent_id, metric_key) → value
- **Aggregation Strategy**:
    - Pre-compute aggregate metrics at end of each simulation step → O(agents × metrics) every step
    - Cache composite metric calculations
    - Example: `average_likes_by_agent_group = aggregate(likes_product, group_by=agent_role)`

### 6. Scenario-Level Metric Definition

**Problem**: User wants to define metrics for individual scenarios, not just simulation-wide

**Solution**: Metric inheritance hierarchy

```
Simulation Level Metrics (all agents share)
└── Scenario Level Metrics (override or add to simulation metrics)
    └── Agent Level Metric Values (updated per action)
```

- Scenarios can introduce new metrics or modify aggregation rules for simulation metrics
- Backend validates no circular dependencies in metric definitions

### 7. Pre-Built Templates

**Problem**: Forcing every user to define metrics from scratch is friction

**Solution**: Scenario templates with common metrics

```
Product Launch Template:
- likes_product (counter)
- dislikes_product (counter)
- intent_to_buy (percentage, 0-100)
- intent_to_invest (percentage, 0-100)
- public_sentiment (categorical: positive/neutral/negative)

Government Policy Change Template:
- support_policy (percentage)
- resign_likelihood (percentage)
- productivity (percentage)
- trust_in_leadership (percentage)
- compliance (boolean)
```

Users can start with templates, then customize

---

## Implementation Roadmap

1. **Schema & Storage** (models.py, database.py)
    - Define MetricDefinition, MetricUpdate dataclasses
    - Create DB tables: metrics, metric_updates
2. **Normalization Engine** (core/metrics_normalizer.py)
    - LLM prompt for standardization + duplicate detection
    - Two-phase user review endpoint

3. **Measurement Executor** (core/metric_executor.py)
    - Action evaluation pipeline
    - Update application with audit logging
    - Confidence scoring

4. **Aggregation Engine** (core/metrics_aggregator.py)
    - Aggregate metric calculations
    - Composite metric definitions
    - Caching strategy

5. **Frontend** (Create Simulation Form)
    - Natural language metric input
    - Review & confirm standardized metrics
    - Select templates or custom

6. **Reporting** (Session Report)
    - Show metric values per agent
    - Show metric changes timeline with contributing actions
    - Composite metric cards

---

## Data Model Summary

```python
# Simulations have a metrics_schema
SimulationMetricsSchema:
  - simulation_id
  - metrics: List[MetricDefinition]
  - created_at
  - version

# Agents store metric values per simulation
AgentMetricValues:
  - agent_id + simulation_id + metric_key (composite key)
  - values: List[MetricSnapshot]  # time-series or final
  - last_updated

# Changes are fully auditable
MetricUpdateLog:
  - agent_id + simulation_id + metric_key + timestamp
  - old_value, new_value, change_magnitude
  - action_id, action_description
  - llm_reasoning, confidence
```
