"""
Insights Engine — Multi-Agent Debate Pipeline

Replaces the old question-based metrics with a user-query-driven investigation:

Phase A: Summarize agent behaviors from the action log (no LLM)
Phase B: Generate 3-5 insight observations from the user's query (1 LLM call)
Phase C: Each agent casts an initial free-form position on the query (1 batched LLM call)
Phase D: K debate rounds — agents update positions after seeing others' views (1 LLM call / round)
Phase E: Compile final verdict, answer groups, and scores (1 LLM call)

Output: insights.json
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

from core.usage import UsageSummary
from core.prompts import (
    generate_insights_prompt,
    initial_agent_votes_prompt,
    debate_round_prompt,
    compile_results_prompt,
)


class InsightsEngine:
    def __init__(self, outputs_path: str, result_file: str = None):
        self.outputs_path = outputs_path
        self._usage = UsageSummary()
        self.actions_file = os.path.join(outputs_path, "actions.jsonl")
        self.agents_file = os.path.join(outputs_path, "agents.json")
        self.result_file = result_file or os.path.join(outputs_path, "insights.json")

    # ── Persist helpers ───────────────────────────────────────────────────────

    def _write_status(self, stage: str) -> None:
        with open(self.result_file, "w", encoding="utf-8") as f:
            json.dump({"status": "running", "stage": stage}, f)

    def _write_result(self, data: dict) -> None:
        with open(self.result_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _write_error(self, message: str) -> None:
        with open(self.result_file, "w", encoding="utf-8") as f:
            json.dump({"status": "error", "error": message}, f)

    # ── Data loading ──────────────────────────────────────────────────────────

    def _load_actions(self) -> list[dict]:
        actions: list[dict] = []
        if os.path.exists(self.actions_file):
            with open(self.actions_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            actions.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass
        return actions

    def _load_agents(self) -> list[dict]:
        # scenario_agents.json has the correct index order (user at 0, then sim
        # agents) plus is_seed_user markers — prefer it when present.
        scenario_agents = os.path.join(self.outputs_path, "scenario_agents.json")
        path = scenario_agents if os.path.exists(scenario_agents) else self.agents_file
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _build_agent_map(self, agents: list[dict]) -> dict[str, str]:
        result: dict[str, str] = {}
        for idx, agent in enumerate(agents):
            name = (
                agent.get("username")
                or agent.get("realname")
                or agent.get("name")
                or f"Agent_{idx}"
            )
            result[str(idx)] = f"{name} ({idx})"
        return result

    # ── LLM helper ────────────────────────────────────────────────────────────

    def _call_llm(self, prompt: str, temperature: float = 0.3) -> Optional[str]:
        if not GENAI_AVAILABLE:
            return None
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        try:
            from core.config import MODEL_NAME
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=temperature,
                ),
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            return response.text
        except Exception as e:
            print(f"[InsightsEngine] LLM call failed: {e}")
            return None

    # ── Phase A: Behavior summarization ──────────────────────────────────────

    def _summarize_behaviors(self, actions: list[dict], agents: list[dict]) -> dict:
        agent_map = self._build_agent_map(agents)

        per_agent: dict[str, dict] = {}
        for key, name in agent_map.items():
            idx = int(key)
            profile = agents[idx] if idx < len(agents) else {}
            per_agent[name] = {
                "agent_id": key,
                "agent_name": name,
                "persona": (profile.get("persona") or profile.get("description") or "")[:500],
                "bio": (profile.get("bio") or "")[:300],
                "mbti": profile.get("mbti") or "",
                "interested_topics": profile.get("interested_topics") or [],
                "posts": [],
                "post_count": 0,
                "interaction_count": 0,
            }

        for action in actions:
            agent_id = str(action.get("user_id", action.get("agent_id", "")))
            agent_name = agent_map.get(agent_id, f"Agent_{agent_id} ({agent_id})")
            if agent_name not in per_agent:
                per_agent[agent_name] = {
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "persona": "",
                    "bio": "",
                    "mbti": "",
                    "interested_topics": [],
                    "posts": [],
                    "post_count": 0,
                    "interaction_count": 0,
                }
            action_type = action.get("_type", "")
            if action_type == "post":
                content = (action.get("content") or "").strip()
                if content:
                    per_agent[agent_name]["posts"].append(content[:400])
                per_agent[agent_name]["post_count"] += 1
            elif action_type in ("like", "share", "reply", "comment"):
                per_agent[agent_name]["interaction_count"] += 1

        total_posts = sum(d["post_count"] for d in per_agent.values()) or 1

        agent_summaries = []
        post_shares: dict[str, float] = {}
        for name, data in per_agent.items():
            post_shares[name] = data["post_count"] / total_posts
            agent_summaries.append({
                "agent_id": data["agent_id"],
                "agent_name": name,
                "persona": data["persona"],
                "bio": data["bio"],
                "mbti": data["mbti"],
                "interested_topics": data["interested_topics"],
                "post_count": data["post_count"],
                "interaction_count": data["interaction_count"],
                "sample_posts": data["posts"][:3],
            })

        aggregate = {
            "total_agents": len(agent_map),
            "total_actions": len(actions),
            "total_posts": sum(d["post_count"] for d in per_agent.values()),
            "total_interactions": sum(d["interaction_count"] for d in per_agent.values()),
        }

        return {
            "agent_summaries": agent_summaries,
            "post_shares": post_shares,
            "aggregate": aggregate,
        }

    # ── Phase B: Generate insights ────────────────────────────────────────────

    def _generate_insights(self, query: str, behavior_summary: dict) -> list[dict]:
        agent_summaries = behavior_summary.get("agent_summaries", [])
        aggregate = behavior_summary.get("aggregate", {})

        profiles_text = "\n".join(
            f"- {a['agent_name']} (MBTI: {a['mbti'] or 'N/A'}): {a['persona'][:200]}"
            for a in agent_summaries
        )
        top_posts_text = "\n".join(
            f"  [{a['agent_name']}] {post}"
            for a in agent_summaries
            for post in a.get("sample_posts", [])[:2]
        )

        prompt = generate_insights_prompt(
            query=query,
            total_agents=aggregate.get('total_agents', 0),
            total_posts=aggregate.get('total_posts', 0),
            total_interactions=aggregate.get('total_interactions', 0),
            profiles_text=profiles_text,
            top_posts_text=top_posts_text,
        )

        result = self._call_llm(prompt, temperature=0.3)
        if result:
            try:
                insights = json.loads(result)
                if isinstance(insights, list) and insights:
                    validated = []
                    for i, item in enumerate(insights[:5]):
                        if isinstance(item, dict):
                            validated.append({
                                "id": item.get("id", f"i_{i}"),
                                "category": str(item.get("category", "")).strip(),
                                "text": str(item.get("text", "")).strip(),
                                "answer_text": str(item.get("answer_text", "")).strip(),
                                "soft_metrics_noted": item.get("soft_metrics_noted") or [],
                            })
                    if validated:
                        return validated
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse insights: {e}")

        return [{"id": "i_0", "category": "behavioral_pattern", "text": "Analysis completed.", "answer_text": "LLM insight generation unavailable.", "soft_metrics_noted": []}]

    # ── Phase C: Initial agent positions ──────────────────────────────────────

    def _initial_agent_votes(self, query: str, agent_summaries: list[dict]) -> list[dict]:
        agents_json = json.dumps(
            [
                {
                    "agent_id": a["agent_id"],
                    "agent_name": a["agent_name"],
                    "persona": a["persona"][:300],
                    "bio": a["bio"][:200],
                    "mbti": a["mbti"],
                    "interested_topics": a["interested_topics"],
                    "sample_posts": a.get("sample_posts", [])[:3],
                }
                for a in agent_summaries
            ],
            indent=2,
        )

        prompt = initial_agent_votes_prompt(query=query, agents_json=agents_json)

        result = self._call_llm(prompt, temperature=0.7)
        if result:
            try:
                votes = json.loads(result)
                if isinstance(votes, list):
                    validated = []
                    for item in votes:
                        if isinstance(item, dict):
                            validated.append({
                                "agent_id": str(item.get("agent_id", "")),
                                "agent_name": str(item.get("agent_name", "")),
                                "position": str(item.get("position", "")).strip()[:1000],
                                "prediction": str(item.get("prediction", "")).strip()[:500],
                                "reasoning": str(item.get("reasoning", "")).strip()[:600],
                                "confidence": str(item.get("confidence", "medium")).strip(),
                                "conviction_level": str(item.get("conviction_level", "moderate")).strip(),
                            })
                    if validated:
                        return validated
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse initial votes: {e}")

        return [
            {
                "agent_id": a["agent_id"],
                "agent_name": a["agent_name"],
                "position": "No position generated.",
                "prediction": "",
                "reasoning": "",
                "confidence": "low",
                "conviction_level": "weak",
            }
            for a in agent_summaries
        ]

    # ── Phase D: Debate round ─────────────────────────────────────────────────

    def _run_debate_round(
        self,
        query: str,
        current_positions: list[dict],
        round_num: int,
        total_rounds: int,
    ) -> list[dict]:
        positions_text = "\n\n".join(
            f"Agent {p['agent_id']} — {p['agent_name']}:\n"
            f"  Position: {p['position']}\n"
            f"  Reasoning: {p['reasoning']}"
            for p in current_positions
        )

        prompt = debate_round_prompt(
            query=query,
            positions_text=positions_text,
            round_num=round_num,
            total_rounds=total_rounds,
        )

        result = self._call_llm(prompt, temperature=0.6)
        if result:
            try:
                updated = json.loads(result)
                if isinstance(updated, list) and len(updated) > 0:
                    validated = []
                    for item in updated:
                        if isinstance(item, dict):
                            # Carry forward prediction/confidence from previous round if LLM omits them
                            prev = next(
                                (p for p in current_positions if str(p.get("agent_id")) == str(item.get("agent_id"))),
                                {}
                            )
                            validated.append({
                                "agent_id": str(item.get("agent_id", "")),
                                "agent_name": str(item.get("agent_name", "")),
                                "position": str(item.get("position", "")).strip()[:1000],
                                "prediction": str(item.get("prediction") or prev.get("prediction", "")).strip()[:500],
                                "reasoning": str(item.get("reasoning", "")).strip()[:600],
                                "confidence": str(item.get("confidence") or prev.get("confidence", "medium")).strip(),
                                "conviction_change": str(item.get("conviction_change", "same")).strip(),
                                "influenced_by": item.get("influenced_by") or [],
                            })
                    if validated:
                        return validated
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse debate round {round_num}: {e}")

        return current_positions  # fallback: keep previous positions

    # ── Phase E: Compile results ──────────────────────────────────────────────

    def _compile_results(self, query: str, final_positions: list[dict]) -> dict:
        positions_json = json.dumps(
            [
                {
                    "agent_id": p["agent_id"],
                    "agent_name": p["agent_name"],
                    "final_position": p["position"],
                }
                for p in final_positions
            ],
            indent=2,
        )

        prompt = compile_results_prompt(query=query, positions_json=positions_json)

        result = self._call_llm(prompt, temperature=0.2)
        if result:
            try:
                data = json.loads(result)
                if isinstance(data, dict):
                    score_raw = data.get("score", {})
                    agree = float(score_raw.get("agree", 0.5))
                    disagree = float(score_raw.get("disagree", 0.3))
                    other = float(score_raw.get("other", 0.2))
                    total = agree + disagree + other
                    if total > 0:
                        agree /= total
                        disagree /= total
                        other /= total

                    answer_groups = []
                    for i, grp in enumerate(data.get("answer_groups", [])[:4]):
                        if isinstance(grp, dict):
                            answer_groups.append({
                                "group_id": grp.get("group_id", f"g_{i}"),
                                "label": str(grp.get("label", f"Group {i + 1}")),
                                "summary": str(grp.get("summary", "")),
                                "agent_ids": [str(aid) for aid in grp.get("agent_ids", [])],
                            })

                    return {
                        "overall_verdict": str(data.get("overall_verdict", "")),
                        "short_term_outlook": str(data.get("short_term_outlook", "")),
                        "long_term_outlook": str(data.get("long_term_outlook", "")),
                        "key_metrics": data.get("key_metrics") or {},
                        "score": {"agree": round(agree, 4), "disagree": round(disagree, 4), "other": round(other, 4)},
                        "soft_metrics_summary": str(data.get("soft_metrics_summary", "")),
                        "answer_groups": answer_groups,
                    }
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse compile results: {e}")

        return {
            "overall_verdict": "Unable to compile results — LLM unavailable.",
            "short_term_outlook": "",
            "long_term_outlook": "",
            "key_metrics": {},
            "score": {"agree": 0.5, "disagree": 0.3, "other": 0.2},
            "soft_metrics_summary": "",
            "answer_groups": [],
        }

    # ── Main pipeline ─────────────────────────────────────────────────────────

    def run(self, query: str, debate_rounds: int = 3) -> "UsageSummary":
        debate_rounds = max(1, min(10, debate_rounds))
        try:
            self._write_status("Loading simulation data...")
            actions = self._load_actions()
            agents = self._load_agents()

            # Agents with is_seed_user=True posted the scenario premise —
            # they are context, not debaters. Collect their ids before building
            # summaries so we can exclude them from phases C–E.
            seed_user_ids = {
                str(i) for i, a in enumerate(agents) if a.get("is_seed_user")
            }

            self._write_status("Analyzing agent behaviors...")
            behavior_summary = self._summarize_behaviors(actions, agents)
            all_summaries = behavior_summary["agent_summaries"]
            post_shares = behavior_summary["post_shares"]
            aggregate = behavior_summary["aggregate"]

            # Debate summaries: real sim agents only (seed user excluded)
            debate_summaries = [
                s for s in all_summaries if s["agent_id"] not in seed_user_ids
            ]
            # Correct total_agents to reflect only real debating agents
            aggregate = {**aggregate, "total_agents": len(debate_summaries)}

            # Phase B uses all_summaries so the seed post appears as context
            self._write_status("Generating insights from your query...")
            insights = self._generate_insights(
                query, {**behavior_summary, "agent_summaries": all_summaries}
            )

            # Phases C–E use debate_summaries only
            self._write_status("Collecting initial agent positions...")
            initial_positions = self._initial_agent_votes(query, debate_summaries)

            # round_histories[0] = initial (round 0), [1..K] = debate rounds
            round_histories: list[list[dict]] = [initial_positions]
            for round_num in range(1, debate_rounds + 1):
                self._write_status(f"Debate round {round_num} of {debate_rounds}...")
                updated = self._run_debate_round(
                    query, round_histories[-1], round_num, debate_rounds
                )
                round_histories.append(updated)

            self._write_status("Compiling final verdict...")
            final_positions = round_histories[-1]
            compiled = self._compile_results(query, final_positions)

            # Build answer_groups with counts + percentages
            total_agents = aggregate["total_agents"] or 1
            agent_group_map: dict[str, str] = {}  # agent_id -> group_id
            answer_groups = []
            for grp in compiled["answer_groups"]:
                count = len(grp["agent_ids"])
                for aid in grp["agent_ids"]:
                    agent_group_map[aid] = grp["group_id"]
                answer_groups.append({
                    **grp,
                    "agent_count": count,
                    "percentage": round(count / total_agents, 4),
                })

            # Build agent records with influence scores and full position history
            agent_records = []
            for pos in final_positions:
                agent_id = pos["agent_id"]
                agent_name = pos["agent_name"]

                # Influence = post_share * 0.4 + group_size_share * 0.6
                post_share = post_shares.get(agent_name, 0.0)
                group_id = agent_group_map.get(agent_id)
                group_size = 0
                if group_id:
                    for grp in answer_groups:
                        if grp["group_id"] == group_id:
                            group_size = grp["agent_count"]
                            break
                group_share = group_size / total_agents
                influence_score = round(post_share * 0.4 + group_share * 0.6, 4)

                # Position history across all rounds
                position_history = []
                for round_idx, round_data in enumerate(round_histories):
                    for p in round_data:
                        if p["agent_id"] == agent_id:
                            position_history.append({
                                "round": round_idx,
                                "position": p["position"],
                                "prediction": p.get("prediction", ""),
                                "reasoning": p["reasoning"],
                                "confidence": p.get("confidence", ""),
                            })
                            break

                agent_records.append({
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "influence_score": influence_score,
                    "position_history": position_history,
                    "final_position": pos["position"],
                    "final_prediction": pos.get("prediction", ""),
                    "final_reasoning": pos["reasoning"],
                    "final_confidence": pos.get("confidence", ""),
                })

            result = {
                "status": "complete",
                "available": True,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "query": query,
                "debate_rounds": debate_rounds,
                "insights": insights,
                "overall_verdict": compiled["overall_verdict"],
                "short_term_outlook": compiled.get("short_term_outlook", ""),
                "long_term_outlook": compiled.get("long_term_outlook", ""),
                "key_metrics": compiled.get("key_metrics", {}),
                "score": compiled["score"],
                "soft_metrics_summary": compiled.get("soft_metrics_summary", ""),
                "answer_groups": answer_groups,
                "agents": agent_records,
                "aggregate": aggregate,
            }
            self._write_result(result)
            return self._usage

        except Exception as e:
            print(f"[InsightsEngine] Pipeline failed: {e}")
            self._write_error(str(e))
            return self._usage
