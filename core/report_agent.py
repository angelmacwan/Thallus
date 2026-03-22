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

    def generate_report(self, query: str, output_path: str | None = None) -> str:
        print(f"Generating report for: {query}")

        logs = []
        if os.path.exists(self.log_path):
            with open(self.log_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        logs.append(line)

        # Send at most the last 100 log entries to respect context limits
        logs_str = "\n".join(logs[-100:]) if logs else "(no simulation logs recorded)"

        prompt = f"""You are the ReportAgent for a digital social-media sandbox simulation.
Based on the simulation logs below, write a comprehensive Markdown report answering:

"{query}"

Simulation Logs:
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

