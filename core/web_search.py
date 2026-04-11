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
from core.usage import UsageSummary


def _extract_topics(seed_text: str, objective: str) -> tuple[list[str], UsageSummary]:
    """Use Gemini to extract 7-12 concrete, searchable topics from the seed + objective."""
    client = genai.Client()

    combined = ""
    if objective:
        combined += f"Investigation Objective:\n{objective}\n\n"
    if seed_text:
        combined += f"Seed Document Excerpt:\n{seed_text[:4000]}"

    prompt = (
        "You are extracting search topics from a simulation brief.\n\n"
        f"{combined}\n\n"
        "List 7 to 12 specific, concrete search queries (one per line, no bullets or numbering) "
        "that would help a researcher build a comprehensive, well-rounded picture of the topic.\n"
        "Cover a diverse range of angles:\n"
        "- Recent breaking news and investigative journalism\n"
        "- Public opinion, community reactions, and grassroots discussion\n"
        "- Government reports, official statements, and policy documents\n"
        "- Economic data, statistics, and market analysis\n"
        "- Expert commentary, academic perspectives, and think-tank analyses\n"
        "- Controversy, criticism, and opposing viewpoints\n"
        "Each query should be suitable for a Google web search. "
        "Return ONLY the search queries, nothing else."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    usage = UsageSummary()
    if response.usage_metadata:
        usage.add(
            input_tokens=response.usage_metadata.prompt_token_count or 0,
            output_tokens=response.usage_metadata.candidates_token_count or 0,
        )
    raw = response.text or ""
    topics = [line.strip() for line in raw.splitlines() if line.strip()]
    return topics[:12], usage


def _slugify(text: str) -> str:
    """Convert a search query string into a safe filename slug."""
    slug = text.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "_", slug)
    slug = slug.strip("_")
    return slug[:60]


def _search_and_summarize(topic: str) -> tuple[str, UsageSummary]:
    """Call Gemini with Google Search grounding and return a (Markdown summary, UsageSummary) tuple."""
    client = genai.Client()

    google_search_tool = types.Tool(google_search=types.GoogleSearch())

    prompt = (
        f"Search the web extensively for information about: **{topic}**\n\n"
        "Write a comprehensive, long-form Markdown report (1200-2000 words) that covers ALL of the following:\n\n"
        "## Required sections:\n"
        "### 1. Breaking News & Recent Developments\n"
        "Pull from major news outlets (Reuters, AP, BBC, NYT, WSJ, Guardian, local outlets) — include dates and specifics.\n\n"
        "### 2. Public Sentiment & Community Discussion\n"
        "Search Reddit, public forums, and community threads for real reactions. Quote or paraphrase actual discussions. "
        "Include subreddit names or forum sources where found. Look for upvoted/popular threads.\n\n"
        "### 3. Social Media & Viral Reactions\n"
        "Search Twitter/X, Threads, and Bluesky for notable posts, trending hashtags, and viral moments related to this topic. "
        "Include specific quotes or post summaries where available.\n\n"
        "### 4. Government & Official Sources\n"
        "Find government publications, official reports, policy documents, regulatory statements, "
        "government blog posts, and statements from public officials or agencies.\n\n"
        "### 5. Expert & Academic Perspectives\n"
        "Include think-tank analyses, academic papers, expert interviews, and professional commentary.\n\n"
        "### 6. Key Facts, Statistics & Data\n"
        "Include hard numbers, economic indicators, survey results, polling data, and verifiable metrics.\n\n"
        "### 7. Criticism, Controversy & Opposing Views\n"
        "Include dissenting opinions, controversies, or critical perspectives found in the sources.\n\n"
        "Aim for MAXIMUM coverage — the more perspectives and sources, the better. "
        "Every section should have multiple data points.\n\n"
        "Include ALL sources found as a References section at the end with URLs. "
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

    usage = UsageSummary()
    if response.usage_metadata:
        usage.add(
            input_tokens=response.usage_metadata.prompt_token_count or 0,
            output_tokens=response.usage_metadata.candidates_token_count or 0,
            grounded_prompts=1,
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

    return text, usage


def run_web_search_grounding(
    inputs_path: str,
    objective: str = "",
    emit=None,
    focus_topics: list[str] | None = None,
) -> tuple[list[str], UsageSummary]:
    """
    Main entry point. Reads seed files from inputs_path, extracts topics,
    searches the web for each, and writes results back to inputs_path as
    ``{topic_slug}_web_results.md`` files.

    Returns a (list of file paths created, UsageSummary) tuple.
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

    usage = UsageSummary()

    # ── 2. Extract topics ──────────────────────────────────────────────────
    _emit("Extracting search topics from seed documents…")
    try:
        topics, extract_usage = _extract_topics(seed_text, objective)
        usage += extract_usage
    except Exception as exc:
        _emit(f"Topic extraction failed: {exc}")
        return [], usage

    if not topics:
        _emit("No topics extracted — skipping web search grounding")
        return [], usage

    _emit(f"Found {len(topics)} topics to search: {', '.join(topics[:3])}{'…' if len(topics) > 3 else ''}")

    # ── 2b. Inject user-defined focus topics (deduplicated) ────────────────
    if focus_topics:
        topics_lower = {t.lower() for t in topics}
        added = [t for t in focus_topics if t.strip() and t.strip().lower() not in topics_lower]
        if added:
            _emit(f"Adding {len(added)} user-defined focus topic(s): {', '.join(added[:3])}{'…' if len(added) > 3 else ''}")
            topics = topics + added

    # ── 3. Search each topic and save results ──────────────────────────────
    created_files: list[str] = []
    for topic in topics:
        slug = _slugify(topic)
        out_file = inputs / f"{slug}_web_results.md"

        _emit(f"Searching: {topic}")
        try:
            summary, search_usage = _search_and_summarize(topic)
            usage += search_usage
            header = f"# Web Research: {topic}\n\n*Retrieved automatically via Google Search grounding.*\n\n---\n\n"
            out_file.write_text(header + summary, encoding="utf-8")
            created_files.append(str(out_file))
            _emit(f"Saved web results → {out_file.name}")
        except Exception as exc:
            _emit(f"Search failed for '{topic}': {exc}")

    _emit(f"Web search grounding complete — {len(created_files)} document(s) added")
    return created_files, usage
