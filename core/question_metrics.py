"""
Question-Based Metrics Engine

Replaces the hardcoded metrics system with an AI-driven question-answer approach:
1. Read the simulation objective stored in objective.txt
2. Generate targeted investigation questions (1 LLM call)
3. Summarize agent behaviors from the action log (no LLM needed)
4. Answer all questions in one batch LLM call with evidence citations
5. Save results to questions_metrics.json
"""

import json
import os
from datetime import datetime
from typing import Optional

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class QuestionMetrics:
    def __init__(self, outputs_path: str):
        self.outputs_path = outputs_path
        self.actions_file = os.path.join(outputs_path, "actions.jsonl")
        self.agents_file = os.path.join(outputs_path, "agents.json")
        self.objective_file = os.path.join(outputs_path, "objective.txt")
        self.result_file = os.path.join(outputs_path, "questions_metrics.json")

    # ── Data loading ──────────────────────────────────────────────────────────

    def _load_objective(self) -> str:
        if os.path.exists(self.objective_file):
            with open(self.objective_file, "r", encoding="utf-8") as f:
                text = f.read().strip()
                if text:
                    return text
        return "Understand how agents behave and interact in the simulation"

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
        if os.path.exists(self.agents_file):
            try:
                with open(self.agents_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _build_agent_map(self, agents: list[dict]) -> dict[str, str]:
        """Map numeric string index -> display name."""
        agent_map: dict[str, str] = {}
        for idx, agent in enumerate(agents):
            name = (
                agent.get("username")
                or agent.get("realname")
                or agent.get("name")
                or f"Agent_{idx}"
            )
            agent_map[str(idx)] = f"{name} ({idx})"
        return agent_map

    # ── Phase 2: Behavior summarization ──────────────────────────────────────

    def _summarize_behaviors(self, actions: list[dict], agents: list[dict]) -> dict:
        """
        Build a compact, token-efficient behavior summary without calling an LLM.
        This is pre-computed and reused across all question answering.
        """
        agent_map = self._build_agent_map(agents)

        # Per-agent tracking
        per_agent: dict[str, dict] = {}
        for key, name in agent_map.items():
            idx = int(key)
            background = ""
            if idx < len(agents):
                background = agents[idx].get("background", "") or ""
            per_agent[name] = {
                "agent_id": key,
                "agent_name": name,
                "background": background[:300],
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
                    "background": "",
                    "posts": [],
                    "post_count": 0,
                    "interaction_count": 0,
                }

            action_type = action.get("_type", "")
            if action_type == "post":
                content = (action.get("content") or "").strip()
                if content:
                    per_agent[agent_name]["posts"].append({
                        "post_id": str(action.get("post_id", "")),
                        "content": content[:400],
                        "timestamp": action.get("created_at", ""),
                        "likes": action.get("num_likes", 0),
                        "shares": action.get("num_shares", 0),
                    })
                per_agent[agent_name]["post_count"] += 1
            elif action_type in ("like", "share", "reply", "comment"):
                per_agent[agent_name]["interaction_count"] += 1

        # Build compact per-agent summaries (limit posts to 5 to control token cost)
        agent_summaries = []
        for name, data in per_agent.items():
            top_posts = data["posts"][:5]
            agent_summaries.append({
                "agent_id": data["agent_id"],
                "agent_name": name,
                "background": data["background"],
                "post_count": data["post_count"],
                "interaction_count": data["interaction_count"],
                "sample_posts": [p["content"] for p in top_posts],
            })

        # Build flat action log sample for evidence linking (first 150 actions)
        action_log_sample = []
        for a in actions[:150]:
            raw_agent_id = str(a.get("user_id", a.get("agent_id", "")))
            action_log_sample.append({
                "agent_id": raw_agent_id,
                "agent_name": agent_map.get(raw_agent_id, f"Agent_{raw_agent_id} ({raw_agent_id})"),
                "type": a.get("_type", ""),
                "content": (a.get("content") or "")[:300],
                "post_id": str(a.get("post_id", "")),
                "timestamp": a.get("created_at", ""),
            })

        aggregate = {
            "total_agents": len(agent_map),
            "total_actions": len(actions),
            "total_posts": sum(d["post_count"] for d in per_agent.values()),
            "total_interactions": sum(d["interaction_count"] for d in per_agent.values()),
        }

        return {
            "agent_summaries": agent_summaries,
            "aggregate": aggregate,
            "action_log_sample": action_log_sample,
        }

    # ── LLM helper ───────────────────────────────────────────────────────────

    def _call_llm(self, prompt: str, temperature: float = 0.2) -> Optional[str]:
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
            print(f"[QuestionMetrics] LLM call failed: {e}")
            return None

    # ── Phase 1: Question generation ─────────────────────────────────────────

    def _generate_questions(self, objective: str, agent_count: int) -> list[str]:
        """Generate 5-8 investigation questions from the objective (1 LLM call)."""
        prompt = f"""You are designing an investigation plan for a multi-agent simulation.

Simulation Objective: "{objective}"
Number of agents in simulation: {agent_count}

Generate exactly 6 specific, measurable investigation questions that a researcher would \
want answered to evaluate whether the simulation accomplished its objective. \
Each question must be answerable with YES / NO / MAYBE based on observable agent behaviors \
(what agents posted, how they interacted, what topics they discussed).

Focus question types evenly across:
- Behavioral outcomes (What did agents actually do?)
- Sentiment / opinion outcomes (How did agents feel or express emotion?)
- Social dynamics (How did agents interact with each other?)
- Emergent patterns (Did unexpected behaviors appear?)

Return ONLY a JSON array of 6 question strings. No extra keys, no wrapper object.
Example format: ["Question 1?", "Question 2?", "Question 3?"]"""

        result = self._call_llm(prompt, temperature=0.3)
        if result:
            try:
                questions = json.loads(result)
                if isinstance(questions, list) and questions:
                    return [str(q).strip() for q in questions[:8] if q]
            except Exception:
                pass

        # Fallback questions when LLM is unavailable
        return [
            "Did agents respond to the core issue described in the objective?",
            "Did agents express predominantly positive or negative sentiment?",
            "Did agents show signs of conflict or disagreement with each other?",
            "Did any agents change their stance or behavior significantly over time?",
            "Were there dominant voices that influenced the direction of the discussion?",
            "Did the agents reach any consensus or resolution?",
        ]

    # ── Phase 3: Answer questions ─────────────────────────────────────────────

    def _answer_questions(
        self,
        questions: list[str],
        behavior_summary: dict,
        objective: str,
    ) -> list[dict]:
        """Answer all questions in a single batched LLM call with evidence citations."""

        agent_summaries = behavior_summary.get("agent_summaries", [])
        aggregate = behavior_summary.get("aggregate", {})
        action_log_sample = behavior_summary.get("action_log_sample", [])

        prompt = f"""You are a rigorous simulation analyst. Answer the following investigation \
questions based SOLELY on the evidence provided below. Do NOT invent, hallucinate, or assume \
any agent behaviors that are not shown in the data.

═══════════════════════════════════════════
SIMULATION OBJECTIVE
═══════════════════════════════════════════
"{objective}"

═══════════════════════════════════════════
AGGREGATE STATISTICS
═══════════════════════════════════════════
- Total agents: {aggregate.get('total_agents', 0)}
- Total actions logged: {aggregate.get('total_actions', 0)}
- Total posts made: {aggregate.get('total_posts', 0)}
- Total social interactions (likes/shares/replies): {aggregate.get('total_interactions', 0)}

═══════════════════════════════════════════
AGENT PROFILES & BEHAVIOR SUMMARIES
═══════════════════════════════════════════
{json.dumps(agent_summaries, indent=2)}

═══════════════════════════════════════════
ACTION LOG SAMPLE (up to 150 most recent actions)
═══════════════════════════════════════════
{json.dumps(action_log_sample, indent=2)}

═══════════════════════════════════════════
INVESTIGATION QUESTIONS
═══════════════════════════════════════════
{json.dumps([{"id": f"q_{i}", "question": q} for i, q in enumerate(questions)], indent=2)}

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

Return a JSON array of exactly {len(questions)} answer objects. No extra wrapper.
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

        result = self._call_llm(prompt, temperature=0.1)
        if result:
            try:
                raw_answers = json.loads(result)
                if isinstance(raw_answers, list):
                    validated: list[dict] = []
                    for i, ans in enumerate(raw_answers):
                        if not isinstance(ans, dict):
                            continue
                        answer_text = str(ans.get("answer", "MAYBE")).upper()
                        if answer_text not in ("YES", "NO", "MAYBE"):
                            answer_text = "MAYBE"
                        raw_evidence = ans.get("evidence") or []
                        evidence = [
                            {
                                "agent_id": str(e.get("agent_id", "")),
                                "agent_name": str(e.get("agent_name", "")),
                                "action_description": str(e.get("action_description", "")),
                                "relevance_to_answer": str(e.get("relevance_to_answer", "")),
                                "weight": float(
                                    max(0.0, min(1.0, e.get("weight", 0.25)))
                                ),
                            }
                            for e in raw_evidence
                            if isinstance(e, dict)
                        ]
                        validated.append({
                            "question_id": ans.get("question_id", f"q_{i}"),
                            "question": str(
                                ans.get("question", questions[i] if i < len(questions) else "")
                            ),
                            "answer": answer_text,
                            "confidence": float(
                                max(0.0, min(1.0, ans.get("confidence", 0.5)))
                            ),
                            "reasoning": str(ans.get("reasoning", "")),
                            "evidence": evidence,
                            "caveats": str(ans.get("caveats", "")),
                        })
                    return validated
            except Exception as e:
                print(f"[QuestionMetrics] Failed to parse answer response: {e}")

        # Fallback: unanswered questions
        return [
            {
                "question_id": f"q_{i}",
                "question": q,
                "answer": "MAYBE",
                "confidence": 0.0,
                "reasoning": "LLM analysis unavailable. Ensure GEMINI_API_KEY is configured.",
                "evidence": [],
                "caveats": "Could not generate answers — LLM service unavailable.",
            }
            for i, q in enumerate(questions)
        ]

    # ── Main entry point ──────────────────────────────────────────────────────

    def run(self) -> dict:
        """
        Execute the full 3-phase pipeline and save results to questions_metrics.json.

        Phase 1 — Question generation (1 LLM call)
        Phase 2 — Behavior summarization (no LLM, pure data processing)
        Phase 3 — Answer all questions (1 batched LLM call)
        """
        objective = self._load_objective()
        actions = self._load_actions()
        agents = self._load_agents()

        if not actions and not agents:
            result = {
                "available": False,
                "generated_at": datetime.utcnow().isoformat(),
                "objective": objective,
                "questions": [],
                "answers": [],
                "aggregate": {},
                "error": "No simulation data found. Run the simulation first.",
            }
            with open(self.result_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
            return result

        # Phase 2 (no LLM — run first so agent count is available for phase 1)
        behavior_summary = self._summarize_behaviors(actions, agents)
        agent_count = behavior_summary["aggregate"]["total_agents"]

        # Phase 1
        questions = self._generate_questions(objective, agent_count)

        # Phase 3
        answers = self._answer_questions(questions, behavior_summary, objective)

        result = {
            "available": True,
            "generated_at": datetime.utcnow().isoformat(),
            "objective": objective,
            "questions": questions,
            "answers": answers,
            "aggregate": behavior_summary["aggregate"],
        }

        with open(self.result_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, default=str)

        return result
