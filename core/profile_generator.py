import json
import os
import re
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
from core.config import MODEL_NAME
from core.usage import UsageSummary

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
        self._usage = UsageSummary()

    def generate_profiles(self, output_path: str = "data/agents.json", target_count: int = None, objective: str = "") -> list:
        objective = (objective or "").strip()

        # When an objective is provided, generate agents designed for that topic
        # instead of extracting named entities from the documents.
        if objective:
            print(f"Objective-driven agent generation enabled for: {objective[:80]}…")
            agents = self._generate_objective_agents(objective, target_count)
            if agents:
                # Skip entity-extraction entirely — write and return directly
                dir_name = os.path.dirname(output_path)
                if dir_name:
                    os.makedirs(dir_name, exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as fh:
                    json.dump(agents, fh, indent=2, ensure_ascii=False)
                print(f"Saved {len(agents)} objective-driven agent profile(s) → {output_path}")
                return agents
            # Fallback: LLM call failed, continue to entity extraction below
            print("Falling back to entity-extraction mode.")

        # ── Legacy: extract named entities from the knowledge graph ──────
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

        core_count = len(agents)
        print(f"Generated {core_count} core agent(s) from graph entities")

        # Generate additional synthetic agents if target_count is specified
        if target_count and target_count > core_count:
            additional_needed = target_count - core_count
            print(f"Generating {additional_needed} additional synthetic agents to reach target of {target_count}...")
            topics = self._extract_topics_from_graph()
            synthetic_agents = self._generate_synthetic_agents(additional_needed, topics, core_count)
            agents.extend(synthetic_agents)
            print(f"Generated {len(synthetic_agents)} synthetic agent(s)")

        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(agents, fh, indent=2, ensure_ascii=False)

        print(f"Saved {len(agents)} OASIS agent profile(s) → {output_path}")
        return agents

    # ------------------------------------------------------------------
    def _generate_objective_agents(self, objective: str, target_count: int = None) -> list[dict]:
        """
        Generate a realistic population of agents designed specifically for the
        given simulation objective.  The LLM decides the population breakdown
        (majority: regular users/consumers; minority: insiders/stakeholders) and
        produces full agent profiles in one batched call.
        """
        count = target_count or 20

        # Build a brief document-context summary to inform the LLM
        entity_lines = [
            f"{name} ({data.get('type', 'entity')})"
            for name, data in list(self.graph.entities.items())[:25]
        ]
        relation_lines = [
            f"{r['source']} {r['type']} {r['target']}"
            for r in self.graph.relations[:15]
        ]
        doc_context = "Key entities: " + ", ".join(entity_lines)
        if relation_lines:
            doc_context += "\nRelationships: " + "; ".join(relation_lines)

        prompt = f"""You are designing a realistic agent population for a multi-agent social simulation.

SIMULATION OBJECTIVE:
"{objective}"

DOCUMENT CONTEXT (knowledge graph extracted from uploaded materials):
{doc_context}

POPULATION DESIGN RULES:
1. The majority (60-70%) must be regular people directly affected by the topic:
   - Heavy users / power users
   - Casual users (e.g. once a month)
   - Long-term loyal users
   - Budget-conscious users / price-sensitive subscribers
   - Family plan users / account sharers
   - Students and young adults
   - Elderly or less tech-savvy users
   Include real demographic variety: ages 18-70, multiple countries, different income levels.

2. The minority (30-40%) should be relevant insiders and industry observers:
   - Company executives / product leads / engineers
   - Investors / financial analysts
   - Industry journalists / media commentators
   - Competing service executives
   - Regulators / policy researchers (if relevant)
   Each should have a clear professional stake in the objective.

3. Every agent's PERSONA must reflect their likely attitude toward the simulation objective:
   - Some should be supportive, some opposed, some uncertain
   - Their persona should foreshadow their debate position
   - Personas must be authentic, specific, and grounded in their role

Generate exactly {count} agent profiles.
Return ONLY a JSON array of {count} objects, each with these exact keys:
  "realname"          – unique full name (string)
  "username"          – unique social-media handle: lowercase letters, digits, underscores only
  "bio"               – 1-2 sentence social-media bio (string)
  "persona"           – 2-3 sentence character description including their stance on the topic (string)
  "age"               – integer between 18-75
  "gender"            – "male" | "female" | "non-binary"
  "mbti"              – Myers-Briggs type code, e.g. "INTJ"
  "country"           – country of residence
  "profession"        – profession
  "interested_topics" – list of 2-4 interest topics directly related to the objective
"""

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.85,
                ),
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            agents = json.loads(response.text)
            if not isinstance(agents, list):
                raise ValueError("LLM did not return a JSON array")

            # Normalise each profile (same coercions as _generate_one)
            validated = []
            for i, a in enumerate(agents):
                if not isinstance(a, dict):
                    continue
                a.setdefault("realname", f"Agent {i}")
                a.setdefault("username", f"agent_{i}")
                a.setdefault("bio", "")
                a.setdefault("persona", "")
                a.setdefault("age", 30)
                a.setdefault("gender", "non-binary")
                a.setdefault("mbti", "INTJ")
                a.setdefault("country", "US")
                a.setdefault("profession", "professional")
                a.setdefault("interested_topics", [])
                try:
                    a["age"] = int(a["age"])
                except (TypeError, ValueError):
                    a["age"] = 30
                validated.append(a)

            print(f"Objective-driven generation produced {len(validated)} agent(s).")
            return validated

        except Exception as exc:
            print(f"Warning: objective-driven agent generation failed ({exc}); falling back to entity extraction.")
            # Graceful fallback: empty list signals the caller to use the legacy path
            return []

    # ------------------------------------------------------------------
    def _extract_topics_from_graph(self) -> list[str]:
        """
        Use an LLM to generate meaningful topic phrases from the graph,
        suitable for creating synthetic agent personas that will actively engage
        with simulation content.
        """
        # Build context from full entity names and relationships
        entity_lines = [
            f"{name} ({data.get('type', 'entity')})"
            for name, data in list(self.graph.entities.items())[:20]
        ]
        relation_lines = [
            f"{r['source']} {r['type']} {r['target']}"
            for r in self.graph.relations[:15]
        ]
        context = "Entities: " + ", ".join(entity_lines)
        if relation_lines:
            context += "\nRelationships: " + "; ".join(relation_lines)

        prompt = (
            "Based on this knowledge graph, generate 12 meaningful topic phrases that describe "
            "the key themes and subject areas that people might be interested in and discuss on social media.\n\n"
            f"Context:\n{context}\n\n"
            "Requirements:\n"
            "- Each topic must be a meaningful phrase of 2-5 words, NOT a single generic word or entity type\n"
            "- Topics should represent specific interests that would motivate someone to engage with this content\n"
            "- GOOD examples: 'enterprise cloud migration', 'AI-driven business transformation', "
            "'strategic consulting partnerships'\n"
            "- BAD examples: 'organization', 'ibm', 'concept' (too vague or just raw tokens)\n"
            "- Return ONLY a JSON array of 12 strings"
        )

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.6,
                ),
            )
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
                )
            topics = json.loads(response.text)
            if isinstance(topics, list) and topics and all(isinstance(t, str) for t in topics):
                print(f"LLM generated {len(topics)} topic phrase(s) for synthetic agents.")
                return topics[:20]
        except Exception as exc:
            print(f"Warning: LLM topic extraction failed ({exc}); falling back to entity names.")

        # Fallback: use full entity names as topics (not split word tokens)
        entity_names = list(self.graph.entities.keys())[:20]
        return entity_names if entity_names else ["technology", "politics", "science", "business"]

    def _generate_synthetic_agents(self, count: int, topics: list[str], start_index: int) -> list[dict]:
        """
        Generate synthetic agents with diverse profiles based on graph topics.
        
        Args:
            count: Number of synthetic agents to generate
            topics: List of topics to use for agent diversity
            start_index: Starting index for naming synthetic agents
        
        Returns:
            List of agent profile dictionaries
        """
        synthetic_agents = []
        
        # Define agent archetypes for diversity
        professions = [
            "journalist", "researcher", "student", "teacher", "engineer",
            "scientist", "activist", "politician", "entrepreneur", "analyst",
            "consultant", "executive", "artist", "writer", "developer"
        ]
        
        countries = ["US", "UK", "Canada", "Germany", "France", "Japan", "India", "Brazil", "Australia"]
        genders = ["male", "female", "non-binary"]
        mbti_types = ["INTJ", "ENTP", "INFP", "ESTJ", "ISFJ", "ENFJ", "ISTP", "ESFP"]
        
        # Generate agents in batches using LLM
        batch_size = 10
        for i in range(0, count, batch_size):
            batch_count = min(batch_size, count - i)
            
            prompt = f"""Generate {batch_count} diverse social media user profiles for a simulation.

Base these profiles on the following context topics: {', '.join(topics[:10])}

Return ONLY a JSON array of {batch_count} objects, each with these exact keys:
  "realname"         – unique full name (string)
  "username"         – unique social-media handle: lowercase letters, digits, underscores only
  "bio"              – 1-2 sentence social-media bio (string)
  "persona"          – 2-3 sentence character/personality description (string)
  "age"              – integer between 18-75
  "gender"           – "male" | "female" | "non-binary"
  "mbti"             – Myers-Briggs type code, e.g. "INTJ"
  "country"          – country of origin
  "profession"       – professional field relevant to the topics
  "interested_topics" – list of 2-4 interest topics from the context

Make each profile unique and diverse. Vary the professions, ages, countries, and perspectives.
"""
            
            try:
                response = self.client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.9,  # Higher temperature for more diversity
                    ),
                )
                if response.usage_metadata:
                    self._usage.add(
                        input_tokens=response.usage_metadata.prompt_token_count or 0,
                        output_tokens=response.usage_metadata.candidates_token_count or 0,
                    )
                batch_profiles = json.loads(response.text)
                
                # Validate and add default values
                for idx, profile in enumerate(batch_profiles):
                    # Ensure all required fields exist
                    profile.setdefault("realname", f"Agent {start_index + i + idx + 1}")
                    profile.setdefault("username", f"agent_{start_index + i + idx + 1}")
                    profile.setdefault("bio", "Interested observer and commentator.")
                    profile.setdefault("persona", profile["bio"])
                    profile.setdefault("age", 30)
                    profile.setdefault("gender", genders[(i + idx) % len(genders)])
                    profile.setdefault("mbti", mbti_types[(i + idx) % len(mbti_types)])
                    profile.setdefault("country", countries[(i + idx) % len(countries)])
                    profile.setdefault("profession", professions[(i + idx) % len(professions)])
                    profile.setdefault("interested_topics", topics[:3])
                    
                    # Coerce age to int
                    try:
                        profile["age"] = int(profile["age"])
                    except (TypeError, ValueError):
                        profile["age"] = 30
                    
                    synthetic_agents.append(profile)
                    
                print(f"  Generated synthetic batch {i // batch_size + 1}: {len(batch_profiles)} profiles")
                
            except Exception as exc:
                print(f"  Warning: Batch generation failed: {exc}")
                # Fallback: create simple profiles
                for idx in range(batch_count):
                    agent_num = start_index + i + idx + 1
                    fallback_profile = {
                        "realname": f"Agent {agent_num}",
                        "username": f"agent_{agent_num}",
                        "bio": f"Interested in {', '.join(topics[:2])}.",
                        "persona": f"A curious individual following developments in {topics[0] if topics else 'various fields'}.",
                        "age": 25 + ((i + idx) % 50),
                        "gender": genders[(i + idx) % len(genders)],
                        "mbti": mbti_types[(i + idx) % len(mbti_types)],
                        "country": countries[(i + idx) % len(countries)],
                        "profession": professions[(i + idx) % len(professions)],
                        "interested_topics": topics[:3] if topics else ["general"]
                    }
                    synthetic_agents.append(fallback_profile)
        
        return synthetic_agents[:count]  # Ensure we return exactly the requested count

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
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
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
            if response.usage_metadata:
                self._usage.add(
                    input_tokens=response.usage_metadata.prompt_token_count or 0,
                    output_tokens=response.usage_metadata.candidates_token_count or 0,
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
