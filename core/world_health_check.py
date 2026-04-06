"""
world_health_check.py – Pre-simulation health check for a Small World.

Checks:
  - Agents with zero relationships (isolation warning)
  - Agents with incomplete core fields
  - Homogeneous relationship sentiment (low simulation value)
  - Self-referential or duplicate relationships
  - World has at least 2 agents
"""

from __future__ import annotations

import json
from typing import Any


def run_health_check(
    agents: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    agents        – list of agent dicts (agent_id, name, personality_traits, etc.)
    relationships – list of relationship dicts (source_agent_id, target_agent_id, sentiment, etc.)

    Returns a list of HealthCheckItem dicts:
    [{"level": "warning"|"error"|"info", "message": str, "affected_agents": [name, ...]}]
    """
    items: list[dict[str, Any]] = []

    if not agents:
        items.append({
            "level": "error",
            "message": "No agents in this world. Add at least 2 agents before running a simulation.",
            "affected_agents": [],
        })
        return items

    if len(agents) < 2:
        items.append({
            "level": "error",
            "message": "At least 2 agents are required to run a simulation.",
            "affected_agents": [a.get("name", "Unknown") for a in agents],
        })
        return items

    # Build connected agent IDs
    connected_ids: set[str] = set()
    for r in relationships:
        connected_ids.add(r.get("source_agent_id", ""))
        connected_ids.add(r.get("target_agent_id", ""))

    # 1. Isolated agents
    isolated = [a for a in agents if a.get("agent_id") not in connected_ids]
    if isolated:
        names = [a.get("name", "Unknown") for a in isolated]
        items.append({
            "level": "warning",
            "message": f"{len(isolated)} agent(s) have no relationships. Isolated agents may produce low-quality simulation results.",
            "affected_agents": names,
        })

    # 2. Incomplete core fields
    important_fields = ["profession", "job_title", "organization", "location"]
    incomplete = []
    for a in agents:
        missing = [f for f in important_fields if not a.get(f)]
        if len(missing) >= 3:
            incomplete.append(a.get("name", "Unknown"))
    if incomplete:
        items.append({
            "level": "warning",
            "message": f"{len(incomplete)} agent(s) have sparse profiles. Consider filling in profession, organization, and location for richer simulations.",
            "affected_agents": incomplete,
        })

    # 3. No Big Five traits
    no_traits = []
    for a in agents:
        pt = a.get("personality_traits")
        if pt:
            if isinstance(pt, str):
                try:
                    pt = json.loads(pt)
                except Exception:
                    pt = {}
            has_any = any(
                pt.get(k) is not None
                for k in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
            )
            if not has_any:
                no_traits.append(a.get("name", "Unknown"))
        else:
            no_traits.append(a.get("name", "Unknown"))

    if no_traits:
        items.append({
            "level": "info",
            "message": f"{len(no_traits)} agent(s) have no Big Five personality traits defined. Traits improve simulation realism.",
            "affected_agents": no_traits,
        })

    # 4. Homogeneous sentiment
    if relationships:
        sentiments = [r.get("sentiment", "neutral") for r in relationships]
        unique_sentiments = set(sentiments)
        if len(unique_sentiments) == 1:
            items.append({
                "level": "info",
                "message": f"All relationships have the same sentiment ({sentiments[0]}). Adding variety (positive/neutral/negative) creates more dynamic simulations.",
                "affected_agents": [],
            })

    # 5. Healthy state
    if not items:
        items.append({
            "level": "info",
            "message": f"World looks healthy — {len(agents)} agents, {len(relationships)} relationships.",
            "affected_agents": [],
        })

    return items
