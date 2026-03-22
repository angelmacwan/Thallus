"""
SimulationRunner – drives an OASIS social-media simulation.

Uses the ``camel-oasis`` library (pip install camel-oasis).
Requires Python >=3.10, <3.12.

Model priority:
  1. GEMINI_API_KEY  →  camel-ai Google provider (gemini-1.5-flash by default)
  2. OPENAI_API_KEY  →  camel-ai OpenAI provider (gpt-4o-mini)

The CAMEL model type can be changed via core/config.py (CAMEL_MODEL_TYPE).
"""

import asyncio
import json
import os
import sqlite3

from dotenv import load_dotenv
load_dotenv()

from core.config import CAMEL_MODEL_TYPE
from core.graph_memory import LocalGraphMemory


def _bridge_google_api_key():
    """
    CAMEL's Google provider looks for GOOGLE_API_KEY.
    If the project uses GEMINI_API_KEY, copy it across so CAMEL finds it.
    """
    if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")


class SimulationRunner:
    def __init__(
        self,
        graph: LocalGraphMemory,
        agents_path: str,
        db_path: str,
        log_path: str,
    ):
        self.graph = graph
        self.agents_path = agents_path
        self.db_path = db_path
        self.log_path = log_path

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def run(self, rounds: int):
        if not os.path.exists(self.agents_path):
            print(f"Agents file not found: {self.agents_path}. Skipping simulation.")
            return

        with open(self.agents_path, encoding="utf-8") as fh:
            profiles = json.load(fh)

        if not profiles:
            print("No agent profiles found. Skipping simulation.")
            return

        print(
            f"Starting OASIS simulation with {len(profiles)} agent(s) "
            f"for {rounds} round(s)…"
        )
        asyncio.run(self._run_oasis(rounds))

    # ------------------------------------------------------------------
    # Async OASIS execution
    # ------------------------------------------------------------------

    async def _run_oasis(self, rounds: int):
        import oasis
        from oasis import ActionType, LLMAction, ManualAction, generate_reddit_agent_graph

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

        print("Building OASIS agent graph…")
        agent_graph = await generate_reddit_agent_graph(
            profile_path=self.agents_path,
            model=model,
            available_actions=available_actions,
        )

        # Fresh database for this run
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

        env = oasis.make(
            agent_graph=agent_graph,
            platform=oasis.DefaultPlatformType.REDDIT,
            database_path=self.db_path,
        )

        await env.reset()

        # ── Seed pass ──────────────────────────────────────────────────
        # Agent 0 posts key facts from the knowledge graph so that every
        # subsequent LLM step has topical context to react to.
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
            print(f"Seeded simulation with {len(seed_contents)} context post(s).")

        # ── LLM rounds ────────────────────────────────────────────────
        for r in range(rounds):
            print(f"\n--- OASIS Round {r + 1}/{rounds} ---")
            llm_actions = {
                agent: LLMAction()
                for _, agent in env.agent_graph.get_agents()
            }
            await env.step(llm_actions)
            print(f"Round {r + 1} complete.")

        await env.close()

        # ── Post-run export ───────────────────────────────────────────
        self._export_db_to_log()
        print(f"\nSimulation complete. Activity log → {self.log_path}")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_camel_model(self):
        from camel.models import ModelFactory
        from camel.types import ModelPlatformType

        _bridge_google_api_key()

        if os.getenv("GOOGLE_API_KEY"):
            # Resolve model type – fall back gracefully if the string is not
            # a recognised enum value in the installed camel-ai version.
            from camel.types import ModelType as MT
            try:
                model_type = MT(CAMEL_MODEL_TYPE)
            except ValueError:
                model_type = MT.GEMINI_1_5_FLASH  # safe fallback
            print(f"Using Google/Gemini model: {model_type.value}")
            return ModelFactory.create(
                model_platform=ModelPlatformType.GEMINI,
                model_type=model_type,
            )

        if os.getenv("OPENAI_API_KEY"):
            from camel.types import ModelType as MT
            print("Using OpenAI model: gpt-4o-mini")
            return ModelFactory.create(
                model_platform=ModelPlatformType.OPENAI,
                model_type=MT.GPT_4O_MINI,
            )

        raise EnvironmentError(
            "No LLM API key found. Set GEMINI_API_KEY or OPENAI_API_KEY."
        )

    def _build_seed_posts(self) -> list[str]:
        """Compose short factual posts from graph entities and relations."""
        posts = []

        for name, data in list(self.graph.entities.items())[:5]:
            etype = data.get("type", "entity")
            posts.append(f"Notable {etype}: {name}")

        for rel in self.graph.relations[:5]:
            posts.append(
                f"{rel['source']} {rel['type']} {rel['target']}"
            )

        return posts[:6]  # keep seed brief

    def _export_db_to_log(self):
        """
        Read posts and comments from the OASIS SQLite database and append
        them to the JSONL action log so the ReportAgent has rich material.
        """
        if not os.path.exists(self.db_path):
            return

        entries: list[dict] = []
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
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
            print(f"Warning: could not read OASIS DB: {exc}")
            return

        if entries:
            log_dir = os.path.dirname(self.log_path)
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)
            with open(self.log_path, "a", encoding="utf-8") as fh:
                for entry in entries:
                    fh.write(json.dumps(entry, default=str) + "\n")
            print(f"Exported {len(entries)} DB record(s) to {self.log_path}")

