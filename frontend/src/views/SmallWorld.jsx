import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
	Users,
	Globe,
	GitBranch,
	Plus,
	BarChart2,
	ArrowLeft,
	Activity,
	Rss,
	MessageSquare,
	FileText,
	Send,
	RotateCcw,
	Loader2,
} from 'lucide-react';
import api from '../api';
import { useSidebar } from '../SidebarContext';
import { useNotifications } from '../hooks/useNotifications';

import AgentCard from '../components/sw/AgentCard';
import CreateAgentModal from '../components/sw/CreateAgentModal';
import AIAgentGeneratorModal from '../components/sw/AIAgentGeneratorModal';
import BulkImportModal from '../components/sw/BulkImportModal';
import AgentRelationshipGraph from '../components/sw/AgentRelationshipGraph';
import WorldCard from '../components/sw/WorldCard';
import CreateWorldModal from '../components/sw/CreateWorldModal';
import WorldHealthCheck from '../components/sw/WorldHealthCheck';
import ScenarioBranchGraph from '../components/sw/ScenarioBranchGraph';
import RunScenarioModal from '../components/sw/RunScenarioModal';
import SmallWorldReport from '../components/sw/SmallWorldReport';
import SWFeedPanel from '../components/sw/SWFeedPanel';
import ResimulateScenarioModal from '../components/sw/ResimulateScenarioModal';
import { swAgents } from '../api';

const EVENT_COLOR = {
	stage: '#818cf8',
	agent: '#34d399',
	action: '#f59e0b',
	round: '#60a5fa',
	error: '#f87171',
	done: '#4ade80',
	info: undefined,
	warning: '#fbbf24',
};

