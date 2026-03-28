"""
ScenarioRunner – runs a "what-if" scenario on top of an existing simulation session.

Reuses the same agent profiles and knowledge graph from the parent session but
seeds the OASIS environment with a user-supplied scenario description so that
agents react to the hypothetical situation.
"""

import asyncio
import json
import os
import sqlite3

from dotenv import load_dotenv
load_dotenv()

from core.config import CAMEL_MODEL_TYPE
from core.graph_memory import LocalGraphMemory


class ScenarioRunner:
    def __init__(
        self,
        graph: LocalGraphMemory,
        agents_path: str,
        db_path: str,
        log_path: str,
        scenario_description: str,
        emit_event=None,
    ):
        self.graph = graph
        self.agents_path = agents_path
        self.db_path = db_path
        self.log_path = log_path
        self.scenario_description = scenario_description
        self._emit = emit_event if callable(emit_event) else (lambda t, m: None)

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

        self._emit("stage", "Building scenario agent graph…")
        agent_graph = await generate_reddit_agent_graph(
            profile_path=self.agents_path,
            model=model,
            available_actions=available_actions,
        )
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

        # ── Seed pass ─────────────────────────────────────────────────────────
        # First agent posts the scenario description + graph context so every
        # subsequent LLM step has the hypothetical situation to react to.
        seed_contents = self._build_seed_posts()
        if seed_contents:
            first_agent = env.agent_graph.get_agent(0)
            seed_actions = {
                first_agent: [
                    ManualAction(
                        action_type=ActionType.CREATE_POST,
                        action_args={"content": text},
                    )
                    for text in seed_contents
                ]
            }
            await env.step(seed_actions)
            self._emit("action", f"Seeded scenario with {len(seed_contents)} context post(s)")

        # ── LLM rounds ────────────────────────────────────────────────────────
        for r in range(rounds):
            self._emit("round", f"Round {r + 1}/{rounds} — agents reacting to scenario…")
            llm_actions = {
                agent: LLMAction()
                for _, agent in env.agent_graph.get_agents()
            }
            await env.step(llm_actions)
            self._emit("round", f"Round {r + 1}/{rounds} complete")

        await env.close()

        # ── Export ────────────────────────────────────────────────────────────
        self._emit("stage", "Exporting scenario data…")
        self._export_db_to_log()
        self._emit("done", "Scenario simulation complete")

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _build_seed_posts(self) -> list[str]:
        """Scenario description first, then a few graph facts for context."""
        posts = [f"[SCENARIO UPDATE] {self.scenario_description}"]

        for name, data in list(self.graph.entities.items())[:3]:
            etype = data.get("type", "entity")
            # Simplified post template to avoid "Background" and "Notable" as concepts
            posts.append(f"Key {etype}: {name}")

        for rel in self.graph.relations[:2]:
            posts.append(
                f"Relationship: {rel['source']} {rel['type']} {rel['target']}"
            )

        return posts[:6]

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
