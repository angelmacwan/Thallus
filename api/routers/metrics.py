import os
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


router = APIRouter(
    prefix="/api/metrics",
    tags=["metrics"]
)

def _get_metrics_data(outputs_path: str):
    json_path = os.path.join(outputs_path, "metrics.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Metrics not found")
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _generate_llm_insights(data: dict) -> list:
    """Use LLM to generate contextual insights from metrics data"""
    # Skip if genai library not available
    if not GENAI_AVAILABLE:
        return []
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Silently skip LLM insights if no API key
            return []
        
        client = genai.Client(api_key=api_key)
        
        # Create a summary of the metrics for the LLM
        prompt = f"""Analyze the following simulation metrics and generate 5-7 insightful, actionable observations.
        
Metrics Overview:
- Total Rounds: {data.get('num_rounds', 0)}
- Number of Agents: {len(data.get('agents', {}).get('influence', {}))}
- Network Density: {data.get('network', {}).get('density', 0):.2f}
- Echo Chamber Index: {data.get('network', {}).get('echo_chamber_index', 0):.2f}
- Total Narrative Chains: {data.get('narratives', {}).get('total_chains', 0)}

Top Influencers:
{json.dumps(sorted(data.get('agents', {}).get('influence', {}).items(), key=lambda x: x[1], reverse=True)[:5], indent=2)}

Agent Growth Rates:
{json.dumps({k: v.get('growth_rate', 0) for k, v in data.get('agents', {}).get('influence_details', {}).items()}, indent=2)}

Concept Adoption Trends:
{json.dumps({k: {'initial': v[0]['adoption'], 'final': v[-1]['adoption'], 'rounds': len(v)} 
            for k, v in data.get('spread', {}).get('adoption_curves', {}).items() if len(v) > 0}, indent=2)}

Co-occurrence Patterns (top 10):
{json.dumps(data.get('spread', {}).get('co_occurrence', [])[:10], indent=2)}

Top Narrative Transitions:
{json.dumps(data.get('narratives', {}).get('top_transitions', [])[:10], indent=2)}

Agent Drift (concept behavior change):
{json.dumps(data.get('agents', {}).get('drift', {}), indent=2)}

Generate insights that:
1. Tell a story about what happened in the simulation
2. Connect different metrics (e.g., "why did agent X grow? what concepts drove that?")
3. Identify concerning patterns (echo chambers, polarization, misinformation spread)
4. Highlight surprising or notable behaviors
5. Explain co-occurrence patterns ("these concepts are strongly linked because...")
6. Analyze narrative flows ("concepts A→B→C form a persuasion chain")
7. Be specific with numbers and agent names

Return your response as a JSON array of insight objects with this structure:
[
  {{
    "type": "narrative_pattern|co_occurrence|growth|polarization|influence|concept_momentum",
    "title": "Short punchy title (6-8 words)",
    "description": "Detailed explanation with specific data points (2-3 sentences)",
    "severity": "info|warning|success",
    "key_finding": "One sentence takeaway",
    "related_entities": {{"agents": [], "concepts": []}}
  }}
]

Focus on actionable insights that help understand the social dynamics."""

        from google.genai import types
        from core.config import MODEL_NAME
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )
        
        # Parse the response
        content = response.text
        insights = json.loads(content)
        return insights
    except Exception as e:
        print(f"Error generating LLM insights: {e}")
        return []

