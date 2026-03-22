import os
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from core.graph_memory import LocalGraphMemory
import json
from core.config import MODEL_NAME

_SUPPORTED_EXTENSIONS = {'.txt', '.md', '.json', '.csv', '.html', '.xml', '.rst'}

class TextProcessor:
    def __init__(self, graph: LocalGraphMemory):
        self.graph = graph
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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
        for fname in files:
            self.ingest(os.path.join(folder_path, fname))

    def ingest(self, source: str):
        # Accept either a file path or raw typed text
        if os.path.exists(source):
            with open(source, 'r', encoding='utf-8', errors='replace') as f:
                text = f.read()
            print(f"Loaded seed from file: {source}")
        else:
            # Treat the input itself as the seed text
            text = source
            print("Using typed text as seed.")

        prompt = f"""Extract entities (people, organizations) and relations from the text. 
Return strictly a JSON object with 'entities' (list of dicts with 'name', 'type') and 'relations' (list of dicts with 'source', 'target', 'type').
Text: {text}
        """
        
        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            data = json.loads(response.text)
            
            for ent in data.get("entities", []):
                self.graph.add_entity(ent["name"], ent["type"])
                
            for rel in data.get("relations", []):
                self.graph.add_relation(rel["source"], rel["target"], rel["type"])
                
            print(f"Ingested {len(data.get('entities', []))} entities and {len(data.get('relations', []))} relations.")
        except Exception as e:
            print(f"Error during ingestion: {e}")
