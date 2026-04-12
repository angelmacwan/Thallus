"""
SimulationRunner – drives an OASIS social-media simulation.

Uses the ``camel-oasis`` library (pip install camel-oasis).
Requires Python >=3.10, <3.12.

Requires GEMINI_API_KEY for the camel-ai Google provider (gemini-1.5-flash by default).
The CAMEL model type can be changed via core/config.py (CAMEL_MODEL_TYPE).
"""

import asyncio
import json
import os
import sqlite3
import tempfile

from dotenv import load_dotenv
load_dotenv()

from core.config import CAMEL_MODEL_TYPE, PATTERN_EXTRACTION_INTERVAL, PATTERN_EVENT_MIN_IMPACT_SCORE
from core.graph_memory import LocalGraphMemory
from core.usage import UsageSummary
from core.prompts import seed_posts_prompt
from core.pattern_engine import PatternEngine


class SimulationRunner:
    def __init__(
        self,
        graph: LocalGraphMemory,
        agents_path: str,
        db_path: str,
        log_path: str,
        emit_event=None,
        objective: str = "",
    ):
        self.graph = graph
        self.agents_path = agents_path
        self.db_path = db_path
        self.log_path = log_path
        self.objective = objective.strip()
        self._emit = emit_event if callable(emit_event) else (lambda t, m: None)
        self._usage = UsageSummary()
        # Will be set in run() — points to agents file OASIS should actually read
        self._effective_agents_path = agents_path

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

        # Inject objective into each agent's persona so OASIS stays on-topic.
        # Write to a temp file so the original agents.json is never altered.
        if self.objective:
            profiles = self._inject_objective_into_profiles(profiles)
            tmp = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False, encoding="utf-8"
            )
            json.dump(profiles, tmp, ensure_ascii=False)
            tmp.close()
            self._effective_agents_path = tmp.name
            print(f"Objective injected into {len(profiles)} agent persona(s).")
        else:
            self._effective_agents_path = self.agents_path

        for p in profiles:
            username = p.get("username") or p.get("realname", "unknown")
            self._emit("agent", f"Agent created: @{username}")

        print(
            f"Starting OASIS simulation with {len(profiles)} agent(s) "
            f"for {rounds} round(s)…"
        )
        self._emit("stage", f"Starting simulation with {len(profiles)} agent(s) for {rounds} round(s)")
        asyncio.run(self._run_oasis(rounds, len(profiles)))

    # ------------------------------------------------------------------
    # Async OASIS execution
    # ------------------------------------------------------------------

    async def _run_oasis(self, rounds: int, n_agents: int):
        import oasis
        from oasis import ActionType, LLMAction, ManualAction, generate_reddit_agent_graph

        self._emit("stage", "Initializing AI model…")
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

        self._emit("stage", "Building agent graph…")
        print("Building OASIS agent graph…")
        agent_graph = await generate_reddit_agent_graph(
            profile_path=self._effective_agents_path,
            model=model,
            available_actions=available_actions,
        )
        self._emit("stage", "Agent graph ready")

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
            self._emit("action", f"Seeded platform with {len(seed_contents)} initial post(s)")

        # ── LLM rounds ────────────────────────────────────────────────
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
            print(f"\n--- OASIS Round {r + 1}/{rounds} ---")
            self._emit("round", f"Round {r + 1}/{rounds} — agents deciding actions…")
            llm_actions = {
                agent: LLMAction()
                for _, agent in env.agent_graph.get_agents()
            }
            await env.step(llm_actions)
            print(f"Round {r + 1} complete.")
            self._emit("round", f"Round {r + 1}/{rounds} complete")

            # ── Pattern extraction & event injection ──────────────────
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

        # Cleanup temp file created by objective injection
        if self._effective_agents_path != self.agents_path:
            try:
                os.unlink(self._effective_agents_path)
            except Exception:
                pass

        # ── Estimate OASIS token usage (camel-ai doesn't expose usage_metadata) ──
        from core.config import (
            OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND,
            OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND,
        )
        self._usage.add(
            input_tokens=n_agents * rounds * OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND,
            output_tokens=n_agents * rounds * OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND,
        )

        # ── Pattern events log ────────────────────────────────────────
        outputs_dir = os.path.dirname(self.log_path) or "."
        pe.flush_log(outputs_dir)

        # ── Post-run export ───────────────────────────────────────────
        self._emit("stage", "Exporting simulation data…")
        self._export_db_to_log()
        print(f"\nSimulation complete. Activity log → {self.log_path}")
        self._emit("done", "Simulation complete")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _inject_objective_into_profiles(self, profiles: list[dict]) -> list[dict]:
        """Return a copy of profiles with the objective context appended to each persona."""
        import copy
        injected = copy.deepcopy(profiles)
        for agent in injected:
            existing = (agent.get("persona") or "").strip()
            agent["persona"] = (
                f"{existing}\n\n"
                f"CURRENT EVENTS CONTEXT: {self.objective}\n"
                "This is a real situation. Engage with this topic authentically in every post and comment "
                "as though it is actually happening. Do NOT introduce unrelated subjects."
            ).strip()
        return injected

    def _build_camel_model(self):
        from camel.models import ModelFactory
        from camel.types import ModelPlatformType

        if os.getenv("GEMINI_API_KEY"):
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

        raise EnvironmentError(
            "No LLM API key found. Set GEMINI_API_KEY in your .env file."
        )

    def _build_seed_posts(self) -> list[str]:
        """Use an LLM to generate natural, contextual seed posts from the knowledge graph."""
        from google import genai as _genai
        from google.genai import types as _gtypes
        from core.config import MODEL_NAME

        # Build a brief context summary
        entity_lines = [
            f"- {name} ({data.get('type', 'entity')})"
            for name, data in list(self.graph.entities.items())[:15]
        ]
        relation_lines = [
            f"- {r['source']} → {r['type']} → {r['target']}"
            for r in self.graph.relations[:10]
        ]
        context = "Entities:\n" + "\n".join(entity_lines)
        if relation_lines:
            context += "\n\nRelationships:\n" + "\n".join(relation_lines)

        objective_line = (
            f"\nFocus topic: {self.objective}\n"
            "All posts MUST relate directly to this topic.\n"
            if self.objective else ""
        )
        prompt = seed_posts_prompt(objective_line=objective_line, context=context)

        try:
            client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=_gtypes.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            posts = json.loads(response.text)
            if isinstance(posts, list) and posts and all(isinstance(p, str) for p in posts):
                print(f"LLM generated {len(posts)} contextual seed post(s).")
                return posts[:6]
        except Exception as exc:
            print(f"Warning: LLM seed post generation failed ({exc}); using fallback.")

        # Fallback: natural-language summaries (no raw label templates)
        posts = []
        for name, data in list(self.graph.entities.items())[:4]:
            etype = data.get("type", "entity").lower()
            posts.append(f"{name} is a significant {etype} shaping this situation.")
        for rel in self.graph.relations[:2]:
            posts.append(
                f"{rel['source']} has a {rel['type'].lower()} relationship with {rel['target']}."
            )
        return posts[:6]

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

