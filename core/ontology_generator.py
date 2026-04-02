"""OntologyGenerator – builds a formal OWL-style ontology from graph data."""

import json
import os

from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types

from core.config import MODEL_NAME
from core.graph_memory import LocalGraphMemory
from core.usage import UsageSummary


class OntologyGenerator:
    """
    Generates a formal ontology (classes, properties, hierarchies, axioms)
    from the entities and relations held in a LocalGraphMemory instance.

    Output schema (JSON):
      {
        "classes": [
          {"name": str, "label": str, "description": str, "superclass": str | null}
        ],
        "object_properties": [
          {"name": str, "label": str, "domain": str, "range": str, "description": str}
        ],
        "data_properties": [
          {"name": str, "label": str, "domain": str, "type": str, "description": str}
        ],
        "individuals": [
          {"name": str, "class": str, "properties": dict}
        ],
        "axioms": [str]
      }
    """

    def __init__(self, graph: LocalGraphMemory):
        self.graph = graph
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self._usage = UsageSummary()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self, output_path: str) -> dict:
        """
        Generate the ontology and write it to *output_path*.
        Returns the ontology dict (empty dict on failure).
        """
        if not self.graph.entities and not self.graph.relations:
            print("Graph is empty – skipping ontology generation.")
            return {}

        ontology = self._generate_from_llm()
        if ontology:
            self._save(ontology, output_path)
        return ontology

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate_from_llm(self) -> dict:
        # Cap the payload so we don't blow the context window
        entities_sample = list(self.graph.entities.items())[:80]
        relations_sample = self.graph.relations[:80]

        graph_summary = json.dumps(
            {
                "entities": [
                    {"name": n, "type": d.get("type"), "attributes": d.get("attributes", {})}
                    for n, d in entities_sample
                ],
                "relations": relations_sample,
            },
            ensure_ascii=False,
        )

        prompt = f"""You are an expert ontology engineer specialising in OWL/RDF knowledge graphs.

Analyse the following graph extracted from source documents and produce a formal,
reusable ontology that faithfully captures the domain semantics.

Graph data:
{graph_summary}

Return ONLY a valid JSON object with exactly these top-level keys:

"classes"            – list of class objects:
    {{ "name": str (CamelCase IRI fragment),
       "label": str (human-readable),
       "description": str,
       "superclass": str | null }}

"object_properties"  – list of object-property objects:
    {{ "name": str (camelCase IRI fragment),
       "label": str,
       "domain": str (class name),
       "range": str (class name),
       "description": str }}

"data_properties"    – list of data-property objects:
    {{ "name": str (camelCase IRI fragment),
       "label": str,
       "domain": str (class name),
       "type": str (xsd type, e.g. "xsd:string"),
       "description": str }}

"individuals"        – list of named individuals:
    {{ "name": str, "class": str, "properties": {{ prop: value }} }}

"axioms"             – list of logical axiom descriptions (plain English)

Guidelines:
- Generalise where possible: prefer abstract superclasses over flat lists.
- Capture IS-A, PART-OF, and domain-specific semantic relations as object properties.
- Every entity from the graph should map to an individual of an appropriate class.
- Keep class and property names concise, unique, and meaningful.
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
            ontology = json.loads(response.text)
            classes = len(ontology.get("classes", []))
            obj_props = len(ontology.get("object_properties", []))
            individuals = len(ontology.get("individuals", []))
            print(
                f"Ontology generated: {classes} classes, "
                f"{obj_props} object properties, {individuals} individuals."
            )
            return ontology
        except Exception as exc:
            print(f"Error generating ontology: {exc}")
            return {}

    def _save(self, ontology: dict, output_path: str):
        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(ontology, fh, indent=2, ensure_ascii=False)
        print(f"Ontology saved → {output_path}")
