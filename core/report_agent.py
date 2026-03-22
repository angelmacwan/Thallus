import os
import json
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
from core.config import MODEL_NAME

class ReportAgent:
    def __init__(self, graph: LocalGraphMemory, log_path: str = "data/actions.jsonl"):
        self.graph = graph
        self.log_path = log_path
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

    def generate_report(self, query: str, output_path: str | None = None) -> str:
        """Ad-hoc chat query against simulation data."""
        logs_str = self._load_logs()
        graph_str = self._graph_summary()

        prompt = f"""You are the ReportAgent for a digital social-media sandbox simulation.
Based on the simulation data below, write a comprehensive Markdown response answering:

"{query}"

## Graph Knowledge Base
{graph_str}

## Simulation Action Logs
{logs_str}

Requirements:
- Use formal analytical language with clear section headings.
- Surface behavioural patterns, emerging narratives, and agent interactions.
- Include direct quotes or paraphrases from agent posts/comments where relevant.
- End with a concise Prediction/Conclusion section.
"""

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
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

        prompt = f"""You are a senior analyst tasked with writing an enterprise-ready simulation analysis report.
The simulation modelled agents interacting in a digital social-media environment.

## Report Focus
{description}

## Knowledge Graph (entities & relations extracted from source documents)
{graph_str}

## Simulation Action Logs (agent behaviour)
{logs_str}

## Prior Chat Analysis
{chat_str}

---

Write a **comprehensive, enterprise-grade Markdown report** that:

1. Opens with a concise **Executive Summary** (3-5 sentences, no jargon).
2. Contains clearly numbered sections with descriptive headings.
3. Includes a **Key Findings** section with bullet points.
4. Includes an **Agent Dynamics** section analysing individual and group behaviour.
5. Includes a **Network & Relationship Analysis** section with at least one Mermaid diagram
   (e.g. `graph TD` or `graph LR`) illustrating important entity relationships or information flows.
6. Includes a **Narrative & Discourse Analysis** section.
7. Includes a **Risk & Opportunity Assessment** table (use Markdown table syntax).
8. Ends with **Conclusions & Recommendations** with actionable bullet points.
9. Uses formal, professional language suitable for sharing with senior stakeholders.
10. Contains no placeholder text — every section must be fully written.

Return ONLY the Markdown report, starting with a `#` level title.
"""

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
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

