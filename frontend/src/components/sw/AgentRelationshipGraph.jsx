import React, { useState, useCallback, useEffect } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	useReactFlow,
	MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Wand2, Trash2 } from 'lucide-react';

const SENTIMENT_COLORS = {
	positive: '#16a34a',
	neutral: '#6366f1',
	negative: '#dc2626',
};

function AgentNode({ data }) {
	return (
		<div
			style={{
				padding: '0.5rem 0.75rem',
				background: 'var(--surface-container-lowest)',
				border: '2px solid var(--outline-variant)',
				borderRadius: '10px',
				minWidth: '100px',
				textAlign: 'center',
				boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
			}}
		>
			<div
				style={{
					fontWeight: 700,
					fontSize: '0.82rem',
					color: 'var(--text-primary)',
				}}
			>
				{data.label}
			</div>
			{data.subtitle && (
				<div
					style={{
						fontSize: '0.68rem',
						color: 'var(--text-secondary)',
						marginTop: 2,
					}}
				>
					{data.subtitle}
				</div>
			)}
		</div>
	);
}

const nodeTypes = { agentNode: AgentNode };

/** Rendered inside <ReactFlow> so it has access to useReactFlow() */
function FitViewOnChange({ edgeCount }) {
	const { fitView } = useReactFlow();
	useEffect(() => {
		const t = setTimeout(
			() => fitView({ padding: 0.15, duration: 300 }),
			80,
		);
		return () => clearTimeout(t);
	}, [edgeCount]);
	return null;
}

export default function AgentRelationshipGraph({
	agents,
	relationships,
	onCreateRelationship,
	onDeleteRelationship,
	onAutoSuggest,
	loading,
	suggestMsg,
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [selectedEdge, setSelectedEdge] = useState(null);
	const [relTypeModal, setRelTypeModal] = useState(null); // { source, target }

	useEffect(() => {
		const angleStep = (2 * Math.PI) / Math.max(agents.length, 1);
		const radius = Math.max(160, agents.length * 30);
		setNodes(
			agents.map((a, i) => ({
				id: a.agent_id,
				position: {
					x: 300 + radius * Math.cos(i * angleStep),
					y: 250 + radius * Math.sin(i * angleStep),
				},
				data: {
					label: a.name,
					subtitle: a.job_title || a.profession || '',
				},
				type: 'agentNode',
			})),
		);
	}, [agents]);

	useEffect(() => {
		setEdges(
			relationships.map((r) => ({
				id: r.rel_id,
				source: r.source_agent_id,
				target: r.target_agent_id,
				label: r.type,
				style: {
					stroke: SENTIMENT_COLORS[r.sentiment] || '#888',
					strokeWidth: Math.max(1, (r.strength || 0.5) * 3),
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: SENTIMENT_COLORS[r.sentiment] || '#888',
				},
				data: { relData: r },
			})),
		);
	}, [relationships]);

	const onConnect = useCallback((params) => {
		setRelTypeModal({ source: params.source, target: params.target });
	}, []);

	const onEdgeClick = useCallback((_, edge) => {
		setSelectedEdge(edge);
	}, []);

	const deleteSelectedEdge = async () => {
		if (!selectedEdge) return;
		const relId = selectedEdge.id;
		const sourceAgentId = selectedEdge.source;
		await onDeleteRelationship(sourceAgentId, relId);
		setSelectedEdge(null);
	};

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			{/* Toolbar */}
			<div
				style={{
					position: 'absolute',
					top: 10,
					left: 10,
					zIndex: 10,
					display: 'flex',
					gap: '0.4rem',
				}}
			>
				<button
					onClick={onAutoSuggest}
					disabled={loading || agents.length < 2}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.35rem',
						padding: '0.4rem 0.85rem',
						background: 'var(--accent-color)',
						color: '#fff',
						border: 'none',
						borderRadius: '7px',
						fontSize: '0.78rem',
						fontWeight: 600,
						cursor:
							loading || agents.length < 2
								? 'not-allowed'
								: 'pointer',
						opacity: agents.length < 2 ? 0.5 : 1,
					}}
				>
					<Wand2 size={13} />{' '}
					{loading ? 'Suggesting…' : 'Auto-suggest'}
				</button>
				{suggestMsg && (
					<div
						style={{
							padding: '0.35rem 0.75rem',
							background: suggestMsg.startsWith('Error')
								? '#fee2e2'
								: '#dcfce7',
							color: suggestMsg.startsWith('Error')
								? '#dc2626'
								: '#16a34a',
							border: `1px solid ${
								suggestMsg.startsWith('Error')
									? '#fca5a5'
									: '#86efac'
							}`,
							borderRadius: '7px',
							fontSize: '0.78rem',
							fontWeight: 500,
						}}
					>
						{suggestMsg}
					</div>
				)}
				{selectedEdge && (
					<button
						onClick={deleteSelectedEdge}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							padding: '0.4rem 0.85rem',
							background: '#fee2e2',
							color: '#dc2626',
							border: '1px solid #fca5a5',
							borderRadius: '7px',
							fontSize: '0.78rem',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						<Trash2 size={13} /> Remove Relationship
					</button>
				)}
			</div>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onEdgeClick={onEdgeClick}
				nodeTypes={nodeTypes}
				fitView
				style={{
					background: 'var(--surface-container-low)',
					borderRadius: '12px',
				}}
			>
				<FitViewOnChange edgeCount={edges.length} />
				<Background
					gap={20}
					color="var(--outline-variant)"
				/>
				<Controls />
				<MiniMap nodeColor="var(--secondary-container)" />
			</ReactFlow>

			{/* Relationship type modal */}
			{relTypeModal && (
				<RelTypeModal
					agents={agents}
					sourceId={relTypeModal.source}
					targetId={relTypeModal.target}
					onCreate={(data) => {
						onCreateRelationship(data);
						setRelTypeModal(null);
					}}
					onClose={() => setRelTypeModal(null)}
				/>
			)}
		</div>
	);
}