export default function SmallWorld() {
	const { setSwNav } = useSidebar();
	const { ensurePermission, notify } = useNotifications();

	// ── World list state ──────────────────────────────────────
	const [worlds, setWorlds] = useState([]);
	const [worldsLoading, setWorldsLoading] = useState(true);
	const [selectedWorld, setSelectedWorld] = useState(null);
	const [createWorldOpen, setCreateWorldOpen] = useState(false);

	// ── World detail tab ──────────────────────────────────────
	const [worldDetailTab, setWorldDetailTab] = useState('scenarios'); // 'agents' | 'scenarios'

	// ── Agent state (per-world) ───────────────────────────────
	const [agents, setAgents] = useState([]);
	const [agentsLoading, setAgentsLoading] = useState(false);
	const [relationships, setRelationships] = useState([]);
	const [relLoading, setRelLoading] = useState(false);

	const [createAgentOpen, setCreateAgentOpen] = useState(false);
	const [editAgent, setEditAgent] = useState(null);
	const [aiGenOpen, setAIGenOpen] = useState(false);
	const [bulkOpen, setBulkOpen] = useState(false);
	const [aiGeneratedProfile, setAIGeneratedProfile] = useState(null);
	const [suggestMsg, setSuggestMsg] = useState(null);

	// ── Scenario state ────────────────────────────────────────
	const [scenarios, setScenarios] = useState([]);
	const [scenariosLoading, setScenariosLoading] = useState(false);
	const [runModalOpen, setRunModalOpen] = useState(false);
	const [runParent, setRunParent] = useState(null);
	const [selectedScenario, setSelectedScenario] = useState(null);
	// liveStatuses: Map<scenario_id, status> — real-time overrides for graph nodes
	const [liveStatuses, setLiveStatuses] = useState(new Map());
	const liveStatusPollRef = useRef(null);

	// ── Scenario panel (left side) state ─────────────────────
	const [swPanelTab, setSwPanelTab] = useState('report');
	const [showResimulateModal, setShowResimulateModal] = useState(false);
	const [scenarioEvents, setScenarioEvents] = useState([]);
	const [scenarioEventsLoading, setScenarioEventsLoading] = useState(false);
	const [scenarioReport, setScenarioReport] = useState(null);
	const [scenarioReportLoading, setScenarioReportLoading] = useState(false);
	const [scenarioChatMessages, setScenarioChatMessages] = useState([]);
	const [scenarioChatInput, setScenarioChatInput] = useState('');
	const [scenarioChatLoading, setScenarioChatLoading] = useState(false);
	const [scenarioLiveStatus, setScenarioLiveStatus] = useState(null);
	const [scenarioPollRef, setScenarioPollRef] = useState(null);
	const prevScenarioLiveStatusRef = useRef(null);

	// ── Load worlds ───────────────────────────────────────────
	const loadWorlds = useCallback(() => {
		setWorldsLoading(true);
		api.get('/small-world/worlds/')
			.then((r) => setWorlds(r.data))
			.catch(() => {})
			.finally(() => setWorldsLoading(false));
	}, []);

	useEffect(() => {
		loadWorlds();
	}, [loadWorlds]);

	// ── Load agents (world-scoped) ────────────────────────────
	const loadAgents = useCallback((worldId) => {
		setAgentsLoading(true);
		api.get(`/small-world/worlds/${worldId}/agents/`)
			.then((r) => setAgents(r.data))
			.catch(() => {})
			.finally(() => setAgentsLoading(false));
	}, []);

	const loadAgentGraph = useCallback((worldId) => {
		setAgentsLoading(true);
		setRelLoading(true);
		swAgents
			.graph(worldId)
			.then((response) => {
				setAgents(response.data?.agents || []);
				setRelationships(response.data?.relationships || []);
			})
			.catch(() => {
				setRelationships([]);
			})
			.finally(() => {
				setAgentsLoading(false);
				setRelLoading(false);
			});
	}, []);

	// ── Load scenarios ────────────────────────────────────────
	const loadScenarios = useCallback((worldId) => {
		if (!worldId) return;
		setScenariosLoading(true);
		api.get(`/small-world/worlds/${worldId}/scenarios/`)
			.then((r) => setScenarios(r.data))
			.catch(() => {})
			.finally(() => setScenariosLoading(false));
	}, []);

	// ── Flatten nested scenario tree to array ─────────────────
	const flattenScenarios = useCallback((tree) => {
		const result = [];
		const visit = (s) => {
			result.push(s);
			(s.children || []).forEach(visit);
		};
		tree.forEach(visit);
		return result;
	}, []);

	// ── Collect all descendants of a scenario ─────────────────
	const collectDescendantIds = useCallback((scenarioId, flat) => {
		const byId = new Map(flat.map((s) => [s.scenario_id, s]));
		const childrenMap = {};
		for (const s of flat) {
			if (s.parent_scenario_id)
				(childrenMap[s.parent_scenario_id] ||= []).push(s.scenario_id);
		}
		const result = [];
		const queue = [scenarioId];
		while (queue.length) {
			const id = queue.shift();
			for (const childId of childrenMap[id] || []) {
				result.push(childId);
				queue.push(childId);
			}
		}
		return result;
	}, []);

	// ── World-level status polling (drives graph node status) ─
	const startLiveStatusPoll = useCallback((worldId) => {
		if (liveStatusPollRef.current) clearInterval(liveStatusPollRef.current);
		const poll = async () => {
			try {
				const r = await api.get(
					`/small-world/worlds/${worldId}/scenarios/`,
				);
				const flat = [];
				const visit = (s) => {
					flat.push(s);
					(s.children || []).forEach(visit);
				};
				r.data.forEach(visit);

				setLiveStatuses((prev) => {
					const next = new Map(prev);
					let anyRunning = false;
					for (const s of flat) {
						next.set(s.scenario_id, s.status);
						if (s.status === 'running') anyRunning = true;
					}
					// Stop polling once nothing is running
					if (!anyRunning) {
						clearInterval(liveStatusPollRef.current);
						liveStatusPollRef.current = null;
					}
					return next;
				});
				// Also refresh the scenarios tree so counts/structure stays fresh
				setScenarios(r.data);
			} catch {}
		};
		poll(); // immediate first hit
		liveStatusPollRef.current = setInterval(poll, 2500);
	}, []);

	// ── Scenario detail data ──────────────────────────────────
	const fetchScenarioEvents = useCallback(async (worldId, scenarioId) => {
		if (!worldId || !scenarioId) return;
		try {
			const r = await api.get(
				`/small-world/worlds/${worldId}/scenarios/${scenarioId}/events`,
			);
			setScenarioEvents(r.data);
			if (r.data.length > 0) {
				const last = r.data[r.data.length - 1];
				if (last.type === 'done' || last.type === 'error') {
					setScenarioLiveStatus(
						last.type === 'done' ? 'completed' : 'failed',
					);
					// Stop polling — scenario has reached a terminal state
					setScenarioPollRef((prev) => {
						clearInterval(prev);
						return null;
					});
				}
			}
		} catch {}
	}, []);

	useEffect(() => {
		if (!selectedScenario || !selectedWorld) {
			setScenarioEvents([]);
			setScenarioReport(null);
			setScenarioChatMessages([]);
			setScenarioLiveStatus(null);
			if (scenarioPollRef) clearInterval(scenarioPollRef);
			return;
		}
		const wId = selectedWorld.world_id;
		const sId = selectedScenario.scenario_id;
		setScenarioEvents([]);
		setScenarioReport(null);
		setScenarioChatMessages([]);
		setScenarioLiveStatus(selectedScenario.status);
		setSwPanelTab('report');
		setScenarioEventsLoading(true);
		fetchScenarioEvents(wId, sId).finally(() =>
			setScenarioEventsLoading(false),
		);
		// Only poll if the scenario is still in a non-terminal state
		if (scenarioPollRef) clearInterval(scenarioPollRef);
		const terminalStatuses = ['completed', 'failed', 'error'];
		if (!terminalStatuses.includes(selectedScenario.status)) {
			const pid = setInterval(() => fetchScenarioEvents(wId, sId), 2500);
			setScenarioPollRef(pid);
			return () => clearInterval(pid);
		}
	}, [selectedScenario?.scenario_id]);

	useEffect(() => {
		if (!selectedScenario || !selectedWorld) return;
		if (
			!scenarioLiveStatus ||
			scenarioLiveStatus === 'running' ||
			scenarioLiveStatus === 'waiting'
		)
			return;
		setScenarioReportLoading(true);

		api.get(
			`/small-world/worlds/${selectedWorld.world_id}/scenarios/${selectedScenario.scenario_id}/report`,
		)
			.then((r) => {
				setScenarioReport(r.data?.available === false ? null : r.data);
			})
			.catch((err) => {
				console.error('[SW Report] Error fetching report:', err);
			})
			.finally(() => setScenarioReportLoading(false));
	}, [selectedScenario?.scenario_id, scenarioLiveStatus]);

	useEffect(() => {
		if (swPanelTab !== 'chat' || !selectedScenario || !selectedWorld)
			return;
		api.get(
			`/small-world/worlds/${selectedWorld.world_id}/scenarios/${selectedScenario.scenario_id}/chat`,
		)
			.then((r) => setScenarioChatMessages(r.data))
			.catch(() => {});
	}, [swPanelTab, selectedScenario?.scenario_id]);

	// Notify when scenario transitions from running → completed / failed
	useEffect(() => {
		if (
			scenarioLiveStatus === 'completed' &&
			prevScenarioLiveStatusRef.current === 'running'
		) {
			notify(
				'Scenario Complete',
				`"${selectedScenario?.name || 'Your scenario'}" has finished running.`,
			);
		}
		prevScenarioLiveStatusRef.current = scenarioLiveStatus;
	}, [scenarioLiveStatus]);

	const handleResimulateSuccess = () => {
		ensurePermission();
		setShowResimulateModal(false);
		setScenarioReport(null);
		setScenarioEvents([]);
		setScenarioLiveStatus('running');
		setSwPanelTab('stream');

		// Immediately reflect statuses in the graph without waiting for poll
		const flat = flattenScenarios(scenarios);
		const descendantIds = collectDescendantIds(
			selectedScenario.scenario_id,
			flat,
		);
		setLiveStatuses((prev) => {
			const next = new Map(prev);
			next.set(selectedScenario.scenario_id, 'running');
			for (const id of descendantIds) next.set(id, 'waiting');
			return next;
		});

		// Start world-level polling to keep graph statuses live
		startLiveStatusPoll(selectedWorld.world_id);

		// Restart selected-scenario event poll
		if (scenarioPollRef) clearInterval(scenarioPollRef);
		const wId = selectedWorld.world_id;
		const sId = selectedScenario.scenario_id;
		fetchScenarioEvents(wId, sId);
		const pid = setInterval(() => fetchScenarioEvents(wId, sId), 2500);
		setScenarioPollRef(pid);
	};

	const sendScenarioChat = async () => {
		const text = scenarioChatInput.trim();
		if (!text || scenarioChatLoading || !selectedScenario || !selectedWorld)
			return;
		setScenarioChatInput('');
		setScenarioChatLoading(true);
		setScenarioChatMessages((prev) => [
			...prev,
			{ is_user: true, text, timestamp: new Date().toISOString() },
		]);
		try {
			const res = await api.post(
				`/small-world/worlds/${selectedWorld.world_id}/scenarios/${selectedScenario.scenario_id}/chat`,
				{ text },
			);
			setScenarioChatMessages((prev) => [...prev, res.data]);
		} catch {}
		setScenarioChatLoading(false);
	};

	// ── Register sw nav in sidebar ────────────────────────────
	useEffect(() => {
		if (selectedWorld && worldDetailTab === 'scenarios') {
			setSwNav({
				worldName: selectedWorld.name,
				scenarioName: selectedScenario?.name || null,
				scenarioStatus:
					scenarioLiveStatus || selectedScenario?.status || null,
				onResimulate: selectedScenario
					? () => setShowResimulateModal(true)
					: null,
				activePanel: swPanelTab,
				setActivePanel: setSwPanelTab,
				onBack: () => setSelectedWorld(null),
			});
		} else {
			setSwNav(null);
		}
		return () => setSwNav(null);
	}, [
		selectedWorld?.world_id,
		worldDetailTab,
		swPanelTab,
		selectedScenario?.scenario_id,
		scenarioLiveStatus,
	]);

	// ── When selected world changes, reload data ──────────────
	useEffect(() => {
		if (selectedWorld) {
			setWorldDetailTab('scenarios');
			setSuggestMsg(null);
			setAgents([]);
			setRelationships([]);
			setLiveStatuses(new Map());
			loadAgents(selectedWorld.world_id);
			loadScenarios(selectedWorld.world_id);
		} else {
			setAgents([]);
			setRelationships([]);
			setScenarios([]);
			setLiveStatuses(new Map());
			if (liveStatusPollRef.current) {
				clearInterval(liveStatusPollRef.current);
				liveStatusPollRef.current = null;
			}
		}
	}, [selectedWorld?.world_id]);

	useEffect(() => {
		if (worldDetailTab === 'relations' && selectedWorld) {
			loadAgentGraph(selectedWorld.world_id);
		} else if (worldDetailTab === 'agents' && selectedWorld) {
			loadAgents(selectedWorld.world_id);
		}
	}, [worldDetailTab, selectedWorld?.world_id]);

	// ── Agent actions ─────────────────────────────────────────
	const saveAgent = async (payload) => {
		const worldId = selectedWorld.world_id;
		if (editAgent) {
			await api.put(
				`/small-world/worlds/${worldId}/agents/${editAgent.agent_id}`,
				payload,
			);
		} else {
			await api.post(`/small-world/worlds/${worldId}/agents/`, payload);
		}
		if (worldDetailTab === 'relations') {
			loadAgentGraph(worldId);
		} else {
			loadAgents(worldId);
		}
	};

	const deleteAgent = async (id) => {
		if (!window.confirm('Delete this agent? This cannot be undone.'))
			return;
		const worldId = selectedWorld.world_id;
		await api.delete(`/small-world/worlds/${worldId}/agents/${id}`);
		if (worldDetailTab === 'relations') {
			loadAgentGraph(worldId);
		} else {
			loadAgents(worldId);
		}
	};

	const handleAIGenerated = (profile) => {
		setAIGenOpen(false);
		setAIGeneratedProfile(profile);
		setEditAgent(null);
		setCreateAgentOpen(true);
	};

	const handleBulkImported = () => {
		setBulkOpen(false);
		const worldId = selectedWorld.world_id;
		if (worldDetailTab === 'relations') {
			loadAgentGraph(worldId);
		} else {
			loadAgents(worldId);
		}
	};

	const createRelationship = async (data) => {
		const worldId = selectedWorld.world_id;
		await api.post(
			`/small-world/worlds/${worldId}/agents/${data.source_agent_id}/relationships`,
			data,
		);
		loadAgentGraph(worldId);
	};

	const deleteRelationship = async (agentId, relId) => {
		const worldId = selectedWorld.world_id;
		await api.delete(
			`/small-world/worlds/${worldId}/agents/${agentId}/relationships/${relId}`,
		);
		loadAgentGraph(worldId);
	};

	const updateRelationship = async (agentId, relId, data) => {
		const worldId = selectedWorld.world_id;
		await api.patch(
			`/small-world/worlds/${worldId}/agents/${agentId}/relationships/${relId}`,
			data,
		);
		loadAgentGraph(worldId);
	};

	const autoSuggestRelationships = async () => {
		const worldId = selectedWorld.world_id;
		setRelLoading(true);
		setSuggestMsg(null);
		const ids = agents.map((a) => a.agent_id);
		try {
			const res = await api.post(
				`/small-world/worlds/${worldId}/agents/auto-suggest-relationships`,
				{ agent_ids: ids },
			);
			const count = res.data?.length ?? 0;
			setSuggestMsg(
				count > 0
					? `Added ${count} new relationship${count !== 1 ? 's' : ''}.`
					: 'No new relationships found.',
			);
		} catch (err) {
			const detail =
				err?.response?.data?.detail ?? 'Auto-suggest failed.';
			setSuggestMsg(`Error: ${detail}`);
		} finally {
			loadAgentGraph(worldId);
		}
	};

	// ── World actions ─────────────────────────────────────────
	const deleteWorld = async (id) => {
		await api.delete(`/small-world/worlds/${id}`);
		if (selectedWorld?.world_id === id) setSelectedWorld(null);
		loadWorlds();
	};

	const handleScenarioCreated = (s) => {
		ensurePermission();
		// Optimistically add scenario as running in the graph
		setLiveStatuses((prev) => new Map(prev).set(s.scenario_id, 'running'));
		setScenarios((prev) => [...prev, s]);
		setSelectedScenario(s);
		// Start world-level status polling so the graph stays live
		if (selectedWorld) startLiveStatusPoll(selectedWorld.world_id);
	};

	// ── Styles ────────────────────────────────────────────────
	const actionBtn = (label, Icon, onClick, variant = 'secondary') => (
		<button
			onClick={onClick}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.35rem',
				padding: '0.45rem 0.9rem',
				background:
					variant === 'primary'
						? 'var(--accent-color)'
						: 'var(--surface-container-high)',
				color: variant === 'primary' ? '#fff' : 'var(--text-primary)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '8px',
				fontSize: '0.82rem',
				fontWeight: 600,
				cursor: 'pointer',
			}}
		>
			<Icon size={13} />
			{label}
		</button>
	);

	return (
		<>
			<div
				className="fade-in"
				style={
					selectedWorld
						? {
								display: 'flex',
								flexDirection: 'column',
								height: '100%',
								overflow: 'hidden',
							}
						: {}
				}
			>
				<div
					style={
						selectedWorld
							? {
									display: 'flex',
									flexDirection: 'column',
									flex: 1,
									minHeight: 0,
								}
							: {
									maxWidth: '1100px',
									margin: '0 auto',
									padding: '2rem 1.5rem',
								}
					}
				>
					{/* ── WORLD LIST (no world selected) ── */}
					{!selectedWorld ? (
						<>
							{/* Header */}
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									marginBottom: '2rem',
								}}
							>
								<div>
									<h1
										style={{
											margin: 0,
											fontSize: '1.6rem',
											fontWeight: 700,
											letterSpacing: '-0.02em',
											color: 'var(--on-surface)',
										}}
									>
										Small World
									</h1>
									<p
										style={{
											margin: '0.25rem 0 0',
											fontSize: '0.82rem',
											color: 'var(--text-secondary)',
										}}
									>
										{worlds.length > 0
											? `${worlds.length} world${worlds.length !== 1 ? 's' : ''}`
											: 'No worlds yet'}
									</p>
								</div>
								<button
									className="btn"
									onClick={() => setCreateWorldOpen(true)}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.45rem',
									}}
								>
									<Plus size={15} /> Create World
								</button>
							</div>

							{/* World grid */}
							{worldsLoading ? (
								<div
									style={{
										display: 'flex',
										justifyContent: 'center',
										padding: '4rem 0',
										color: 'var(--text-secondary)',
									}}
								>
									<Globe
										size={22}
										style={{ opacity: 0.4 }}
									/>
								</div>
							) : worlds.length === 0 ? (
								<div
									style={{
										padding: '3.5rem',
										textAlign: 'center',
										border: '1.5px dashed var(--outline-variant)',
										borderRadius: '14px',
										color: 'var(--text-secondary)',
										marginBottom: '3rem',
									}}
								>
									<Globe
										size={28}
										style={{
											marginBottom: '0.75rem',
											opacity: 0.4,
										}}
									/>
									<p
										style={{
											margin: 0,
											fontWeight: 600,
											fontSize: '0.9rem',
										}}
									>
										No worlds yet
									</p>
									<p
										style={{
											margin: '0.35rem 0 1rem',
											fontSize: '0.8rem',
										}}
									>
										Create a world to start building your
										agent network.
									</p>
									<button
										className="btn"
										onClick={() => setCreateWorldOpen(true)}
										style={{ gap: '0.4rem' }}
									>
										<Plus size={14} /> Create World
									</button>
								</div>
							) : (
								<div
									style={{
										display: 'grid',
										gridTemplateColumns:
											'repeat(auto-fill, minmax(280px, 1fr))',
										gap: '0.85rem',
										marginBottom: '3.5rem',
									}}
								>
									{worlds.map((w) => (
										<div
											key={w.world_id}
											onClick={() => setSelectedWorld(w)}
											style={{ cursor: 'pointer' }}
										>
											<WorldCard
												world={w}
												onClick={() =>
													setSelectedWorld(w)
												}
												onDelete={deleteWorld}
											/>
										</div>
									))}
								</div>
							)}

							{/* ── About Small World ── */}
							<div
								style={{
									borderTop:
										'1px solid var(--outline-variant)',
									paddingTop: '2.5rem',
									marginTop: worlds.length > 0 ? '1rem' : '0',
								}}
							>
								<p
									style={{
										fontSize: '0.68rem',
										fontWeight: 700,
										letterSpacing: '0.1em',
										textTransform: 'uppercase',
										color: 'var(--outline)',
										marginBottom: '1.25rem',
									}}
								>
									About Small World
								</p>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns:
											'repeat(auto-fill, minmax(220px, 1fr))',
										gap: '1rem',
									}}
								>
									{[
										{
											icon: Users,
											title: 'Build Agent Personas',
											body: 'Design agents with rich personality traits, beliefs, goals, and demographic profiles.',
										},
										{
											icon: Globe,
											title: 'Define Relationships',
											body: 'Connect agents with typed social links—allies, rivals, mentors—with configurable strengths.',
										},
										{
											icon: GitBranch,
											title: 'Run Scenarios',
											body: 'Simulate events and observe how each agent reacts, adapts, and influences the network.',
										},
										{
											icon: BarChart2,
											title: 'Compare Outcomes',
											body: 'Diff scenarios side-by-side to surface how different events reshaped beliefs and alliances.',
										},
									].map((item) => {
										const Icon = item.icon;
										return (
											<div
												key={item.title}
												style={{
													display: 'flex',
													gap: '0.85rem',
													alignItems: 'flex-start',
													padding: '1rem',
													background:
														'var(--surface-container-low)',
													borderRadius: '12px',
												}}
											>
												<div
													style={{
														width: 32,
														height: 32,
														borderRadius: '8px',
														background:
															'var(--surface-container-high)',
														display: 'flex',
														alignItems: 'center',
														justifyContent:
															'center',
														flexShrink: 0,
													}}
												>
													<Icon
														size={15}
														color="var(--accent-color)"
													/>
												</div>
												<div>
													<p
														style={{
															margin: 0,
															fontWeight: 600,
															fontSize: '0.82rem',
														}}
													>
														{item.title}
													</p>
													<p
														style={{
															margin: '0.25rem 0 0',
															fontSize: '0.75rem',
															color: 'var(--text-secondary)',
															lineHeight: 1.5,
														}}
													>
														{item.body}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</>
					) : (
						/* ── WORLD DETAIL ── */
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flex: 1,
								minHeight: 0,
								overflow: 'hidden',
							}}
						>
							{/* World detail header */}
							<div
								style={{
									flexShrink: 0,
									paddingBottom: '1.25rem',
								}}
							>
								{/* Tabs */}
								<div
									style={{
										display: 'flex',
										gap: '0',
										borderBottom:
											'1px solid var(--outline-variant)',
									}}
								>
									{[
										{
											key: 'scenarios',
											label: 'Scenarios',
											icon: GitBranch,
										},
										{
											key: 'agents',
											label: 'Agents',
											icon: Users,
										},
										{
											key: 'relations',
											label: 'Agent Relations',
											icon: Globe,
										},
									].map((item) => {
										const TabIcon = item.icon;
										return (
											<button
												key={item.key}
												onClick={() =>
													setWorldDetailTab(item.key)
												}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '0.4rem',
													padding: '0.6rem 1.1rem',
													background: 'none',
													border: 'none',
													borderBottom:
														worldDetailTab ===
														item.key
															? '2px solid var(--accent-color)'
															: '2px solid transparent',
													marginBottom: '-1px',
													fontSize: '0.84rem',
													fontWeight:
														worldDetailTab ===
														item.key
															? 700
															: 500,
													cursor: 'pointer',
													color:
														worldDetailTab ===
														item.key
															? 'var(--accent-color)'
															: 'var(--text-secondary)',
													transition: 'color 0.15s',
												}}
											>
												<TabIcon size={14} />
												{item.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* ── AGENTS TAB ── */}
							{worldDetailTab === 'agents' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										flex: 1,
										minHeight: 0,
										overflow: 'hidden',
									}}
								>
									{/* Toolbar */}
									<div
										style={{
											display: 'flex',
											gap: '0.5rem',
											marginBottom: '1.25rem',
											flexWrap: 'wrap',
											alignItems: 'center',
										}}
									>
										<div
											style={{
												display: 'flex',
												gap: '0.5rem',
												flex: 1,
												flexWrap: 'wrap',
											}}
										>
											{actionBtn(
												'New Agent',
												Plus,
												() => {
													setEditAgent(null);
													setAIGeneratedProfile(null);
													setCreateAgentOpen(true);
												},
												'primary',
											)}
											{actionBtn(
												'AI Generate',
												Users,
												() => setAIGenOpen(true),
											)}
											{actionBtn(
												'Bulk Import',
												Plus,
												() => setBulkOpen(true),
											)}
										</div>
									</div>

									{/* Agent content */}
									<div
										style={{
											flex: 1,
											minHeight: 0,
											overflowY: 'auto',
										}}
									>
										{agentsLoading ? (
											<div
												style={{
													display: 'flex',
													justifyContent: 'center',
													padding: '4rem 0',
													color: 'var(--text-secondary)',
												}}
											>
												<Users
													size={22}
													style={{ opacity: 0.4 }}
												/>
											</div>
										) : agents.length === 0 ? (
											<div
												style={{
													padding: '2.5rem',
													textAlign: 'center',
													border: '1.5px dashed var(--outline-variant)',
													borderRadius: '14px',
													color: 'var(--text-secondary)',
												}}
											>
												<Users
													size={24}
													style={{
														marginBottom: '0.5rem',
														opacity: 0.4,
													}}
												/>
												<p
													style={{
														margin: 0,
														fontWeight: 600,
														fontSize: '0.88rem',
													}}
												>
													No agents yet
												</p>
												<p
													style={{
														margin: '0.3rem 0 0.85rem',
														fontSize: '0.78rem',
													}}
												>
													Create an agent to get
													started.
												</p>
												{actionBtn(
													'New Agent',
													Plus,
													() => {
														setEditAgent(null);
														setAIGeneratedProfile(
															null,
														);
														setCreateAgentOpen(
															true,
														);
													},
													'primary',
												)}
											</div>
										) : (
											<div
												style={{
													display: 'grid',
													gridTemplateColumns:
														'repeat(auto-fill, minmax(270px, 1fr))',
													gap: '0.85rem',
												}}
											>
												{agents.map((a) => (
													<AgentCard
														key={a.agent_id}
														agent={a}
														onEdit={() => {
															setEditAgent(a);
															setAIGeneratedProfile(
																null,
															);
															setCreateAgentOpen(
																true,
															);
														}}
														onDelete={() =>
															deleteAgent(
																a.agent_id,
															)
														}
													/>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{/* ── AGENT RELATIONS TAB ── */}
							{worldDetailTab === 'relations' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										flex: 1,
										minHeight: 0,
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											display: 'flex',
											gap: '1.5rem',
											flex: 1,
											minHeight: 0,
											overflow: 'hidden',
										}}
									>
										{/* Left panel: List view */}
										<div
											style={{
												width: '30%',
												flexShrink: 0,
												display: 'flex',
												flexDirection: 'column',
												background:
													'var(--surface-container-lowest)',
												border: '1px solid var(--outline-variant)',
												borderRadius: '12px',
												overflow: 'hidden',
											}}
										>
											<div
												style={{
													padding: '0.85rem 1rem',
													borderBottom:
														'1px solid var(--outline-variant)',
													fontWeight: 600,
													fontSize: '0.9rem',
												}}
											>
												Relationships
											</div>
											<div
												style={{
													flex: 1,
													overflowY: 'auto',
													padding: '1rem',
													display: 'flex',
													flexDirection: 'column',
													gap: '0.65rem',
												}}
											>
												{relLoading ? (
													<div
														style={{
															textAlign: 'center',
															color: 'var(--text-secondary)',
															padding: '2rem 0',
														}}
													>
														<Loader2
															size={20}
															style={{
																animation:
																	'spin 1s linear infinite',
																margin: '0 auto 0.5rem',
															}}
														/>
														Loading...
													</div>
												) : relationships.length ===
												  0 ? (
													<div
														style={{
															textAlign: 'center',
															color: 'var(--text-secondary)',
															padding: '2rem 0',
															fontSize: '0.85rem',
														}}
													>
														No relationships found.
													</div>
												) : (
													relationships.map((r) => {
														const src = agents.find(
															(a) =>
																a.agent_id ===
																r.source_agent_id,
														);
														const tgt = agents.find(
															(a) =>
																a.agent_id ===
																r.target_agent_id,
														);
														return (
															<div
																key={r.rel_id}
																style={{
																	background:
																		'var(--surface-container-low)',
																	padding:
																		'0.75rem',
																	borderRadius:
																		'8px',
																	border: '1px solid var(--outline-variant)',
																}}
															>
																<div
																	style={{
																		fontWeight: 600,
																		fontSize:
																			'0.85rem',
																		marginBottom:
																			'0.35rem',
																		color: 'var(--on-surface)',
																	}}
																>
																	{src?.name ||
																		'Unknown'}{' '}
																	<span
																		style={{
																			color: 'var(--text-secondary)',
																		}}
																	>
																		→
																	</span>{' '}
																	{tgt?.name ||
																		'Unknown'}
																</div>
																<div
																	style={{
																		display:
																			'flex',
																		alignItems:
																			'center',
																		gap: '0.5rem',
																		fontSize:
																			'0.75rem',
																	}}
																>
																	<span
																		style={{
																			background:
																				'var(--surface-container-high)',
																			padding:
																				'0.1rem 0.4rem',
																			borderRadius:
																				'4px',
																			color: 'var(--text-secondary)',
																			textTransform:
																				'capitalize',
																			fontWeight: 500,
																		}}
																	>
																		{r.type}
																	</span>
																	<span
																		style={{
																			color:
																				r.sentiment ===
																				'positive'
																					? '#16a34a'
																					: r.sentiment ===
																						  'negative'
																						? '#dc2626'
																						: '#6366f1',
																			textTransform:
																				'capitalize',
																			fontWeight: 600,
																		}}
																	>
																		{
																			r.sentiment
																		}
																	</span>
																</div>
															</div>
														);
													})
												)}
											</div>
										</div>

										{/* Right panel: Graph view */}
										<div
											style={{
												flex: 1,
												display: 'flex',
												flexDirection: 'column',
												minHeight: 0,
											}}
										>
											<AgentRelationshipGraph
												agents={agents}
												relationships={relationships}
												loading={relLoading}
												onCreateRelationship={
													createRelationship
												}
												onDeleteRelationship={
													deleteRelationship
												}
												onUpdateRelationship={
													updateRelationship
												}
												onAutoSuggest={
													autoSuggestRelationships
												}
												suggestMsg={suggestMsg}
											/>
										</div>
									</div>
								</div>
							)}

							{/* ── SCENARIOS TAB ── */}
							{worldDetailTab === 'scenarios' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										flex: 1,
										minHeight: 0,
										gap: '0.75rem',
									}}
								>
									{/* Split layout — flex row */}
									<div
										style={{
											display: 'flex',
											gap: '1.5rem',
											flex: 1,
											minHeight: 0,
											overflow: 'hidden',
										}}
									>
										{selectedScenario ? (
											<div
												style={{
													width: '42%',
													flexShrink: 0,
													display: 'flex',
													flexDirection: 'column',
													minHeight: 0,
													background:
														'var(--surface-container-lowest)',
													border: '1px solid var(--outline-variant)',
													borderRadius: '12px',
													overflow: 'hidden',
												}}
											>
												{/* Panel header */}
												<div
													style={{
														padding:
															'0.85rem 1rem 0.6rem',
														borderBottom:
															'1px solid var(--outline-variant)',
														flexShrink: 0,
													}}
												>
													<div
														style={{
															display: 'flex',
															alignItems:
																'center',
															justifyContent:
																'space-between',
															marginBottom:
																'0.5rem',
														}}
													>
														<div>
															<div
																style={{
																	fontWeight: 700,
																	fontSize:
																		'0.9rem',
																	color: 'var(--on-surface)',
																}}
															>
																{
																	selectedScenario.name
																}
															</div>
															<div
																style={{
																	display:
																		'flex',
																	alignItems:
																		'center',
																	gap: '0.4rem',
																	marginTop:
																		'0.2rem',
																}}
															>
																<span
																	style={{
																		width: 7,
																		height: 7,
																		borderRadius:
																			'50%',
																		background:
																			scenarioLiveStatus ===
																			'completed'
																				? '#16a34a'
																				: scenarioLiveStatus ===
																					  'running'
																					? '#2563eb'
																					: scenarioLiveStatus ===
																						  'failed'
																						? '#dc2626'
																						: '#94a3b8',
																		display:
																			'inline-block',
																		flexShrink: 0,
																	}}
																/>
																<span
																	style={{
																		fontSize:
																			'0.72rem',
																		color: 'var(--text-secondary)',
																		textTransform:
																			'capitalize',
																	}}
																>
																	{scenarioLiveStatus ||
																		'idle'}
																</span>
															</div>
														</div>
														<button
															onClick={() =>
																setSelectedScenario(
																	null,
																)
															}
															style={{
																background:
																	'none',
																border: 'none',
																cursor: 'pointer',
																color: 'var(--text-secondary)',
																fontSize:
																	'0.75rem',
																padding:
																	'0.25rem',
															}}
														>
															✕
														</button>
													</div>
												</div>
												{/* Panel body */}
												<div
													style={{
														flex: 1,
														overflow: 'hidden',
														display: 'flex',
														flexDirection: 'column',
													}}
												>
													{swPanelTab ===
														'stream' && (
														<div
															style={{
																flex: 1,
																overflowY:
																	'auto',
																padding:
																	'0.75rem 1rem',
																fontFamily:
																	'monospace',
																fontSize:
																	'0.76rem',
																lineHeight: 1.8,
																background:
																	'var(--primary)',
															}}
														>
															{scenarioEventsLoading &&
																scenarioEvents.length ===
																	0 && (
																	<div
																		style={{
																			display:
																				'flex',
																			alignItems:
																				'center',
																			gap: '0.5rem',
																			color: '#8c7c6c',
																		}}
																	>
																		<Loader2
																			size={
																				13
																			}
																			style={{
																				animation:
																					'spin 1s linear infinite',
																			}}
																		/>
																		Loading
																		events…
																	</div>
																)}
															{!scenarioEventsLoading &&
																scenarioEvents.length ===
																	0 && (
																	<p
																		style={{
																			color: '#8c7c6c',
																			margin: 0,
																		}}
																	>
																		{scenarioLiveStatus ===
																		'running'
																			? 'Waiting for simulation events…'
																			: 'No events recorded for this scenario.'}
																	</p>
																)}
															{scenarioEvents.map(
																(e) => (
																	<div
																		key={
																			e.id
																		}
																		style={{
																			marginBottom:
																				'0.15rem',
																			display:
																				'flex',
																			gap: '0.5rem',
																			alignItems:
																				'baseline',
																		}}
																	>
																		<span
																			style={{
																				flexShrink: 0,
																				fontSize:
																					'0.65rem',
																				fontWeight: 700,
																				textTransform:
																					'uppercase',
																				color:
																					EVENT_COLOR[
																						e
																							.type
																					] ||
																					'#94a3b8',
																			}}
																		>
																			{
																				e.type
																			}
																		</span>
																		<span
																			style={{
																				color: 'var(--primary-fixed)',
																				flex: 1,
																			}}
																		>
																			{
																				e.message
																			}
																		</span>
																	</div>
																),
															)}
														</div>
													)}
													{swPanelTab === 'feed' && (
														<div
															style={{
																flex: 1,
																overflow:
																	'hidden',
																display: 'flex',
																flexDirection:
																	'column',
															}}
														>
															<SWFeedPanel
																worldId={
																	selectedWorld.world_id
																}
																scenarioId={
																	selectedScenario.scenario_id
																}
															/>
														</div>
													)}
													{swPanelTab === 'chat' && (
														<div
															style={{
																flex: 1,
																display: 'flex',
																flexDirection:
																	'column',
																overflow:
																	'hidden',
															}}
														>
															<div
																style={{
																	flex: 1,
																	overflowY:
																		'auto',
																	padding:
																		'0.85rem 1rem',
																	display:
																		'flex',
																	flexDirection:
																		'column',
																	gap: '0.5rem',
																}}
															>
																{scenarioChatMessages.length ===
																	0 && (
																	<div
																		style={{
																			textAlign:
																				'center',
																			color: 'var(--text-secondary)',
																			marginTop:
																				'3rem',
																		}}
																	>
																		<MessageSquare
																			size={
																				28
																			}
																			style={{
																				opacity: 0.3,
																				marginBottom:
																					'0.5rem',
																			}}
																		/>
																		<p
																			style={{
																				fontSize:
																					'0.82rem',
																				margin: 0,
																			}}
																		>
																			Ask
																			anything
																			about
																			this
																			scenario
																		</p>
																	</div>
																)}
																{scenarioChatMessages.map(
																	(
																		msg,
																		i,
																	) => (
																		<div
																			key={
																				i
																			}
																			className={`chat-bubble ${
																				msg.is_user
																					? 'user'
																					: 'agent'
																			}`}
																		>
																			{
																				msg.text
																			}
																		</div>
																	),
																)}
																{scenarioChatLoading && (
																	<div className="chat-bubble agent">
																		Thinking…
																	</div>
																)}
															</div>
															<form
																onSubmit={(
																	e,
																) => {
																	e.preventDefault();
																	sendScenarioChat();
																}}
																style={{
																	display:
																		'flex',
																	gap: '0.5rem',
																	padding:
																		'0.75rem',
																	borderTop:
																		'1px solid var(--outline-variant)',
																	background:
																		'var(--surface-container-low)',
																}}
															>
																<input
																	className="input-field"
																	value={
																		scenarioChatInput
																	}
																	onChange={(
																		e,
																	) =>
																		setScenarioChatInput(
																			e
																				.target
																				.value,
																		)
																	}
																	placeholder="Ask about this scenario…"
																	disabled={
																		scenarioChatLoading
																	}
																	style={{
																		flex: 1,
																		fontSize:
																			'0.82rem',
																	}}
																/>
																<button
																	type="submit"
																	className="btn"
																	disabled={
																		scenarioChatLoading ||
																		!scenarioChatInput.trim()
																	}
																	style={{
																		padding:
																			'0.6rem',
																		flexShrink: 0,
																	}}
																>
																	<Send
																		size={
																			15
																		}
																	/>
																</button>
															</form>
														</div>
													)}
													{swPanelTab ===
														'report' && (
														<div
															style={{
																flex: 1,
																overflowY:
																	'auto',
																padding:
																	'0.75rem',
															}}
														>
															{scenarioReportLoading ? (
																<div
																	style={{
																		display:
																			'flex',
																		justifyContent:
																			'center',
																		padding:
																			'3rem 0',
																		color: 'var(--text-secondary)',
																	}}
																>
																	<Loader2
																		size={
																			20
																		}
																		style={{
																			animation:
																				'spin 1s linear infinite',
																		}}
																	/>
																</div>
															) : scenarioReport ? (
																<SmallWorldReport
																	report={
																		scenarioReport
																	}
																/>
															) : scenarioLiveStatus ===
																	'running' ||
															  scenarioLiveStatus ===
																	'waiting' ? (
																<div
																	style={{
																		textAlign:
																			'center',
																		color: 'var(--text-secondary)',
																		padding:
																			'3rem 1rem',
																	}}
																>
																	<Loader2
																		size={
																			28
																		}
																		style={{
																			opacity: 0.6,
																			marginBottom:
																				'0.75rem',
																			animation:
																				'spin 1s linear infinite',
																		}}
																	/>
																	<p
																		style={{
																			fontWeight: 600,
																			fontSize:
																				'0.85rem',
																			margin: 0,
																		}}
																	>
																		{scenarioLiveStatus ===
																		'waiting'
																			? 'Queued'
																			: 'Simulation in progress'}
																	</p>
																	<p
																		style={{
																			fontSize:
																				'0.75rem',
																			marginTop:
																				'0.3rem',
																		}}
																	>
																		{scenarioLiveStatus ===
																		'waiting'
																			? 'Waiting for the simulation to start…'
																			: 'Report will appear here once complete.'}
																	</p>
																</div>
															) : (
																<div
																	style={{
																		textAlign:
																			'center',
																		color: 'var(--text-secondary)',
																		padding:
																			'3rem 1rem',
																	}}
																>
																	<FileText
																		size={
																			28
																		}
																		style={{
																			opacity: 0.3,
																			marginBottom:
																				'0.5rem',
																		}}
																	/>
																	<p
																		style={{
																			fontWeight: 600,
																			fontSize:
																				'0.85rem',
																			margin: 0,
																		}}
																	>
																		No
																		report
																		yet
																	</p>
																	<p
																		style={{
																			fontSize:
																				'0.75rem',
																			marginTop:
																				'0.3rem',
																		}}
																	>
																		Complete
																		the
																		scenario
																		to
																		generate
																		a
																		report.
																	</p>
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										) : (
											<div
												style={{
													width: '42%',
													flexShrink: 0,
													display: 'flex',
													flexDirection: 'column',
													alignItems: 'center',
													justifyContent: 'center',
													gap: '0.5rem',
													color: 'var(--text-secondary)',
													background:
														'var(--surface-container-low)',
													border: '1px solid var(--outline-variant)',
													borderRadius: '12px',
												}}
											>
												<GitBranch
													size={28}
													style={{ opacity: 0.3 }}
												/>
												<p
													style={{
														margin: 0,
														fontWeight: 600,
														fontSize: '0.85rem',
													}}
												>
													Select a scenario
												</p>
												<p
													style={{
														margin: 0,
														fontSize: '0.76rem',
														textAlign: 'center',
														lineHeight: 1.5,
													}}
												>
													Click any node in the graph
													to explore it.
												</p>
											</div>
										)}

										{/* ── RIGHT: Scenario graph ── */}
										<div
											style={{
												flex: 1,
												display: 'flex',
												flexDirection: 'column',
												minHeight: 0,
											}}
										>
											<div
												style={{
													flex: 1,
													minHeight: 0,
													background:
														'var(--surface-container-lowest)',
													border: '1px solid var(--outline-variant)',
													borderRadius: '12px',
													overflow: 'hidden',
												}}
											>
												{scenariosLoading ? (
													<div
														style={{
															display: 'flex',
															justifyContent:
																'center',
															alignItems:
																'center',
															height: '100%',
															color: 'var(--text-secondary)',
														}}
													>
														<GitBranch
															size={22}
															style={{
																opacity: 0.4,
															}}
														/>
													</div>
												) : (
													<ScenarioBranchGraph
														scenarios={scenarios}
														selectedScenarioId={
															selectedScenario?.scenario_id
														}
														liveStatuses={
															liveStatuses
														}
														onSelectScenario={(
															s,
														) => {
															setSelectedScenario(
																s,
															);
															setSwPanelTab(
																'report',
															);
														}}
														onBranchFrom={(s) => {
															setRunParent(s);
															setRunModalOpen(
																true,
															);
														}}
														onCreate={(parent) => {
															setRunParent(
																parent,
															);
															setRunModalOpen(
																true,
															);
														}}
													/>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

			{/* ── MODALS ── */}
			<CreateAgentModal
				open={createAgentOpen}
				onClose={() => {
					setCreateAgentOpen(false);
					setEditAgent(null);
					setAIGeneratedProfile(null);
				}}
				onSave={saveAgent}
				initialData={editAgent || aiGeneratedProfile}
			/>
			<AIAgentGeneratorModal
				open={aiGenOpen}
				onClose={() => setAIGenOpen(false)}
				onGenerated={handleAIGenerated}
				worldId={selectedWorld?.world_id}
			/>
			<BulkImportModal
				open={bulkOpen}
				onClose={() => setBulkOpen(false)}
				onImported={handleBulkImported}
				worldId={selectedWorld?.world_id}
			/>
			<CreateWorldModal
				open={createWorldOpen}
				onClose={() => setCreateWorldOpen(false)}
				onSave={(w) => {
					loadWorlds();
					setSelectedWorld(w);
				}}
			/>
			<RunScenarioModal
				open={runModalOpen}
				onClose={() => {
					setRunModalOpen(false);
					setRunParent(null);
				}}
				worldId={selectedWorld?.world_id}
				parentScenario={runParent}
				onCreated={handleScenarioCreated}
			/>
			{selectedWorld && (
				<WorldHealthCheck worldId={selectedWorld.world_id} />
			)}
			{showResimulateModal && selectedScenario && selectedWorld && (
				<ResimulateScenarioModal
					worldId={selectedWorld.world_id}
					scenario={selectedScenario}
					onClose={() => setShowResimulateModal(false)}
					onSuccess={handleResimulateSuccess}
				/>
			)}
		</>
	);
}
