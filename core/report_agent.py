import os
import json
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
from core.config import MODEL_NAME
from core.usage import UsageSummary
from core.prompts import report_agent_chat_prompt, structured_report_prompt

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
        return "\n".join(logs[-100:]) if logs else "(no activity logs recorded)"

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

        prompt = report_agent_chat_prompt(
            query=query,
            graph_str=graph_str,
            logs_str=logs_str,
            extra_context=extra_context,
        )

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

        prompt = structured_report_prompt(
            objective_str=objective_str,
            context_str=context_str,
            description=description,
            graph_str=graph_str,
            logs_str=logs_str,
            insights_str=insights_str,
            chat_str=chat_str,
        )

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

