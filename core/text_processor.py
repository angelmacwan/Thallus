import os
import re
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
import json
from core.config import MODEL_NAME

_SUPPORTED_EXTENSIONS = {'.txt', '.md', '.json', '.csv', '.html', '.xml', '.rst'}
_MAX_TEXT_LENGTH = 50000  # Limit text size to avoid API issues

class TextProcessor:
    def __init__(self, graph: LocalGraphMemory):
        self.graph = graph
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def _clean_json_response(self, text: str) -> str:
        """Clean and fix common JSON formatting issues."""
        # Remove markdown code blocks if present
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*$', '', text, flags=re.MULTILINE)
        text = text.strip()
        
        # Try to find JSON object boundaries
        if not text.startswith('{'):
            start = text.find('{')
            if start != -1:
                text = text[start:]
        
        if not text.endswith('}'):
            # Find the last complete closing brace
            end = text.rfind('}')
            if end != -1:
                text = text[:end + 1]
        
        return text

    def _parse_json_robust(self, text: str) -> dict:
        """Attempt to parse JSON with multiple fallback strategies."""
        # Strategy 1: Direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"Initial JSON parse failed: {e}. Attempting cleanup...")
        
        # Strategy 2: Clean and try again
        try:
            cleaned = self._clean_json_response(text)
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"Cleaned JSON parse failed: {e}. Attempting truncation...")
        
        # Strategy 3: Try to truncate at last valid position
        try:
            cleaned = self._clean_json_response(text)
            # Find last complete entity or relation entry
            for i in range(len(cleaned) - 1, max(0, len(cleaned) - 1000), -1):
                if cleaned[i] == '}':
                    truncated = cleaned[:i + 1]
                    try:
                        return json.loads(truncated)
                    except:
                        continue
        except Exception as e:
            print(f"Truncation strategy failed: {e}")
        
        # Strategy 4: Extract partial data using regex
        print("Attempting regex extraction as last resort...")
        return self._extract_partial_json(text)

    def _extract_partial_json(self, text: str) -> dict:
        """Extract entities and relations using regex when JSON parsing fails."""
        entities = []
        relations = []
        
        # Try to find entity patterns
        entity_patterns = [
            r'"name"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"',
            r'\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"\s*\}'
        ]
        
        for pattern in entity_patterns:
            matches = re.finditer(pattern, text, re.DOTALL)
            for match in matches:
                entities.append({"name": match.group(1), "type": match.group(2)})
        
        # Try to find relation patterns
        relation_patterns = [
            r'"source"\s*:\s*"([^"]+)"\s*,\s*"target"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"',
            r'\{\s*"source"\s*:\s*"([^"]+)"\s*,\s*"target"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"\s*\}'
        ]
        
        for pattern in relation_patterns:
            matches = re.finditer(pattern, text, re.DOTALL)
            for match in matches:
                relations.append({
                    "source": match.group(1),
                    "target": match.group(2),
                    "type": match.group(3)
                })
        
        # Deduplicate entities by name
        seen_names = set()
        unique_entities = []
        for ent in entities:
            if ent["name"] not in seen_names:
                seen_names.add(ent["name"])
                unique_entities.append(ent)
        
        print(f"Regex extraction found {len(unique_entities)} entities and {len(relations)} relations")
        return {"entities": unique_entities, "relations": relations}

    def ingest_folder(self, folder_path: str):
        """Ingest every supported text file found in *folder_path*."""
        if not os.path.isdir(folder_path):
            print(f"Folder not found: {folder_path}")
            return

        files = sorted(
            f for f in os.listdir(folder_path)
            if os.path.isfile(os.path.join(folder_path, f))
            and os.path.splitext(f)[1].lower() in _SUPPORTED_EXTENSIONS
        )

        if not files:
            print(f"No supported files found in {folder_path}")
            return

        print(f"Found {len(files)} file(s) to ingest from '{folder_path}'")
        successes = 0
        failures = 0
        
        for fname in files:
            try:
                print(f"\n--- Processing: {fname} ---")
                self.ingest(os.path.join(folder_path, fname))
                successes += 1
            except Exception as e:
                print(f"✗ Failed to ingest {fname}: {e}")
                failures += 1
        
        print(f"\n=== Ingestion Summary ===")
        print(f"✓ Successful: {successes}/{len(files)}")
        if failures > 0:
            print(f"✗ Failed: {failures}/{len(files)}")

    def ingest(self, source: str):
        """Ingest a file or raw text, with robust error handling."""
        # Accept either a file path or raw typed text
        if os.path.exists(source):
            try:
                with open(source, 'r', encoding='utf-8', errors='replace') as f:
                    text = f.read()
                print(f"Loaded seed from file: {source}")
            except Exception as e:
                print(f"Error reading file {source}: {e}")
                return
        else:
            # Treat the input itself as the seed text
            text = source
            print("Using typed text as seed.")

        # Truncate very large texts to avoid API issues
        if len(text) > _MAX_TEXT_LENGTH:
            print(f"Warning: Text is {len(text)} chars, truncating to {_MAX_TEXT_LENGTH} chars")
            text = text[:_MAX_TEXT_LENGTH]
            # Try to truncate at a sentence boundary
            last_period = text.rfind('.')
            if last_period > _MAX_TEXT_LENGTH * 0.9:  # Within last 10%
                text = text[:last_period + 1]

        prompt = f"""Extract entities (people, organizations, locations, concepts) and relations from the text. 
Return strictly a JSON object with 'entities' (list of dicts with 'name', 'type') and 'relations' (list of dicts with 'source', 'target', 'type').
Keep entity names concise. Maximum 50 entities and 50 relations.

Text: {text}
        """
        
        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,  # Lower temperature for more consistent JSON
                )
            )
            
            # Use robust JSON parsing
            data = self._parse_json_robust(response.text)
            
            # Validate data structure
            if not isinstance(data, dict):
                print("Warning: Response is not a dict, creating empty structure")
                data = {"entities": [], "relations": []}
            
            if "entities" not in data:
                data["entities"] = []
            if "relations" not in data:
                data["relations"] = []
            
            # Limit number of entities/relations to avoid overload
            entities = data.get("entities", [])[:100]
            relations = data.get("relations", [])[:100]
            
            # Add to graph with error handling for each entity/relation
            entities_added = 0
            for ent in entities:
                try:
                    if isinstance(ent, dict) and "name" in ent and "type" in ent:
                        self.graph.add_entity(ent["name"], ent["type"])
                        entities_added += 1
                except Exception as e:
                    print(f"Error adding entity {ent}: {e}")
            
            relations_added = 0
            for rel in relations:
                try:
                    if isinstance(rel, dict) and "source" in rel and "target" in rel and "type" in rel:
                        self.graph.add_relation(rel["source"], rel["target"], rel["type"])
                        relations_added += 1
                except Exception as e:
                    print(f"Error adding relation {rel}: {e}")
            
            print(f"✓ Successfully ingested {entities_added} entities and {relations_added} relations.")
            
        except Exception as e:
            print(f"Error during ingestion: {e}")
            print("Attempting graceful fallback...")
            
            # Fallback: Try to extract entities from text using simple heuristics
            try:
                self._fallback_extraction(text)
            except Exception as fallback_error:
                print(f"Fallback extraction also failed: {fallback_error}")
                print("Ingestion completed with no data extracted.")
    
    def _fallback_extraction(self, text: str):
        """Simple fallback extraction when API fails."""
        print("Using fallback entity extraction...")
        
        # Extract capitalized words as potential entities
        words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        # Count occurrences
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # Take top 20 most frequent capitalized terms
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        
        entities_added = 0
        for word, count in sorted_words:
            if count >= 2 and len(word) > 3:  # Mentioned at least twice and longer than 3 chars
                try:
                    self.graph.add_entity(word, "Unknown")
                    entities_added += 1
                except:
                    pass
        
        print(f"✓ Fallback extraction added {entities_added} potential entities")
