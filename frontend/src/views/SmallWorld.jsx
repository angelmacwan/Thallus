import React, { useState, useEffect, useCallback } from 'react';
import {
	Users,
	Globe,
	GitBranch,
	Plus,
	BarChart2,
	ArrowLeft,
} from 'lucide-react';
import api from '../api';

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
import ScenarioDetail from '../components/sw/ScenarioDetail';
import ScenarioDiff from '../components/sw/ScenarioDiff';
import { swAgents } from '../api';

export default function SmallWorld() {
	// ── World list state ──────────────────────────────────────
	const [worlds, setWorlds] = useState([]);
	const [worldsLoading, setWorldsLoading] = useState(true);
	const [selectedWorld, setSelectedWorld] = useState(null);
	const [createWorldOpen, setCreateWorldOpen] = useState(false);

	// ── World detail tab ──────────────────────────────────────
	const [worldDetailTab, setWorldDetailTab] = useState('agents'); // 'agents' | 'scenarios'

	// ── Agent state (per-world) ───────────────────────────────
	const [agents, setAgents] = useState([]);
	const [agentsLoading, setAgentsLoading] = useState(false);
	const [relationships, setRelationships] = useState([]);
	const [relLoading, setRelLoading] = useState(false);
	const [agentGraphMode, setAgentGraphMode] = useState(false);

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
	const [worldSubTab, setWorldSubTab] = useState('graph'); // 'graph' | 'diff'

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

	// ── When selected world changes, reload data ──────────────
	useEffect(() => {
		if (selectedWorld) {
			setWorldDetailTab('agents');
			setAgentGraphMode(false);
			setSuggestMsg(null);
			setAgents([]);
			setRelationships([]);
			loadAgents(selectedWorld.world_id);
			loadScenarios(selectedWorld.world_id);
		} else {
			setAgents([]);
			setRelationships([]);
			setScenarios([]);
		}
	}, [selectedWorld?.world_id]);

	useEffect(() => {
		if (agentGraphMode && selectedWorld) {
			loadAgentGraph(selectedWorld.world_id);
		} else if (!agentGraphMode && selectedWorld) {
			loadAgents(selectedWorld.world_id);
		}
	}, [agentGraphMode]);

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
		if (agentGraphMode) {
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
		if (agentGraphMode) {
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
		if (agentGraphMode) {
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
		setScenarios((prev) => [...prev, s]);
		setSelectedScenario(s);
	};

	// ── Styles ────────────────────────────────────────────────
	const tabBtn = (key, label, Icon, tab, setTab) => (
		<button
			key={key}
			onClick={() => setTab(key)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.35rem',
				padding: '0.5rem 1rem',
				border: 'none',
				borderRadius: '8px',
				fontSize: '0.85rem',
				fontWeight: tab === key ? 700 : 500,
				cursor: 'pointer',
				background:
					tab === key ? 'var(--secondary-container)' : 'transparent',
				color:
					tab === key
						? 'var(--on-secondary-container)'
						: 'var(--text-secondary)',
				transition: 'background 0.15s',
			}}
		>
			<Icon size={14} />
			{label}
		</button>
	);

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
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				padding: '0',
				overflow: 'hidden',
			}}
		>
			{/* ── WORLD LIST (no world selected) ── */}
			{!selectedWorld ? (
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						overflow: 'hidden',
					}}
				>
					{/* Header */}
					<div
						style={{
							padding: '1.2rem 1.5rem 1rem',
							borderBottom: '1px solid var(--outline-variant)',
							flexShrink: 0,
							background: 'var(--surface-container-lowest)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.6rem',
							}}
						>
							<Globe
								size={20}
								style={{ color: 'var(--accent-color)' }}
							/>
							<h1
								style={{
									margin: 0,
									fontSize: '1.2rem',
									fontWeight: 800,
								}}
							>
								Small World
							</h1>
						</div>
						<button
							onClick={() => setCreateWorldOpen(true)}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.35rem',
								padding: '0.5rem 1rem',
								background: 'var(--accent-color)',
								color: '#fff',
								border: 'none',
								borderRadius: '8px',
								fontSize: '0.84rem',
								fontWeight: 600,
								cursor: 'pointer',
							}}
						>
							<Plus size={14} /> Create World
						</button>
					</div>

					{/* World grid */}
					<div
						style={{
							flex: 1,
							overflowY: 'auto',
							padding: '1.2rem 1.5rem',
						}}
					>
						{worldsLoading ? (
							<p
								style={{
									color: 'var(--text-secondary)',
									fontSize: '0.88rem',
								}}
							>
								Loading worlds…
							</p>
						) : worlds.length === 0 ? (
							<div
								style={{
									textAlign: 'center',
									padding: '4rem 2rem',
									color: 'var(--text-secondary)',
								}}
							>
								<Globe
									size={48}
									style={{
										opacity: 0.3,
										marginBottom: '1rem',
									}}
								/>
								<p
									style={{
										fontSize: '1rem',
										fontWeight: 600,
										marginBottom: '0.5rem',
									}}
								>
									No worlds yet
								</p>
								<p style={{ fontSize: '0.88rem' }}>
									Create a world to start building your agent
									network.
								</p>
							</div>
						) : (
							<div
								style={{
									display: 'grid',
									gridTemplateColumns:
										'repeat(auto-fill, minmax(280px, 1fr))',
									gap: '0.75rem',
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
											onClick={() => setSelectedWorld(w)}
											onDelete={deleteWorld}
										/>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			) : (
				/* ── WORLD DETAIL ── */
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						overflow: 'hidden',
					}}
				>
					{/* World detail header */}
					<div
						style={{
							padding: '0.75rem 1.5rem 0',
							borderBottom: '1px solid var(--outline-variant)',
							flexShrink: 0,
							background: 'var(--surface-container-lowest)',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.75rem',
								marginBottom: '0.75rem',
							}}
						>
							<button
								onClick={() => setSelectedWorld(null)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									background: 'none',
									border: '1px solid var(--outline-variant)',
									borderRadius: '7px',
									padding: '0.3rem 0.65rem',
									fontSize: '0.78rem',
									fontWeight: 600,
									cursor: 'pointer',
									color: 'var(--text-secondary)',
								}}
							>
								<ArrowLeft size={13} /> Worlds
							</button>
							<span
								style={{
									fontSize: '1.05rem',
									fontWeight: 800,
								}}
							>
								{selectedWorld.name}
							</span>
							{selectedWorld.description && (
								<span
									style={{
										fontSize: '0.82rem',
										color: 'var(--text-secondary)',
										fontWeight: 400,
									}}
								>
									— {selectedWorld.description}
								</span>
							)}
						</div>

						{/* World detail tabs */}
						<div style={{ display: 'flex', gap: '0.3rem' }}>
							{tabBtn(
								'agents',
								'Agents',
								Users,
								worldDetailTab,
								setWorldDetailTab,
							)}
							{tabBtn(
								'scenarios',
								'Scenarios',
								GitBranch,
								worldDetailTab,
								setWorldDetailTab,
							)}
						</div>
					</div>

					{/* ── AGENTS TAB ── */}
					{worldDetailTab === 'agents' && (
						<div
							style={{
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden',
							}}
						>
							{/* Toolbar */}
							<div
								style={{
									display: 'flex',
									gap: '0.4rem',
									padding: '0.75rem 1.2rem',
									borderBottom:
										'1px solid var(--outline-variant)',
									flexShrink: 0,
									flexWrap: 'wrap',
									alignItems: 'center',
								}}
							>
								<span
									style={{
										fontWeight: 700,
										fontSize: '0.85rem',
										marginRight: '0.5rem',
									}}
								>
									{agents.length} Agent
									{agents.length !== 1 ? 's' : ''}
								</span>
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
								{actionBtn('AI Generate', Users, () =>
									setAIGenOpen(true),
								)}
								{actionBtn('Bulk Import', Plus, () =>
									setBulkOpen(true),
								)}
								<button
									onClick={() => setAgentGraphMode((m) => !m)}
									style={{
										marginLeft: 'auto',
										padding: '0.45rem 0.9rem',
										background: agentGraphMode
											? 'var(--secondary-container)'
											: 'var(--surface-container-high)',
										color: agentGraphMode
											? 'var(--on-secondary-container)'
											: 'var(--text-primary)',
										border: '1px solid var(--outline-variant)',
										borderRadius: '8px',
										fontSize: '0.82rem',
										fontWeight: 600,
										cursor: 'pointer',
									}}
								>
									{agentGraphMode
										? 'List View'
										: 'Relationship Graph'}
								</button>
							</div>

							{/* Agent content */}
							<div
								style={{
									flex: 1,
									minHeight: 0,
									overflow: agentGraphMode
										? 'hidden'
										: 'auto',
									padding: agentGraphMode ? 0 : '1rem 1.2rem',
								}}
							>
								{agentsLoading ? (
									<p
										style={{
											color: 'var(--text-secondary)',
											padding: '1rem',
										}}
									>
										Loading agents…
									</p>
								) : agentGraphMode ? (
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
										onAutoSuggest={autoSuggestRelationships}
										suggestMsg={suggestMsg}
									/>
								) : agents.length === 0 ? (
									<p
										style={{
											color: 'var(--text-secondary)',
											fontSize: '0.88rem',
											padding: '1rem 0',
										}}
									>
										No agents yet. Create one to get
										started.
									</p>
								) : (
									<div
										style={{
											display: 'grid',
											gridTemplateColumns:
												'repeat(auto-fill, minmax(270px, 1fr))',
											gap: '0.75rem',
										}}
									>
										{agents.map((a) => (
											<AgentCard
												key={a.agent_id}
												agent={a}
												onEdit={() => {
													setEditAgent(a);
													setAIGeneratedProfile(null);
													setCreateAgentOpen(true);
												}}
												onDelete={() =>
													deleteAgent(a.agent_id)
												}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── SCENARIOS TAB ── */}
					{worldDetailTab === 'scenarios' && (
						<div
							style={{
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden',
								padding: '1rem 1.2rem',
							}}
						>
							<WorldHealthCheck
								worldId={selectedWorld.world_id}
							/>

							{/* Scenario sub-tabs */}
							<div
								style={{
									display: 'flex',
									gap: '0.3rem',
									marginBottom: '0.75rem',
								}}
							>
								{tabBtn(
									'graph',
									'Scenarios',
									GitBranch,
									worldSubTab,
									setWorldSubTab,
								)}
								{tabBtn(
									'diff',
									'Compare',
									BarChart2,
									worldSubTab,
									setWorldSubTab,
								)}
							</div>

							{worldSubTab === 'graph' && (
								<div style={{ flex: 1, minHeight: 0 }}>
									{scenariosLoading ? (
										<p
											style={{
												color: 'var(--text-secondary)',
												fontSize: '0.84rem',
											}}
										>
											Loading scenarios…
										</p>
									) : (
										<ScenarioBranchGraph
											scenarios={scenarios}
											onSelectScenario={
												setSelectedScenario
											}
											onBranchFrom={(s) => {
												setRunParent(s);
												setRunModalOpen(true);
											}}
											onCreate={(parent) => {
												setRunParent(parent);
												setRunModalOpen(true);
											}}
										/>
									)}
								</div>
							)}

							{worldSubTab === 'diff' && (
								<div style={{ flex: 1, overflowY: 'auto' }}>
									<ScenarioDiff
										worldId={selectedWorld.world_id}
										scenarios={scenarios}
									/>
								</div>
							)}
						</div>
					)}
				</div>
			)}

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

			{/* Scenario detail slide-out */}
			{selectedScenario && (
				<ScenarioDetail
					worldId={selectedWorld?.world_id}
					scenario={selectedScenario}
					onClose={() => setSelectedScenario(null)}
				/>
			)}
		</div>
	);
}
