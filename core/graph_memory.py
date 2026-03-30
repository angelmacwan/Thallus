import json
import os
import re
from typing import List, Dict, Any

# Generic terms that should not be tracked as concepts (sync with text_processor.py)
_CONCEPT_STOPWORDS = {
    # Template/context words
    'background', 'notable', 'context', 'update', 'information', 'data', 'content',
    'description', 'details', 'summary', 'overview', 'general', 'specific', 'various',
    'multiple', 'several', 'many', 'some', 'other', 'thing', 'things', 'item', 'items',
    'new', 'old', 'current', 'previous', 'next', 'first', 'last', 'major', 'minor',
    
    # Pronouns and demonstratives
    'this', 'that', 'these', 'those', 'it', 'its', "it's", 'they', 'them', 'their',
    'he', 'she', 'him', 'her', 'his', 'hers', 'we', 'us', 'our', 'ours', 'you', 'your',
    'yours', 'i', 'me', 'my', 'mine',
    
    # Common verbs/auxiliaries
    "let's", 'lets', 'let', 'get', 'got', 'getting', 'do', 'does', 'did', 'doing',
    'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
    'having', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    
    # Generic descriptors
    'good', 'bad', 'better', 'worse', 'best', 'worst', 'great', 'small', 'large',
    'big', 'little', 'more', 'less', 'most', 'least', 'very', 'much', 'quite',
    'interesting', 'important', 'significant', 'relevant', 'true', 'false',
    
    # Articles, conjunctions, and adverbs
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'as', 'at', 'by',
    'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'about', 'between',
    'while', 'when', 'where', 'who', 'what', 'why', 'how', 'which', 'whose',
    'until', 'unless', 'since', 'because', 'although', 'though',
    
    # Common nouns
    'people', 'person', 'place', 'time', 'way', 'year', 'day', 'work', 'part',
    
    # Template artifacts
    'nothing', 'something', 'anything', 'everything', 'scenario', '[scenario',
    'update]', '[update]', 'ignoring', 'location:', 'people:', 'type:', 'entity:',
    'organization:', 'concept:',
}

class LocalGraphMemory:
    def __init__(self, storage_path="data/graph.json"):
        self.storage_path = storage_path
        self.entities = {}
        self.relations = []
        self.facts = []
        self._load()
    
    def _normalize_entity_name(self, name: str) -> str:
        """Normalize entity names to avoid case duplicates, possessives, and punctuation."""
        if not name:
            return name
        
        # Trim whitespace
        name = name.strip()
        
        # Strip trailing punctuation (but keep internal punctuation like U.S.)
        name = name.rstrip('.,!?;:\'"[]{}()')
        
        # Strip possessive 's (India's -> India)
        if name.endswith("'s"):
            name = name[:-2]
        elif name.endswith("s'"):
            name = name[:-1]
        
        # Strip again in case possessive had punctuation
        name = name.rstrip('.,!?;:\'"[]{}()')
        
        # Skip normalization for acronyms (all caps, 2-5 chars)
        if name.isupper() and 2 <= len(name) <= 5:
            return name
        
        # Title case for normal names (each word capitalized)
        return name.title()
    
    def _is_valid_concept(self, name: str) -> bool:
        """Check if an entity name should be tracked as a concept."""
        if not name or len(name) < 2:
            return False
        
        # Filter out generic stopwords
        name_lower = name.lower().strip()
        if name_lower in _CONCEPT_STOPWORDS:
            return False
        
        # Filter out single letters
        if len(name) == 1:
            return False
        
        # Filter out pure numbers
        if name.isdigit():
            return False
        
        # Filter out very short words (likely not meaningful concepts)
        if len(name) <= 2 and not name.isupper():
            return False
        
        # Filter out words that are just punctuation or special chars
        if not any(c.isalnum() for c in name):
            return False
        
        return True

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
        """Add entity with normalization and validation."""
        # Normalize the entity name
        normalized_name = self._normalize_entity_name(name)
        
        # Validate that this is a real concept, not a stopword
        if not self._is_valid_concept(normalized_name):
            return  # Silently skip invalid concepts
        
        # Use normalized name as key
        self.entities[normalized_name] = {"type": entity_type, "attributes": attributes or {}}
        self._save()

    def add_relation(self, source: str, target: str, relation_type: str):
        """Add relation with normalized entity names."""
        # Normalize both source and target
        normalized_source = self._normalize_entity_name(source)
        normalized_target = self._normalize_entity_name(target)
        
        # Only add if both are valid concepts
        if not self._is_valid_concept(normalized_source) or not self._is_valid_concept(normalized_target):
            return  # Silently skip invalid relations
        
        self.relations.append({"source": normalized_source, "target": normalized_target, "type": relation_type})
        self._save()

    def add_fact(self, agent_name: str, fact: str):
        self.facts.append({"agent": agent_name, "fact": fact})
        self._save()
        
    def get_context(self, agent_name: str) -> str:
        agent_facts = [f["fact"] for f in self.facts if f["agent"] == agent_name]
        agent_rels = [r for r in self.relations if r["source"] == agent_name or r["target"] == agent_name]
        return json.dumps({"facts": agent_facts, "relations": agent_rels})
