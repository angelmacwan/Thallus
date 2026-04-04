# Feature : Small World

## phase 1:

AGENTS

add a Small World tab in the home screen sidebar

Small world page:
Split into 2 tabs (1: worlds, 2: agents ) (this allows the user to use same agents for various worlds)

in the agents tab, there will be a list of all agents made my that user.
also a create agent button and a load from csv / excel button

Clicking create agent button opens up a form that the user can use to create one agent

Agents should have this:

```agent_info
Core Identity
Name
Age
Gender (optional)
Location (geo + cultural context)
Profession
Job title / role
Organization
Psychological Profile (VERY important)
Personality traits (Big Five or custom scale)
Openness
Conscientiousness
Extraversion
Agreeableness
Neuroticism
Risk tolerance
Decision style (analytical, emotional, impulsive)
Motivation drivers (money, status, stability, impact)
Core beliefs / worldview
Biases (optional but powerful)
Behavioral Attributes
Communication style (direct, passive, aggressive)
Influence level (low → high)
Adaptability to change
Loyalty (to org / product / people)
Stress response
Contextual State
Current goals
Current frustrations
Incentives (what they gain/lose)
Constraints (budget, authority, time)
Relationships (this is CRITICAL)
Connections to other agents
Type (manager, peer, competitor, customer)
Strength (weak → strong)
Sentiment (positive, neutral, negative)
Influence direction (who affects whom)
External Factors
Salary / financial state (if relevant)
Work environment
Market exposure (for customers)
```

User can also create multiple agents at once using a excel file

In the ui, allow the users to download a template with all required fields already present in excel format

in backend handle this new features properly, store agents created by users prooperly

Add ability to generate agents using natural language
wherer the user fills out 4-6 fields and discribes the agent then the backedn uses LLM and generates other fields

This updated fields are verified by the user, user can edit this, and confirm the agent

user should also be able to update existing agents when needed

basically we will have multiple ways of creating agents

For agent relations lets have this:

- Visual relationship builder (graph view)
- Auto-suggest relationships
- Bulk relationship creation (for CSV users)

---

## Phase 2:

SIM

In the worlds tab, the user can create a world and add agents to it

initially agents do nothing, until the user askes a question

When user clicks create world button, a form should open:
here the users can add agents as well as define what the world is about in natural language.

In the UI, once the world is created , users can do the following:

run senarios based on various seed inputs

Seed inout can be text documents or just a simple prompt (what happens if this changes, etc)

Once a sim runs, the user gets a sim report for that senario

The user can also chat with the senario

for each senario, the agents memory and conversations must be isolated

AKA, if ther is one sim for layoffs, and other for hiring. The layoff sim should not affect hiring sim in any way unless the new senario us a branch of the old one

So display each senario as a branch

users can create multiple isolated senarios

then branch them (kinda like git)

display this as a graph in senarios tab

Each agent will have local senario memory, and branching inherites memory from parent

---

## Phase 3:

Output

output should be extremly structured, hard metrices

- Required outputs:
- Outcome summary
- adoption, churn, conflict, morale
- Key agent behaviors
- who drove outcomes
- Bottlenecks / risks
- Unexpected outcomes
- Recommendations
- “Reduce friction by changing X”
- Scenario comparison (if multiple runs)

Output should be exterprise decision grade:

use

- Confidence score
- Key drivers (top 3 factors)
- Counterfactual insight
- “If X didn’t happen, outcome changes by Y”
- Action priority
- ranked recommendations

## Phase 4:

Inform the user about:

- World Health Check (before running sim)
- missing relationships?
- unrealistic configs?
- low-confidence inputs?

Scenario Diff View (very important)

When comparing branches:

- what changed?
- which agents behaved differently?
- what caused divergence?

This is where real insight comes from.

Add a few default agent templates

- Manager
- IC
- Customer persona
- Executive
