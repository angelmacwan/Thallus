"""
small_world_report.py – Generates a structured JSON report for a WorldScenario.

Output JSON schema:
{
  "outcome_summary": str,
  "confidence_score": float (0-1),
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

from core.usage import UsageSummary


def generate_report(
    output_dir: str,
    world_description: str,
    scenario_name: str,
    seed_text: str,
    agent_profiles: list[dict[str, Any]],
) -> tuple[dict[str, Any], UsageSummary]:
    """
    Read actions.jsonl and agent profiles from output_dir, call Gemini,
    and return a (report_dict, UsageSummary) tuple.
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

    # Prefer agents.json (written by OASIS, preserves insertion order & realname)
    agents_path = os.path.join(output_dir, "agents.json")
    if os.path.exists(agents_path):
        try:
            with open(agents_path, encoding="utf-8") as f:
                agent_profiles = json.load(f)
        except Exception:
            pass  # fall back to the DB-derived profiles passed in

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

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_gtypes.GenerateContentConfig(
            temperature=0.4,
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

    report = json.loads(raw)

    # Remove metrics block entirely if present (not used)
    report.pop("metrics", None)

    # Clamp confidence score to 0-1
    try:
        report["confidence_score"] = max(0.0, min(1.0, float(report.get("confidence_score", 0.0))))
    except (TypeError, ValueError):
        report["confidence_score"] = 0.0

    report["generated_at"] = datetime.now(timezone.utc).isoformat()

    # Inject computationally-derived influence scores into agent_behaviors
    influence_scores = _compute_influence_scores(activity_lines, agent_profiles)
    for ab in report.get("agent_behaviors", []):
        name = ab.get("agent_name", "")
        score = influence_scores.get(name)
        if score is None:
            # Fall back to a case-insensitive partial match
            name_lower = name.lower()
            for k, v in influence_scores.items():
                if k.lower() in name_lower or name_lower in k.lower():
                    score = v
                    break
        ab["influence_score"] = round(score, 4) if score is not None else 0.0

    return report, usage


def _compute_influence_scores(
    activity_lines: list[dict],
    agent_profiles: list[dict],
) -> dict[str, float]:
    """Compute per-agent influence scores (0-1) from actual simulation data.

    Formula per post author:
      raw_score = (num_likes * 1.0) + (num_shares * 2.0) + (comments_received * 1.5)

    Scores are normalized against the agent with the highest raw score.
    """
    uid_to_name: dict[int, str] = {}
    for i, p in enumerate(agent_profiles):
        uid_to_name[i] = p.get("realname") or p.get("username") or p.get("name") or f"Agent_{i}"

    raw: dict[str, float] = {name: 0.0 for name in uid_to_name.values()}

    # Index post records by post_id (post records have post_id, no comment_id, no action field)
    posts_by_id: dict = {}
    for line in activity_lines:
        if "post_id" in line and "comment_id" not in line and "action" not in line:
            pid = line.get("post_id")
            if pid is not None:
                posts_by_id[pid] = line

    # Accumulate likes + shares from post records (aggregated counts stored on the record)
    for post in posts_by_id.values():
        author = uid_to_name.get(post.get("user_id", -1))
        if author and author in raw:
            raw[author] += float(post.get("num_likes", 0)) * 1.0
            raw[author] += float(post.get("num_shares", 0)) * 2.0

    # Count comments received per post author
    for line in activity_lines:
        if "comment_id" in line and "action" not in line:
            post_id = line.get("post_id")
            if post_id is not None and post_id in posts_by_id:
                post = posts_by_id[post_id]
                author = uid_to_name.get(post.get("user_id", -1))
                if author and author in raw:
                    raw[author] += 1.5

    max_score = max(raw.values(), default=0.0)
    if max_score == 0.0:
        return {name: 0.0 for name in raw}
    return {name: round(score / max_score, 4) for name, score in raw.items()}


def _summarize_activity(
    activity_lines: list[dict], agent_profiles: list[dict]
) -> str:
    """Build a brief text summary of simulation activity for the LLM prompt."""
    if not activity_lines:
        return "No activity recorded."

    # Build user_id → agent name lookup (OASIS assigns IDs by profile insertion order)
    uid_to_name: dict[int, str] = {}
    for i, p in enumerate(agent_profiles):
        uid_to_name[i] = p.get("realname") or p.get("username") or f"Agent_{i}"

    def _infer_type(line: dict) -> str:
        # Trace table records have an explicit 'action' field
        if line.get("action"):
            return str(line["action"])
        # Post table records: have post_id but no comment_id
        if "post_id" in line and "comment_id" not in line:
            return "create_post"
        # Comment table records
        if "comment_id" in line:
            return "create_comment"
        return "unknown"

    # Count by type — exclude infrastructure noise from trace table
    _NOISE = {"sign_up", "refresh", "unknown"}
    type_counts: dict[str, int] = {}
    for line in activity_lines:
        t = _infer_type(line)
        if t not in _NOISE:
            type_counts[t] = type_counts.get(t, 0) + 1

    counts_str = ", ".join(f"{k}: {v}" for k, v in sorted(type_counts.items(), key=lambda x: -x[1])[:10])

    # Sample posts with actual content (from the post table records)
    posts = [l for l in activity_lines if "post_id" in l and "comment_id" not in l and l.get("content")][:5]
    post_samples = "\n".join(
        f"  [{uid_to_name.get(p.get('user_id', -1), 'agent')}]: {str(p.get('content', ''))[:200]}"
        for p in posts
    )

    # Sample comments with actual content
    comments = [l for l in activity_lines if "comment_id" in l and l.get("content")][:3]
    comment_samples = "\n".join(
        f"  [{uid_to_name.get(c.get('user_id', -1), 'agent')} on post #{c.get('post_id', '?')}]: {str(c.get('content', ''))[:200]}"
        for c in comments
    )

    # Compute influence rankings to include in the summary
    influence_scores = _compute_influence_scores(activity_lines, agent_profiles)
    sorted_influence = sorted(influence_scores.items(), key=lambda x: -x[1])
    influence_str = ", ".join(
        f"{name}: {round(score * 100)}%"
        for name, score in sorted_influence[:8]
        if score > 0
    ) or "(no engagement recorded)"

    summary = f"Total events: {len(activity_lines)}\nMeaningful event breakdown: {counts_str}"
    summary += f"\n\nInfluence ranking (by likes + shares + comments received, normalized):\n  {influence_str}"
    if post_samples:
        summary += f"\n\nSample posts:\n{post_samples}"
    if comment_samples:
        summary += f"\n\nSample comments:\n{comment_samples}"

    return summary
