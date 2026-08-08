# Thallus

Thallus is a social-media simulation and agentic research engine. Given one or more seed documents, it builds a knowledge graph, derives an ontology, synthesizes a population of AI agents, runs multi-round social-media simulations, and provides rich analytical insights and report generation.

---

## Architecture Overview

Thallus consists of:
1. **Core Simulation Engine** (`core/`) – Python library powering document ingestion, graph construction, agent synthesis, simulation execution, pattern recognition, and reporting.
2. **FastAPI Backend API** (`api/`) – RESTful API managing simulations, user auth, worlds, scenarios, and streaming report updates.
3. **React/Vite Frontend** (`frontend/`) – Modern dashboard UI for controlling simulations, exploring agent relationship graphs, running scenario diffs, and reading generated reports.

---

## Requirements

- Python 3.11+
- Node.js 18+ and npm
- A `.env` file in the root directory with your API keys:

```env
GEMINI_API_KEY=your_key_here
```

---

## Quick Start

### 1. Set Up Backend

Install the Python dependencies and run the FastAPI server:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (runs on http://localhost:8000)
uvicorn api.main:app --reload --port 8000
```

### 2. Set Up Frontend

In a separate terminal, install Node dependencies and start the Vite dev server:

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser to access the Thallus Web Application.

---

## Key Features

- **Document Ingestion & Graph Construction**: Ingests unstructured text or seed markdown files into a local knowledge graph.
- **Ontology & Agent Persona Synthesis**: Automatically extracts topics, sentiment dynamics, and entity relationships to generate realistic AI agent profiles.
- **Multi-Round Social Simulation**: Simulates dynamic agent interactions, post generation, sentiment shifting, and narrative propagation over multiple rounds.
- **Small World & Network Analysis**: Visualizes agent relationship graphs, centrality metrics, and community clustering.
- **Scenario Testing & Diffing**: Run baseline vs. counterfactual scenarios to compare sentiment trajectories, narrative reach, and influence metrics side by side.
- **Natural Language Q&A Reports**: Query simulation logs using natural language to generate targeted markdown reports with custom insights.

---

## Core Modules (`core/`)

The underlying Python engine modules can also be imported into custom scripts or notebooks:

| Module | Description |
| --- | --- |
| `core/text_processor.py` | Ingests seed documents and builds knowledge graphs |
| `core/ontology_generator.py` | Derives domain ontologies from graph memory |
| `core/profile_generator.py` | Synthesizes realistic agent personas |
| `core/simulation_runner.py` | Executes multi-round simulation rounds |
| `core/small_world_runner.py` | Runs network graph simulations |
| `core/insights_engine.py` | Extracts deep patterns, metrics, and insights |
| `core/report_agent.py` | Generates natural-language analytical reports |

