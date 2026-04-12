"""
Central prompt library.

Every function accepts the data needed to build one prompt and returns the
complete prompt string.  No LLM calls are made here.
"""


# ── Agent Generator ───────────────────────────────────────────────────────────

def agent_profile_prompt(field_lines: str, description: str) -> str:
    return f"""You are an expert organizational psychologist and agent profile designer.

A user wants to create a simulation agent with the following known details:
{field_lines}

Natural language description from the user:
"{description}"

Generate a COMPLETE agent profile. Return ONLY a valid JSON object with exactly these fields:

{{
  "name": "<string>",
  "age": <integer or null>,
  "gender": "<string or null>",
  "location": "<string>",
  "profession": "<string>",
  "job_title": "<string>",
  "organization": "<string>",
  "personality_traits": {{
    "openness": <float 0-1>,
    "conscientiousness": <float 0-1>,
    "extraversion": <float 0-1>,
    "agreeableness": <float 0-1>,
    "neuroticism": <float 0-1>,
    "risk_tolerance": <float 0-1>,
    "decision_style": "<analytical|emotional|impulsive>",
    "motivation_drivers": ["<string>", ...],
    "core_beliefs": "<string>",
    "biases": ["<string>", ...]
  }},
  "behavioral_attributes": {{
    "communication_style": "<direct|passive|aggressive>",
    "influence_level": <float 0-1>,
    "adaptability": <float 0-1>,
    "loyalty": <float 0-1>,
    "stress_response": "<string>"
  }},
  "contextual_state": {{
    "current_goals": ["<string>", ...],
    "current_frustrations": ["<string>", ...],
    "incentives": ["<string>", ...],
    "constraints": ["<string>", ...]
  }},
  "external_factors": {{
    "salary": "<string or null>",
    "work_environment": "<string>",
    "market_exposure": "<string or null>"
  }}
}}

Rules:
- Keep all existing known values unchanged.
- Infer realistic, internally consistent values for missing fields based on the description.
- Big Five scores (openness, conscientiousness, extraversion, agreeableness, neuroticism) must be floats between 0.0 and 1.0.
- Return ONLY the JSON object, no markdown, no explanation.
"""


def suggest_relationships_prompt(agent_summaries: str, max_relationships: int) -> str:
    return f"""You are an expert in organizational dynamics and social network analysis.

Given the following agents in a simulation world:
{agent_summaries}

Suggest realistic relationships between them. Return ONLY a JSON array where each item has:
{{
  "source_agent_id": "<agent_id string>",
  "target_agent_id": "<agent_id string>",
  "type": "<free text describing the relationship (e.g., father, CEO, mentor, stakeholder, customer, peer, co-founder, rival, investor, friend, employee)>",
  "strength": <float 0-1>,
  "sentiment": "<positive|neutral|negative>",
  "influence_direction": "<source_to_target|target_to_source|both>"
}}

Rules:
- The "type" field must be a natural relation, specific label (not generic like "related").
- Relationships can be personal, professional, social, economic, or anything realistic.
- Prefer precise roles (e.g., "CEO", "daughter", "co-founder", "direct manager", "landlord", "primary investor").
- Only suggest relationships that make sense given each agent's role and organization.
- Do not create self-relationships.
- Be selective — not everyone needs to be connected to everyone.
- Return between 1 and {max_relationships} relationships.
- Return ONLY the JSON array.
"""


# ── Insights Engine ───────────────────────────────────────────────────────────

