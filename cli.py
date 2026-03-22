import sys
import argparse
import os
from dotenv import load_dotenv
load_dotenv()  # Load API keys from .env before any module reads them

from core.config import OUTPUTS_BASE
from core.graph_memory import LocalGraphMemory
from core.text_processor import TextProcessor
from core.ontology_generator import OntologyGenerator
from core.profile_generator import ProfileGenerator
from core.simulation_runner import SimulationRunner
from core.report_agent import ReportAgent


# ---------------------------------------------------------------------------
# Output directory management
# ---------------------------------------------------------------------------

def make_output_dir(base: str = OUTPUTS_BASE) -> str:
    """
    Create and return a versioned output directory.

    If *base* does not exist it is created and ``output_1`` is returned.
    If ``output_1`` already exists, ``output_2`` is tried, and so on.
    """
    os.makedirs(base, exist_ok=True)
    n = 1
    while True:
        candidate = os.path.join(base, f"output_{n}")
        if not os.path.exists(candidate):
            os.makedirs(candidate)
            return candidate
        n += 1


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def run_pipeline(seed_source: str, rounds: int = 3, is_folder: bool = False):
    out_dir = make_output_dir()
    print(f"\nOutputs will be saved to: {out_dir}")

    graph = LocalGraphMemory(storage_path=os.path.join(out_dir, "graph.json"))

    # Stage 1 – Ingest
    print("\n=== Stage 1: Ingesting Seed ===")
    tp = TextProcessor(graph)
    if is_folder:
        tp.ingest_folder(seed_source)
    else:
        tp.ingest(seed_source)

    # Stage 2 – Ontology
    print("\n=== Stage 2: Generating Ontology ===")
    og = OntologyGenerator(graph)
    og.generate(output_path=os.path.join(out_dir, "ontology.json"))

    # Stage 3 – Agent profiles
    print("\n=== Stage 3: Generating Agent Profiles ===")
    agents_path = os.path.join(out_dir, "agents.json")
    pg = ProfileGenerator(graph)
    pg.generate_profiles(output_path=agents_path)

    # Stage 4 – OASIS simulation
    print(f"\n=== Stage 4: Running OASIS Simulation ({rounds} round(s)) ===")
    db_path = os.path.join(out_dir, "simulation.db")
    log_path = os.path.join(out_dir, "actions.jsonl")
    sr = SimulationRunner(
        graph,
        agents_path=agents_path,
        db_path=db_path,
        log_path=log_path,
    )
    sr.run(rounds)

    # Stage 5 – Report (interactive loop)
    print("\n=== Stage 5: Report Q&A ===")
    print("Ask questions about the simulation. Type 'exit' or leave blank to quit.\n")
    ra = ReportAgent(graph, log_path=log_path)
    qa_log_path = os.path.join(out_dir, "qa_log.md")
    report_index = 1
    while True:
        try:
            query = input("Enter your report query (or 'exit' to quit): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break
        if not query or query.lower() == "exit":
            print("Exiting report Q&A.")
            break
        report_path = os.path.join(out_dir, f"report_{report_index}.md")
        report = ra.generate_report(query, output_path=report_path)
        print("\n=== REPORT ===")
        print(report)
        print(f"\n(Saved to {report_path})\n")

        # Append Q&A to the session log
        with open(qa_log_path, "a", encoding="utf-8") as fh:
            fh.write(f"## Q{report_index}: {query}\n\n")
            fh.write(report.strip())
            fh.write("\n\n---\n\n")

        report_index += 1


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Thallus",
        usage="%(prog)s <input> [--rounds N]",
    )
    parser.add_argument(
        "source",
        help="Path to a seed text file or a folder containing seed files",
    )
    parser.add_argument(
        "--rounds",
        type=int,
        default=3,
        help="Number of OASIS simulation rounds (default: 3)",
    )
    args = parser.parse_args()

    seed = args.source
    if not os.path.exists(seed):
        print(f"Error: '{seed}' does not exist.")
        sys.exit(1)

    is_folder = os.path.isdir(seed)
    run_pipeline(seed, rounds=args.rounds, is_folder=is_folder)


if __name__ == "__main__":
    main()