const REL_TYPES = [
	'manager',
	'peer',
	'direct_report',
	'competitor',
	'customer',
	'mentor',
	'stakeholder',
];
const SENTIMENTS = ['positive', 'neutral', 'negative'];

function RelTypeModal({ agents, sourceId, targetId, onCreate, onClose }) {
	const [type, setType] = useState('peer');
	const [strength, setStrength] = useState(0.5);
	const [sentiment, setSentiment] = useState('neutral');
	const [direction] = useState('both');

	const srcName =
		agents.find((a) => a.agent_id === sourceId)?.name || sourceId;
	const tgtName =
		agents.find((a) => a.agent_id === targetId)?.name || targetId;

	const s = {
		width: '100%',
		padding: '0.45rem 0.7rem',
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '7px',
		fontSize: '0.83rem',
		color: 'var(--text-primary)',
		outline: 'none',
	};

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'rgba(0,0,0,0.3)',
				zIndex: 20,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{ width: 340, padding: '1.25rem', borderRadius: '13px' }}
				onClick={(e) => e.stopPropagation()}
			>
				<p
					style={{
						fontWeight: 700,
						fontSize: '0.9rem',
						marginBottom: '0.2rem',
					}}
				>
					New Relationship
				</p>
				<p
					style={{
						fontSize: '0.78rem',
						color: 'var(--text-secondary)',
						marginBottom: '1rem',
					}}
				>
					{srcName} → {tgtName}
				</p>

				<label
					style={{
						fontSize: '0.72rem',
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						color: 'var(--text-secondary)',
					}}
				>
					Type
				</label>
				<select
					value={type}
					onChange={(e) => setType(e.target.value)}
					style={{
						...s,
						marginBottom: '0.6rem',
						marginTop: '0.2rem',
					}}
				>
					{REL_TYPES.map((t) => (
						<option
							key={t}
							value={t}
						>
							{t}
						</option>
					))}
				</select>

				<label
					style={{
						fontSize: '0.72rem',
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						color: 'var(--text-secondary)',
					}}
				>
					Sentiment
				</label>
				<select
					value={sentiment}
					onChange={(e) => setSentiment(e.target.value)}
					style={{
						...s,
						marginBottom: '0.6rem',
						marginTop: '0.2rem',
					}}
				>
					{SENTIMENTS.map((t) => (
						<option
							key={t}
							value={t}
						>
							{t}
						</option>
					))}
				</select>

				<label
					style={{
						fontSize: '0.72rem',
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						color: 'var(--text-secondary)',
					}}
				>
					Strength: {Math.round(strength * 100)}%
				</label>
				<input
					type="range"
					min={0}
					max={100}
					value={Math.round(strength * 100)}
					onChange={(e) => setStrength(Number(e.target.value) / 100)}
					style={{
						width: '100%',
						accentColor: 'var(--accent-color)',
						marginBottom: '0.6rem',
						marginTop: '0.2rem',
					}}
				/>

				<div
					style={{
						display: 'flex',
						gap: '0.4rem',
						justifyContent: 'flex-end',
						marginTop: '0.5rem',
					}}
				>
					<button
						onClick={onClose}
						style={{
							padding: '0.5rem 1rem',
							background: 'var(--surface-container-high)',
							border: '1px solid var(--outline-variant)',
							borderRadius: '7px',
							fontSize: '0.82rem',
							cursor: 'pointer',
						}}
					>
						Cancel
					</button>
					<button
						onClick={() =>
							onCreate({
								source_agent_id: sourceId,
								target_agent_id: targetId,
								type,
								strength,
								sentiment,
								influence_direction: direction,
							})
						}
						style={{
							padding: '0.5rem 1.1rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '7px',
							fontSize: '0.82rem',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						Add
					</button>
				</div>
			</div>
		</div>
	);
}
