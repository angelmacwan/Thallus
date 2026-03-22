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
