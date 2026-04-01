"""
web_search.py — Google Search Grounding for Thallus simulations

Uses Gemini's built-in Google Search grounding tool to research topics
extracted from the simulation seed text and objective. Results are saved
as Markdown files in the session's input folder so the simulation engine
can ingest them alongside the user's seed documents.
"""

import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

from core.config import MODEL_NAME


def _extract_topics(seed_text: str, objective: str) -> list[str]:
    """Use Gemini to extract 3-7 concrete, searchable topics from the seed + objective."""
    client = genai.Client()

    combined = ""
    if objective:
        combined += f"Investigation Objective:\n{objective}\n\n"
    if seed_text:
        combined += f"Seed Document Excerpt:\n{seed_text[:4000]}"

    prompt = (
        "You are extracting search topics from a simulation brief.\n\n"
        f"{combined}\n\n"
        "List 3 to 7 specific, concrete search queries (one per line, no bullets or numbering) "
        "that would help a researcher gather current news, data, and context about the above topic. "
        "Each query should be suitable for a Google News or web search. "
        "Return ONLY the search queries, nothing else."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    raw = response.text or ""
    topics = [line.strip() for line in raw.splitlines() if line.strip()]
    return topics[:7]


def _slugify(text: str) -> str:
    """Convert a search query string into a safe filename slug."""
    slug = text.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "_", slug)
    slug = slug.strip("_")
    return slug[:60]


def _search_and_summarize(topic: str) -> str:
    """Call Gemini with Google Search grounding and return a Markdown summary."""
    client = genai.Client()

    google_search_tool = types.Tool(google_search=types.GoogleSearch())

    prompt = (
        f"Search the web for up-to-date information about: **{topic}**\n\n"
        "Write a detailed Markdown summary (600-1000 words) covering:\n"
        "- Recent news and developments\n"
        "- Key facts, statistics, and data points\n"
        "- Expert opinions or official statements\n"
        "- Market or social sentiment (if applicable)\n"
        "- Stock prices, economic indicators, or metrics (if applicable)\n\n"
        "Include the sources you found as a References section at the end with URLs where available. "
        "Format everything as clean Markdown."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[google_search_tool],
            response_modalities=["TEXT"],
        ),
    )

    text = response.text or ""

    # Append grounding source metadata if available
    grounding_metadata = getattr(response, "candidates", [])
    sources: list[str] = []
    for candidate in grounding_metadata:
        gm = getattr(candidate, "grounding_metadata", None)
        if gm:
            chunks = getattr(gm, "grounding_chunks", []) or []
            for chunk in chunks:
                web = getattr(chunk, "web", None)
                if web:
                    uri = getattr(web, "uri", "")
                    title = getattr(web, "title", "")
                    if uri:
                        sources.append(f"- [{title or uri}]({uri})")

    if sources:
        unique_sources = list(dict.fromkeys(sources))  # deduplicate
        if "## References" not in text and "## Sources" not in text:
            text += "\n\n## Web Sources\n" + "\n".join(unique_sources)

    return text


def run_web_search_grounding(
    inputs_path: str,
    objective: str = "",
    emit=None,
) -> list[str]:
    """
    Main entry point. Reads seed files from inputs_path, extracts topics,
    searches the web for each, and writes results back to inputs_path as
    ``{topic_slug}_web_results.md`` files.

    Returns a list of file paths that were created.
    """
    def _emit(msg: str):
        if emit:
            emit("stage", msg)
        else:
            print(f"[web_search] {msg}")

    # ── 1. Read seed text from existing input files ────────────────────────
    seed_text_parts: list[str] = []
    inputs = Path(inputs_path)
    if inputs.exists():
        for fpath in sorted(inputs.iterdir()):
            if fpath.is_file() and fpath.suffix in {".txt", ".md", ".csv"}:
                try:
                    seed_text_parts.append(fpath.read_text(encoding="utf-8", errors="ignore")[:2000])
                except Exception:
                    pass
    seed_text = "\n\n".join(seed_text_parts)

    # ── 2. Extract topics ──────────────────────────────────────────────────
    _emit("Extracting search topics from seed documents…")
    try:
        topics = _extract_topics(seed_text, objective)
    except Exception as exc:
        _emit(f"Topic extraction failed: {exc}")
        return []

    if not topics:
        _emit("No topics extracted — skipping web search grounding")
        return []

    _emit(f"Found {len(topics)} topics to search: {', '.join(topics[:3])}{'…' if len(topics) > 3 else ''}")

    # ── 3. Search each topic and save results ──────────────────────────────
    created_files: list[str] = []
    for topic in topics:
        slug = _slugify(topic)
        out_file = inputs / f"{slug}_web_results.md"

        _emit(f"Searching: {topic}")
        try:
            summary = _search_and_summarize(topic)
            header = f"# Web Research: {topic}\n\n*Retrieved automatically via Google Search grounding.*\n\n---\n\n"
            out_file.write_text(header + summary, encoding="utf-8")
            created_files.append(str(out_file))
            _emit(f"Saved web results → {out_file.name}")
        except Exception as exc:
            _emit(f"Search failed for '{topic}': {exc}")

    _emit(f"Web search grounding complete — {len(created_files)} document(s) added")
    return created_files
