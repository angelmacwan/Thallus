# BACKLOG

- Google Search / Web Scraper agents (grounding agents)
- Code Execution
- Streamline UI
- Social Network Analytics

# Task 1

- Google Search Grounding
- When the user clicks Simulate button, AKA starts a new sim:
    - extract relevent topics from the SEED and users intent / input
    - perform google search and find news articles, blogs, stock prices, Social media posts etc about those topics
    - Add the results of those topics to markdown file named `{topic}_web_results.md` and add to SEED documents folder for that simulation
    - This only happens if the user selects the Web Search option when creting a sim
    - For this, add a checkbox in the create simulation form
    - Also add a new seed data tab in the sidebar of the simulation. Clicking this will open a list of all documents that the user have uploaded, as well as retrived data from web search

# Task 2

- For report creation as well as insight generation, use agents that can perform code execution and use thinking.
- This should allow the LLM agents to create more accurcate reports when doing things like math, stats, time series analysis, generate excel reports, perform detailed network analysis

# Task 3

- Social Network Analysis
- Add a new tab called Network Analysis
- here, use LLM agent that can perform code execution and use thinking.
- Pass add network details like the graph, posts, interactions etc
- the agent then can use code execution to analise the network and return a detailed report on the network
