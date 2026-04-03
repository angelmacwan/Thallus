import os
import json
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
from core.config import MODEL_NAME
from core.usage import UsageSummary

class ReportAgent:
    def __init__(self, graph: LocalGraphMemory, log_path: str = "data/actions.jsonl"):
        self.graph = graph
        self.log_path = log_path
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self._usage = UsageSummary()

    def _load_logs(self) -> str:
        logs = []
        if os.path.exists(self.log_path):
            with open(self.log_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        logs.append(line)
        return "\n".join(logs[-100:]) if logs else "(no simulation logs recorded)"

    def _graph_summary(self) -> str:
        try:
            entities = self.graph.entities or {}
            relations = self.graph.relations or []
            entity_lines = [f"- {name} ({data.get('type','?')})" for name, data in list(entities.items())[:60]]
            rel_lines = [f"- {r.get('source')} --[{r.get('type')}]--> {r.get('target')}" for r in relations[:60]]
            return "Entities:\n" + "\n".join(entity_lines) + "\n\nRelations:\n" + "\n".join(rel_lines)
        except Exception:
            return "(graph data unavailable)"

    def generate_report(self, query: str, output_path: str | None = None, extra_context: str = "") -> str:
        """Ad-hoc chat query against simulation data."""
        logs_str = self._load_logs()
        graph_str = self._graph_summary()

        extra_ctx_block = f"\n\n{extra_context.strip()}" if extra_context.strip() else ""

        prompt = f"""You are a simulation analyst assistant. Answer the user's question directly and concisely based on the simulation data below.

User question: "{query}"

## Knowledge Graph
{graph_str}

## Simulation Logs
{logs_str}{extra_ctx_block}

Rules:
- Be direct. Answer the question first, then add supporting detail only if needed.
- Keep responses short — 1 to 4 short paragraphs maximum.
- Do NOT use heavy section headers or turn every answer into a formal report.
- Use bullet points only when listing multiple distinct items.
- If asked about a specific agent or scenario, focus there; otherwise synthesise across everything.
- Avoid filler phrases like "Certainly!" or "Based on the data provided".
"""

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            report = response.text

            if output_path:
                dir_name = os.path.dirname(output_path)
                if dir_name:
                    os.makedirs(dir_name, exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as fh:
                    fh.write(report)
                print(f"Report saved → {output_path}")

            return report
        except Exception as exc:
            return f"Error generating report: {exc}"

    def generate_structured_report(
        self,
        description: str,
        chat_messages: list[dict] | None = None,
        output_path: str | None = None,
        objective: str = "",
        insights: list[dict] | None = None,
        scenario: dict | None = None,
    ) -> tuple[str, str]:
        """
        Generate a full enterprise-grade structured Markdown report.

        Returns (title, report_text).
        """
        logs_str = self._load_logs()
        graph_str = self._graph_summary()

        chat_str = "(no prior chat history)"
        if chat_messages:
            lines = []
            for m in chat_messages:
                role = "User" if m.get("is_user") else "Agent"
                lines.append(f"**{role}:** {m.get('text', '')}")
            chat_str = "\n\n".join(lines[-30:])

        objective_str = objective.strip() if objective else "(no investigation objective provided)"

        if scenario:
            context_str = f"**Selected Scenario:** {scenario.get('name', 'Unknown')}\n{scenario.get('description', '')}"
        else:
            context_str = "**Context:** Main simulation (no scenario selected)"

        insights_str = "(no user insights available)"
        if insights:
            sections = []
            for idx, ins in enumerate(insights, 1):
                query = ins.get("query", "(unknown question)")
                verdict = ins.get("overall_verdict", "")
                obs_lines = [
                    f"  - {item.get('answer_text', item.get('text', ''))}"
                    for item in ins.get("insights", [])[:4]
                ]
                obs_block = "\n".join(obs_lines) if obs_lines else "  (no individual observations)"
                sections.append(
                    f"**Insight {idx}**\n"
                    f"Question: {query}\n"
                    f"Verdict: {verdict}\n"
                    f"Key observations:\n{obs_block}"
                )
            insights_str = "\n\n".join(sections)

        prompt = f"""You are a senior analyst tasked with writing an enterprise-ready simulation analysis report.
The simulation modelled agents interacting in a digital social-media environment.

## Investigation Objective
{objective_str}

## Simulation Context
{context_str}

## Report Focus
{description}

## Knowledge Graph (entities & relations extracted from source documents)
{graph_str}

## Simulation Action Logs (agent behaviour)
{logs_str}

## User-Generated Insights & Questions
{insights_str}

## Prior Chat Analysis
{chat_str}

---

Write a **comprehensive, enterprise-grade Markdown report** that:

1. Opens with a concise **Executive Summary** (3-5 sentences, no jargon).
2. Contains clearly numbered sections with descriptive headings.
3. Includes a **Key Findings** section with bullet points.
4. Includes an **Agent Dynamics** section analysing individual and group behaviour.
5. Includes a dedicated **Soft Metrics Analysis** section covering:
   - **Sentiment Evolution**: How did emotional tone shift across the simulation?
   - **Influence Cascades**: Which agents' ideas propagated? How did influence flow?
   - **Consensus vs Polarization**: Did agents converge or diverge? How unified/polarized was the group?
   - **Thought Leadership**: Who emerged as narrative drivers? Whose ideas had most impact?
   - **Position Stability**: How stable were agent positions? Did conviction strengthen/weaken?
6. Includes a **Network & Relationship Analysis** section with at least one Mermaid diagram
   (e.g. `graph TD` or `graph LR`) illustrating important entity relationships or information flows.
7. Includes a **Narrative & Discourse Analysis** section.
8. Includes a **Risk & Opportunity Assessment** table (use Markdown table syntax).
9. Ends with **Conclusions & Recommendations** with actionable bullet points that reflect soft metrics insights.
10. Uses formal, professional language suitable for sharing with senior stakeholders.
11. Contains no placeholder text — every section must be fully written.

Return ONLY the Markdown report, starting with a `#` level title.
"""

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            report_text = response.text.strip()

            # Extract the title from the first # heading
            title = description[:80]
            for line in report_text.splitlines():
                if line.startswith("# "):
                    title = line.lstrip("# ").strip()[:120]
                    break

            if output_path:
                dir_name = os.path.dirname(output_path)
                if dir_name:
                    os.makedirs(dir_name, exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as fh:
                    fh.write(report_text)
                print(f"Structured report saved → {output_path}")

            return title, report_text
        except Exception as exc:
            error_text = f"# Report Generation Error\n\nError generating report: {exc}"
            return "Generation Error", error_text

