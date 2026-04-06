# Thallus: Product Feature Documentation

**Thallus** is an advanced AI-driven social media simulation engine designed to model the spread of narratives, evaluate human-like interactions, and anticipate behavioral outcomes. It is built to serve users—from researchers and strategic consultants to enterprise analysts—who need to understand complex social dynamics before they occur in the real world.

The Thallus platform is built around two primary core features: **Automated Simulations** and **Small World(s)**. These are supported by a suite of analytical engines, scenario testing tools, and visualization dashboards.

---

## Core Feature 1: Automated Simulations

The Automated Simulations engine is designed for rapid ingestion and analysis. By simply uploading source text (such as news reports, intelligence briefings, strategy documents, or social media trends), Thallus autonomously builds an entire simulated digital ecosystem to model how that information would spread and evolve.

### 1. Ingestion & Knowledge Graph Construction

The engine reads the seed documents and instantly parses them into a complex local knowledge graph (`graph_memory`). This maps out key people, organizations, ideologies, and events, capturing the nuanced relationships within the source data.

### 2. Auto-Generated Ontology

Drawing directly from the knowledge graph, Thallus dynamically derives a structured semantic ontology. It classifies the core ideas, potential narratives, and thematic boundaries of the upcoming simulation.

### 3. AI Agent Persona Synthesis

Using the derived ontology, Thallus automatically synthesizes a diverse population of AI agents. These personas are directly grounded in the source material, ensuring that the simulated ecosystem accurately reflects the demographic, ideological, and behavioral traits relevant to the scenario.

### 4. Multi-Round Social Simulation

Once the agents are generated, the simulator deploys them into a multi-round social media environment. Agents will autonomously post, share, debate, and react to one another's ideas based on their unique personas. Every action is meticulously logged (e.g., `actions.jsonl`) for subsequent analysis.

### 5. Interactive Report Q&A

Following the simulation, users can interrogate the digital environment using natural-language queries (e.g., _"What narratives spread the fastest?"_). Thallus interprets the data, generates detailed markdown reports, and saves them as official session logs.

---

## Core Feature 2: Small World(s)

While Automated Simulations focus on generating ecosystems autonomously from unstructured text, **Small World(s)** is a customizable sandbox. It caters to users requiring precision control, allowing them to handcraft specific digital societies (worlds) and the agents that populate them in order to test highly specific, targeted scenarios.

### 1. Custom Agent Definition

Instead of relying on auto-generated profiles, users can manually create and refine individual "Small World Agents." Their traits, biases, priorities, and communication styles can be precisely calibrated to represent specific target demographics, stakeholders, or ideological factions.

### 2. Custom World Construction

Users dictate the rules, boundaries, and historical context of the "World" through robust world descriptions paired with a seed scenario. This allows for rigorous testing of specific organizational, political, or market environments.

### 3. Scenario Branching & State Copying

A standout capability of Small World(s) is scenario branching. Users can run a simulation up to a specific point, copy its exact state (the `parent_scenario_id`), and then introduce a new variable—such as a PR crisis, a new product launch, or a regulatory change. This allows users to observe how an identical population reacts under diverging conditions without restarting the entire simulation.

---

## Supporting Features & Analytics

Beyond the core simulation layers, Thallus provides deep analytical tools and rich visual dashboards to transform raw simulation logs into actionable intelligence.

### 1. The Insights Engine (Multi-Agent Debate Pipeline)

This state-of-the-art evaluation pipeline replaces standard mathematical metrics with qualitative analysis. When a user queries a simulation's outcome, Thallus:

- Summarizes agent behaviors across all rounds.
- Extracts observations directly based on the user’s query.
- Facilitates an **AI Agent Debate**, wherein the participating agents cast initial judgments on the query, observe each other’s views, and debate over multiple rounds.
- Compiles a final, nuanced verdict and answers based on this intelligent consensus.

### 2. Scenario Comparison (Diffing)

The Scenario Diff engine compares two distinct simulation runs to identify their points of divergence. It automatically highlights exactly _which round_ the behavior diverged, tracks metric deltas (changes in adoption, churn, conflict, and morale), and provides an LLM-generated plain English summary explaining the systemic shift.

### 3. Visual Analytics & Dashboards

- **Insights & Metrics Dashboards:** Track real-time telemetry on the simulation's health, user activity, and engagement shifts.
- **Concept Co-occurrence Graphs:** A visualization layer mapping how frequently certain ideas, concepts, or terms intersect during agent conversations.
- **Narrative Transitions Graph:** Reveals the dynamic flow of narratives, showing how an idea mutates as it passes through the digital population over time.

### 4. World Health Check

A dedicated diagnostic tool ensuring the ongoing stability, diversity, and functional integrity of the simulated digital environment, preventing the ecosystem from breaking down or encountering logic loops.

---

**Summary for Investors & Users**
Thallus offers the unique ability to "stress-test reality." Whether automating the creation of a digital ecosystem from a raw strategy document (Automated Simulations) or painstakingly crafting a bespoke demographic to test a specific PR response (Small Worlds), Thallus transforms unpredictable social dynamics into measurable, observable data.