def generate_insights_prompt(
    query: str,
    total_agents: int,
    total_posts: int,
    total_interactions: int,
    profiles_text: str,
    top_posts_text: str,
) -> str:
    return f"""You are an expert analyst reviewing how a group of real people responded to a recent event or topic.

USER QUERY: "{query}"

DISCUSSION OVERVIEW:
- Total participants: {total_agents}
- Total posts made: {total_posts}
- Total interactions: {total_interactions}

PARTICIPANT PROFILES:
{profiles_text}

SAMPLE POSTS FROM THE DISCUSSION:
{top_posts_text}

TASK:
Extract the following structured intelligence from the discussion data above, directly addressing the user's query:

1. OUTCOME DISTRIBUTION — What specific outcomes are the participants predicting? \
Estimate the approximate % predicting each outcome (e.g., churn increase, revenue growth, \
public backlash, long-term success, regulatory response, etc.).

2. TOP RISKS — The 3 most significant risks or negative outcomes surfacing across the participant population.

3. TOP OPPORTUNITIES — The 3 most significant positive outcomes or opportunities identified.

4. KEY DISAGREEMENTS — The biggest point of disagreement between participant clusters \
(i.e., where participants are most split). Name the opposing camps.

5. BEHAVIORAL PATTERNS — Notable patterns in how participants engaged with the topic \
(e.g., influence cascades, polarization, consensus formation, thought leaders).

Return a JSON array of 4-6 insight objects. Each object must have:
- "id": "i_0", "i_1", etc.
- "category": one of "outcome_distribution" | "risk" | "opportunity" | "disagreement" | "behavioral_pattern"
- "text": the insight statement (1-2 sentences, evidence-grounded and specific)
- "answer_text": a direct answer to the query from this insight's perspective (1-2 sentences)
- "soft_metrics_noted": array of relevant soft metrics touched on \
(e.g., ["sentiment_shifts", "influence_spread", "consensus_formation", "polarization"])

Return ONLY the JSON array, no other text."""


def initial_agent_votes_prompt(query: str, agents_json: str) -> str:
    return f"""You are roleplaying as each of the following people, based on their actual profiles and posting history.

USER QUERY: "{query}"

The people below each have a unique personality, background, and posting history. \
Generate each person's authentic initial response to the query based on who they are.

PARTICIPANTS:
{agents_json}

TASK:
For each person, generate their honest initial position in response to the user's query. \
The position should feel authentic to their character — shaped by their persona, MBTI, \
interests, and actual posts. Treat the scenario as real: do NOT frame responses as hypothetical or simulated.

When formulating positions, consider how each person might view:
- The emotional or psychological dimensions of the query (sentiment around the topic)
- How their ideas or values might spread or resonate with peers
- Whether they see the issue as triggering cascading consequences
- The stability or volatility of their stance on this—how firm vs uncertain they are
- Points of potential consensus or disagreement with others

Return a JSON array — one entry per person — each with:
- "agent_id": the person's id string (e.g. "0", "1", ...)
- "agent_name": the person's name
- "position": the person's stance ("support" | "oppose" | "neutral") followed by 1-2 sentences of authentic character voice
- "prediction": a specific, concrete outcome this person predicts (1 sentence, e.g. \
  "Churn will increase ~15% in the first 3 months among casual users.")
- "reasoning": why they hold this position, grounded in their profile or posts (1-2 sentences)
- "confidence": 'high' | 'medium' | 'low' — how confident this person is in their prediction
- "conviction_level": 'strong' | 'moderate' | 'weak' — how firm their stance is

Return ONLY the JSON array. No other text."""


def debate_round_prompt(
    query: str,
    positions_text: str,
    round_num: int,
    total_rounds: int,
) -> str:
    return f"""You are facilitating round {round_num} of {total_rounds} of a structured debate among real people about a real event or topic.

USER QUERY: "{query}"

CURRENT POSITIONS (end of round {round_num - 1}):
{positions_text}

Each person has now read all other participants' positions and reasoning. Generate each person's \
updated response. Participants may:
- Strengthen their original position with new arguments
- Shift their stance if persuaded by another agent (sentiment/emotional shifts)
- Find nuance or partial agreement (consensus formation)
- Challenge a specific other agent by name (thought leadership and influence dynamics)
- Show increased or decreased conviction based on how others respond (stability vs volatility)

Pay attention to SOFT METRICS as agents update:
- How is consensus/divergence forming across the group?
- Are any agents cascading off others' ideas? Who is influencing whom?
- Is sentiment in discussion becoming more polarized or unified?
- Who is emerging as thought leaders driving the narrative?
- How stable vs volatile are agents' positions—are they shifting or holding firm?

Return a JSON array — one entry per agent — each with:
- "agent_id": same id as above
- "agent_name": same name as above
- "position": updated stance ("support" | "oppose" | "neutral") plus 1-2 sentences of updated reasoning
- "prediction": updated specific outcome prediction (may refine based on others' arguments)
- "reasoning": updated reasoning, possibly referencing other agents by name (1-2 sentences)
- "confidence": 'high' | 'medium' | 'low' — updated confidence level
- "conviction_change": 'stronger' | 'same' | 'weaker' — how did conviction evolve this round?
- "influenced_by": optional array of agent names whose arguments influenced this update

Return ONLY the JSON array. No other text."""