def _build_metrics_summary(data: dict):
    """Helper to build summary insights from metrics data using both rule-based and LLM analysis"""
    insights = []
    
    # Try to get LLM-generated insights first
    llm_insights = _generate_llm_insights(data)
    if llm_insights:
        insights.extend(llm_insights[:7])  # Use top 7 LLM insights
    
    # Add rule-based insights as backup or supplement
    # Analyze influence growth
    if "agents" in data and "influence_details" in data["agents"]:
        growth_agents = []
        for agent_id, details in data["agents"]["influence_details"].items():
            growth_rate = details.get("growth_rate", 0)
            if growth_rate > 150:
                growth_agents.append((agent_id, growth_rate))
        
        if growth_agents:
            # Sort by growth rate and take top 3
            growth_agents.sort(key=lambda x: x[1], reverse=True)
            top_agents = growth_agents[:3]
            if len(top_agents) == 1:
                agent_id, rate = top_agents[0]
                insights.append({
                    "type": "agent_growth",
                    "title": f"{agent_id}: Exceptional Influence Growth",
                    "description": f"{agent_id} demonstrated remarkable growth with influence increasing {rate:.0f}% from first to second half of simulation. This suggests highly effective messaging or advantageous network position.",
                    "severity": "success",
                    "key_finding": f"Single dominant growth leader with {rate:.0f}% increase",
                    "related_entities": {"agents": [agent_id], "concepts": []}
                })
            else:
                agent_list = ", ".join([f"{a} ({r:.0f}%)" for a, r in top_agents])
                insights.append({
                    "type": "agent_growth",
                    "title": "Multiple High-Growth Influencers Emerged",
                    "description": f"{len(top_agents)} agents showed exceptional growth trajectories: {agent_list}. This suggests competitive influence dynamics.",
                    "severity": "info",
                    "key_finding": f"{len(top_agents)} agents with >150% growth",
                    "related_entities": {"agents": [a for a, _ in top_agents], "concepts": []}
                })
    
    # Analyze echo chambers with context
    if "network" in data:
        echo_index = data["network"].get("echo_chamber_index", 0)
        homophily = data["network"].get("homophily_score", 0)
        density = data["network"].get("density", 0)
        
        if echo_index > 0.7:
            insights.append({
                "type": "echo_chamber",
                "title": "Strong Echo Chambers Forming",
                "description": f"Network shows significant belief-based clustering (homophily: {homophily:.2f}). Agents are primarily engaging with like-minded peers, limiting cross-cutting exposure. Network density of {density:.2f} suggests fragmentation.",
                "severity": "warning",
                "key_finding": f"70%+ homophily indicates information silos",
                "related_entities": {"agents": [], "concepts": []}
            })
        elif echo_index > 0.5:
            insights.append({
                "type": "echo_chamber",
                "title": "Moderate Echo Chamber Formation",
                "description": f"Growing belief-based clustering detected (homophily: {homophily:.2f}). While still permeable, clear preference patterns emerging for same-belief interactions.",
                "severity": "info",
                "key_finding": f"Moderate clustering with room for cross-pollination",
                "related_entities": {"agents": [], "concepts": []}
            })
        elif echo_index < 0.3 and density > 0.5:
            insights.append({
                "type": "network_health",
                "title": "Healthy Cross-Belief Dialogue",
                "description": f"Low echo chamber formation (homophily: {homophily:.2f}) with strong network density ({density:.2f}) indicates agents engaging across belief lines - positive for diverse information exposure.",
                "severity": "success",
                "key_finding": "Open dialogue across different viewpoints",
                "related_entities": {"agents": [], "concepts": []}
            })
    
    # Analyze co-occurrence patterns with meaning
    if "spread" in data and "co_occurrence" in data["spread"]:
        co_occur = data["spread"]["co_occurrence"]
        if co_occur:
            # Find perfect co-occurrences (concepts always mentioned together)
            perfect_pairs = [item for item in co_occur if item["jaccard"] >= 0.95]
            if perfect_pairs:
                pair_strs = [f"{p['pair'][0]} & {p['pair'][1]}" for p in perfect_pairs[:3]]
                insights.append({
                    "type": "co_occurrence",
                    "title": "Tightly Bound Concept Pairs Detected",
                    "description": f"These concepts appear together nearly 100% of the time: {', '.join(pair_strs)}. This suggests they form unified narratives or talking points that agents treat as inseparable.",
                    "severity": "info",
                    "key_finding": f"{len(perfect_pairs)} concept pairs are semantically fused",
                    "related_entities": {"agents": [], "concepts": [p for pair in perfect_pairs for p in pair["pair"]][:6]}
                })
            
            # Find weak co-occurrences (concepts used by different communities)
            weak_pairs = [item for item in co_occur if 0.2 < item["jaccard"] < 0.4]
            if weak_pairs:
                pair_info = weak_pairs[0]
                insights.append({
                    "type": "co_occurrence",
                    "title": "Divergent Concept Communities",
                    "description": f"Concept pair {pair_info['pair'][0]} & {pair_info['pair'][1]} (jaccard: {pair_info['jaccard']:.2f}) show moderate overlap, suggesting distinct agent communities focusing on different aspects of the narrative.",
                    "severity": "info",
                    "key_finding": "Multiple interpretive communities exist",
                    "related_entities": {"agents": [], "concepts": pair_info["pair"]}
                })
    
    # Analyze narrative transitions for patterns
    if "narratives" in data and "top_transitions" in data["narratives"]:
        transitions = data["narratives"]["top_transitions"]
        if len(transitions) >= 3:
            # Find dominant transition
            top_trans = transitions[0]
            if top_trans["count"] >= 3:
                insights.append({
                    "type": "narrative_pattern",
                    "title": f"Dominant Narrative Flow: {top_trans['from']} → {top_trans['to']}",
                    "description": f"The transition from {top_trans['from']} to {top_trans['to']} occurred {top_trans['count']}× - the most common narrative move. This represents a learned persuasion strategy or natural conceptual bridge agents discovered.",
                    "severity": "info",
                    "key_finding": f"Primary narrative pathway established",
                    "related_entities": {"agents": [], "concepts": [top_trans['from'], top_trans['to']]}
                })
            
            # Look for circular narratives (A→B, B→A)
            for i, trans1 in enumerate(transitions):
                for trans2 in transitions[i+1:]:
                    if trans1['from'] == trans2['to'] and trans1['to'] == trans2['from']:
                        insights.append({
                            "type": "narrative_pattern",  
                            "title": f"Reciprocal Narrative: {trans1['from']} ⟷ {trans1['to']}",
                            "description": f"Agents alternate between {trans1['from']} and {trans1['to']} in both directions ({trans1['count']}→, {trans2['count']}←). This suggests these concepts are interdependent or contested themes.",
                            "severity": "info",
                            "key_finding": "Bidirectional concept dialogue detected",
                            "related_entities": {"agents": [], "concepts": [trans1['from'], trans1['to']]}
                        })
                        break
    
    # Analyze concept momentum with interpretation
    if "spread" in data and "adoption_curves" in data["spread"]:
        momentum_concepts = []
        declining_concepts = []
        
        for concept, curve in data["spread"]["adoption_curves"].items():
            if len(curve) >= 2:
                first_adoption = curve[0]["adoption"]
                last_adoption = curve[-1]["adoption"]
                
                if last_adoption > first_adoption * 2.5 and last_adoption > 0.3:
                    momentum_concepts.append((concept, first_adoption, last_adoption))
                elif last_adoption < first_adoption * 0.4 and first_adoption > 0.2:
                    declining_concepts.append((concept, first_adoption, last_adoption))
        
        if momentum_concepts:
            momentum_concepts.sort(key=lambda x: x[2]/x[1] if x[1] > 0 else 0, reverse=True)
            top_concept, initial, final = momentum_concepts[0]
            growth = (final/initial) if initial > 0 else float('inf')
            insights.append({
                "type": "concept_momentum",
                "title": f"Viral Concept: '{top_concept}' Spreading Rapidly",
                "description": f"'{top_concept}' adoption surged from {initial:.1%} to {final:.1%} ({growth:.1f}x growth). Now mentioned by {final:.0%} of agents. This represents successful narrative propagation or emerging consensus.",
                "severity": "success",
                "key_finding": f"{growth:.1f}x adoption increase",
                "related_entities": {"agents": [], "concepts": [top_concept]}
            })
        
        if declining_concepts:
            declining_concepts.sort(key=lambda x: (x[1]-x[2])/x[1] if x[1] > 0 else 0, reverse=True)
            top_concept, initial, final = declining_concepts[0]
            insights.append({
                "type": "concept_decay",
                "title": f"Fading Concept: '{top_concept}' Losing Relevance",
                "description": f"'{top_concept}' adoption fell from {initial:.1%} to {final:.1%} - agents moved on. This may indicate debunking, loss of novelty, or crowding out by competing narratives.",
                "severity": "info",
                "key_finding": f"{((initial-final)/initial*100):.0f}% decline in adoption",
                "related_entities": {"agents": [], "concepts": [top_concept]}
            })
    
    # Analyze high drift agents with context
    if "agents" in data and "drift" in data["agents"]:
        high_drift = [(agent, drift) for agent, drift in data["agents"]["drift"].items() if drift > 0.6]
        if high_drift:
            high_drift.sort(key=lambda x: x[1], reverse=True)
            if len(high_drift) == 1:
                agent, drift_val = high_drift[0]
                insights.append({
                    "type": "agent_drift",
                    "title": f"{agent}: Major Behavior Shift Detected",
                    "description": f"{agent} showed dramatic conceptual repositioning (drift: {drift_val:.2f}). This could indicate persuasion by peers, strategic pivoting, or exposure to new information.",
                    "severity": "warning",
                    "key_finding": "Single agent underwent concept transformation",
                    "related_entities": {"agents": [agent], "concepts": []}
                })
            else:
                insights.append({
                    "type": "agent_drift",
                    "title": f"Widespread Opinion Evolution",
                    "description": f"{len(high_drift)} agents significantly changed their concept focus (drift >0.6). This suggests a dynamic simulation where beliefs aren't fixed and peer influence is active.",
                    "severity": "info",
                    "key_finding": f"{len(high_drift)} agents shifted positions",
                    "related_entities": {"agents": [a for a, _ in high_drift[:5]], "concepts": []}
                })
    
    # Key metrics summary
    key_metrics = {}
    if "agents" in data:
        influence_data = data["agents"].get("influence", {})
        if influence_data:
            top_agent = max(influence_data.items(), key=lambda x: x[1])
            key_metrics["top_influencer"] = {"agent_id": top_agent[0], "influence": top_agent[1]}
    
    if "network" in data:
        key_metrics["network_density"] = data["network"].get("density", 0)
        key_metrics["echo_chamber_level"] = data["network"].get("echo_chamber_index", 0)
    
    if "narratives" in data:
        key_metrics["narrative_chains"] = data["narratives"].get("total_chains", 0)
    
    # Deduplicate and limit insights
    seen_titles = set()
    unique_insights = []
    for insight in insights:
        if insight["title"] not in seen_titles:
            seen_titles.add(insight["title"])
            unique_insights.append(insight)
    
    return {"insights": unique_insights[:10], "key_metrics": key_metrics}

