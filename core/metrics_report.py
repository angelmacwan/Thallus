import json
import sqlite3
import os
import datetime
import networkx as nx
from collections import defaultdict, Counter
from dateutil import parser as date_parser
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
import community as community_louvain

# Generic terms that should not be tracked as concepts (same as in text_processor.py)
_CONCEPT_STOPWORDS = {
    # Template/context words
    'background', 'notable', 'context', 'update', 'information', 'data', 'content',
    'description', 'details', 'summary', 'overview', 'general', 'specific', 'various',
    'multiple', 'several', 'many', 'some', 'other', 'thing', 'things', 'item', 'items',
    'new', 'old', 'current', 'previous', 'next', 'first', 'last', 'major', 'minor',
    
    # Pronouns and demonstratives
    'this', 'that', 'these', 'those', 'it', 'its', "it's", 'they', 'them', 'their',
    'he', 'she', 'him', 'her', 'his', 'hers', 'we', 'us', 'our', 'ours', 'you', 'your',
    'yours', 'i', 'me', 'my', 'mine',
    
    # Common verbs/auxiliaries
    "let's", 'lets', 'let', 'get', 'got', 'getting', 'do', 'does', 'did', 'doing',
    'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
    'having', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    
    # Generic descriptors
    'good', 'bad', 'better', 'worse', 'best', 'worst', 'great', 'small', 'large',
    'big', 'little', 'more', 'less', 'most', 'least', 'very', 'much', 'quite',
    'interesting', 'important', 'significant', 'relevant', 'true', 'false',
    
    # Articles, conjunctions, and adverbs
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'as', 'at', 'by',
    'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'about', 'between',
    'while', 'when', 'where', 'who', 'what', 'why', 'how', 'which', 'whose',
    'until', 'unless', 'since', 'because', 'although', 'though', 'while',
    
    # Common nouns
    'people', 'person', 'place', 'time', 'way', 'year', 'day', 'work', 'part',
    
    # Template artifacts
    'nothing', 'something', 'anything', 'everything', 'scenario', '[scenario',
    'update]', '[update]', 'ignoring', 'location:', 'people:', 'type:', 'entity:',
    'organization:', 'concept:',
}