def compile_results_prompt(query: str, positions_json: str) -> str:
    return f"""You are synthesizing the final results of a structured debate about a real-world topic.

USER QUERY: "{query}"

FINAL AGENT POSITIONS (after all debate rounds):
{positions_json}

TASK:
Synthesize these positions into a coherent result. Group agents by similarity of position, \
and analyze the SOFT METRICS that shaped the outcome:

**Key metrics to assess:**
- **Consensus vs Polarization**: Did agents converge or split into opposing camps? How distinct are the factions?
- **Thought Leaders**: Which agents drove the narrative? Whose predictions were most influential?
- **Sentiment Trajectory**: How did emotional tone evolve? More heated, unified, or nuanced by the end?
- **Prediction Confidence**: Were agents generally confident or uncertain? Did confidence shift during debate?
- **Outcome Distribution**: What % broadly predict each outcome (churn, revenue, backlash, success)?

Return a single JSON object with:
- "overall_verdict": a balanced, synthesized answer to the user's query (2-4 sentences) \
  representing the collective intelligence that emerged from the debate — must reference \
  specific outcomes (not vague sentiment summaries)
- "short_term_outlook": concrete prediction for 0-3 months — what happens immediately? \
  (1-2 sentences covering likely user reactions, churn, sentiment)
- "long_term_outlook": concrete prediction for 3-12+ months — equilibrium outcome? \
  (1-2 sentences covering revenue trajectory, market position, sustained sentiment)
- "key_metrics": {{
    "churn": "increase" | "decrease" | "neutral",
    "revenue": "increase" | "decrease" | "neutral",
    "sentiment": "positive" | "negative" | "mixed"
  }}
- "score": {{ "agree": float, "disagree": float, "other": float }} — fractions of agents \
  that broadly support vs oppose the decision being analyzed (must sum to 1.0)
- "soft_metrics_summary": 2-3 sentences on key patterns: consensus/polarization level, \
  thought leaders that emerged, sentiment arc, and how stable final positions were
- "answer_groups": array of 2-4 distinct clusters of agents with similar positions:
  - "group_id": "g_0", "g_1", etc.
  - "label": short label for this group's shared stance (3-8 words)
  - "summary": what agents in this group believe and predict (1-2 sentences)
  - "agent_ids": array of agent_id strings in this group (cover ALL agents across all groups)

Return ONLY the JSON object. No other text."""


# ── Ontology Generator ────────────────────────────────────────────────────────

def generate_ontology_prompt(graph_summary: str) -> str:
    return f"""You are an expert ontology engineer specialising in OWL/RDF knowledge graphs.

Analyse the following graph extracted from source documents and produce a formal,
reusable ontology that faithfully captures the domain semantics.

Graph data:
{graph_summary}

Return ONLY a valid JSON object with exactly these top-level keys:

"classes"            – list of class objects:
    {{ "name": str (CamelCase IRI fragment),
       "label": str (human-readable),
       "description": str,
       "superclass": str | null }}

"object_properties"  – list of object-property objects:
    {{ "name": str (camelCase IRI fragment),
       "label": str,
       "domain": str (class name),
       "range": str (class name),
       "description": str }}

"data_properties"    – list of data-property objects:
    {{ "name": str (camelCase IRI fragment),
       "label": str,
       "domain": str (class name),
       "type": str (xsd type, e.g. "xsd:string"),
       "description": str }}

"individuals"        – list of named individuals:
    {{ "name": str, "class": str, "properties": {{ prop: value }} }}

"axioms"             – list of logical axiom descriptions (plain English)

Guidelines:
- Generalise where possible: prefer abstract superclasses over flat lists.
- Capture IS-A, PART-OF, and domain-specific semantic relations as object properties.
- Every entity from the graph should map to an individual of an appropriate class.
- Keep class and property names concise, unique, and meaningful.
"""


# ── Profile Generator ─────────────────────────────────────────────────────────

