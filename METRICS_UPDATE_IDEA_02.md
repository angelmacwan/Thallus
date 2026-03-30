# Question-Based Metrics (Idea #2)

## Core Concept

Remove hardcoded metrics entirely. Instead:

1. User inputs **simulation objective** in creation form
    - Example: "Understand how employees react to salary cut"
2. Backend uses AI to generate **dynamic investigation questions**
    - "Will employee morale drop?"
    - "How many will resign?"
    - "Will internal conflicts increase?"
3. Simulation runs with agents taking actions

4. Backend uses AI to **answer generated questions** based on simulation data
    - Shows answers with evidence + confidence scores
    - Links to specific agent actions that support each answer

---

## Key Implementation Details

### 1. Trustworthiness & Evidence-Based Answers

**Problem**: How does AI answer questions accurately? Risk of hallucination.

**Solution**: Force evidence citation + confidence scoring

```python
@dataclass
class QuestionAnswer:
    question: str                          # "Will employee morale drop?"
    answer: str                            # "Yes"
    confidence: float                      # 0.0-1.0, LLM confidence
    evidence: List[Evidence]               # Citations to support answer
    reasoning: str                         # Why the AI reached this conclusion

@dataclass
class Evidence:
    agent_id: str
    action_description: str                # What the agent did
    action_timestamp: datetime
    relevance_to_answer: str               # Why this action matters for the question
    weight: float                          # How much this action influences the answer (0.0-1.0)
```

**Prompt Template for Answer Generation**:

```
Given the objective: "{objective}"
Question to answer: "{question}"

Simulation data:
- {num_agents} agents participated
- Agent actions log: {action_summary}
- Agent interaction history: {interaction_summary}

Please answer the question with:
1. A clear YES/NO/MAYBE answer
2. 3-5 specific agent actions that support your answer
3. Why each action is relevant
4. Your confidence (0-100%) in this answer
5. Any important caveats or uncertainties

Format as JSON for parsing.
```

**Frontend Display**:

```
Question: "Will employee morale drop?"
Answer: YES (87% confidence)

Evidence:
  • Agent #3 (John) left the team after salary cut announced
    → Suggests negative morale impact
  • Agents #1, #2, #5 reduced collaboration conversations by 60%
    → Indicates disengagement
  • Agent #4 submitted compliant but minimal work
    → Shows resignation/apathy response

⚠️ Caveat: Limited sample size (6 agents), results may not generalize
```

---

### 2. Cost & Performance Optimization

**Problem**: LLM calls are expensive. Generate questions + answer questions = multiple expensive calls.

**Solution**: Batch operations + caching strategy

**Phase 1 - Question Generation** (1 LLM call)

```python
questions = generate_questions(
    objective="Understand salary cut impact",
    context={
        "agent_count": 50,
        "simulation_type": "enterprise",
        "relevant_factors": ["compensation", "morale", "retention"]
    }
)
# Output: 5-8 targeted questions
# Cost: 1 API call (cached per objective type)
```

**Phase 2 - Behavior Summarization** (Batch, 1 call)

```
Instead of analyzing full action logs for each question,
pre-compute behavior summaries:

Per Agent:
  - Top 3-5 most significant actions
  - Behavioral clusters (resigned, disengaged, committed, etc.)
  - Sentiment trend (positive→neutral→negative)
  - Key decisions made

Aggregate:
  - Total resignations
  - Team collaboration trends
  - Sentiment distribution
  - Conflict/agreement patterns

Cache these summaries per simulation
```

**Phase 3 - Answer Questions** (1 batch LLM call for all questions)

```python
answers = answer_all_questions(
    questions=questions,
    agent_summaries=cached_summaries,           # Pre-computed
    aggregate_metrics=cached_aggregate_metrics
)
# Instead of N questions × M variations = N separate calls
# Now: 1 call with all questions at once
# LLM handles: "Here are 8 questions, here's the simulation summary, answer all"
```

**Caching Strategy**:

```
Cache by:
  - simulation_id → behavior_summaries (never changes)
  - objective_type → question_template (reuse across similar sims)
  - question_id + simulation_id → answers (reuse if re-generating)

Invalidate:
  - When simulation data updated
  - When objectives significantly different

Result: 3 LLM calls per simulation (generate → summarize → answer)
        vs. 1 + N + N = 1 + 2N calls without batching
```

---

### 3. Audit Trail & Evidence Linking

**Problem**: Black box answers. "Why did you say people will resign?" Hard to trace.

**Solution**: Complete evidence chain from question → LLM reasoning → specific agent actions

```python
@dataclass
class AuditTrail:
    question_id: str
    question_text: str
    answer: str

    # Level 1: What reasoning did the LLM use?
    llm_reasoning_steps: List[str]         # Step-by-step logic chain

    # Level 2: Which agent behaviors were evaluated?
    evaluated_behaviors: List[str]         # "resignation", "productivity_drop", etc.

    # Level 3: Which specific actions triggered these behaviors?
    supporting_actions: List[SupportingAction]

@dataclass
class SupportingAction:
    agent_id: str
    action_id: str
    action_description: str
    timestamp: datetime
    behavior_triggered: str                # How this action connects to answer
    action_category: str                   # "departure", "disengagement", "conflict", etc.
    contribution_weight: float             # 0.0-1.0: How much this influenced the answer
```

**Frontend Evidence Explorer**:

```
Click "Show Evidence" → Drill-down view:

Q: "Will employee morale drop?"
A: YES (87% confidence)
├─ Reasoning Step 1: "Morale impacts are evidenced by departures & disengagement"
├─ Reasoning Step 2: "Team collaboration metrics dropped 60%"
├─ Reasoning Step 3: "Salary cuts typically trigger resign behaviors"
│
├─ Behavior: Resignation (40% contribution to answer)
│  └─ Agent #3 (John) left team → Action ID: action_2847
│     └─ [Link] View action details and context
│
├─ Behavior: Disengagement (45% contribution)
│  └─ Agents #1, #2, #5, #7 reduced collaboration
│     └─ [Timeline] Show collaboration metric drop over time
│
└─ Behavior: Minimal Work (15% contribution)
   └─ Agent #4 submitted work but quality/effort reduced
      └─ [Comparison] Compare pre/post salary cut behavior
```

**Traceable Data Model**:

```python
# Every answer points back to source evidence
Answer
  ├─ links to → QuestionEvaluation
  │             └─ links to → EvaluatedBehavior
  │                           └─ links to → AgentAction(s)
  │                                        └─ links to → Original Action Log
  │
  # Full chain: Answer → LLM Logic → Behavior Pattern → Specific Agent Actions → Raw Data
  # User can trace "Yes people will resign" all the way back to John leaving on Step 4
```

---

## Summary: Trust-First Design

| Component          | How It Builds Trust                               |
| ------------------ | ------------------------------------------------- |
| Confidence Scores  | Transparent about LLM uncertainty                 |
| Evidence Citations | Every claim linked to agent actions               |
| Detailed Reasoning | Show the logical steps, not just conclusion       |
| Audit Trail        | User can drill down to source data                |
| Caching/Versioning | Reproducible results, same question = same answer |
