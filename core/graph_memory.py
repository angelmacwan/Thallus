import json
import os
from typing import List, Dict, Any

class LocalGraphMemory:
    def __init__(self, storage_path="data/graph.json"):
        self.storage_path = storage_path
        self.entities = {}
        self.relations = []
        self.facts = []
        self._load()

    def _load(self):
        """Load graph data from storage with error handling."""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.entities = data.get("entities", {})
                    self.relations = data.get("relations", [])
                    self.facts = data.get("facts", [])
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to load graph from {self.storage_path}: {e}")
                print("Starting with empty graph. Corrupted file will be backed up.")
                # Back up the corrupted file
                backup_path = f"{self.storage_path}.corrupted"
                try:
                    os.rename(self.storage_path, backup_path)
                    print(f"Backed up corrupted file to: {backup_path}")
                except:
                    pass
                self.entities = {}
                self.relations = []
                self.facts = []
            except Exception as e:
                print(f"Warning: Unexpected error loading graph from {self.storage_path}: {e}")
                self.entities = {}
                self.relations = []
                self.facts = []

    def _save(self):
        dir_name = os.path.dirname(self.storage_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(self.storage_path, 'w') as f:
            json.dump({
                "entities": self.entities,
                "relations": self.relations,
                "facts": self.facts
            }, f, indent=2)

    def add_entity(self, name: str, entity_type: str, attributes: Dict[str, Any] = None):
        self.entities[name] = {"type": entity_type, "attributes": attributes or {}}
        self._save()

    def add_relation(self, source: str, target: str, relation_type: str):
        self.relations.append({"source": source, "target": target, "type": relation_type})
        self._save()

    def add_fact(self, agent_name: str, fact: str):
        self.facts.append({"agent": agent_name, "fact": fact})
        self._save()
        
    def get_context(self, agent_name: str) -> str:
        agent_facts = [f["fact"] for f in self.facts if f["agent"] == agent_name]
        agent_rels = [r for r in self.relations if r["source"] == agent_name or r["target"] == agent_name]
        return json.dumps({"facts": agent_facts, "relations": agent_rels})