def agents_from_objective_prompt(
    objective: str,
    doc_context: str,
    count: int,
    role_note: str,
) -> str:
    return f"""You are creating profiles for a diverse group of real social media users who will be discussing the following real-world topic or event.

TOPIC / EVENT:
"{objective if objective else '(no specific topic — generate a diverse, relevant population)'}"

DOCUMENT CONTEXT (knowledge graph extracted from uploaded materials):
{doc_context}

TASK:
{role_note}

POPULATION DESIGN RULES:
1. The majority (60-70%) must be regular people directly affected by the topic:
   - Heavy users / power users
   - Casual users (e.g. once a month)
   - Long-term loyal users
   - Budget-conscious users / price-sensitive subscribers
   - Family plan users / account sharers
   - Students and young adults
   - Elderly or less tech-savvy users
   Include real demographic variety: ages 18-70, multiple countries, different income levels.

2. The minority (30-40%) should be relevant insiders and industry observers:
   - Company executives / product leads / engineers
   - Investors / financial analysts
   - Industry journalists / media commentators
   - Competing service executives
   - Regulators / policy researchers (if relevant)
   Each should have a clear professional stake in the topic.

3. Every agent's PERSONA must reflect their genuine attitude toward this topic or event:
   - Some should be supportive, some opposed, some uncertain
   - Their persona should foreshadow their likely opinion
   - Personas must be authentic, specific, and grounded in their real-world role
   - IMPORTANT: personas must NOT reference being in a simulation or role-play — they are real people

Generate exactly {count} agent profiles.
Return ONLY a JSON array of {count} objects, each with these exact keys:
  "realname"          – unique full name (string)
  "username"          – unique social-media handle: lowercase letters, digits, underscores only
  "bio"               – 1-2 sentence social-media bio (string)
  "persona"           – 2-3 sentence character description including their stance on the topic (string)
  "age"               – integer between 18-75
  "gender"            – "male" | "female" | "non-binary"
  "mbti"              – Myers-Briggs type code, e.g. "INTJ"
  "country"           – country of residence
  "profession"        – profession
  "interested_topics" – list of 2-4 interest topics directly related to the topic
"""


def extract_topics_from_graph_prompt(context: str) -> str:
    return (
        "Based on this knowledge graph, generate 12 meaningful topic phrases that describe "
        "the key themes and subject areas that people might be interested in and discuss on social media.\n\n"
        f"Context:\n{context}\n\n"
        "Requirements:\n"
        "- Each topic must be a meaningful phrase of 2-5 words, NOT a single generic word or entity type\n"
        "- Topics should represent specific interests that would motivate someone to engage with this content\n"
        "- GOOD examples: 'enterprise cloud migration', 'AI-driven business transformation', "
        "'strategic consulting partnerships'\n"
        "- BAD examples: 'organization', 'ibm', 'concept' (too vague or just raw tokens)\n"
        "- Return ONLY a JSON array of 12 strings"
    )


def synthetic_agents_prompt(
    batch_count: int,
    topics: str,
    objective_context: str,
) -> str:
    return f"""Generate {batch_count} diverse social media user profiles for people discussing a real-world topic.

Base these profiles on the following context topics: {topics}{objective_context}

Return ONLY a JSON array of {batch_count} objects, each with these exact keys:
  "realname"         – unique full name (string)
  "username"         – unique social-media handle: lowercase letters, digits, underscores only
  "bio"              – 1-2 sentence social-media bio (string)
  "persona"          – 2-3 sentence character/personality description (string)
  "age"              – integer between 18-75
  "gender"           – "male" | "female" | "non-binary"
  "mbti"             – Myers-Briggs type code, e.g. "INTJ"
  "country"          – country of origin
  "profession"       – professional field relevant to the topics
  "interested_topics" – list of 2-4 interest topics from the context

Make each profile unique and diverse. Vary the professions, ages, countries, and perspectives.
"""


def infer_role_prompt(name: str, context: str) -> str:
    return f"""Based on the following information about {name}, infer their most likely professional role or occupation.

Context:
{context}

Respond with ONLY ONE of these roles (choose the best fit):
politician, diplomat, ambassador, journalist, reporter, military_officer, spokesperson, analyst, activist, researcher, scientist, engineer, executive, ceo, official, advisor, expert, doctor, teacher, author, artist, athlete, lawyer, judge

If none fit well, respond with: person

Role:"""


def generate_one_agent_prompt(name: str, ent_type: str, objective_context: str) -> str:
    return f"""Generate an OASIS social-media user profile for {name}, a {ent_type}.{objective_context}

Return ONLY a JSON object with exactly these keys:
  "realname"         – full real name (string)
  "username"         – social-media handle: lowercase letters, digits, underscores only
  "bio"              – 1-2 sentence social-media bio (string)
  "persona"          – 2-3 sentence character/personality description (string)
  "age"              – integer
  "gender"           – "male" | "female" | "non-binary"
  "mbti"             – Myers-Briggs type code, e.g. "INTJ"
  "country"          – country of origin (string)
  "profession"       – professional field (string)
  "interested_topics" – list of 2-3 interest topic strings
"""


