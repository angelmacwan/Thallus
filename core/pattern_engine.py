"""
pattern_engine.py — Pattern-Driven Simulation Evolution

Detects emerging behavioural patterns in a running OASIS simulation and
generates subtle world events that organically amplify those patterns.

Usage (inside an async _run_oasis method):

    from core.pattern_engine import PatternEngine
    from core.config import PATTERN_EXTRACTION_INTERVAL, PATTERN_EVENT_MIN_IMPACT_SCORE

    pe = PatternEngine(genai_client, MODEL_NAME, self._usage, self._emit)

    for r in range(rounds):
        await env.step(llm_actions)

        if (r + 1) % PATTERN_EXTRACTION_INTERVAL == 0:
            patterns = pe.extract_patterns(db_path, r + 1)
            if patterns:
                event = pe.generate_event_from_patterns(patterns)
                score = pe.score_event_impact(event, patterns)
                if score >= PATTERN_EVENT_MIN_IMPACT_SCORE:
                    await pe.inject_event(event, env, env.agent_graph.get_agent(0))

    pe.flush_log(outputs_dir)
"""

from __future__ import annotations

import json
import os
import sqlite3
from typing import TYPE_CHECKING, Any, Callable

if TYPE_CHECKING:
    pass  # avoid importing heavy oasis types at module level


class PatternEngine:
    """
    Stateful helper that attaches to a running simulation loop.

    One instance per simulation run.  Thread-safe reads against the OASIS
    SQLite database are performed mid-run (the file is written continuously
    by OASIS between env.step() calls).
    """

    def __init__(
        self,
        genai_client: Any,
        model_name: str,
        usage: Any,
        emit_event: Callable[[str, str], None] | None = None,
    ) -> None:
        self._client = genai_client
        self._model = model_name
        self._usage = usage
        self._emit = emit_event if callable(emit_event) else (lambda t, m: None)
        self._log: list[dict] = []

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def extract_patterns(self, db_path: str, round_num: int) -> list[str]:
        """
        Read the live OASIS DB, then use an LLM to identify 3–5 emerging
        behavioural patterns.  Returns a (possibly empty) list of strings.
        """
        state = self._read_state(db_path)
        posts = state["posts"]
        comments = state["comments"]

        if not posts and not comments:
            return []

        from core.prompts import extract_patterns_prompt
        prompt = extract_patterns_prompt(posts, comments, round_num)

        raw = self._call_llm(prompt, temperature=0.4)
        if not raw:
            return []

        try:
            data = json.loads(raw)
            patterns = data.get("patterns", [])
            if isinstance(patterns, list):
                return [str(p) for p in patterns if p]
        except (json.JSONDecodeError, AttributeError):
            pass
        return []

    def generate_event_from_patterns(self, patterns: list[str]) -> dict:
        """
        Given a list of detected patterns, generate ONE subtle world event
        that organically amplifies the existing dynamics.
        """
        from core.prompts import generate_event_prompt
        prompt = generate_event_prompt(patterns)

        raw = self._call_llm(prompt, temperature=0.7)
        if not raw:
            return self._fallback_event(patterns)

        try:
            event = json.loads(raw)
            if (
                isinstance(event, dict)
                and event.get("title")
                and event.get("description")
            ):
                event.setdefault("expected_effects", [])
                return event
        except (json.JSONDecodeError, AttributeError):
            pass

        return self._fallback_event(patterns)

    def score_event_impact(self, event: dict, patterns: list[str]) -> float:
        """
        Predict how meaningfully the event will shift agent dynamics.
        Returns a float in [0.0, 1.0].  Events below config threshold are
        discarded by the caller.
        """
        from core.prompts import score_event_impact_prompt
        prompt = score_event_impact_prompt(event, patterns)

        raw = self._call_llm(prompt, temperature=0.1)
        if not raw:
            return 0.5  # default to injecting on error

        try:
            data = json.loads(raw)
            score = float(data.get("score", 0.5))
            return max(0.0, min(1.0, score))
        except (json.JSONDecodeError, ValueError, AttributeError):
            return 0.5

    async def inject_event(self, event: dict, env: Any, agent_0: Any) -> None:
        """
        Post the event as a ManualAction from agent 0 so all agents see it
        in their feed on the next LLM round.  This is the OASIS-compatible
        equivalent of injecting system-level context mid-run.
        """
        from oasis import ActionType, ManualAction

        content = f"[WORLD EVENT] {event['title']}: {event['description']}"
        action = ManualAction(
            action_type=ActionType.CREATE_POST,
            action_args={"content": content},
        )
        await env.step({agent_0: [action]})

    def flush_log(self, outputs_dir: str) -> None:
        """
        Write all accumulated pattern/event entries to pattern_events.json
        in the given outputs directory.  Safe to call even if the log is empty.
        """
        if not self._log:
            return

        os.makedirs(outputs_dir, exist_ok=True)
        log_path = os.path.join(outputs_dir, "pattern_events.json")
        with open(log_path, "w", encoding="utf-8") as fh:
            json.dump(self._log, fh, ensure_ascii=False, indent=2)
        print(f"PatternEngine: logged {len(self._log)} event(s) → {log_path}")

    def record(
        self,
        round_num: int,
        patterns: list[str],
        event: dict,
        impact_score: float,
    ) -> None:
        """Append one entry to the in-memory log."""
        self._log.append(
            {
                "round": round_num,
                "patterns": patterns,
                "event": event,
                "impact_score": round(impact_score, 4),
            }
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _read_state(self, db_path: str) -> dict[str, list[dict]]:
        """
        Query the live OASIS SQLite DB for posts and comments.
        Handles both 'post'/'posts' and 'comment'/'comments' table variants.
        Returns {"posts": [...], "comments": [...]}.
        """
        result: dict[str, list[dict]] = {"posts": [], "comments": []}

        if not os.path.exists(db_path):
            return result

        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row[0].lower() for row in cur.fetchall()}

            for candidate in ("post", "posts"):
                if candidate in tables:
                    cur.execute(f"SELECT * FROM {candidate}")
                    result["posts"] = [dict(row) for row in cur.fetchall()]
                    break

            for candidate in ("comment", "comments"):
                if candidate in tables:
                    cur.execute(f"SELECT * FROM {candidate}")
                    result["comments"] = [dict(row) for row in cur.fetchall()]
                    break

            conn.close()
        except sqlite3.Error as exc:
            print(f"PatternEngine: DB read error ({exc}); skipping pattern extraction")

        return result

    def _call_llm(self, prompt: str, temperature: float = 0.4) -> str | None:
        """
        Make a single Gemini LLM call and return the raw text response.
        Accumulates token usage into the shared UsageSummary.
        Returns None on any error.
        """
        try:
            from google.genai import types as _gtypes

            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=_gtypes.GenerateContentConfig(
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
        except Exception as exc:
            print(f"PatternEngine: LLM call failed ({exc})")
            return None

    @staticmethod
    def _fallback_event(patterns: list[str]) -> dict:
        """Return a safe no-op event when LLM generation fails."""
        first = patterns[0] if patterns else "emerging tension"
        return {
            "title": "Subtle Shift Detected",
            "description": (
                f"Observers note a quiet but discernible change: {first}. "
                "Agents are free to interpret this through their own lens."
            ),
            "expected_effects": ["Increased reflection", "Minor behavioural adjustment"],
        }
