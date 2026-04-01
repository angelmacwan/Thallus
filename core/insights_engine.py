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


class InsightsEngine:
    def __init__(self, outputs_path: str, result_file: str = None):
        self.outputs_path = outputs_path
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
            result[str(idx)] = str(name)
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
            agent_name = agent_map.get(agent_id, f"Agent_{agent_id}")
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

        prompt = f"""You are an expert simulation analyst reviewing a multi-agent social simulation.

USER QUERY: "{query}"

SIMULATION OVERVIEW:
- Total agents: {aggregate.get('total_agents', 0)}
- Total posts made: {aggregate.get('total_posts', 0)}
- Total interactions: {aggregate.get('total_interactions', 0)}

AGENT PROFILES:
{profiles_text}

SAMPLE POSTS FROM THE SIMULATION:
{top_posts_text}

TASK:
Based on the user's query and the simulation data above, generate 3-5 specific, trackable \
insight observations that directly answer or relate to the query. Each insight should be a \
clear, evidence-grounded observation from the simulation.

When analyzing, explicitly consider these SOFT METRICS:
- **Sentiment Shifts**: How did emotional tone evolve? Did posts become increasingly positive/negative/polarized?
- **Influence Spread**: Which agents' ideas were echoed or built upon by others? How did ideas cascade?
- **Decision Cascades**: Did agent actions trigger follow-up actions by other agents? What chains of behavior emerged?
- **Stability vs Volatility**: Were agent positions consistent or did they shift significantly? How stable were group dynamics?
- **Consensus Formation**: Did agents converge toward shared views, or diverge into opposing camps?
- **Polarization Patterns**: Did opinion clusters emerge? How distinct were agent positions from each other?
- **Thought Leadership**: Which agents drove narrative direction? Whose ideas garnered most engagement?

Return a JSON array of insight objects. Each object must have:
- "id": "i_0", "i_1", etc.
- "text": the insight observation statement (1-2 sentences), optionally referencing one or more soft metrics above
- "answer_text": a direct synthesized answer to the query from this insight's perspective (1-2 sentences)
- "soft_metrics_noted": an optional array of the specific soft metrics this insight touches on (e.g., ["sentiment_shifts", "influence_spread"])

Return ONLY the JSON array, no other text."""

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
                                "text": str(item.get("text", "")).strip(),
                                "answer_text": str(item.get("answer_text", "")).strip(),
                            })
                    if validated:
                        return validated
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse insights: {e}")

        return [{"id": "i_0", "text": "Analysis completed.", "answer_text": "LLM insight generation unavailable."}]

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

        prompt = f"""You are simulating a cast of agents in a multi-agent social simulation.

USER QUERY: "{query}"

The agents below each have a unique personality, background, and posting history. \
Simulate each agent's authentic initial response to the query based on who they are.

AGENTS:
{agents_json}

TASK:
For each agent, generate their honest initial position in response to the user's query. \
The position should feel authentic to their character — shaped by their persona, MBTI, \
interests, and sample posts.

When formulating positions, consider how each agent might view:
- The emotional or psychological dimensions of the query (sentiment around the topic)
- How their ideas or values might spread or resonate with peers
- Whether they see the issue as triggering cascading consequences
- The stability or volatility of their stance on this—how firm vs uncertain they are
- Points of potential consensus or disagreement with others

Return a JSON array — one entry per agent — each with:
- "agent_id": the agent's id string (e.g. "0", "1", ...)
- "agent_name": the agent's name
- "position": the agent's answer/stance on the query (1-3 sentences, authentic to their character)
- "reasoning": why they hold this position, grounded in their profile or posts (1-2 sentences)
- "conviction_level": 'strong', 'moderate', or 'weak' — how certain or firm this agent is in their position

Return ONLY the JSON array. No other text."""

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
                                "reasoning": str(item.get("reasoning", "")).strip()[:600],
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
                "reasoning": "",
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

        prompt = f"""You are facilitating debate round {round_num} of {total_rounds} in a multi-agent simulation.

USER QUERY: "{query}"

CURRENT POSITIONS (end of round {round_num - 1}):
{positions_text}

Each agent has now read all other agents' positions and reasoning. Simulate each agent \
updating their response. Agents may:
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
- "position": updated position after this debate round (1-3 sentences)
- "reasoning": updated reasoning, possibly referencing other agents by name (1-2 sentences)
- "conviction_change": 'stronger', 'same', or 'weaker' — how did conviction evolve this round?
- "influenced_by": optional array of agent names whose arguments influenced this update

Return ONLY the JSON array. No other text."""

        result = self._call_llm(prompt, temperature=0.6)
        if result:
            try:
                updated = json.loads(result)
                if isinstance(updated, list) and len(updated) > 0:
                    validated = []
                    for item in updated:
                        if isinstance(item, dict):
                            validated.append({
                                "agent_id": str(item.get("agent_id", "")),
                                "agent_name": str(item.get("agent_name", "")),
                                "position": str(item.get("position", "")).strip()[:1000],
                                "reasoning": str(item.get("reasoning", "")).strip()[:600],
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

        prompt = f"""You are synthesizing the final results of a multi-agent debate simulation.

USER QUERY: "{query}"

FINAL AGENT POSITIONS (after all debate rounds):
{positions_json}

TASK:
Synthesize these positions into a coherent result. Group agents by similarity of position, \
and analyze the SOFT METRICS that shaped the outcome:

**Key soft metrics to assess:**
- **Consensus Formation**: Did agents converge toward shared views? Are there clear consensus clusters or deep polarization?
- **Influence & Cascading**: Did certain agent viewpoints dominate and cascade through the group? Who were the thought leaders?
- **Sentiment Evolution**: What was the overall emotional/sentiment arc? Did discussion become more heated, unified, or nuanced?
- **Stability Patterns**: How stable were final positions? Did conviction levels strengthen, weaken, or remain unchanged?
- **Polarization**: How distinct are the agent groups? Are they close together in opinion or far apart?

Return a single JSON object with:
- "overall_verdict": a balanced, synthesized answer to the user's query (2-4 sentences), \
  representing the collective intelligence that emerged from the debate
- "score": {{ "agree": float, "disagree": float, "other": float }} — fractions of agents \
  that broadly agree vs disagree vs hold a neutral/other position (must sum to 1.0). \
  Assign based on the direction of each agent's final position relative to the query.
- "soft_metrics_summary": a brief synthesis (2-3 sentences) of the key soft metrics patterns observed. \
  Mention: level of consensus/polarization, any thought leaders that emerged, sentiment trajectory, \
  and stability of the positions
- "answer_groups": array of 2-4 distinct clusters of agents with similar positions:
  - "group_id": "g_0", "g_1", etc.
  - "label": short label for this group's shared stance (3-8 words)
  - "summary": what agents in this group believe (1-2 sentences)
  - "agent_ids": array of agent_id strings in this group (cover ALL agents across all groups)

Return ONLY the JSON object. No other text."""

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
                        "score": {"agree": round(agree, 4), "disagree": round(disagree, 4), "other": round(other, 4)},
                        "answer_groups": answer_groups,
                    }
            except Exception as e:
                print(f"[InsightsEngine] Failed to parse compile results: {e}")

        return {
            "overall_verdict": "Unable to compile results — LLM unavailable.",
            "score": {"agree": 0.5, "disagree": 0.3, "other": 0.2},
            "answer_groups": [],
        }

    # ── Main pipeline ─────────────────────────────────────────────────────────

    def run(self, query: str, debate_rounds: int = 3) -> None:
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
                                "reasoning": p["reasoning"],
                            })
                            break

                agent_records.append({
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "influence_score": influence_score,
                    "position_history": position_history,
                    "final_position": pos["position"],
                    "final_reasoning": pos["reasoning"],
                })

            result = {
                "status": "complete",
                "available": True,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "query": query,
                "debate_rounds": debate_rounds,
                "insights": insights,
                "overall_verdict": compiled["overall_verdict"],
                "score": compiled["score"],
                "answer_groups": answer_groups,
                "agents": agent_records,
                "aggregate": aggregate,
            }
            self._write_result(result)

        except Exception as e:
            print(f"[InsightsEngine] Pipeline failed: {e}")
            self._write_error(str(e))