# ── Question Metrics ──────────────────────────────────────────────────────────

def generate_questions_prompt(objective: str, agent_count: int) -> str:
    return f"""You are designing an investigation plan to analyze how real people responded to an event or topic.

Topic / Event: "{objective}"
Number of participants: {agent_count}

Generate exactly 6 specific, measurable investigation questions that a researcher would \
want answered to evaluate how people reacted to this topic or event. \
Each question must be answerable with YES / NO / MAYBE based on observable participant behaviors \
(what they posted, how they interacted, what topics they discussed).

Focus question types evenly across:
- Behavioral outcomes (What did participants actually do?)
- Sentiment / opinion outcomes (How did participants feel or express emotion?)
- Social dynamics (How did participants interact with each other?)
- Emergent patterns (Did unexpected behaviors appear?)

Return ONLY a JSON array of 6 question strings. No extra keys, no wrapper object.
Example format: ["Question 1?", "Question 2?", "Question 3?"]"""


def answer_questions_prompt(
    objective: str,
    total_agents: int,
    total_actions: int,
    total_posts: int,
    total_interactions: int,
    agent_summaries_json: str,
    action_log_sample_json: str,
    questions_json: str,
    questions_count: int,
) -> str:
    return f"""You are a rigorous analyst. Answer the following investigation \
questions based SOLELY on the evidence provided below. Do NOT invent, hallucinate, or assume \
any participant behaviors that are not shown in the data.

═══════════════════════════════════════════
TOPIC / EVENT (treat as real ground truth)
═══════════════════════════════════════════
"{objective}"

═══════════════════════════════════════════
AGGREGATE STATISTICS
═══════════════════════════════════════════
- Total participants: {total_agents}
- Total actions logged: {total_actions}
- Total posts made: {total_posts}
- Total social interactions (likes/shares/replies): {total_interactions}

═══════════════════════════════════════════
AGENT PROFILES & BEHAVIOR SUMMARIES
═══════════════════════════════════════════
{agent_summaries_json}

═══════════════════════════════════════════
ACTION LOG SAMPLE (up to 150 most recent actions)
═══════════════════════════════════════════
{action_log_sample_json}

═══════════════════════════════════════════
INVESTIGATION QUESTIONS
═══════════════════════════════════════════
{questions_json}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════
For EACH question above, provide:
1. "answer": "YES", "NO", or "MAYBE"
   - YES = strong evidence this happened
   - NO = strong evidence this did not happen
   - MAYBE = mixed or insufficient evidence
2. "confidence": float 0.0–1.0 (be calibrated; MAYBE answers should be 0.3–0.6)
3. "reasoning": 2–3 sentence explanation citing specific agent names and behaviors
4. "evidence": array of 2–4 specific citations from the data
   Each evidence item must include:
   - "agent_id": the numeric agent_id string
   - "agent_name": the agent's display name
   - "action_description": what the agent specifically said or did (quote content when possible)
   - "relevance_to_answer": why this action supports the answer
   - "weight": float 0.0–1.0 (how much this item contributes to the answer)
5. "caveats": any important limitations (sample size, data gaps, etc.)

IMPORTANT RULES:
- If data is too sparse to answer, use MAYBE with confidence ≤ 0.4
- Never cite evidence that is not in the action log sample above
- Evidence weights across all items in one question should ideally sum to ≈ 1.0

Return a JSON array of exactly {questions_count} answer objects. No extra wrapper.
[
  {{
    "question_id": "q_0",
    "question": "<copy the question text>",
    "answer": "YES",
    "confidence": 0.82,
    "reasoning": "...",
    "evidence": [
      {{
        "agent_id": "3",
        "agent_name": "Jane Smith",
        "action_description": "Posted: 'This salary cut is unacceptable...'",
        "relevance_to_answer": "Directly expresses morale impact",
        "weight": 0.45
      }}
    ],
    "caveats": "..."
  }}
]"""


# ── Report Agent ──────────────────────────────────────────────────────────────

