"""
ScenarioRunner – runs a "what-if" scenario on top of an existing simulation session.

Reuses the same agent profiles from the parent session and injects the user as the
first (most influential) agent whose single post — the scenario description — becomes
the seed truth that all other agents react to.

The combined profile list (user + sim agents) is written to scenario_agents.json so
InsightsEngine can read correct indices and identify which agent is the seed user.
"""

import asyncio
import json
import os
import sqlite3
import tempfile

from dotenv import load_dotenv
load_dotenv()

from core.config import CAMEL_MODEL_TYPE, PATTERN_EXTRACTION_INTERVAL, PATTERN_EVENT_MIN_IMPACT_SCORE
from core.usage import UsageSummary
from core.pattern_engine import PatternEngine


class ScenarioRunner:
    def __init__(
        self,
        agents_path: str,
        db_path: str,
        log_path: str,
        scenario_description: str,
        user_label: str = "You",
        emit_event=None,
        objective: str = "",
    ):
        self.agents_path = agents_path
        self.db_path = db_path
        self.log_path = log_path
        self.scenario_description = scenario_description
        self.user_label = user_label
        self.objective = objective.strip()
        self._emit = emit_event if callable(emit_event) else (lambda t, m: None)
        self._usage = UsageSummary()

    # ──────────────────────────────────────────────────────────────────────────
    # Public
    # ──────────────────────────────────────────────────────────────────────────

    def run(self, rounds: int):
        if not os.path.exists(self.agents_path):
            self._emit("error", "Agent profiles not found. Cannot run scenario.")
            return

        with open(self.agents_path, encoding="utf-8") as fh:
            profiles = json.load(fh)

        if not profiles:
            self._emit("error", "No agent profiles found.")
            return

        for p in profiles:
            username = p.get("username") or p.get("realname", "unknown")
            self._emit("agent", f"Scenario agent: @{username}")

        self._emit(
            "stage",
            f"Starting scenario with {len(profiles)} agent(s) for {rounds} round(s)",
        )
        asyncio.run(self._run_oasis(rounds))

    # ──────────────────────────────────────────────────────────────────────────
    # Async OASIS execution
    # ──────────────────────────────────────────────────────────────────────────

    async def _run_oasis(self, rounds: int):
        import oasis
        from oasis import ActionType, LLMAction, ManualAction, generate_reddit_agent_graph

        self._emit("stage", "Initializing AI model for scenario…")
        model = self._build_camel_model()

        available_actions = [
            ActionType.CREATE_POST,
            ActionType.CREATE_COMMENT,
            ActionType.LIKE_POST,
            ActionType.DISLIKE_POST,
            ActionType.LIKE_COMMENT,
            ActionType.DISLIKE_COMMENT,
            ActionType.SEARCH_POSTS,
            ActionType.TREND,
            ActionType.REFRESH,
            ActionType.DO_NOTHING,
            ActionType.FOLLOW,
        ]

        # ── Inject user as the first (most influential) agent ─────────────────
        # The user posts the scenario description before any LLM round starts,
        # so it is the only content on the platform when agents wake up.
        # is_seed_user=True lets InsightsEngine exclude them from debates.
        user_handle = self.user_label.lower().replace(" ", "_")
        user_profile = {
            "username": user_handle,
            "realname": self.user_label,
            "bio": "Scenario architect and simulation operator.",
            "persona": (
                f"{self.user_label} introduced this scenario. "
                "Posts with authority; other participants react to their framing."
            ),
            "age": 35,
            "gender": "non-binary",
            "mbti": "ENTJ",
            "country": "US",
            "profession": "Analyst",
            "interested_topics": ["current events", "geopolitics", "society"],
            "is_seed_user": True,
        }

        with open(self.agents_path, encoding="utf-8") as fh:
            sim_profiles = json.load(fh)

        combined_profiles = [user_profile] + sim_profiles

        # Inject objective into every non-seed agent's persona so agents stay
        # anchored to the real-world topic being discussed.
        if self.objective:
            for profile in combined_profiles:
                if not profile.get("is_seed_user"):
                    existing = (profile.get("persona") or "").strip()
                    profile["persona"] = (
                        f"{existing}\n\n"
                        f"CURRENT EVENTS CONTEXT: {self.objective}\n"
                        "This is real. Engage with this event authentically in every post and comment "
                        "as though it is actually happening. Do NOT introduce unrelated subjects."
                    ).strip()
            print(f"Context injected into {len(combined_profiles) - 1} scenario agent persona(s).")

        # Persist so InsightsEngine reads correct indices + can identify seed user
        scenario_dir = os.path.dirname(self.log_path)
        os.makedirs(scenario_dir, exist_ok=True)
        scenario_agents_path = os.path.join(scenario_dir, "scenario_agents.json")
        with open(scenario_agents_path, "w", encoding="utf-8") as fh:
            json.dump(combined_profiles, fh, ensure_ascii=False)

        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        )
        json.dump(combined_profiles, tmp, ensure_ascii=False)
        tmp.close()

        self._emit("stage", "Building scenario agent graph…")
        try:
            agent_graph = await generate_reddit_agent_graph(
                profile_path=tmp.name,
                model=model,
                available_actions=available_actions,
            )
        finally:
            os.unlink(tmp.name)

        self._emit("stage", "Scenario agent graph ready")

        # Fresh database for this scenario run
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

        env = oasis.make(
            agent_graph=agent_graph,
            platform=oasis.DefaultPlatformType.REDDIT,
            database_path=self.db_path,
        )

        await env.reset()

        # ── User seed post ────────────────────────────────────────────────────
        # The user (agent 0) posts the scenario description as plain text.
        # No prefixes, no graph noise — just the premise, as if a real person
        # broke the news. Every LLM agent reads this first.
        user_agent = env.agent_graph.get_agent(0)
        await env.step({
            user_agent: [
                ManualAction(
                    action_type=ActionType.CREATE_POST,
                    action_args={"content": self.scenario_description},
                )
            ]
        })
        self._emit("action", f"@{user_handle} posted the scenario — agents will now react")

        # ── LLM rounds ────────────────────────────────────────────────────────
        from core.config import MODEL_NAME
        import os as _os
        _genai_client = None
        try:
            from google import genai as _genai
            _genai_client = _genai.Client(api_key=_os.getenv("GEMINI_API_KEY"))
        except Exception:
            pass

        pe = PatternEngine(
            genai_client=_genai_client,
            model_name=MODEL_NAME,
            usage=self._usage,
            emit_event=self._emit,
        )

        for r in range(rounds):
            self._emit("round", f"Round {r + 1}/{rounds} — agents reacting to scenario…")
            llm_actions = {
                agent: LLMAction()
                for _, agent in env.agent_graph.get_agents()
            }
            await env.step(llm_actions)
            self._emit("round", f"Round {r + 1}/{rounds} complete")

            # ── Pattern extraction & event injection ──────────────────────────
            if _genai_client and (r + 1) % PATTERN_EXTRACTION_INTERVAL == 0:
                self._emit("stage", f"Analysing emerging patterns after round {r + 1}…")
                patterns = pe.extract_patterns(self.db_path, r + 1)
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

        # ── Estimate OASIS token usage (camel-ai doesn't expose usage_metadata) ──
        from core.config import (
            OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND,
            OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND,
        )
        n_agents = len(combined_profiles)
        self._usage.add(
            input_tokens=n_agents * rounds * OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND,
            output_tokens=n_agents * rounds * OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND,
        )

        # ── Pattern events log ────────────────────────────────────────────────
        scenario_dir = os.path.dirname(self.log_path) or "."
        pe.flush_log(scenario_dir)

        # ── Export ────────────────────────────────────────────────────────────
        self._emit("stage", "Exporting scenario data…")
        self._export_db_to_log()
        self._emit("done", "Scenario simulation complete")

    def _build_camel_model(self):
        from camel.models import ModelFactory
        from camel.types import ModelPlatformType

        if os.getenv("GEMINI_API_KEY"):
            from camel.types import ModelType as MT
            try:
                model_type = MT(CAMEL_MODEL_TYPE)
            except ValueError:
                model_type = MT.GEMINI_1_5_FLASH
            return ModelFactory.create(
                model_platform=ModelPlatformType.GEMINI,
                model_type=model_type,
            )

        raise EnvironmentError(
            "No LLM API key found. Set GEMINI_API_KEY in your .env file."
        )

    def _export_db_to_log(self):
        if not os.path.exists(self.db_path):
            return

        entries: list[dict] = []
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row[0].lower() for row in cursor.fetchall()}

            for candidate in ("post", "posts"):
                if candidate in tables:
                    cursor.execute(f"SELECT * FROM {candidate}")
                    cols = [d[0] for d in cursor.description]
                    for row in cursor.fetchall():
                        entries.append({"_type": "post", **dict(zip(cols, row))})
                    break

            for candidate in ("comment", "comments"):
                if candidate in tables:
                    cursor.execute(f"SELECT * FROM {candidate}")
                    cols = [d[0] for d in cursor.description]
                    for row in cursor.fetchall():
                        entries.append({"_type": "comment", **dict(zip(cols, row))})
                    break

            conn.close()
        except Exception as exc:
            print(f"ScenarioRunner: could not read OASIS DB: {exc}")
            return

        os.makedirs(os.path.dirname(self.log_path) or ".", exist_ok=True)
        with open(self.log_path, "a", encoding="utf-8") as fh:
            for entry in entries:
                fh.write(json.dumps(entry) + "\n")

        print(f"ScenarioRunner: exported {len(entries)} entries → {self.log_path}")
