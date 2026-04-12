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
from core.prompts import agent_profile_prompt, suggest_relationships_prompt


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

    prompt = agent_profile_prompt(field_lines, description)

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
    max_relationships = min(len(agents) * 2, 20)

    prompt = suggest_relationships_prompt(agent_summaries, max_relationships)

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