def report_agent_chat_prompt(
    query: str,
    graph_str: str,
    logs_str: str,
    extra_context: str,
) -> str:
    extra_ctx_block = f"\n\n{extra_context.strip()}" if extra_context.strip() else ""
    return f"""You are an analyst assistant. Answer the user's question directly and concisely based on the discussion data below. Treat all events and scenarios described as real.

User question: "{query}"

## Knowledge Graph
{graph_str}

## Activity Logs
{logs_str}{extra_ctx_block}

Rules:
- Be direct. Answer the question first, then add supporting detail only if needed.
- Keep responses short — 1 to 4 short paragraphs maximum.
- Do NOT use heavy section headers or turn every answer into a formal report.
- Use bullet points only when listing multiple distinct items.
- If asked about a specific agent or scenario, focus there; otherwise synthesise across everything.
- Avoid filler phrases like "Certainly!" or "Based on the data provided".
"""


def structured_report_prompt(
    objective_str: str,
    context_str: str,
    description: str,
    graph_str: str,
    logs_str: str,
    insights_str: str,
    chat_str: str,
) -> str:
    return f"""You are a senior analyst tasked with writing an enterprise-ready analysis report.
The discussion recorded real people interacting on a social-media platform in response to a real-world event or topic.
Treat all scenarios and events as ground truth — do not frame them as hypothetical or simulated.

## Investigation Objective
{objective_str}

## Context
{context_str}

## Report Focus
{description}

## Knowledge Graph (entities & relations extracted from source documents)
{graph_str}

## Activity Logs (participant behaviour)
{logs_str}

## User-Generated Insights & Questions
{insights_str}

## Prior Chat Analysis
{chat_str}

---

Write a **comprehensive, enterprise-grade Markdown report** that:

1. Opens with a concise **Executive Summary** (3-5 sentences, no jargon).
2. Contains clearly numbered sections with descriptive headings.
3. Includes a **Key Findings** section with bullet points.
4. Includes an **Agent Dynamics** section analysing individual and group behaviour.
5. Includes a dedicated **Soft Metrics Analysis** section covering:
   - **Sentiment Evolution**: How did emotional tone shift across the simulation?
   - **Influence Cascades**: Which agents' ideas propagated? How did influence flow?
   - **Consensus vs Polarization**: Did agents converge or diverge? How unified/polarized was the group?
   - **Thought Leadership**: Who emerged as narrative drivers? Whose ideas had most impact?
   - **Position Stability**: How stable were agent positions? Did conviction strengthen/weaken?
6. Includes a **Network & Relationship Analysis** section with at least one Mermaid diagram
   (e.g. `graph TD` or `graph LR`) illustrating important entity relationships or information flows.
7. Includes a **Narrative & Discourse Analysis** section.
8. Includes a **Risk & Opportunity Assessment** table (use Markdown table syntax).
9. Ends with **Conclusions & Recommendations** with actionable bullet points that reflect soft metrics insights.
10. Uses formal, professional language suitable for sharing with senior stakeholders.
11. Contains no placeholder text — every section must be fully written.

Return ONLY the Markdown report, starting with a `#` level title.
"""


# ── Simulation Runner ─────────────────────────────────────────────────────────

def seed_posts_prompt(objective_line: str, context: str) -> str:
    return (
        "Write 4 natural, engaging social media posts reacting to a real-world event or topic. "
        "Based on the following context, write posts that spark authentic discussion about what is happening. "
        "These will be the first posts people see and react to.\n\n"
        f"{objective_line}"
        f"Context:\n{context}\n\n"
        "Requirements:\n"
        "- Each post should be 1-3 sentences, written naturally as if by a real social media user reacting to real news\n"
        "- Do NOT use label prefixes like 'Notable ORGANIZATION:' or 'Key CONCEPT:'\n"
        "- Every post must directly address the topic as though it really happened\n"
        "- Vary the angle (analytical, curious, opinionated, etc.)\n"
        "- Return ONLY a JSON array of 4 strings, nothing else"
    )


# ── Small World Report ────────────────────────────────────────────────────────

