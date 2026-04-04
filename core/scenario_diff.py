"""
scenario_diff.py – Compares two WorldScenario runs to identify divergence.

Compares actions.jsonl files from two scenarios and produces:
- metric_deltas (adoption, churn, conflict, morale differences)
- agent_behavior_changes (per agent: what changed between scenarios)
- divergence_round (first round where behavior diverged)
- summary (LLM-generated plain English explanation)
"""

from __future__ import annotations

import json
import os
from collections import defaultdict
from typing import Any


def compute_diff(
    output_dir_a: str,
    output_dir_b: str,
    scenario_name_a: str,
    scenario_name_b: str,
    report_a: dict[str, Any] | None = None,
    report_b: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Compare two scenario output directories.

    Returns:
    {
      "scenario_a": str,
      "scenario_b": str,
      "metric_deltas": {"adoption": float, "churn": float, "conflict": float, "morale": float},
      "agent_behavior_changes": [{"agent_name": str, "change_type": str, "detail": str}],
      "divergence_round": int | None,
      "summary": str,
      "report_a": dict,
      "report_b": dict,
    }
    """
    events_a = _load_events(output_dir_a)
    events_b = _load_events(output_dir_b)

    metric_deltas = _compute_metric_deltas(report_a, report_b)
    agent_changes = _compute_agent_changes(events_a, events_b)
    divergence_round = _find_divergence_round(events_a, events_b)

    summary = _generate_summary(
        scenario_name_a, scenario_name_b,
        metric_deltas, agent_changes, divergence_round,
        report_a, report_b,
    )

    return {
        "scenario_a": scenario_name_a,
        "scenario_b": scenario_name_b,
        "metric_deltas": metric_deltas,
        "agent_behavior_changes": agent_changes,
        "divergence_round": divergence_round,
        "summary": summary,
        "report_a": report_a or {},
        "report_b": report_b or {},
    }


def _load_events(output_dir: str) -> list[dict]:
    log_path = os.path.join(output_dir, "actions.jsonl")
    events = []
    if not os.path.exists(log_path):
        return events
    with open(log_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except Exception:
                    pass
    return events


def _compute_metric_deltas(
    report_a: dict | None,
    report_b: dict | None,
) -> dict[str, float]:
    """Compute delta for each metric (B - A). Positive = B increased."""
    keys = ["adoption", "churn", "conflict", "morale"]
    deltas = {}
    for k in keys:
        a_val = (report_a or {}).get("metrics", {}).get(k, 0) or 0
        b_val = (report_b or {}).get("metrics", {}).get(k, 0) or 0
        deltas[k] = round(b_val - a_val, 2)
    return deltas


def _compute_agent_changes(
    events_a: list[dict],
    events_b: list[dict],
) -> list[dict[str, Any]]:
    """
    Compare per-agent activity counts between two scenarios.
    Returns agents who posted/commented significantly more or less.
    """
    def _count_by_agent(events: list[dict]) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for e in events:
            agent = e.get("username") or e.get("agent_name") or e.get("user_id", "unknown")
            if str(agent) != "unknown":
                counts[str(agent)] += 1
        return dict(counts)

    counts_a = _count_by_agent(events_a)
    counts_b = _count_by_agent(events_b)

    all_agents = set(list(counts_a.keys()) + list(counts_b.keys()))
    changes = []
    for agent in sorted(all_agents):
        a_count = counts_a.get(agent, 0)
        b_count = counts_b.get(agent, 0)
        if a_count == 0 and b_count == 0:
            continue
        delta = b_count - a_count
        if abs(delta) < 1:
            continue

        if delta > 0:
            change_type = "more_active"
            detail = f"Posted/commented {delta} more time(s) in scenario B"
        else:
            change_type = "less_active"
            detail = f"Posted/commented {abs(delta)} fewer time(s) in scenario B"

        changes.append({
            "agent_name": agent,
            "change_type": change_type,
            "detail": detail,
            "activity_a": a_count,
            "activity_b": b_count,
        })

    # Sort by absolute delta descending
    changes.sort(key=lambda x: abs(x["activity_b"] - x["activity_a"]), reverse=True)
    return changes[:15]  # Top 15 most changed agents


def _find_divergence_round(
    events_a: list[dict],
    events_b: list[dict],
) -> int | None:
    """
    Find the first round where the two scenarios produced different amounts of activity.
    Uses the round field or order-of-events as a proxy.
    """
    if not events_a or not events_b:
        return None

    # Try to find round markers
    def _events_by_round(events: list[dict]) -> dict[int, int]:
        by_round: dict[int, int] = defaultdict(int)
        for e in events:
            r = e.get("round") or e.get("round_id")
            if r is not None:
                try:
                    by_round[int(r)] += 1
                except Exception:
                    pass
        return dict(by_round)

    rounds_a = _events_by_round(events_a)
    rounds_b = _events_by_round(events_b)

    if not rounds_a or not rounds_b:
        # Fall back: compare total counts in 10-event chunks
        chunk = 10
        for i, (ea, eb) in enumerate(
            zip(
                [events_a[j:j+chunk] for j in range(0, len(events_a), chunk)],
                [events_b[j:j+chunk] for j in range(0, len(events_b), chunk)],
            ),
            start=1,
        ):
            if len(ea) != len(eb):
                return i
        return None

    all_rounds = sorted(set(list(rounds_a.keys()) + list(rounds_b.keys())))
    for r in all_rounds:
        if rounds_a.get(r, 0) != rounds_b.get(r, 0):
            return r
    return None


def _generate_summary(
    name_a: str,
    name_b: str,
    metric_deltas: dict[str, float],
    agent_changes: list[dict],
    divergence_round: int | None,
    report_a: dict | None,
    report_b: dict | None,
) -> str:
    """Generate a concise English summary of the diff."""
    lines = [f"Comparing '{name_a}' vs '{name_b}':"]

    for metric, delta in metric_deltas.items():
        if abs(delta) > 1:
            direction = "increased" if delta > 0 else "decreased"
            lines.append(f"  • {metric.capitalize()} {direction} by {abs(delta):.1f}% in scenario B.")

    if divergence_round:
        lines.append(f"  • Scenarios diverged from round {divergence_round}.")

    if agent_changes:
        top = agent_changes[0]
        lines.append(f"  • Most changed agent: {top['agent_name']} ({top['detail']}).")

    a_summary = (report_a or {}).get("outcome_summary", "")
    b_summary = (report_b or {}).get("outcome_summary", "")
    if a_summary and b_summary:
        lines.append(f"\nScenario A outcome: {a_summary}")
        lines.append(f"Scenario B outcome: {b_summary}")

    return " ".join(lines) if len(lines) == 1 else "\n".join(lines)
