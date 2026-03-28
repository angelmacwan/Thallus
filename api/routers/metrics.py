import os
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user


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

def run_metrics_bg(outputs_path: str):
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
    report.run(concepts=concepts)

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
    insights = []
    
    # Analyze influence growth
    if "agents" in data and "influence_details" in data["agents"]:
        for agent_id, details in data["agents"]["influence_details"].items():
            growth_rate = details.get("growth_rate", 0)
            if growth_rate > 100:
                insights.append({
                    "type": "agent_growth",
                    "title": f"Agent {agent_id} High Growth",
                    "description": f"Influence grew {growth_rate:.1f}% during simulation",
                    "severity": "info",
                    "related_entities": {"agent_id": agent_id, "growth_rate": growth_rate}
                })
    
    # Analyze echo chambers
    if "network" in data:
        echo_index = data["network"].get("echo_chamber_index", 0)
        homophily = data["network"].get("homophily_score", 0)
        if echo_index > 0.7:
            insights.append({
                "type": "echo_chamber",
                "title": "Strong Echo Chambers Detected",
                "description": f"Homophily score: {homophily:.2f} - Agents clustering by beliefs",
                "severity": "warning",
                "related_entities": {"echo_chamber_index": echo_index, "homophily": homophily}
            })
        elif echo_index > 0.4:
            insights.append({
                "type": "echo_chamber",
                "title": "Moderate Echo Chambers",
                "description": f"Some belief clustering observed (homophily: {homophily:.2f})",
                "severity": "info",
                "related_entities": {"echo_chamber_index": echo_index, "homophily": homophily}
            })
    
    # Analyze concept momentum
    if "spread" in data and "adoption_curves" in data["spread"]:
        for concept, curve in data["spread"]["adoption_curves"].items():
            if len(curve) >= 2:
                first_adoption = curve[0]["adoption"]
                last_adoption = curve[-1]["adoption"]
                if last_adoption > first_adoption * 2:
                    insights.append({
                        "type": "concept_momentum",
                        "title": f"Concept '{concept}' Gaining Momentum",
                        "description": f"Adoption increased from {first_adoption:.1%} to {last_adoption:.1%}",
                        "severity": "info",
                        "related_entities": {"concept": concept, "growth": last_adoption / first_adoption if first_adoption > 0 else 0}
                    })
                elif last_adoption < first_adoption * 0.5 and first_adoption > 0.1:
                    insights.append({
                        "type": "concept_decay",
                        "title": f"Concept '{concept}' Losing Traction",
                        "description": f"Adoption decreased from {first_adoption:.1%} to {last_adoption:.1%}",
                        "severity": "info",
                        "related_entities": {"concept": concept}
                    })
    
    # Analyze high drift agents
    if "agents" in data and "drift" in data["agents"]:
        for agent_id, drift_val in data["agents"]["drift"].items():
            if drift_val > 0.5:
                insights.append({
                    "type": "agent_drift",
                    "title": f"Agent {agent_id} Behavior Shift",
                    "description": f"Significant behavior change detected (drift: {drift_val:.2f})",
                    "severity": "info",
                    "related_entities": {"agent_id": agent_id, "drift": drift_val}
                })
    
    # Key metrics summary
    key_metrics = {}
    if "agents" in data:
        # Top influencer
        influence_data = data["agents"].get("influence", {})
        if influence_data:
            top_agent = max(influence_data.items(), key=lambda x: x[1])
            key_metrics["top_influencer"] = {"agent_id": top_agent[0], "influence": top_agent[1]}
    
    if "network" in data:
        key_metrics["network_density"] = data["network"].get("density", 0)
        key_metrics["echo_chamber_level"] = data["network"].get("echo_chamber_index", 0)
    
    if "narratives" in data:
        key_metrics["narrative_chains"] = data["narratives"].get("total_chains", 0)
    
    return {"insights": insights[:10], "key_metrics": key_metrics}  # Limit to top 10 insights

@router.post("/{session_uuid}/generate")
def generate_metrics(session_uuid: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = crud.get_session(db, session_uuid)
    if not db_session or db_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    background_tasks.add_task(run_metrics_bg, db_session.outputs_path)
    return {"message": "Metrics generation started"}


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
    background_tasks.add_task(run_metrics_bg, scenario.outputs_path)
    return {"message": "Metrics generation started"}

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
    insights = []
    
    # Reuse same insight logic as session summary
    if "agents" in data and "influence_details" in data["agents"]:
        for agent_id, details in data["agents"]["influence_details"].items():
            growth_rate = details.get("growth_rate", 0)
            if growth_rate > 100:
                insights.append({
                    "type": "agent_growth",
                    "title": f"Agent {agent_id} High Growth",
                    "description": f"Influence grew {growth_rate:.1f}% during simulation",
                    "severity": "info",
                    "related_entities": {"agent_id": agent_id, "growth_rate": growth_rate}
                })
    
    if "network" in data:
        echo_index = data["network"].get("echo_chamber_index", 0)
        homophily = data["network"].get("homophily_score", 0)
        if echo_index > 0.7:
            insights.append({
                "type": "echo_chamber",
                "title": "Strong Echo Chambers Detected",
                "description": f"Homophily score: {homophily:.2f} - Agents clustering by beliefs",
                "severity": "warning",
                "related_entities": {"echo_chamber_index": echo_index, "homophily": homophily}
            })
        elif echo_index > 0.4:
            insights.append({
                "type": "echo_chamber",
                "title": "Moderate Echo Chambers",
                "description": f"Some belief clustering observed (homophily: {homophily:.2f})",
                "severity": "info",
                "related_entities": {"echo_chamber_index": echo_index, "homophily": homophily}
            })
    
    if "spread" in data and "adoption_curves" in data["spread"]:
        for concept, curve in data["spread"]["adoption_curves"].items():
            if len(curve) >= 2:
                first_adoption = curve[0]["adoption"]
                last_adoption = curve[-1]["adoption"]
                if last_adoption > first_adoption * 2:
                    insights.append({
                        "type": "concept_momentum",
                        "title": f"Concept '{concept}' Gaining Momentum",
                        "description": f"Adoption increased from {first_adoption:.1%} to {last_adoption:.1%}",
                        "severity": "info",
                        "related_entities": {"concept": concept, "growth": last_adoption / first_adoption if first_adoption > 0 else 0}
                    })
    
    if "agents" in data and "drift" in data["agents"]:
        for agent_id, drift_val in data["agents"]["drift"].items():
            if drift_val > 0.5:
                insights.append({
                    "type": "agent_drift",
                    "title": f"Agent {agent_id} Behavior Shift",
                    "description": f"Significant behavior change detected (drift: {drift_val:.2f})",
                    "severity": "info",
                    "related_entities": {"agent_id": agent_id, "drift": drift_val}
                })
    
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
    
    return {"insights": insights[:10], "key_metrics": key_metrics}