def run_metrics_bg(outputs_path: str, actual_rounds: int = None):
    """Generate metrics from simulation outputs.
    
    Args:
        outputs_path: Path to simulation output directory
        actual_rounds: Actual number of simulation rounds (if known). 
                      If None, will be calculated from action timestamps.
    """
    concepts = None
    graph_path = os.path.join(outputs_path, "graph.json")
    if os.path.exists(graph_path):
        try:
            with open(graph_path, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
                nodes = graph_data.get("nodes", [])
                concepts = [n["id"] for n in nodes if n.get("type") in ["concept", "theme"]]
        except:
             pass

    from core.metrics_report import MetricsReport
    report = MetricsReport(outputs_path)
    report.run(concepts=concepts, actual_rounds=actual_rounds)

@router.get("/{session_uuid}/status", response_model=schemas.MetricsStatusResponse)
def get_metrics_status(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    json_path = os.path.join(db_session.outputs_path, "metrics.json")
    if os.path.exists(json_path):
        try:
             with open(json_path, 'r', encoding='utf-8') as f:
                 data = json.load(f)
             return schemas.MetricsStatusResponse(
                 available=True, 
                 generated_at=data.get("generated_at"),
                 num_rounds=data.get("num_rounds")
             )
        except:
             return schemas.MetricsStatusResponse(available=True, generated_at=None, num_rounds=None)
    return schemas.MetricsStatusResponse(available=False, generated_at=None, num_rounds=None)

@router.get("/{session_uuid}/agents", response_model=schemas.AgentMetricsResponse)
def get_agent_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _get_metrics_data(db_session.outputs_path)
    return data.get("agents", {})

@router.get("/{session_uuid}/network", response_model=schemas.NetworkMetricsResponse)
def get_network_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _get_metrics_data(db_session.outputs_path)
    return data.get("network", {})

@router.get("/{session_uuid}/spread", response_model=schemas.SpreadMetricsResponse)
def get_spread_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _get_metrics_data(db_session.outputs_path)
    return data.get("spread", {})

@router.get("/{session_uuid}/engagement", response_model=schemas.EngagementMetricsResponse)
def get_engagement_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _get_metrics_data(db_session.outputs_path)
    return {"engagement": data.get("engagement", {})}

@router.get("/{session_uuid}/narratives", response_model=schemas.NarrativeMetricsResponse)
def get_narrative_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    data = _get_metrics_data(db_session.outputs_path)
    return data.get("narratives", {"top_transitions": [], "total_chains": 0})

@router.get("/{session_uuid}/temporal")
def get_temporal_metrics(
    session_uuid: str, 
    metric: str,
    agent_id: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get temporal data for a specific metric (e.g., influence, density)"""
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    import sqlite3
    db_path = os.path.join(db_session.outputs_path, "metrics.db")
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Temporal metrics not available")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    data_points = []
    if metric == "density":
        # Network density by round
        cur.execute("SELECT round, value FROM network_summary WHERE metric = ? AND round > 0 ORDER BY round", ("density",))
        rows = cur.fetchall()
        data_points = [{"round": r, "value": v} for r, v in rows]
    elif metric in ["influence", "dominance"]:
        # Agent metrics by round
        if agent_id:
            cur.execute("SELECT round, value FROM agent_scores WHERE agent = ? AND metric = ? AND round > 0 ORDER BY round", 
                       (agent_id, metric))
            rows = cur.fetchall()
            data_points = [{"round": r, "value": v} for r, v in rows]
        else:
            raise HTTPException(status_code=400, detail="agent_id required for agent metrics")
    
    conn.close()
    return {"metric_name": metric, "agent_id": agent_id, "data": data_points}

@router.get("/{session_uuid}/summary", response_model=schemas.MetricsSummaryResponse)
def get_metrics_summary(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get actionable insights summary"""
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    data = _get_metrics_data(db_session.outputs_path)
    return _build_metrics_summary(data)

@router.post("/{session_uuid}/generate")
def generate_metrics(session_uuid: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    # Pass actual configured rounds to metrics calculation
    background_tasks.add_task(run_metrics_bg, db_session.outputs_path, db_session.rounds)
    return {"message": "Metrics generation started"}

@router.get("/{session_uuid}", response_model=schemas.MetricsFullResponse)
def get_all_metrics(session_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Unified endpoint that returns all metrics data plus status in one response"""
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    json_path = os.path.join(db_session.outputs_path, "metrics.json")
    if not os.path.exists(json_path):
        return schemas.MetricsFullResponse(
            available=False,
            generated_at=None,
            num_rounds=None,
            agents=None,
            network=None,
            spread=None,
            engagement=None,
            narratives=None,
            summary=None
        )
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        summary_data = _build_metrics_summary(data)
        
        return schemas.MetricsFullResponse(
            available=True,
            generated_at=data.get("generated_at"),
            num_rounds=data.get("num_rounds"),
            agents=data.get("agents", {}),
            network=data.get("network", {}),
            spread=data.get("spread", {}),
            engagement={"engagement": data.get("engagement", {})},
            narratives=data.get("narratives", {"top_transitions": [], "total_chains": 0}),
            summary=summary_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load metrics: {str(e)}")


# --- Scenario Endpoints ---

@router.get("/scenario/{scenario_uuid}/status", response_model=schemas.MetricsStatusResponse)
def get_scenario_metrics_status(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    outputs_path = scenario.outputs_path
    if not outputs_path:
        raise HTTPException(status_code=404, detail="Scenario outputs not available")

    json_path = os.path.join(outputs_path, "metrics.json")
    if os.path.exists(json_path):
        try:
             with open(json_path, 'r', encoding='utf-8') as f:
                 data = json.load(f)
             return schemas.MetricsStatusResponse(
                 available=True, 
                 generated_at=data.get("generated_at"),
                 num_rounds=data.get("num_rounds")
             )
        except:
             return schemas.MetricsStatusResponse(available=True, generated_at=None, num_rounds=None)
    return schemas.MetricsStatusResponse(available=False, generated_at=None, num_rounds=None)

@router.get("/scenario/{scenario_uuid}/agents", response_model=schemas.AgentMetricsResponse)
def get_scenario_agent_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _get_metrics_data(scenario.outputs_path)
    return data.get("agents", {})

@router.get("/scenario/{scenario_uuid}/network", response_model=schemas.NetworkMetricsResponse)
def get_scenario_network_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _get_metrics_data(scenario.outputs_path)
    return data.get("network", {})

@router.get("/scenario/{scenario_uuid}/spread", response_model=schemas.SpreadMetricsResponse)
def get_scenario_spread_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _get_metrics_data(scenario.outputs_path)
    return data.get("spread", {})

@router.post("/scenario/{scenario_uuid}/generate")
def generate_scenario_metrics(scenario_uuid: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    # Pass actual configured rounds to metrics calculation
    background_tasks.add_task(run_metrics_bg, scenario.outputs_path, scenario.rounds)
    return {"message": "Metrics generation started"}

@router.get("/scenario/{scenario_uuid}", response_model=schemas.MetricsFullResponse)
def get_all_scenario_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Unified endpoint that returns all scenario metrics data plus status in one response"""
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    outputs_path = scenario.outputs_path
    if not outputs_path:
        raise HTTPException(status_code=404, detail="Scenario outputs not available")
    
    json_path = os.path.join(outputs_path, "metrics.json")
    if not os.path.exists(json_path):
        return schemas.MetricsFullResponse(
            available=False,
            generated_at=None,
            num_rounds=None,
            agents=None,
            network=None,
            spread=None,
            engagement=None,
            narratives=None,
            summary=None
        )
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        summary_data = _build_metrics_summary(data)
        
        return schemas.MetricsFullResponse(
            available=True,
            generated_at=data.get("generated_at"),
            num_rounds=data.get("num_rounds"),
            agents=data.get("agents", {}),
            network=data.get("network", {}),
            spread=data.get("spread", {}),
            engagement={"engagement": data.get("engagement", {})},
            narratives=data.get("narratives", {"top_transitions": [], "total_chains": 0}),
            summary=summary_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load metrics: {str(e)}")

@router.get("/scenario/{scenario_uuid}/engagement", response_model=schemas.EngagementMetricsResponse)
def get_scenario_engagement_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _get_metrics_data(scenario.outputs_path)
    return {"engagement": data.get("engagement", {})}

@router.get("/scenario/{scenario_uuid}/narratives", response_model=schemas.NarrativeMetricsResponse)
def get_scenario_narrative_metrics(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _get_metrics_data(scenario.outputs_path)
    return data.get("narratives", {"top_transitions": [], "total_chains": 0})

@router.get("/scenario/{scenario_uuid}/temporal")
def get_scenario_temporal_metrics(
    scenario_uuid: str, 
    metric: str,
    agent_id: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get temporal data for a specific metric in a scenario"""
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    import sqlite3
    db_path = os.path.join(scenario.outputs_path, "metrics.db")
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Temporal metrics not available")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    data_points = []
    if metric == "density":
        cur.execute("SELECT round, value FROM network_summary WHERE metric = ? AND round > 0 ORDER BY round", ("density",))
        rows = cur.fetchall()
        data_points = [{"round": r, "value": v} for r, v in rows]
    elif metric in ["influence", "dominance"]:
        if agent_id:
            cur.execute("SELECT round, value FROM agent_scores WHERE agent = ? AND metric = ? AND round > 0 ORDER BY round", 
                       (agent_id, metric))
            rows = cur.fetchall()
            data_points = [{"round": r, "value": v} for r, v in rows]
        else:
            raise HTTPException(status_code=400, detail="agent_id required for agent metrics")
    
    conn.close()
    return {"metric_name": metric, "agent_id": agent_id, "data": data_points}

@router.get("/scenario/{scenario_uuid}/summary", response_model=schemas.MetricsSummaryResponse)
def get_scenario_metrics_summary(scenario_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get actionable insights summary for scenario"""
    scenario = crud.get_scenario_by_uuid(db, scenario_uuid)
    if not scenario or not scenario.outputs_path:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    data = _get_metrics_data(scenario.outputs_path)
    return _build_metrics_summary(data)
