"""
agent_generator.py – Uses Gemini to generate a full SmallWorld agent profile
from sparse user-provided fields + a natural-language description.
"""

from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
load_dotenv()

from core.usage import UsageSummary


def generate_agent_profile(sparse: dict[str, Any]) -> tuple[dict[str, Any], UsageSummary]:
    """
    Given sparse agent fields (name, profession, organization, location, age,
    description), call Gemini to produce a complete agent profile matching the
    AgentCreate schema.

    Returns a (profile_dict, UsageSummary) tuple.
    """
    from google import genai as _genai
    from google.genai import types as _gtypes
    from core.config import MODEL_NAME

    client = _genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    field_lines = "\n".join(
        f"- {k}: {v}" for k, v in sparse.items() if v is not None and k != "description"
    )
    description = sparse.get("description", "")

    prompt = f"""You are an expert organizational psychologist and agent profile designer.

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

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_gtypes.GenerateContentConfig(
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )

    usage = UsageSummary()
    if response.usage_metadata:
        usage.add(
            input_tokens=response.usage_metadata.prompt_token_count or 0,
            output_tokens=response.usage_metadata.candidates_token_count or 0,
        )

    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw), usage


def suggest_relationships(agents: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], UsageSummary]:
    """
    Given a list of agent summaries, suggest a list of relationships between them.
    Each relationship has: source_agent_id, target_agent_id, type, strength, sentiment, influence_direction.

    Returns a (relationships_list, UsageSummary) tuple.
    """
    from google import genai as _genai
    from google.genai import types as _gtypes
    from core.config import MODEL_NAME

    client = _genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    agent_summaries = "\n".join(
        f"- agent_id={a['agent_id']} name={a['name']} role={a.get('job_title') or a.get('profession', 'unknown')} org={a.get('organization', 'unknown')}"
        for a in agents
    )

    prompt = f"""You are an expert in organizational dynamics and social network analysis.

Given the following agents in a simulation world:
{agent_summaries}

Suggest realistic relationships between them. Return ONLY a JSON array where each item has:
{{
  "source_agent_id": "<agent_id string>",
  "target_agent_id": "<agent_id string>",
  "type": "<manager|peer|competitor|customer|mentor|direct_report|stakeholder>",
  "strength": <float 0-1>,
  "sentiment": "<positive|neutral|negative>",
  "influence_direction": "<source_to_target|target_to_source|both>"
}}

Rules:
- Only suggest relationships that make sense given each agent's role and organization.
- Do not create self-relationships.
- Be selective — not everyone needs to be connected to everyone.
- Return between 1 and {min(len(agents) * 2, 20)} relationships.
- Return ONLY the JSON array.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_gtypes.GenerateContentConfig(
            temperature=0.5,
            response_mime_type="application/json",
        ),
    )

    usage = UsageSummary()
    if response.usage_metadata:
        usage.add(
            input_tokens=response.usage_metadata.prompt_token_count or 0,
            output_tokens=response.usage_metadata.candidates_token_count or 0,
        )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw), usage
