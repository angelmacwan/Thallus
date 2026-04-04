"""
small_world_report.py – Generates a structured JSON report for a WorldScenario.

Output JSON schema:
{
  "outcome_summary": str,
  "confidence_score": float (0-1),
  "metrics": {"adoption": float, "churn": float, "conflict": float, "morale": float},
  "key_drivers": [{"rank": int, "factor": str, "explanation": str}],
  "agent_behaviors": [{"agent_name": str, "role_in_outcome": str, "behavior_summary": str}],
  "bottlenecks_risks": [str],
  "unexpected_outcomes": [str],
  "counterfactual": {"condition": str, "impact_description": str},
  "recommendations": [{"rank": int, "action": str, "expected_impact": str}],
  "generated_at": str (ISO)
}
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any


def generate_report(
    output_dir: str,
    world_description: str,
    scenario_name: str,
    seed_text: str,
    agent_profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Read actions.jsonl and agent profiles from output_dir, call Gemini,
    and return a structured report dict.
    """
    from google import genai as _genai
    from google.genai import types as _gtypes
    from core.config import MODEL_NAME

    client = _genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    # Read activity log
    log_path = os.path.join(output_dir, "actions.jsonl")
    activity_lines = []
    if os.path.exists(log_path):
        with open(log_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        activity_lines.append(json.loads(line))
                    except Exception:
                        pass

    # Summarize activity
    activity_summary = _summarize_activity(activity_lines, agent_profiles)

    # Build agent summary
    agent_summary_lines = []
    for a in agent_profiles[:20]:
        name = a.get("realname") or a.get("username") or a.get("name", "Agent")
        role = a.get("work") or a.get("job_title") or "Unknown"
        agent_summary_lines.append(f"- {name} ({role})")
    agent_summary = "\n".join(agent_summary_lines)

    prompt = f"""You are an enterprise decision intelligence analyst. Analyze the following simulation data and produce a structured JSON report.

WORLD CONTEXT: {world_description}

SCENARIO: {scenario_name}
SEED (what-if prompt): {seed_text}

AGENTS IN SIMULATION:
{agent_summary}

SIMULATION ACTIVITY SUMMARY:
{activity_summary}

Generate a comprehensive enterprise-grade analysis with ONLY this JSON structure (no markdown, no explanation):
{{
  "outcome_summary": "<2-3 sentence summary of what happened and the key outcome>",
  "confidence_score": <float 0.0-1.0 reflecting how consistent/conclusive the simulation was>,
  "metrics": {{
    "adoption": <float 0-100 percentage — how many agents aligned positively with the scenario>,
    "churn": <float 0-100 percentage — how many agents showed resistance or disengagement>,
    "conflict": <float 0-100 percentage — level of disagreement or tension observed>,
    "morale": <float 0-100 percentage — overall positivity/energy of agent interactions>
  }},
  "key_drivers": [
    {{"rank": 1, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}},
    {{"rank": 2, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}},
    {{"rank": 3, "factor": "<factor name>", "explanation": "<why this drove the outcome>"}}
  ],
  "agent_behaviors": [
    {{"agent_name": "<name>", "role_in_outcome": "<protagonist|antagonist|neutral|amplifier>", "behavior_summary": "<what this agent specifically did>"}}
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

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_gtypes.GenerateContentConfig(
            temperature=0.4,
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    report = json.loads(raw)
    report["generated_at"] = datetime.now(timezone.utc).isoformat()
    return report


def _summarize_activity(
    activity_lines: list[dict], agent_profiles: list[dict]
) -> str:
    """Build a brief text summary of simulation activity for the LLM prompt."""
    if not activity_lines:
        return "No activity recorded."

    # Count by type
    type_counts: dict[str, int] = {}
    for line in activity_lines:
        t = (
            line.get("action_type")
            or line.get("type")
            or line.get("action")
            or "unknown"
        )
        type_counts[t] = type_counts.get(t, 0) + 1

    counts_str = ", ".join(f"{k}: {v}" for k, v in sorted(type_counts.items(), key=lambda x: -x[1])[:10])

    # Sample posts/comments
    posts = [l for l in activity_lines if "post" in str(l.get("action_type", l.get("type", ""))).lower()][:5]
    post_samples = "\n".join(
        f"  [{p.get('username', p.get('agent_name', 'agent'))}]: {str(p.get('content') or p.get('message') or p.get('post_content', ''))[:200]}"
        for p in posts
        if p.get('content') or p.get('message') or p.get('post_content')
    )

    summary = f"Total events: {len(activity_lines)}\nEvent breakdown: {counts_str}"
    if post_samples:
        summary += f"\n\nSample posts:\n{post_samples}"

    return summary
