# Thallus

## Requirements

- Python 3.11
- Dependencies: `pip install -r requirements.txt`
- A `.env` file with your API key:

```
GEMINI_API_KEY=your_key_here
```

## Usage

```bash
python main.py <input> [--rounds N]
```

**Arguments:**

| Argument     | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `<input>`    | Path to a seed text file or a folder of seed files (required) |
| `--rounds N` | Number of simulation rounds (default: `3`)                    |

**Examples:**

```bash
# Run with a single seed file
python cli.py data/seed.txt

# Run with a folder of seed files
python cli.py data/my_inputs/

# Run with a custom number of rounds
python cli.py data/seed.txt --rounds 5
```

## Pipeline Stages

1. **Ingest** – Processes the seed file(s) into a knowledge graph
2. **Ontology** – Generates an ontology from the graph
3. **Agent Profiles** – Creates OASIS agent profiles
4. **Simulation** – Runs the OASIS social-media simulation
5. **Report Q&A** – Interactive loop to ask questions about the simulation results

After the simulation completes, you can ask as many questions as you like. Each report is saved to the output directory (`OUTPUTS/output_N/report_1.md`, `report_2.md`, …). Type `exit` or press Enter on an empty line to quit.

## Outputs

Each run creates a versioned folder under `OUTPUTS/`:

```
OUTPUTS/
  output_1/
    graph.json
    ontology.json
    agents.json
    simulation.db
    actions.jsonl
    report_1.md
    report_2.md
    ...
```

Commands to Run the Application
If they are not already running, open two separate terminal instances from /Users/angel/Documents/mv2 and run:

1. FastAPI Backend Server (Port 8000)

```bash
uvicorn api.main:app --reload --port 8000
```

2. Vite React Frontend (Port 5173)

```bash
cd frontend && npm run dev
```

Navigate to http://localhost:5173/ in your browser. From here you can create a test user, login, upload some sample .txt seed files into the "New Session" configurator, hit "Simulate", and begin asking the agent questions once its completed!