def small_world_report_prompt(
    world_description: str,
    scenario_name: str,
    seed_text: str,
    agent_summary: str,
    activity_summary: str,
) -> str:
    return f"""You are an enterprise decision intelligence analyst. Analyze the following agent discussion data and produce a structured JSON report.

WORLD CONTEXT: {world_description}

SCENARIO: {scenario_name}
SCENARIO DESCRIPTION (treat as ground truth — this event really happened): {seed_text}

AGENTS IN SIMULATION:
{agent_summary}

SIMULATION ACTIVITY SUMMARY:
{activity_summary}

Generate a comprehensive enterprise-grade analysis with ONLY this JSON structure (no markdown, no explanation):
{{
  "outcome_summary": "<2-3 sentence summary of what happened and the key outcome>",
  "confidence_score": <float 0.0-1.0 reflecting how consistent/conclusive the simulation was>,
  "key_drivers": [
    {{"rank": 1, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}},
    {{"rank": 2, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}},
    {{"rank": 3, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}}
  ],
  "agent_behaviors": [
    {{"agent_name": "<name>", "role_in_outcome": "<protagonist|antagonist|neutral|amplifier>", "behavior_summary": "<what this agent specifically did>", "sentiment_shift": "<became more positive|negative|neutral|stayed the same>"}}
  ],
  "bottlenecks_risks": ["<risk or bottleneck identified>", ...],
  "unexpected_outcomes": ["<surprising finding>", ...],
  "counterfactual": {{
    "condition": "<what would need to be different>",
    "impact_description": "<how the outcome would change>"
  }},
  "recommendations": [
    {{"rank": 1, "action": "<specific action>", "expected_impact": "<predicted outcome>"}}
  ]
}}

Rules:
- All floats must be valid JSON numbers.
- Include agents from the simulation in agent_behaviors.
- Make recommendations actionable and specific.
- Confidence score above 0.7 only if agents showed consistent behavior.
- Return ONLY the JSON object.
"""


# ── Text Processor ────────────────────────────────────────────────────────────

def extract_entities_relations_prompt(text: str) -> str:
    return f"""Extract entities (people, organizations, locations, concepts) and relations from the text. 
Return strictly a JSON object with 'entities' (list of dicts with 'name', 'type') and 'relations' (list of dicts with 'source', 'target', 'type').
Keep entity names concise. Maximum 50 entities and 50 relations.

Text: {text}
        """


# ── Web Search ────────────────────────────────────────────────────────────────

def extract_search_topics_prompt(combined: str) -> str:
    return (
        "You are extracting search topics from a simulation brief.\n\n"
        f"{combined}\n\n"
        "List 7 to 12 specific, concrete search queries (one per line, no bullets or numbering) "
        "that would help a researcher build a comprehensive, well-rounded picture of the topic.\n"
        "Cover a diverse range of angles:\n"
        "- Recent breaking news and investigative journalism\n"
        "- Public opinion, community reactions, and grassroots discussion\n"
        "- Government reports, official statements, and policy documents\n"
        "- Economic data, statistics, and market analysis\n"
        "- Expert commentary, academic perspectives, and think-tank analyses\n"
        "- Controversy, criticism, and opposing viewpoints\n"
        "Each query should be suitable for a Google web search. "
        "Return ONLY the search queries, nothing else."
    )


def search_and_summarize_prompt(topic: str) -> str:
    return (
        f"Search the web extensively for information about: **{topic}**\n\n"
        "Write a comprehensive, long-form Markdown report (1200-2000 words) that covers ALL of the following:\n\n"
        "## Required sections:\n"
        "### 1. Breaking News & Recent Developments\n"
        "Pull from major news outlets (Reuters, AP, BBC, NYT, WSJ, Guardian, local outlets) — include dates and specifics.\n\n"
        "### 2. Public Sentiment & Community Discussion\n"
        "Search Reddit, public forums, and community threads for real reactions. Quote or paraphrase actual discussions. "
        "Include subreddit names or forum sources where found. Look for upvoted/popular threads.\n\n"
        "### 3. Social Media & Viral Reactions\n"
        "Search Twitter/X, Threads, and Bluesky for notable posts, trending hashtags, and viral moments related to this topic. "
        "Include specific quotes or post summaries where available.\n\n"
        "### 4. Government & Official Sources\n"
        "Find government publications, official reports, policy documents, regulatory statements, "
        "government blog posts, and statements from public officials or agencies.\n\n"
        "### 5. Expert & Academic Perspectives\n"
        "Include think-tank analyses, academic papers, expert interviews, and professional commentary.\n\n"
        "### 6. Key Facts, Statistics & Data\n"
        "Include hard numbers, economic indicators, survey results, polling data, and verifiable metrics.\n\n"
        "### 7. Criticism, Controversy & Opposing Views\n"
        "Include dissenting opinions, controversies, or critical perspectives found in the sources.\n\n"
        "Aim for MAXIMUM coverage — the more perspectives and sources, the better. "
        "Every section should have multiple data points.\n\n"
        "Include ALL sources found as a References section at the end with URLs. "
        "Format everything as clean Markdown."
    )


