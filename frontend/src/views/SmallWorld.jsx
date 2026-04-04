import React, { useState, useEffect, useCallback } from 'react';
import { Users, Globe, GitBranch, Plus, BarChart2 } from 'lucide-react';
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

// ─── Top-level tabs ──────────────────────────────────────────────────
const TOP_TABS = [
	{ key: 'worlds', label: 'Worlds', icon: Globe },
	{ key: 'agents', label: 'Agents', icon: Users },
];

export default function SmallWorld() {
	const [topTab, setTopTab] = useState('worlds');

	// ── Agent state ──────────────────────────────────────────
	const [agents, setAgents] = useState([]);
	const [agentsLoading, setAgentsLoading] = useState(true);
	const [relationships, setRelationships] = useState([]);
	const [relLoading, setRelLoading] = useState(false);
	const [agentGraphMode, setAgentGraphMode] = useState(false);

	const [createAgentOpen, setCreateAgentOpen] = useState(false);
	const [editAgent, setEditAgent] = useState(null);
	const [aiGenOpen, setAIGenOpen] = useState(false);
	const [bulkOpen, setBulkOpen] = useState(false);
	const [aiGeneratedProfile, setAIGeneratedProfile] = useState(null);

	// ── World state ───────────────────────────────────────────
	const [worlds, setWorlds] = useState([]);
	const [worldsLoading, setWorldsLoading] = useState(true);
	const [selectedWorld, setSelectedWorld] = useState(null);
	const [scenarios, setScenarios] = useState([]);
	const [scenariosLoading, setScenariosLoading] = useState(false);
	const [createWorldOpen, setCreateWorldOpen] = useState(false);

	const [runModalOpen, setRunModalOpen] = useState(false);
	const [runParent, setRunParent] = useState(null);
	const [selectedScenario, setSelectedScenario] = useState(null);

	const [worldSubTab, setWorldSubTab] = useState('graph'); // 'graph' | 'diff'

	// ── Load agents ───────────────────────────────────────────
	const loadAgents = useCallback(() => {
		setAgentsLoading(true);
		api.get('/small-world/agents/')
			.then((r) => setAgents(r.data))
			.catch(() => {})
			.finally(() => setAgentsLoading(false));
	}, []);

	const loadRelationships = useCallback(() => {
		setRelLoading(true);
		api.get('/small-world/agents-relationships/all')
			.then((r) => setRelationships(r.data))
			.catch(() => setRelationships([]))
			.finally(() => setRelLoading(false));
	}, []);

	useEffect(() => {
		loadAgents();
	}, [loadAgents]);
	useEffect(() => {
		if (agentGraphMode) loadRelationships();
	}, [agentGraphMode]);

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

	// ── Load scenarios when world selected ────────────────────
	const loadScenarios = useCallback((worldId) => {
		if (!worldId) return;
		setScenariosLoading(true);
		api.get(`/small-world/worlds/${worldId}/scenarios/`)
			.then((r) => setScenarios(r.data))
			.catch(() => {})
			.finally(() => setScenariosLoading(false));
	}, []);

	useEffect(() => {
		if (selectedWorld) loadScenarios(selectedWorld.world_id);
		else setScenarios([]);
	}, [selectedWorld]);

	// ── Agent actions ─────────────────────────────────────────
	const saveAgent = async (payload) => {
		if (editAgent) {
			await api.put(`/small-world/agents/${editAgent.agent_id}`, payload);
		} else {
			await api.post('/small-world/agents/', payload);
		}
		loadAgents();
	};

	const deleteAgent = async (id) => {
		if (!window.confirm('Delete this agent? This cannot be undone.'))
			return;
		await api.delete(`/small-world/agents/${id}`);
		loadAgents();
	};

	const handleAIGenerated = (profile) => {
		setAIGenOpen(false);
		setAIGeneratedProfile(profile);
		setEditAgent(null);
		setCreateAgentOpen(true);
	};

	const handleBulkImported = () => {
		setBulkOpen(false);
		loadAgents();
	};

	const createRelationship = async (data) => {
		await api.post(
			`/small-world/agents/${data.source_agent_id}/relationships`,
			data,
		);
		loadRelationships();
	};

	const deleteRelationship = async (agentId, relId) => {
		await api.delete(
			`/small-world/agents/${agentId}/relationships/${relId}`,
		);
		loadRelationships();
	};

	const [suggestMsg, setSuggestMsg] = useState(null);

	const autoSuggestRelationships = async () => {
		setRelLoading(true);
		setSuggestMsg(null);
		const ids = agents.map((a) => a.agent_id);
		try {
			const res = await api.post(
				'/small-world/agents/auto-suggest-relationships',
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
			loadRelationships();
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
			{/* Page header + top tabs */}
			<div
				style={{
					padding: '1.2rem 1.5rem 0',
					borderBottom: '1px solid var(--outline-variant)',
					flexShrink: 0,
					background: 'var(--surface-container-lowest)',
				}}
			>
				<h1
					style={{
						margin: '0 0 0.9rem',
						fontSize: '1.2rem',
						fontWeight: 800,
					}}
				>
					Small World
				</h1>
				<div style={{ display: 'flex', gap: '0.3rem' }}>
					{TOP_TABS.map(({ key, label, icon: Icon }) =>
						tabBtn(key, label, Icon, topTab, setTopTab),
					)}
				</div>
			</div>

			{/* ── WORLDS TAB ── */}
			{topTab === 'worlds' && (
				<div
					style={{
						flex: 1,
						display: 'grid',
						gridTemplateColumns: selectedWorld
							? '280px 1fr'
							: '1fr',
						overflow: 'hidden',
					}}
				>
					{/* Left: world list */}
					<div
						style={{
							borderRight: selectedWorld
								? '1px solid var(--outline-variant)'
								: 'none',
							overflowY: 'auto',
							padding: '1rem',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '0.75rem',
							}}
						>
							<span
								style={{ fontWeight: 700, fontSize: '0.88rem' }}
							>
								{worlds.length} World
								{worlds.length !== 1 ? 's' : ''}
							</span>
							<button
								onClick={() => setCreateWorldOpen(true)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.4rem 0.75rem',
									background: 'var(--accent-color)',
									color: '#fff',
									border: 'none',
									borderRadius: '7px',
									fontSize: '0.78rem',
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								<Plus size={13} /> New
							</button>
						</div>
						{worldsLoading ? (
							<p
								style={{
									color: 'var(--text-secondary)',
									fontSize: '0.84rem',
								}}
							>
								Loading…
							</p>
						) : worlds.length === 0 ? (
							<p
								style={{
									color: 'var(--text-secondary)',
									fontSize: '0.84rem',
								}}
							>
								No worlds yet.
							</p>
						) : (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '0.5rem',
								}}
							>
								{worlds.map((w) => (
									<div
										key={w.world_id}
										onClick={() => setSelectedWorld(w)}
										style={{
											cursor: 'pointer',
											border: `1px solid ${selectedWorld?.world_id === w.world_id ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
											borderRadius: '10px',
											overflow: 'hidden',
										}}
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

					{/* Right: world detail */}
					{selectedWorld && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden',
								padding: '1rem 1.2rem',
							}}
						>
							<WorldHealthCheck
								worldId={selectedWorld.world_id}
							/>

							{/* World detail tabs */}
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
								<div
									style={{
										flex: 1,
										minHeight: 0,
										display: 'flex',
										flexDirection: 'column',
									}}
								>
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
										<div style={{ flex: 1, minHeight: 0 }}>
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
										</div>
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

			{/* ── AGENTS TAB ── */}
			{topTab === 'agents' && (
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
							borderBottom: '1px solid var(--outline-variant)',
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

					{/* Content */}
					<div
						style={{
							flex: 1,
							minHeight: 0,
							overflow: agentGraphMode ? 'hidden' : 'auto',
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
								onCreateRelationship={createRelationship}
								onDeleteRelationship={deleteRelationship}
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
								No agents yet. Create one to get started.
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
										onDelete={() => deleteAgent(a.agent_id)}
									/>
								))}
							</div>
						)}
					</div>
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
			/>
			<BulkImportModal
				open={bulkOpen}
				onClose={() => setBulkOpen(false)}
				onImported={handleBulkImported}
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
