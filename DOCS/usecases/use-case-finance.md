
# Use Case: Finance

## Problem

A quantitative hedge fund wants to understand how market-moving narratives and rumors emerge and spread on social media platforms. Unsubstantiated rumors can cause significant, unpredictable stock price volatility, creating both risks and opportunities. The fund needs a way to model the potential impact of a new financial rumor (e.g., a rumored acquisition, a product failure, or a C-level executive scandal) on investor sentiment and a specific stock's price before it becomes widespread.

## Thallus to the Rescue

The fund's analysts can use Thallus to simulate narrative diffusion.

1.  **Seed Documents:** They feed Thallus with a collection of documents representing the current financial landscape: recent earnings reports for a specific company, financial news articles, and transcripts of analyst calls. They also add a new, fabricated document representing the rumor they want to model.

2.  **Simulation:** Thallus ingests this information, builds a knowledge graph of the key entities (companies, people, financial metrics), and synthesizes a population of AI agents representing different market participants: retail investors, institutional traders, financial journalists, and professional analysts. It then runs a simulation to see how the rumor propagates through this network. Different agents will have different levels of influence and different criteria for believing and sharing the rumor.

3.  **Q&A Analysis:** After the simulation, the analysts can ask natural-language questions to the Thallus report agent:
    *   "Which investor profiles were most likely to believe and share the rumor?"
    *   "What was the overall sentiment shift regarding 'AAPL' stock over the simulation?"
    *   "Identify the key influencers who were most effective at spreading the narrative."
    *   "How long did it take for the rumor to reach 50% of the simulated population?"

## Outcome

The hedge fund gains a predictive model of how a specific rumor could affect market sentiment. This allows them to:
*   **Price Risk:** Better quantify the risk associated with social media-driven volatility in their portfolio.
*   **Identify Opportunity:** Develop automated trading strategies to detect the early signals of a similar narrative spreading on real social media, allowing them to take a position before the market fully reacts.
*   **Test Counter-Narratives:** Simulate the release of a press statement or official clarification to see if it would effectively quell the rumor, allowing them to predict the company's probable response.

This simulation-driven insight provides a significant edge over competitors who are only able to react to news after the fact.