# ── Small World Worlds (router) ───────────────────────────────────────────────

def small_world_chat_prompt(
    scenario_name: str,
    seed_text: str,
    report_context: str,
    actions_context: str,
    history_text: str,
    question: str,
) -> str:
    return f"""You are an expert analyst who studied how real people responded to the scenario "{scenario_name}".

Scenario (treat as ground truth — this event really happened): {seed_text}

Agent discussion report:
{report_context}

Recent agent activity (sample):
{actions_context}

Conversation history:
{history_text}

User question: {question}

Answer specifically about this scenario's results based on agent activity data. Be concise, insightful, and grounded in the data. Treat the scenario as a real event — do not describe it as hypothetical or simulated.
"""


# ── Scenarios (router) ────────────────────────────────────────────────────────

def scenario_chat_context_prompt(
    scenario_name: str,
    scenario_description: str,
    query: str,
) -> str:
    return (
        f"SCENARIO CONTEXT: {scenario_name} — {scenario_description}\n\n"
        f"USER QUESTION: {query}"
    )


# ── Pattern-Driven Evolution ──────────────────────────────────────────────────

def extract_patterns_prompt(
    posts: list[dict],
    comments: list[dict],
    round_num: int,
) -> str:
    post_lines = "\n".join(
        f"- [{p.get('agent_id', p.get('user_id', 'agent'))}]: {str(p.get('content', p.get('text', '')))[:200]}"
        for p in posts[-40:]
    )
    comment_lines = "\n".join(
        f"- [{c.get('agent_id', c.get('user_id', 'agent'))}]: {str(c.get('content', c.get('text', '')))[:150]}"
        for c in comments[-40:]
    )
    return f"""You are a social dynamics analyst observing a simulation after round {round_num}.

Analyse the following agent activity and identify emerging patterns.

RECENT POSTS:
{post_lines or "(none yet)"}

RECENT COMMENTS:
{comment_lines or "(none yet)"}

Instructions:
- Identify 3 to 5 EMERGING PATTERNS in agent behaviour, attitudes, and group dynamics.
- Focus on tensions, power shifts, in-group/out-group formation, trust changes, and behavioural drift.
- Do NOT write generic summaries — name specific dynamics that are actually visible in the activity above.
- Each pattern should be one concise sentence (15–30 words).

Return ONLY valid JSON:
{{
  "patterns": [
    "<pattern 1>",
    "<pattern 2>",
    "<pattern 3>"
  ]
}}"""


def generate_event_prompt(patterns: list[str]) -> str:
    pattern_lines = "\n".join(f"- {p}" for p in patterns)
    return f"""You are a world-event designer for an emergent social simulation.

The following behavioural patterns have emerged among the agents:

{pattern_lines}

Design ONE subtle world event that:
1. Amplifies or responds to the tensions already present — do NOT introduce an entirely new system or topic.
2. Feels like a natural, realistic development — not a dramatic movie twist.
3. Is minimal and specific — a small institutional shift, a rumour, a policy tweak, or a social pressure.
4. Will affect agent behaviour differently depending on their position/goals.

Return ONLY valid JSON:
{{
  "title": "<short event title, max 6 words>",
  "description": "<1–2 sentence event description that agents will read as a news post>",
  "expected_effects": [
    "<effect 1>",
    "<effect 2>"
  ]
}}"""


def score_event_impact_prompt(event: dict, patterns: list[str]) -> str:
    pattern_lines = "\n".join(f"- {p}" for p in patterns)
    return f"""You are evaluating whether a world event is worth injecting into a simulation.

DETECTED PATTERNS:
{pattern_lines}

PROPOSED EVENT:
Title: {event.get("title", "")}
Description: {event.get("description", "")}
Expected effects: {", ".join(event.get("expected_effects", []))}

Rate this event on a scale from 0.0 to 1.0:
- 1.0 = highly relevant, will meaningfully shift agent dynamics
- 0.5 = moderately relevant, will affect some agents
- 0.0 = irrelevant, redundant, or too generic

Return ONLY valid JSON:
{{
  "score": <float 0.0–1.0>,
  "reason": "<one sentence explanation>"
}}"""
