import json
import os
import re
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
from core.config import MODEL_NAME

# Entity types that should become social-media simulation agents
_AGENT_TYPES = {
    "person", "student", "expert", "journalist", "ceo", "researcher",
    "politician", "activist", "scientist", "engineer", "executive",
    "artist", "athlete", "author", "teacher", "doctor",
}


class ProfileGenerator:
    """
    Generates OASIS-compatible social-media user profiles from graph entities.

    Output format is a JSON list of user objects matching the camel-oasis
    ``generate_reddit_agent_graph`` profile schema::

        [
          {
            "realname": str,
            "username": str,          # lowercase, no spaces
            "bio": str,               # ≤ 2 sentences
            "persona": str,           # 2-3 sentence character description
            "age": int,
            "gender": str,
            "mbti": str,              # e.g. "INTJ"
            "country": str,
            "profession": str,
            "interested_topics": [str]
          }
        ]
    """

    def __init__(self, graph: LocalGraphMemory):
        self.graph = graph
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def generate_profiles(self, output_path: str = "data/agents.json") -> list:
        agents = []

        for name, ent_data in self.graph.entities.items():
            ent_type = ent_data.get("type", "")
            if not isinstance(ent_type, str) or ent_type.lower() not in _AGENT_TYPES:
                continue

            profile = self._generate_one(name, ent_type)
            if profile:
                agents.append(profile)

        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(agents, fh, indent=2, ensure_ascii=False)

        print(f"Saved {len(agents)} OASIS agent profile(s) → {output_path}")
        return agents

    # ------------------------------------------------------------------
    def _generate_one(self, name: str, ent_type: str) -> dict | None:
        prompt = f"""Generate an OASIS social-media user profile for {name}, a {ent_type}.

Return ONLY a JSON object with exactly these keys:
  "realname"         – full real name (string)
  "username"         – social-media handle: lowercase letters, digits, underscores only
  "bio"              – 1-2 sentence social-media bio (string)
  "persona"          – 2-3 sentence character/personality description (string)
  "age"              – integer
  "gender"           – "male" | "female" | "non-binary"
  "mbti"             – Myers-Briggs type code, e.g. "INTJ"
  "country"          – country of origin (string)
  "profession"       – professional field (string)
  "interested_topics" – list of 2-3 interest topic strings
"""
        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            profile = json.loads(response.text)

            # Guarantee required keys exist
            profile.setdefault("realname", name)
            profile.setdefault("username", re.sub(r"\W+", "_", name.lower()).strip("_"))
            profile.setdefault("bio", f"{name} is a {ent_type}.")
            profile.setdefault("persona", profile["bio"])
            profile.setdefault("age", 30)
            profile.setdefault("gender", "unknown")
            profile.setdefault("mbti", "INTJ")
            profile.setdefault("country", "US")
            profile.setdefault("profession", ent_type)
            profile.setdefault("interested_topics", [])

            # Coerce age to int in case the LLM returned a string
            try:
                profile["age"] = int(profile["age"])
            except (TypeError, ValueError):
                profile["age"] = 30

            print(f"  Profile generated for {name}")
            return profile
        except Exception as exc:
            print(f"  Error generating profile for {name}: {exc}")
            return None
