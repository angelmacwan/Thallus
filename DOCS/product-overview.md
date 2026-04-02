# Thallus Product Overview

## What Thallus Is

Thallus is an AI-powered simulation and analysis platform for exploring how ideas, narratives, and positions evolve across a population of generated agents.

At a high level, Thallus takes source material such as reports, briefs, notes, or research documents and turns that material into a structured simulation environment. It builds a knowledge graph from the input, derives an ontology, generates agent profiles, runs a multi-round simulation, and then lets the user inspect the results through reports, insights, and follow-on scenarios.

The product supports two main ways of working:

- A web application for uploading documents, launching simulations, monitoring progress, viewing outputs, and generating reports.
- A CLI workflow for running the same core pipeline directly from the terminal.

## What Thallus Can Do

### 1. Ingest source material

Users can upload one or more seed documents that define the context for a simulation. These files become the grounding material for the rest of the pipeline.

### 2. Build a structured representation of the input

Thallus converts the uploaded material into a local knowledge graph and derives an ontology from that graph. This gives the system a structured view of the themes, concepts, and relationships present in the source material.

### 3. Generate a population of AI agents

Based on the ontology, Thallus creates agent profiles that represent different viewpoints or actors inside the simulation. The web product supports configurable agent counts.

### 4. Run multi-round simulations

Thallus runs agents through multiple rounds of deliberation and interaction. During the run, it records actions, simulation state, and event updates that can later be reviewed.

### 5. Ground simulations with web search

When creating a simulation in the web app, users can enable web search grounding. This adds external context to the run alongside the uploaded documents.

### 6. Generate reports from completed sessions

After a simulation finishes, users can request structured reports in natural language. Reports are stored as markdown and can include narrative summaries, findings, and diagrams.

### 7. Run insight analyses

Thallus can generate insight dashboards for a completed session. These insight runs analyze a user question, track debate rounds, group agent answers, and produce an overall verdict.

### 8. Create and run scenarios

Users can create follow-on scenarios from a completed session and run them separately. This is useful for exploring alternative conditions, prompts, or what-if situations without rebuilding the original session from scratch.

### 9. Review simulation artifacts

The platform stores and exposes simulation outputs such as:

- Knowledge graph data
- Ontology files
- Agent definitions
- Action logs
- Simulation database state
- Reports
- Insight files
- Scenario outputs

### 10. Manage users and credits

The web product includes authentication, user accounts, and a credits system used to control simulation, scenario, and insight usage.

## Typical Use Cases

Thallus is suited to workflows where a user wants to understand how a body of information might propagate, fragment, or be interpreted by different actors. Common examples include:

- Policy and geopolitical analysis
- Research synthesis
- Narrative and media analysis
- Internal strategy exploration
- Market and stakeholder response modeling
- Educational or investigative simulations

## How the Product Works

The standard product flow is:

1. Upload seed documents.
2. Optionally define an investigation objective.
3. Choose the number of rounds and optionally the number of agents.
4. Optionally enable web search grounding.
5. Start the simulation.
6. Wait for ingestion, ontology generation, agent generation, and simulation execution to complete.
7. Open the completed session.
8. Review feed data, seed data, insights, scenarios, and reports.
9. Generate additional reports or insight analyses as needed.

## How To Use Thallus

Before running Thallus locally, ensure the project is configured with the required environment variables, including a valid `GEMINI_API_KEY` in the local `.env` file.

### Using the Web Application

### 1. Start the backend

From the project root:

```bash
conda activate py11
uvicorn api.main:app --reload --port 8000
```

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in a browser.

### 3. Create an account and sign in

Use the authentication flow in the web app to register and log in. The product uses authenticated API access for sessions, reports, scenarios, insights, and credits.

### 4. Create a new simulation

From the main screen:

- Enter a simulation title.
- Add an optional investigation objective.
- Upload one or more seed documents.
- Choose the number of rounds.
- Optionally adjust the agent count.
- Optionally enable web search grounding.
- Start the simulation.

### 5. Monitor progress

The backend runs the simulation as a background process and streams progress events. Internally, the run moves through stages such as:

- Processing input documents
- Generating ontology
- Generating agent profiles
- Running the simulation

### 6. Review the completed session

Once complete, the session view can be used to inspect:

- Uploaded seed documents
- Web search grounding results, if enabled
- Session reports
- Generated insights
- Simulation feed data
- Scenarios derived from the session

### 7. Generate reports

After completion, create a report by describing the question or output you want. Thallus generates a structured markdown report and saves it with the session.

### 8. Generate insights

Run an insight analysis against a completed session to answer a specific question. Thallus tracks the insight run, records its status, and stores the result for later review.

### 9. Create scenarios

Create a scenario from a completed session when you want to test an alternate framing or follow-on condition. Run the scenario, monitor its progress, and review its outputs independently from the original session.

### Using the CLI

The CLI provides an end-to-end terminal workflow for running the core simulation pipeline.

### Command

```bash
conda activate py11
python cli.py <input> [--rounds N]
```

### Examples

```bash
conda activate py11
python cli.py INPUT/01.md

conda activate py11
python cli.py INPUT/ --rounds 10
```

### CLI flow

The CLI runs the following stages in sequence:

1. Ingest source files into a graph.
2. Generate an ontology.
3. Generate agent profiles.
4. Run the simulation.
5. Enter a report question-and-answer loop.

In the final stage, the user can ask natural-language questions about the results and Thallus writes the answers as markdown reports.

## Main Outputs

Depending on the workflow, Thallus writes output files such as:

- `graph.json`
- `ontology.json`
- `agents.json`
- `simulation.db`
- `actions.jsonl`
- `objective.txt`
- `report_<id>.md`
- `insight_<id>.json`
- Scenario-specific output folders

In the web product, these are stored under user-specific session directories in `users_data/`.

## Summary

Thallus is a document-grounded, multi-agent AI simulation system. It helps users turn source material into structured simulations, generate agent-based analysis, explore alternate scenarios, and produce reusable reports and insight artifacts through either a web interface or a CLI workflow.
