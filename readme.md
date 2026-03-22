# Thallus

Thallus is a social-media simulation engine. Given one or more seed documents, it builds a knowledge graph, derives an ontology, synthesizes a population of AI agents, runs a multi-round social-media simulation, and then lets you query the results in natural language to generate reports.

## Requirements

- Python 3.11
- Dependencies: `pip install -r requirements.txt`
- A `.env` file with your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

---

## CLI

The primary interface is `cli.py`. It runs the full pipeline end-to-end in your terminal.

### Usage

```bash
python cli.py <input> [--rounds N]
```

### Arguments

| Argument     | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `<input>`    | Path to a seed text file or a folder of seed files (required) |
| `--rounds N` | Number of simulation rounds (default: `3`)                    |

### Examples

```bash
# Run with a single seed file
python cli.py INPUT/01.md

# Run with a folder of seed files
python cli.py INPUT/

# Run with a custom number of rounds
python cli.py INPUT/01.md --rounds 10
```

### Pipeline Stages

When you run the CLI, it executes five sequential stages:

1. **Ingest** – Reads the seed file(s) and populates a local knowledge graph (`graph.json`).
2. **Ontology** – Derives a structured ontology from the graph and saves it to `ontology.json`.
3. **Agent Profiles** – Synthesizes a set of AI agent personas grounded in the ontology and saves them to `agents.json`.
4. **Simulation** – Runs the social-media simulation for the requested number of rounds, logging every agent action to `actions.jsonl`.
5. **Report Q&A** – Enters an interactive loop where you can ask natural-language questions about the simulation. Each answer is saved as a numbered markdown report.

```
Enter your report query (or 'exit' to quit): What narratives spread the fastest?
```

Type `exit` or press Enter on an empty line to end the session.

### Outputs

Each run creates a new versioned folder under `OUTPUTS/`:

```
OUTPUTS/
  output_1/
    graph.json        ← knowledge graph
    ontology.json     ← derived ontology
    agents.json       ← agent profiles
    simulation.db     ← simulation state
    actions.jsonl     ← per-round agent actions
    qa_log.md         ← full Q&A session log
    report_1.md       ← first report
    report_2.md       ← second report (if asked)
    ...
```

---

## Core Library

The simulation engine is implemented as a standalone Python library under the `core/` folder. These modules can be imported and used independently of the CLI or the web API.

| File                         | Responsibility                                            |
| ---------------------------- | --------------------------------------------------------- |
| `core/config.py`             | Global configuration and path constants                   |
| `core/graph_memory.py`       | Local knowledge graph (build, query, persist)             |
| `core/text_processor.py`     | Ingests seed documents into the graph                     |
| `core/ontology_generator.py` | Derives a structured ontology from the graph              |
| `core/profile_generator.py`  | Synthesizes agent personas from the ontology              |
| `core/simulation_runner.py`  | Runs the multi-round OASIS simulation                     |
| `core/report_agent.py`       | Answers natural-language queries about simulation results |

---

## Web UI

There is also a browser-based interface for users who prefer not to use the terminal. It requires running two processes:

**1. FastAPI backend (port 8000)**

```bash
uvicorn api.main:app --reload --port 8000
```

**2. Vite/React frontend (port 5173)**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser. You can register an account, log in, upload seed files through the "New Session" form, run a simulation, and query the results — all without leaving the browser.