class MetricsReport:
    def __init__(self, outputs_path: str):
        self.outputs_path = outputs_path
        self.actions_file = os.path.join(outputs_path, "actions.jsonl")
        self.graph_file = os.path.join(outputs_path, "graph.json")
        self.db_file = os.path.join(outputs_path, "metrics.db")
        self.json_file = os.path.join(outputs_path, "metrics.json")
        self.agents_file = os.path.join(outputs_path, "agents.json")
    
    def _normalize_entity_name(self, name: str) -> str:
        """Normalize entity names to avoid case duplicates, possessives, and punctuation."""
        if not name:
            return name
        
        # Trim whitespace
        name = name.strip()
        
        # Strip trailing punctuation (but keep internal punctuation like U.S.)
        name = name.rstrip('.,!?;:\'"[]{}()')
        
        # Strip possessive 's (India's -> India)
        if name.endswith("'s"):
            name = name[:-2]
        elif name.endswith("s'"):
            name = name[:-1]
        
        # Skip normalization for acronyms (all caps, 2-5 chars)
        if name.isupper() and 2 <= len(name) <= 5:
            return name
        
        # Title case for normal names (each word capitalized)
        # This makes "america", "America", "AMERICA" all become "America"
        return name.title()
    
    def _is_valid_concept(self, name: str) -> bool:
        """Check if an entity name should be tracked as a concept."""
        if not name or len(name) < 2:
            return False
        
        # Filter out generic stopwords
        name_lower = name.lower().strip()
        if name_lower in _CONCEPT_STOPWORDS:
            return False
        
        # Filter out single letters
        if len(name) == 1:
            return False
        
        # Filter out pure numbers
        if name.isdigit():
            return False
        
        # Filter out very short words (likely not meaningful concepts)
        if len(name) <= 2 and not name.isupper():
            return False
        
        # Filter out words that are just punctuation or special chars
        if not any(c.isalnum() for c in name):
            return False
        
        return True
    
    def _load_agent_mapping(self):
        """Load agent profiles and create mapping from user_id to username"""
        agent_map = {}
        if os.path.exists(self.agents_file):
            try:
                with open(self.agents_file, 'r', encoding='utf-8') as f:
                    agents = json.load(f)
                    for idx, agent in enumerate(agents):
                        # Map numeric index to username (or realname as fallback)
                        username = agent.get('username', agent.get('realname', f'agent_{idx}'))
                        agent_map[str(idx)] = username
            except:
                pass
        return agent_map

    def _load_concepts_from_graph(self):
        """Load concepts/entities from graph.json, normalized and filtered.
        
        IMPORTANT: This loads data into memory and normalizes it WITHOUT modifying
        the source graph.json file. Normalization happens only for metrics calculation.
        """
        concepts = set()
        if os.path.exists(self.graph_file):
            try:
                with open(self.graph_file, 'r', encoding='utf-8') as f:
                    graph_data = json.load(f)
                    if "entities" in graph_data:
                        # Normalize and filter each concept IN MEMORY ONLY
                        for concept in graph_data["entities"].keys():
                            normalized = self._normalize_entity_name(concept)
                            if self._is_valid_concept(normalized):
                                concepts.add(normalized)
            except:
                pass
        return concepts

    def _parse_rounds(self, actions):
        """Parse actions into rounds based on timestamps"""
        if not actions:
            return {}, 1
        
        # Sort actions by timestamp
        sorted_actions = sorted(actions, key=lambda x: x.get('created_at', ''))
        
        # Parse first and last timestamps
        try:
            first_time = date_parser.parse(sorted_actions[0]['created_at'])
            last_time = date_parser.parse(sorted_actions[-1]['created_at'])
            duration = (last_time - first_time).total_seconds()
            
            # Determine number of rounds (assume ~60 second rounds, min 1 round)
            num_rounds = max(1, int(duration / 60) + 1)
            round_duration = duration / num_rounds if num_rounds > 1 else 1
            
            # Assign each action to a round
            rounds_actions = defaultdict(list)
            for action in sorted_actions:
                try:
                    action_time = date_parser.parse(action['created_at'])
                    elapsed = (action_time - first_time).total_seconds()
                    round_num = int(elapsed / round_duration) + 1 if round_duration > 0 else 1
                    round_num = min(round_num, num_rounds)  # Cap at max rounds
                    rounds_actions[round_num].append(action)
                except:
                    rounds_actions[1].append(action)  # Default to round 1
            
            return dict(rounds_actions), num_rounds
        except:
            # Fallback: all actions in round 1
            return {1: sorted_actions}, 1

    def _extract_concepts_from_content(self, content, known_concepts):
        """Extract concepts mentioned in content with case-insensitive matching.
        
        Creates a canonical mapping to avoid duplicates like America/AMERICA/India's.
        Filters out generic stopwords and normalizes possessives/punctuation.
        """
        # Build a mapping from lowercase to canonical (normalized) form
        concept_map = {}
        for concept in known_concepts:
            # Normalize the concept
            normalized = self._normalize_entity_name(concept)
            
            # Filter out invalid concepts
            if not self._is_valid_concept(normalized):
                continue
            
            normalized_lower = normalized.lower()
            
            # Keep first occurrence as canonical (or prefer non-uppercase)
            if normalized_lower not in concept_map:
                concept_map[normalized_lower] = normalized
            elif not normalized.isupper():  # Prefer non-all-caps versions
                concept_map[normalized_lower] = normalized
        
        # Now match against content (also check variations in content)
        mentioned = set()
        content_lower = content.lower()
        
        for concept_lower, canonical in concept_map.items():
            # Check if concept appears in content
            if concept_lower in content_lower:
                mentioned.add(canonical)
        
        return mentioned

    def _calculate_engagement_rate(self, post):
        """Calculate engagement rate for a post"""
        likes = post.get('num_likes', 0)
        dislikes = post.get('num_dislikes', 0)
        shares = post.get('num_shares', 0)
        # Assume reach is roughly likes + shares + 1 (at least the poster)
        reach = max(1, likes + shares + 1)
        engagement = likes + shares
        return engagement / reach

    def _calculate_virality_score(self, actions, post_id):
        """Calculate virality based on share depth"""
        shares = [a for a in actions if a.get('_type') == 'share' and a.get('original_post_id') == post_id]
        num_shares = len(shares)
        # Simple virality: share_rate with exponential bonus for cascades
        return num_shares * (1.1 ** num_shares) if num_shares > 0 else 0.0

    def run(self, concepts=None, embedder=None, actual_rounds: int = None) -> dict:
        """Generate comprehensive metrics from simulation actions.
        
        Args:
            concepts: Known concepts to track for spread analysis
            embedder: Optional embedding model for semantic similarity
            actual_rounds: Actual number of simulation rounds. If provided, uses this
                          instead of calculating from action timestamps.
        """
        # Load actions
        actions = []
        if os.path.exists(self.actions_file):
            with open(self.actions_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        actions.append(json.loads(line))
                    except:
                        pass
        
        if not actions:
            return self._empty_metrics()
        
        # Load agent mapping (user_id -> username)
        agent_map = self._load_agent_mapping()
        
        # Load concepts from graph
        known_concepts = self._load_concepts_from_graph()
        if not known_concepts and concepts:
            known_concepts = set(concepts)
        elif not known_concepts:
            # Extract from content as fallback
            all_content = " ".join([a.get('content', '') for a in actions])
            # Simple heuristic: titlecased words as concepts
            words = all_content.split()
            known_concepts = {w for w in words if w and w[0].isupper() and len(w) > 3}
        
        # Parse actions into rounds
        rounds_actions, num_rounds = self._parse_rounds(actions)
        
        # Use actual configured rounds if provided (more accurate than timestamp calculation)
        if actual_rounds is not None and actual_rounds > 0:
            num_rounds = actual_rounds
        
        # Ensure num_rounds covers all rounds in rounds_actions
        if rounds_actions:
            max_round_in_actions = max(rounds_actions.keys())
            num_rounds = max(num_rounds, max_round_in_actions)
        
        # Initialize data structures
        all_agents = set()
        posts_by_agent = defaultdict(list)
        agent_concepts_by_round = defaultdict(lambda: defaultdict(set))
        concept_agents_by_round = defaultdict(lambda: defaultdict(set))
        
        # Family 1: Agent Behavior (per round tracking)
        influence_by_round = defaultdict(lambda: defaultdict(float))
        posts_count_by_round = defaultdict(lambda: defaultdict(int))
        engagement_by_agent = defaultdict(list)
        
        # Family 2: Network Dynamics (per round)
        graphs_by_round = {r: nx.DiGraph() for r in range(1, num_rounds + 1)}
        
        # Build metrics from actions
        for round_num, round_actions in rounds_actions.items():
            G = graphs_by_round[round_num]
            
            for action in round_actions:
                u_id = str(action.get("user_id", action.get("agent_id", "unknown")))
                # Map numeric ID to agent name
                agent_name = agent_map.get(u_id, u_id)
                all_agents.add(agent_name)
                
                if action.get("_type") == "post":
                    posts_count_by_round[round_num][agent_name] += 1
                    influence_by_round[round_num][agent_name] += 1.0
                    posts_by_agent[agent_name].append(action)
                    
                    # Extract concepts from post
                    content = action.get('content', '')
                    mentioned_concepts = self._extract_concepts_from_content(content, known_concepts)
                    for concept in mentioned_concepts:
                        agent_concepts_by_round[round_num][agent_name].add(concept)
                        concept_agents_by_round[round_num][concept].add(agent_name)
                    
                    # Track engagement
                    eng_rate = self._calculate_engagement_rate(action)
                    engagement_by_agent[agent_name].append(eng_rate)
                    
                elif action.get("_type") in ["like", "share", "reply", "comment"]:
                    influence_by_round[round_num][agent_name] += 0.5
                    
                    # Build network edge
                    post_id = action.get("post_id") or action.get("original_post_id")
                    if post_id:
                        # Find post author
                        target_post = next((a for a in actions if a.get("_type") == "post" and a.get("post_id") == post_id), None)
                        if target_post:
                            target_id = str(target_post.get("user_id", "unknown"))
                            target_name = agent_map.get(target_id, target_id)
                            if target_name != agent_name:
                                current_weight = G.get_edge_data(agent_name, target_name, {}).get("weight", 0)
                                G.add_edge(agent_name, target_name, weight=current_weight + 1)
        
        # Ensure all agents are in graphs
        for r in graphs_by_round:
            for u in all_agents:
                if u not in graphs_by_round[r]:
                    graphs_by_round[r].add_node(u)
        
        # Calculate cumulative influence and dominance
        total_influence = defaultdict(float)
        total_posts = sum(sum(posts_count_by_round[r].values()) for r in posts_count_by_round)
        
        for round_num in influence_by_round:
            for agent, infl in influence_by_round[round_num].items():
                total_influence[agent] += infl
        
        dominance = {}
        for agent in all_agents:
            agent_total_posts = sum(posts_count_by_round[r].get(agent, 0) for r in posts_count_by_round)
            dominance[agent] = agent_total_posts / total_posts if total_posts > 0 else 0.0
        
        # Calculate drift (concept vector similarity between rounds)
        drift = {}
        for agent in all_agents:
            agent_drift_scores = []
            for r in range(1, num_rounds):
                if r + 1 <= num_rounds:
                    concepts_r1 = agent_concepts_by_round[r].get(agent, set())
                    concepts_r2 = agent_concepts_by_round[r + 1].get(agent, set())
                    
                    if concepts_r1 or concepts_r2:
                        # Create concept vectors
                        all_round_concepts = concepts_r1 | concepts_r2
                        if all_round_concepts:
                            vec1 = np.array([1 if c in concepts_r1 else 0 for c in all_round_concepts])
                            vec2 = np.array([1 if c in concepts_r2 else 0 for c in all_round_concepts])
                            
                            # Cosine distance (1 - similarity)
                            if np.sum(vec1) > 0 and np.sum(vec2) > 0:
                                similarity = cosine_similarity([vec1], [vec2])[0][0]
                                agent_drift_scores.append(1 - similarity)
            
            drift[agent] = float(np.mean(agent_drift_scores)) if agent_drift_scores else 0.0
        
        # Improved influence metrics
        influence_details = {}
        for agent in all_agents:
            agent_posts = posts_by_agent[agent]
            total_infl = total_influence[agent]
            num_posts = len(agent_posts)
            
            # Amplification factor
            amplification = total_infl / num_posts if num_posts > 0 else 0.0
            
            # Influence growth rate
            first_half = sum(influence_by_round[r].get(agent, 0) for r in range(1, num_rounds // 2 + 1))
            second_half = sum(influence_by_round[r].get(agent, 0) for r in range(num_rounds // 2 + 1, num_rounds + 1))
            growth_rate = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0.0
            
            # Reach (unique agents who interacted)
            reach = len({agent_map.get(str(a.get("user_id")), str(a.get("user_id"))) for a in actions 
                        if a.get("_type") in ["like", "comment", "share"] 
                        and a.get("post_id") in [p.get("post_id") for p in agent_posts]})
            
            # Top posts
            top_posts = sorted(agent_posts, key=lambda p: p.get('num_likes', 0) + p.get('num_shares', 0), reverse=True)[:3]
            top_post_ids = [p.get('post_id') for p in top_posts]
            
            influence_details[agent] = {
                "total_influence": float(total_infl),
                "amplification_factor": float(amplification),
                "growth_rate": float(growth_rate),
                "reach": reach,
                "top_post_ids": top_post_ids
            }
        
        # Engagement metrics
        engagement_metrics = {}
        for agent in all_agents:
            if engagement_by_agent[agent]:
                engagement_metrics[agent] = {
                    "avg_engagement_rate": float(np.mean(engagement_by_agent[agent])),
                    "max_engagement_rate": float(np.max(engagement_by_agent[agent])),
                    "consistency": float(1.0 - np.std(engagement_by_agent[agent])) if len(engagement_by_agent[agent]) > 1 else 1.0
                }
            else:
                engagement_metrics[agent] = {
                    "avg_engagement_rate": 0.0,
                    "max_engagement_rate": 0.0,
                    "consistency": 0.0
                }
        
        # Network metrics (per round)
        pagerank_by_round = {}
        density_by_round = {}
        for r in graphs_by_round:
            G = graphs_by_round[r]
            pagerank_by_round[r] = nx.pagerank(G, alpha=0.85) if len(G) > 0 else {}
            density_by_round[r] = nx.density(G) if len(G) > 0 else 0.0
        
        # Final pagerank (last round)
        final_graph = graphs_by_round[num_rounds]
        pagerank = pagerank_by_round.get(num_rounds, {})
        density = density_by_round.get(num_rounds, 0.0)
        
        # Echo chamber with belief clustering
        echo_chamber_index = 0.0
        homophily_score = 0.0
        
        if len(final_graph) > 2:
            # Build agent concept vectors
            agent_list = list(all_agents)
            all_mentioned_concepts = set()
            for r in agent_concepts_by_round:
                for agent in agent_concepts_by_round[r]:
                    all_mentioned_concepts.update(agent_concepts_by_round[r][agent])
            
            if len(all_mentioned_concepts) > 0:
                concept_list = list(all_mentioned_concepts)
                agent_vectors = []
                for agent in agent_list:
                    all_agent_concepts = set()
                    for r in agent_concepts_by_round:
                        all_agent_concepts.update(agent_concepts_by_round[r].get(agent, set()))
                    vector = [1 if c in all_agent_concepts else 0 for c in concept_list]
                    agent_vectors.append(vector)
                
                # Cluster agents by concepts
                if len(agent_list) > 1 and len(concept_list) > 0:
                    n_clusters = min(3, len(agent_list))
                    try:
                        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                        clusters = kmeans.fit_predict(agent_vectors)
                        
                        # Calculate homophily: % of edges within same cluster
                        edges = list(final_graph.edges())
                        if edges:
                            same_cluster_edges = sum(1 for u, v in edges 
                                                    if agent_list.index(u) < len(clusters) 
                                                    and agent_list.index(v) < len(clusters)
                                                    and clusters[agent_list.index(u)] == clusters[agent_list.index(v)])
                            homophily_score = same_cluster_edges / len(edges)
                        
                        # Echo chamber index based on homophily
                        echo_chamber_index = float(homophily_score)
                    except:
                        pass
        
        # Information Spread metrics (REAL calculations)
        adoption_curves = {}
        for concept in known_concepts:
            curve = []
            for r in range(1, num_rounds + 1):
                adopting_agents = concept_agents_by_round[r].get(concept, set())
                adoption_rate = len(adopting_agents) / len(all_agents) if all_agents else 0.0
                curve.append({"round": r, "adoption": float(adoption_rate)})
            adoption_curves[concept] = curve
        
        # Half-life: round where adoption drops below 50% of peak
        half_life = {}
        for concept, curve in adoption_curves.items():
            adoptions = [pt["adoption"] for pt in curve]
            if adoptions:
                peak = max(adoptions)
                half_peak = peak * 0.5
                half_round = num_rounds
                for pt in curve:
                    if pt["adoption"] >= peak:
                        peak_round = pt["round"]
                        # Find where it drops below half after peak
                        for pt2 in curve:
                            if pt2["round"] > peak_round and pt2["adoption"] < half_peak:
                                half_round = pt2["round"]
                                break
                        break
                half_life[concept] = half_round
            else:
                half_life[concept] = 1
        
        # Co-occurrence (Jaccard similarity)
        co_occurrence = []
        concept_list = list(known_concepts)
        for i in range(len(concept_list)):
            for j in range(i + 1, len(concept_list)):
                c1, c2 = concept_list[i], concept_list[j]
                # Get all agents who mentioned each concept
                agents_c1 = set()
                agents_c2 = set()
                for r in concept_agents_by_round:
                    agents_c1.update(concept_agents_by_round[r].get(c1, set()))
                    agents_c2.update(concept_agents_by_round[r].get(c2, set()))
                
                if agents_c1 or agents_c2:
                    intersection = len(agents_c1 & agents_c2)
                    union = len(agents_c1 | agents_c2)
                    jaccard = intersection / union if union > 0 else 0.0
                    if jaccard > 0:  # Only include if there's co-occurrence
                        co_occurrence.append({
                            "pair": [c1, c2],
                            "jaccard": float(jaccard)
                        })
        
        # Narrative patterns
        narrative_chains = []
        # Find concept sequences in posts
        for agent in all_agents:
            agent_posts = sorted(posts_by_agent[agent], key=lambda p: p.get('created_at', ''))
            if len(agent_posts) >= 2:
                for i in range(len(agent_posts) - 1):
                    concepts1 = self._extract_concepts_from_content(agent_posts[i].get('content', ''), known_concepts)
                    concepts2 = self._extract_concepts_from_content(agent_posts[i + 1].get('content', ''), known_concepts)
                    if concepts1 and concepts2:
                        for c1 in concepts1:
                            for c2 in concepts2:
                                if c1 != c2:
                                    narrative_chains.append((c1, c2))
        
        # Count narrative transitions
        narrative_transitions = Counter(narrative_chains)
        top_narratives = [{"from": pair[0], "to": pair[1], "count": count} 
                         for pair, count in narrative_transitions.most_common(10)]
        
        # Assemble final metrics
        metrics = {
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "num_rounds": num_rounds,
            "agents": {
                "influence": {k: float(v) for k, v in total_influence.items()},
                "dominance": {k: float(v) for k, v in dominance.items()},
                "drift": drift,
                "influence_details": influence_details
            },
            "engagement": engagement_metrics,
            "network": {
                "pagerank": {k: float(v) for k, v in pagerank.items()},
                "density": float(density),
                "density_by_round": {r: float(d) for r, d in density_by_round.items()},
                "echo_chamber_index": float(echo_chamber_index),
                "homophily_score": float(homophily_score)
            },
            "spread": {
                "adoption_curves": adoption_curves,
                "half_life": half_life,
                "co_occurrence": co_occurrence
            },
            "narratives": {
                "top_transitions": top_narratives,
                "total_chains": len(narrative_chains)
            }
        }

        # Write JSON
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2)

        # Write to database with temporal support
        self._write_to_database(metrics, influence_by_round, posts_count_by_round, density_by_round)

        return metrics
    
    def _empty_metrics(self):
        """Return empty metrics structure when no actions"""
        return {
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "num_rounds": 0,
            "agents": {"influence": {}, "dominance": {}, "drift": {}, "influence_details": {}},
            "engagement": {},
            "network": {"pagerank": {}, "density": 0.0, "density_by_round": {}, "echo_chamber_index": 0.0, "homophily_score": 0.0},
            "spread": {"adoption_curves": {}, "half_life": {}, "co_occurrence": []},
            "narratives": {"top_transitions": [], "total_chains": 0}
        }
    
    def _write_to_database(self, metrics, influence_by_round, posts_count_by_round, density_by_round):
        """Write metrics to SQLite database"""
        conn = sqlite3.connect(self.db_file)
        cur = conn.cursor()
        
        # Drop and recreate tables with round support
        cur.executescript("""
            DROP TABLE IF EXISTS agent_scores;
            DROP TABLE IF EXISTS concept_spread;
            DROP TABLE IF EXISTS network_summary;
            DROP TABLE IF EXISTS engagement_metrics;
            DROP TABLE IF EXISTS narrative_patterns;
            
            CREATE TABLE agent_scores (agent TEXT, metric TEXT, value REAL, round INTEGER DEFAULT 0);
            CREATE TABLE concept_spread (concept TEXT, round INTEGER, adoption REAL);
            CREATE TABLE network_summary (metric TEXT, value REAL, round INTEGER DEFAULT 0);
            CREATE TABLE engagement_metrics (agent TEXT, metric TEXT, value REAL);
            CREATE TABLE narrative_patterns (from_concept TEXT, to_concept TEXT, count INTEGER);
        """)
        
        # Agent scores (cumulative)
        for agent, val in metrics["agents"]["influence"].items():
            cur.execute("INSERT INTO agent_scores VALUES (?, ?, ?, ?)", (agent, "influence", val, 0))
        for agent, val in metrics["agents"]["dominance"].items():
            cur.execute("INSERT INTO agent_scores VALUES (?, ?, ?, ?)", (agent, "dominance", val, 0))
        for agent, val in metrics["agents"]["drift"].items():
            cur.execute("INSERT INTO agent_scores VALUES (?, ?, ?, ?)", (agent, "drift", val, 0))
        
        # Agent scores per round
        for round_num in influence_by_round:
            for agent, val in influence_by_round[round_num].items():
                cur.execute("INSERT INTO agent_scores VALUES (?, ?, ?, ?)", (agent, "influence", val, round_num))
        
        # Engagement metrics
        for agent, eng_data in metrics["engagement"].items():
            for metric, val in eng_data.items():
                cur.execute("INSERT INTO engagement_metrics VALUES (?, ?, ?)", (agent, metric, val))
        
        # Concept spread
        for concept, curve in metrics["spread"]["adoption_curves"].items():
            for pt in curve:
                cur.execute("INSERT INTO concept_spread VALUES (?, ?, ?)", (concept, pt["round"], pt["adoption"]))
        
        # Network summary
        cur.execute("INSERT INTO network_summary VALUES (?, ?, ?)", ("density", metrics["network"]["density"], 0))
        cur.execute("INSERT INTO network_summary VALUES (?, ?, ?)", ("echo_chamber_index", metrics["network"]["echo_chamber_index"], 0))
        cur.execute("INSERT INTO network_summary VALUES (?, ?, ?)", ("homophily_score", metrics["network"]["homophily_score"], 0))
        
        for round_num, density in density_by_round.items():
            cur.execute("INSERT INTO network_summary VALUES (?, ?, ?)", ("density", density, round_num))
        
        # Narrative patterns
        for transition in metrics["narratives"]["top_transitions"]:
            cur.execute("INSERT INTO narrative_patterns VALUES (?, ?, ?)", 
                       (transition["from"], transition["to"], transition["count"]))
        
        conn.commit()
        conn.close()
