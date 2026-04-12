"""
small_world_runner.py – Drives an OASIS simulation for a Small World scenario.

Differs from SimulationRunner:
  - Agents are pre-defined SmallWorldAgent records (no ProfileGenerator step)
  - World context is synthesized from world.description + scenario.seed_text
  - Branching: if parent_scenario_id is set, parent simulation.db is copied
    as the starting state before new rounds run
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import tempfile
from typing import Any, Callable

from dotenv import load_dotenv
load_dotenv()

from core.usage import UsageSummary
from core.pattern_engine import PatternEngine
from core.config import PATTERN_EXTRACTION_INTERVAL, PATTERN_EVENT_MIN_IMPACT_SCORE


class SmallWorldRunner:
    def __init__(
        self,
        agents: list[dict[str, Any]],
        world_description: str,
        scenario_name: str,
        seed_text: str,
        output_dir: str,
        emit_event: Callable[[str, str], None] | None = None,
        parent_output_dir: str | None = None,
        rounds: int = 2,
        relationships: list[dict[str, Any]] | None = None,
    ):
        """
        agents           – list of agent dicts (name, job_title, profession, persona, goals, …)
        world_description – natural language description of the world
        scenario_name    – name of this scenario
        seed_text        – seed prompt / what-if question
        output_dir       – where to write simulation artifacts
        emit_event       – callback(type, message) for SSE
        parent_output_dir – output dir of parent scenario for branching (optional)
        rounds           – number of OASIS LLM rounds
        relationships    – list of user-defined AgentRelationship dicts (source_name, target_name, type, sentiment, …)
        """
        self.agents = agents
        self.world_description = world_description
        self.scenario_name = scenario_name
        self.seed_text = seed_text
        self.output_dir = output_dir
        self.parent_output_dir = parent_output_dir
        self.rounds = rounds
        self.relationships = relationships or []
        self._emit = emit_event if callable(emit_event) else (lambda t, m: None)
        self._usage = UsageSummary()

        os.makedirs(output_dir, exist_ok=True)

    # ──────────────────────────────────────────────────────────────────────────
    # Public
    # ──────────────────────────────────────────────────────────────────────────

    def run(self) -> None:
        if not self.agents:
            self._emit("error", "No agents provided for simulation")
            raise ValueError("No agents provided")

        # Build OASIS-compatible agent profiles
        profiles = self._build_profiles()
        agents_path = os.path.join(self.output_dir, "agents.json")
        with open(agents_path, "w", encoding="utf-8") as f:
            json.dump(profiles, f, ensure_ascii=False, indent=2)

        db_path = os.path.join(self.output_dir, "simulation.db")
        log_path = os.path.join(self.output_dir, "actions.jsonl")

        # Branch: copy parent DB if available
        if self.parent_output_dir:
            parent_db = os.path.join(self.parent_output_dir, "simulation.db")
            if os.path.exists(parent_db):
                shutil.copy2(parent_db, db_path)
                self._emit("stage", "Branching from parent scenario — copying state…")
            else:
                self._emit("stage", "Parent scenario DB not found; starting fresh")
        
        for p in profiles:
            self._emit("agent", f"Agent ready: @{p.get('username', 'unknown')}")

        self._emit("stage", f"Starting Small World simulation — {len(profiles)} agent(s), {self.rounds} round(s)")
        asyncio.run(self._run_oasis(profiles, agents_path, db_path, log_path))

    # ──────────────────────────────────────────────────────────────────────────
    # Private
    # ──────────────────────────────────────────────────────────────────────────

    def _build_profiles(self) -> list[dict]:
        """Convert SmallWorldAgent dicts to OASIS-compatible profile format."""
        # Build a lookup: agent_id → list of relationship descriptions
        rel_map: dict[str, list[str]] = {}
        for r in self.relationships:
            src_id = r.get("source_agent_id", "")
            tgt_name = r.get("target_name", "")
            rel_type = r.get("type", "")
            sentiment = r.get("sentiment", "")
            influence = r.get("influence_direction", "")
            if src_id and tgt_name:
                desc = f"{tgt_name} ({rel_type}, {sentiment} sentiment"
                if influence:
                    desc += f", {influence}"
                desc += ")"
                rel_map.setdefault(src_id, []).append(desc)

        profiles = []
        for agent in self.agents:
            name = agent.get("name", "Agent")
            agent_id = agent.get("agent_id", "")
            username = name.lower().replace(" ", "_")

            # Build persona string from rich profile data
            persona_parts = [f"Name: {name}"]
            if agent.get("job_title"):
                persona_parts.append(f"Role: {agent['job_title']}")
            if agent.get("organization"):
                persona_parts.append(f"Organization: {agent['organization']}")
            if agent.get("location"):
                persona_parts.append(f"Location: {agent['location']}")

            pt = agent.get("personality_traits") or {}
            if isinstance(pt, str):
                try:
                    pt = json.loads(pt)
                except Exception:
                    pt = {}
            if pt.get("decision_style"):
                persona_parts.append(f"Decision style: {pt['decision_style']}")
            if pt.get("core_beliefs"):
                persona_parts.append(f"Core beliefs: {pt['core_beliefs']}")
            if pt.get("motivation_drivers"):
                drivers = pt["motivation_drivers"]
                if isinstance(drivers, list):
                    persona_parts.append(f"Motivated by: {', '.join(str(d) for d in drivers)}")

            ba = agent.get("behavioral_attributes") or {}
            if isinstance(ba, str):
                try:
                    ba = json.loads(ba)
                except Exception:
                    ba = {}
            if ba.get("communication_style"):
                persona_parts.append(f"Communication style: {ba['communication_style']}")

            cs = agent.get("contextual_state") or {}
            if isinstance(cs, str):
                try:
                    cs = json.loads(cs)
                except Exception:
                    cs = {}
            goals = cs.get("current_goals") or []
            if isinstance(goals, list) and goals:
                persona_parts.append(f"Current goals: {'; '.join(str(g) for g in goals[:3])}")
            frustrations = cs.get("current_frustrations") or []
            if isinstance(frustrations, list) and frustrations:
                persona_parts.append(f"Frustrations: {'; '.join(str(f) for f in frustrations[:2])}")

            # Inject only user-defined relationships (or explicitly note none exist)
            agent_rels = rel_map.get(agent_id, [])
            if agent_rels:
                persona_parts.append(f"\nDEFINED RELATIONSHIPS: {'; '.join(agent_rels)}")
                persona_parts.append(
                    "You MUST reflect these defined relationships in how you interact. "
                    "Treat other agents according to your relationship type and sentiment."
                )
            else:
                persona_parts.append(
                    "\nDEFINED RELATIONSHIPS: None. You have no pre-defined relationships with other agents. "
                    "Do NOT invent or assume social familiarity with others."
                )

            # Include world + scenario context in every agent persona
            persona_parts.append(f"\nWORLD CONTEXT: {self.world_description}")
            persona_parts.append(f"SCENARIO: {self.scenario_name} — {self.seed_text}")
            persona_parts.append(
                "You MUST stay strictly within this scenario context in every post and comment. "
                "React authentically based on your role, goals, and beliefs."
            )

            persona = "\n".join(persona_parts)

            # Derive MBTI from Big Five traits when not explicitly stored.
            # Mapping: E/I←extraversion, N/S←openness, F/T←agreeableness, J/P←conscientiousness
            stored_mbti = pt.get("mbti") if isinstance(pt, dict) else None
            if stored_mbti:
                mbti = stored_mbti
            else:
                e_score = pt.get("extraversion") if isinstance(pt, dict) else None
                o_score = pt.get("openness") if isinstance(pt, dict) else None
                a_score = pt.get("agreeableness") if isinstance(pt, dict) else None
                c_score = pt.get("conscientiousness") if isinstance(pt, dict) else None
                ei = "E" if (e_score or 0.5) >= 0.5 else "I"
                ns = "N" if (o_score or 0.5) >= 0.5 else "S"
                ft = "F" if (a_score or 0.5) >= 0.5 else "T"
                jp = "J" if (c_score or 0.5) >= 0.5 else "P"
                mbti = f"{ei}{ns}{ft}{jp}"

            profile = {
                "username": username,
                "realname": name,
                "age": agent.get("age", 30),
                "gender": agent.get("gender", "unspecified"),
                "work": agent.get("profession") or agent.get("job_title") or "Professional",
                "location": agent.get("location", ""),
                "country": agent.get("location", ""),
                "bio": persona[:300],
                "mbti": mbti,
                "persona": persona,
                "is_small_world_agent": True,
                "agent_id": agent.get("agent_id", ""),
            }
            profiles.append(profile)
        return profiles

    async def _run_oasis(
        self,
        profiles: list[dict],
        agents_path: str,
        db_path: str,
        log_path: str,
    ) -> None:
        import oasis
        from oasis import ActionType, LLMAction, ManualAction, generate_reddit_agent_graph
        from core.config import CAMEL_MODEL_TYPE, OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND, OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND

        self._emit("stage", "Initializing AI model…")
        model = self._build_camel_model(CAMEL_MODEL_TYPE)

        # Write temp profile file for OASIS (profiles already built in _build_profiles)
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
        json.dump(profiles, tmp, ensure_ascii=False)
        tmp.close()

        try:
            available_actions = [
                ActionType.CREATE_POST,
                ActionType.CREATE_COMMENT,
                ActionType.LIKE_POST,
                ActionType.DISLIKE_POST,
                ActionType.LIKE_COMMENT,
                ActionType.DISLIKE_COMMENT,
                ActionType.SEARCH_POSTS,
                ActionType.DO_NOTHING,
            ]

            self._emit("stage", "Building agent graph…")
            agent_graph = await generate_reddit_agent_graph(
                profile_path=tmp.name,
                model=model,
                available_actions=available_actions,
            )
            self._emit("stage", "Agent graph ready")

            # If branching and DB already exists, don't wipe it — OASIS will append
            if not os.path.exists(db_path):
                pass  # Fresh start; OASIS creates the DB

            env = oasis.make(
                agent_graph=agent_graph,
                platform=oasis.DefaultPlatformType.REDDIT,
                database_path=db_path,
            )

            await env.reset()

            # Seed post: inject scenario seed text as Agent 0's first post
            if self.seed_text:
                first_agent = env.agent_graph.get_agent(0)
                seed_action = {
                    first_agent: [
                        ManualAction(
                            action_type=ActionType.CREATE_POST,
                            action_args={"content": f"[SCENARIO SEED] {self.seed_text}"},
                        )
                    ]
                }
                await env.step(seed_action)
                self._emit("action", "Scenario seed post published")

            # LLM rounds
            from core.config import MODEL_NAME
            _genai_client = None
            try:
                from google import genai as _genai
                _genai_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            except Exception:
                pass

            pe = PatternEngine(
                genai_client=_genai_client,
                model_name=MODEL_NAME,
                usage=self._usage,
                emit_event=self._emit,
            )

            for r in range(self.rounds):
                self._emit("round", f"Round {r + 1}/{self.rounds} — agents deliberating…")
                llm_actions = {
                    agent: LLMAction()
                    for _, agent in env.agent_graph.get_agents()
                }
                await env.step(llm_actions)
                self._emit("round", f"Round {r + 1}/{self.rounds} complete")

                # ── Pattern extraction & event injection ──────────────────────
                if _genai_client and (r + 1) % PATTERN_EXTRACTION_INTERVAL == 0:
                    self._emit("stage", f"Analysing emerging patterns after round {r + 1}…")
                    patterns = pe.extract_patterns(db_path, r + 1)
                    if patterns:
                        self._emit("stage", f"Detected {len(patterns)} pattern(s) — generating world event…")
                        event = pe.generate_event_from_patterns(patterns)
                        score = pe.score_event_impact(event, patterns)
                        pe.record(r + 1, patterns, event, score)
                        if score >= PATTERN_EVENT_MIN_IMPACT_SCORE:
                            await pe.inject_event(event, env, env.agent_graph.get_agent(0))
                            self._emit("action", f"[WORLD EVENT] {event['title']}: {event['description']}")
                            print(f"PatternEngine: injected event '{event['title']}' (impact={score:.2f})")
                        else:
                            print(f"PatternEngine: event '{event['title']}' skipped (impact={score:.2f} < threshold)")

            await env.close()

            # ── Pattern events log ────────────────────────────────────────────
            pe.flush_log(self.output_dir)

            # Accumulate estimated token usage (OASIS doesn't expose per-call counts)
            n_agents = len(profiles)
            self._usage.add(
                input_tokens=n_agents * self.rounds * OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND,
                output_tokens=n_agents * self.rounds * OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND,
            )

        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass

        # Export to JSONL log
        self._export_db_to_log(db_path, log_path)

        # Save agent profiles to output
        with open(agents_path, "w", encoding="utf-8") as f:
            json.dump(profiles, f, ensure_ascii=False, indent=2)

        self._emit("stage", "Simulation runs complete")

    def _build_camel_model(self, model_type_str: str):
        from camel.models import ModelFactory
        from camel.types import ModelPlatformType, ModelType as MT

        if os.getenv("GEMINI_API_KEY"):
            try:
                model_type = MT(model_type_str)
            except ValueError:
                model_type = MT.GEMINI_1_5_FLASH
            return ModelFactory.create(
                model_platform=ModelPlatformType.GEMINI,
                model_type=model_type,
            )
        raise EnvironmentError("No LLM API key found. Set GEMINI_API_KEY.")

    def _export_db_to_log(self, db_path: str, log_path: str) -> None:
        """Export OASIS simulation.db activity to JSONL."""
        import sqlite3

        if not os.path.exists(db_path):
            return

        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            # Export trace first (has action field), then post/comment for content
            tables_to_try = ["trace", "post", "posts", "comment", "comments", "action", "actions"]
            with open(log_path, "w", encoding="utf-8") as out:
                for table in tables_to_try:
                    try:
                        cur.execute(f"SELECT * FROM {table}")  # noqa: S608
                        rows = cur.fetchall()
                        for row in rows:
                            out.write(json.dumps(dict(row)) + "\n")
                    except sqlite3.OperationalError:
                        continue
            conn.close()
        except Exception as e:
            print(f"Warning: could not export simulation DB: {e}")
