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
    "person", "people", "student", "expert", "journalist", "ceo", "researcher",
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

            # For generic "People" entities, infer specific role from context
            if ent_type.lower() == "people":
                inferred_role = self._infer_role(name)
                if inferred_role:
                    print(f"  Inferred role for {name}: {inferred_role}")
                    ent_type = inferred_role
                else:
                    # Skip generic group entities like "American troops", "Indian nationals"
                    if any(word in name.lower() for word in ["troops", "nationals", "members", "forces"]):
                        print(f"  Skipping group entity: {name}")
                        continue
                    ent_type = "person"  # Default fallback

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
    def _infer_role(self, name: str) -> str | None:
        """
        Infer a person's role/profession from their graph context.
        
        Returns a specific role (e.g., "politician", "journalist", "diplomat")
        or None if the role cannot be confidently inferred.
        """
        # Gather context from graph relations
        context_parts = []
        
        # Get relations where this person is involved
        for rel in self.graph.relations:
            if rel["source"] == name:
                context_parts.append(f"{name} {rel['type']} {rel['target']}")
            elif rel["target"] == name:
                context_parts.append(f"{rel['source']} {rel['type']} {name}")
        
        if not context_parts:
            # No relations found - try to infer from name alone
            return self._infer_role_from_name(name)
        
        context = ". ".join(context_parts[:10])  # Limit context to avoid token limits
        
        # Use LLM to infer the professional role
        prompt = f"""Based on the following information about {name}, infer their most likely professional role or occupation.

Context:
{context}

Respond with ONLY ONE of these roles (choose the best fit):
politician, diplomat, ambassador, journalist, reporter, military_officer, spokesperson, analyst, activist, researcher, scientist, engineer, executive, ceo, official, advisor, expert, doctor, teacher, author, artist, athlete, lawyer, judge

If none fit well, respond with: person

Role:"""
        
        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                ),
            )
            inferred_role = response.text.strip().lower()
            
            # Validate the response
            if inferred_role in _AGENT_TYPES:
                return inferred_role
            elif inferred_role == "person":
                return None
            else:
                # Try to extract a valid role from the response
                for role in _AGENT_TYPES:
                    if role in inferred_role:
                        return role
                return None
                
        except Exception as exc:
            print(f"  Warning: Role inference failed for {name}: {exc}")
            return None
    
    def _infer_role_from_name(self, name: str) -> str | None:
        """Fallback: infer role from name patterns (e.g., 'Dr.', 'President')."""
        name_lower = name.lower()
        
        if any(title in name_lower for title in ["dr.", "doctor"]):
            return "doctor"
        elif any(title in name_lower for title in ["prof.", "professor"]):
            return "teacher"
        elif any(title in name_lower for title in ["president", "prime minister", "senator", "governor"]):
            return "politician"
        elif any(title in name_lower for title in ["ambassador", "diplomat"]):
            return "diplomat"
        
        return None

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
