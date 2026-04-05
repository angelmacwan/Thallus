import React, {
	useState,
	useCallback,
	useEffect,
	useRef,
	useMemo,
} from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	Handle,
	Position,
	useNodesState,
	useEdgesState,
	useReactFlow,
	MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Wand2, LayoutGrid } from 'lucide-react';

/**
 * Fruchterman-Reingold force-directed layout.
 * Returns a map of { [nodeId]: { x, y } }.
 */
function forceLayout(nodeIds, edgePairs, iterations = 400) {
	const n = nodeIds.length;
	if (n === 0) return {};

	const NODE_W = 150; // approximate rendered node width
	const NODE_H = 60; // approximate rendered node height
	const PAD_X = NODE_W + 30;
	const PAD_Y = NODE_H + 30;

	// Scale canvas to node count
	const W = Math.max(700, n * 90);
	const H = Math.max(500, n * 70);

	// k = ideal spring length — must be at least as large as node footprint
	const k = Math.max(Math.sqrt((W * H) / n) * 0.9, PAD_X * 1.5);

	// Init on a circle
	const pos = {};
	nodeIds.forEach((id, i) => {
		const angle = (2 * Math.PI * i) / n;
		const r = Math.min(W, H) * 0.38;
		pos[id] = {
			x: W / 2 + r * Math.cos(angle),
			y: H / 2 + r * Math.sin(angle),
		};
	});

	const disp = {};

	for (let iter = 0; iter < iterations; iter++) {
		const temp = k * 2 * Math.pow(1 - iter / iterations, 1.5);

		nodeIds.forEach((id) => {
			disp[id] = { x: 0, y: 0 };
		});

		// Repulsion between every pair
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const u = nodeIds[i],
					v = nodeIds[j];
				let dx = pos[u].x - pos[v].x;
				let dy = pos[u].y - pos[v].y;
				const rawDist = Math.sqrt(dx * dx + dy * dy);

				// If nodes are at (nearly) the same point, nudge them apart randomly
				if (rawDist < 1) {
					dx = (Math.random() - 0.5) * 2;
					dy = (Math.random() - 0.5) * 2;
				}

				const dist = Math.max(rawDist, 1);
				// Apply a much larger force when inside the exclusion zone
				const inZone = rawDist < PAD_X;
				const repulse = inZone
					? (k * k * 4) / dist // 4× stronger inside the zone
					: (k * k) / dist;
				const fx = (dx / dist) * repulse;
				const fy = (dy / dist) * repulse;
				disp[u].x += fx;
				disp[u].y += fy;
				disp[v].x -= fx;
				disp[v].y -= fy;
			}
		}

		// Attraction along edges — only when farther than k
		edgePairs.forEach(([u, v]) => {
			if (!pos[u] || !pos[v]) return;
			const dx = pos[u].x - pos[v].x;
			const dy = pos[u].y - pos[v].y;
			const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
			if (dist <= k) return;
			const force = ((dist - k) * (dist - k)) / (k * 2);
			const fx = (dx / dist) * force;
			const fy = (dy / dist) * force;
			disp[u].x -= fx;
			disp[u].y -= fy;
			disp[v].x += fx;
			disp[v].y += fy;
		});

		// Apply with temperature clamping
		nodeIds.forEach((id) => {
			const d = disp[id];
			const dlen = Math.max(Math.sqrt(d.x * d.x + d.y * d.y), 0.1);
			const clamp = Math.min(dlen, temp);
			pos[id].x += (d.x / dlen) * clamp;
			pos[id].y += (d.y / dlen) * clamp;
			pos[id].x = Math.max(100, Math.min(W - 100, pos[id].x));
			pos[id].y = Math.max(80, Math.min(H - 80, pos[id].y));
		});
	}

	// ── Post-simulation overlap resolution ──────────────────────────────────
	// Run multiple passes pushing any still-overlapping nodes apart directly.
	for (let pass = 0; pass < 50; pass++) {
		let moved = false;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const u = nodeIds[i],
					v = nodeIds[j];
				let dx = pos[u].x - pos[v].x;
				let dy = pos[u].y - pos[v].y;
				// Axis-aligned overlap check (fits rectangular node cards better)
				const overlapX = PAD_X - Math.abs(dx);
				const overlapY = PAD_Y - Math.abs(dy);
				if (overlapX > 0 && overlapY > 0) {
					// Push along the axis of least overlap
					if (overlapX < overlapY) {
						const push = (overlapX / 2 + 1) * Math.sign(dx || 1);
						pos[u].x += push;
						pos[v].x -= push;
					} else {
						const push = (overlapY / 2 + 1) * Math.sign(dy || 1);
						pos[u].y += push;
						pos[v].y -= push;
					}
					moved = true;
				}
			}
		}
		if (!moved) break;
	}

	return pos;
}

const SENTIMENT_COLORS = {
	positive: '#16a34a',
	neutral: '#6366f1',
	negative: '#dc2626',
};

function AgentNode({ data }) {
	return (
		<div
			style={{
				position: 'relative',
				padding: '0.5rem 0.75rem',
				background: 'var(--surface-container-lowest)',
				border: '2px solid var(--outline-variant)',
				borderRadius: '10px',
				minWidth: '100px',
				textAlign: 'center',
				boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				style={{
					width: 10,
					height: 10,
					background: 'var(--outline)',
					border: '2px solid var(--surface-container-lowest)',
				}}
			/>
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
			<Handle
				type="source"
				position={Position.Right}
				style={{
					width: 10,
					height: 10,
					background: 'var(--outline)',
					border: '2px solid var(--surface-container-lowest)',
				}}
			/>
		</div>
	);
}

const nodeTypes = { agentNode: AgentNode };

/**
 * Lives inside <ReactFlow> so it has access to useReactFlow().
 * Handles both auto-fit and force-layout triggering.
 */
function GraphController({
	edgeCount,
	layoutTrigger,
	agents,
	relationships,
	setNodes,
	savePositions,
}) {
	const { fitView } = useReactFlow();

	// Fit view whenever edges change
	useEffect(() => {
		if (layoutTrigger > 0) return; // layoutTrigger handler will fit itself
		const t = setTimeout(
			() => fitView({ padding: 0.15, duration: 300 }),
			80,
		);
		return () => clearTimeout(t);
	}, [edgeCount, fitView, layoutTrigger]);

	// Run force layout when trigger increments
	useEffect(() => {
		if (layoutTrigger === 0) return;
		const nodeIds = agents.map((a) => a.agent_id);
		const edgePairs = relationships.map((r) => [
			r.source_agent_id,
			r.target_agent_id,
		]);
		const positions = forceLayout(nodeIds, edgePairs);
		setNodes((prev) =>
			prev.map((n) =>
				positions[n.id] ? { ...n, position: positions[n.id] } : n,
			),
		);
		// Persist the new positions from force layout
		savePositions(positions);
		const t = setTimeout(
			() => fitView({ padding: 0.18, duration: 450 }),
			50,
		);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layoutTrigger]);

	return null;
}

export default function AgentRelationshipGraph({
	agents,
	relationships,
	onCreateRelationship,
	onDeleteRelationship,
	onUpdateRelationship,
	onAutoSuggest,
	loading,
	suggestMsg,
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	// Edge context menu: { edge, x, y }
	const [edgeMenu, setEdgeMenu] = useState(null);
	// Modal for creating a new connection: { source, target }
	const [relTypeModal, setRelTypeModal] = useState(null);
	// Modal for editing an existing edge: edge object
	const [editModal, setEditModal] = useState(null);

	const containerRef = useRef(null);
	const [layoutTrigger, setLayoutTrigger] = useState(0);

	// Stable localStorage key — scoped to the sorted set of agent IDs
	const storageKey = useMemo(
		() =>
			'ag_pos_' +
			agents
				.map((a) => a.agent_id)
				.sort()
				.join(','),
		// We only want this to update when the set of agents changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			agents
				.map((a) => a.agent_id)
				.sort()
				.join(','),
		],
	);

	// In-memory position cache; seeded from localStorage
	const posCache = useRef({});
	useEffect(() => {
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) posCache.current = JSON.parse(saved);
		} catch {
			/* ignore */
		}
	}, [storageKey]);

	const savePositions = useCallback(
		(positions) => {
			Object.assign(posCache.current, positions);
			try {
				localStorage.setItem(
					storageKey,
					JSON.stringify(posCache.current),
				);
			} catch {
				/* ignore */
			}
		},
		[storageKey],
	);

	const applyForceLayout = useCallback(() => {
		setLayoutTrigger((n) => n + 1);
	}, []);

	useEffect(() => {
		const angleStep = (2 * Math.PI) / Math.max(agents.length, 1);
		const radius = Math.max(160, agents.length * 30);
		setNodes((prev) => {
			const existingById = Object.fromEntries(prev.map((n) => [n.id, n]));
			return agents.map((a, i) => {
				// Prefer: 1) current node position (user dragged), 2) cache, 3) circle fallback
				const existing = existingById[a.agent_id];
				const cached = posCache.current[a.agent_id];
				const position = existing?.position ??
					cached ?? {
						x: 300 + radius * Math.cos(i * angleStep),
						y: 250 + radius * Math.sin(i * angleStep),
					};
				return {
					id: a.agent_id,
					position,
					data: {
						label: a.name,
						subtitle: a.job_title || a.profession || '',
					},
					type: 'agentNode',
				};
			});
		});
	}, [agents, setNodes]);

	useEffect(() => {
		setEdges(
			relationships.map((r) => ({
				id: r.rel_id,
				source: r.source_agent_id,
				target: r.target_agent_id,
				type: 'smoothstep',
				label: r.type,
				animated: true,
				style: {
					stroke: SENTIMENT_COLORS[r.sentiment] || '#888',
					strokeWidth: Math.max(1, (r.strength || 0.5) * 3),
				},
				labelStyle: {
					color: 'var(--text-primary)',
					fontSize: '0.75rem',
					fontWeight: 600,
				},
				labelBgStyle: {
					fill: 'var(--surface-container)',
					stroke: SENTIMENT_COLORS[r.sentiment] || '#888',
					strokeWidth: 1,
				},
				labelBgPadding: [8, 4],
				labelBgBorderRadius: 6,
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: SENTIMENT_COLORS[r.sentiment] || '#888',
				},
				data: { relData: r },
			})),
		);
	}, [relationships, setEdges]);

	const onConnect = useCallback((params) => {
		setRelTypeModal({ source: params.source, target: params.target });
	}, []);

	// Intercept node drag-stop to persist positions
	const handleNodesChange = useCallback(
		(changes) => {
			onNodesChange(changes);
			const moved = {};
			changes.forEach((c) => {
				if (
					c.type === 'position' &&
					c.dragging === false &&
					c.position
				) {
					moved[c.id] = c.position;
				}
			});
			if (Object.keys(moved).length > 0) savePositions(moved);
		},
		[onNodesChange, savePositions],
	);

	const onEdgeClick = useCallback((event, edge) => {
		event.stopPropagation();
		const rect = containerRef.current?.getBoundingClientRect();
		const x = rect ? event.clientX - rect.left : event.clientX;
		const y = rect ? event.clientY - rect.top : event.clientY;
		setEdgeMenu({ edge, x, y });
	}, []);

	const closeEdgeMenu = useCallback(() => setEdgeMenu(null), []);

	const handleDeleteEdge = async () => {
		if (!edgeMenu) return;
		const { edge } = edgeMenu;
		closeEdgeMenu();
		await onDeleteRelationship(edge.source, edge.id);
	};

	const handleEditEdge = () => {
		if (!edgeMenu) return;
		setEditModal(edgeMenu.edge);
		closeEdgeMenu();
	};

	return (
		<div
			ref={containerRef}
			style={{ width: '100%', height: '100%', position: 'relative' }}
			onClick={edgeMenu ? closeEdgeMenu : undefined}
		>
			{/* Toolbar */}
			<div
				style={{
					position: 'absolute',
					top: 10,
					left: 10,
					zIndex: 10,
					display: 'flex',
					gap: '0.4rem',
					flexWrap: 'wrap',
					maxWidth: 'calc(100% - 20px)',
				}}
			>
				<button
					onClick={applyForceLayout}
					disabled={agents.length < 2}
					title="Auto-layout: arrange nodes for clarity"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.35rem',
						padding: '0.4rem 0.85rem',
						background: 'var(--surface-container-high)',
						color: 'var(--text-primary)',
						border: '1px solid var(--outline-variant)',
						borderRadius: '7px',
						fontSize: '0.78rem',
						fontWeight: 600,
						cursor: agents.length < 2 ? 'not-allowed' : 'pointer',
						opacity: agents.length < 2 ? 0.5 : 1,
					}}
				>
					<LayoutGrid size={13} /> Auto-layout
				</button>
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
			</div>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onEdgeClick={onEdgeClick}
				onPaneClick={closeEdgeMenu}
				nodeTypes={nodeTypes}
				fitView
				style={{
					background: 'var(--surface-container-low)',
					borderRadius: '12px',
				}}
			>
				<GraphController
					edgeCount={edges.length}
					layoutTrigger={layoutTrigger}
					agents={agents}
					relationships={relationships}
					setNodes={setNodes}
					savePositions={savePositions}
				/>
				<Background
					gap={20}
					color="var(--outline-variant)"
				/>
				<Controls />
				<MiniMap nodeColor="var(--secondary-container)" />
			</ReactFlow>

			{/* Edge context menu */}
			{edgeMenu && (
				<EdgeContextMenu
					x={edgeMenu.x}
					y={edgeMenu.y}
					edge={edgeMenu.edge}
					onEdit={handleEditEdge}
					onDelete={handleDeleteEdge}
					onClose={closeEdgeMenu}
				/>
			)}

			{/* Create relationship modal */}
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

			{/* Edit relationship modal */}
			{editModal && (
				<RelTypeModal
					agents={agents}
					sourceId={editModal.source}
					targetId={editModal.target}
					initial={editModal.data?.relData}
					onUpdate={(data) => {
						onUpdateRelationship(
							editModal.source,
							editModal.id,
							data,
						);
						setEditModal(null);
					}}
					onClose={() => setEditModal(null)}
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

/** Small floating menu that appears where the user clicked on an edge */
function EdgeContextMenu({ x, y, edge, onEdit, onDelete, onClose }) {
	const containerStyle = {
		position: 'absolute',
		left: x,
		top: y,
		zIndex: 30,
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '9px',
		boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
		minWidth: 160,
		overflow: 'hidden',
	};
	const btnStyle = (danger) => ({
		display: 'block',
		width: '100%',
		padding: '0.55rem 1rem',
		background: 'transparent',
		border: 'none',
		textAlign: 'left',
		fontSize: '0.82rem',
		fontWeight: 600,
		cursor: 'pointer',
		color: danger ? '#dc2626' : 'var(--text-primary)',
	});
	const labelStyle = {
		padding: '0.35rem 1rem 0.2rem',
		fontSize: '0.7rem',
		color: 'var(--text-secondary)',
		fontWeight: 600,
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		borderBottom: '1px solid var(--outline-variant)',
	};

	return (
		<div
			style={containerStyle}
			onClick={(e) => e.stopPropagation()}
		>
			<div style={labelStyle}>{edge.label || edge.id}</div>
			<button
				style={btnStyle(false)}
				onMouseEnter={(e) =>
					(e.currentTarget.style.background =
						'var(--surface-container-high)')
				}
				onMouseLeave={(e) =>
					(e.currentTarget.style.background = 'transparent')
				}
				onClick={onEdit}
			>
				Edit relationship
			</button>
			<button
				style={btnStyle(true)}
				onMouseEnter={(e) =>
					(e.currentTarget.style.background = '#fee2e2')
				}
				onMouseLeave={(e) =>
					(e.currentTarget.style.background = 'transparent')
				}
				onClick={onDelete}
			>
				Remove relationship
			</button>
		</div>
	);
}

/**
 * Modal for creating a new relationship OR editing an existing one.
 * Pass `initial` (the relData object) to pre-fill for editing.
 * Pass `onCreate` for creation, `onUpdate` for editing.
 */
function RelTypeModal({
	agents,
	sourceId,
	targetId,
	initial,
	onCreate,
	onUpdate,
	onClose,
}) {
	const isEdit = Boolean(initial);
	const [typeInput, setTypeInput] = useState(initial?.type ?? 'peer');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [strength, setStrength] = useState(initial?.strength ?? 0.5);
	const [sentiment, setSentiment] = useState(initial?.sentiment ?? 'neutral');

	const srcName =
		agents.find((a) => a.agent_id === sourceId)?.name || sourceId;
	const tgtName =
		agents.find((a) => a.agent_id === targetId)?.name || targetId;

	const filteredSuggestions = REL_TYPES.filter(
		(t) => t.includes(typeInput.toLowerCase()) && t !== typeInput,
	);

	const s = {
		width: '100%',
		padding: '0.45rem 0.7rem',
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '7px',
		fontSize: '0.83rem',
		color: 'var(--text-primary)',
		outline: 'none',
		boxSizing: 'border-box',
	};

	const handleConfirm = () => {
		const trimmed = typeInput.trim();
		if (!trimmed) return;
		const payload = {
			type: trimmed,
			strength,
			sentiment,
			influence_direction: 'both',
		};
		if (isEdit) {
			onUpdate(payload);
		} else {
			onCreate({
				source_agent_id: sourceId,
				target_agent_id: targetId,
				...payload,
			});
		}
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
					{isEdit ? 'Edit Relationship' : 'New Relationship'}
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

				{/* Type: free-text with suggestions */}
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
				<div
					style={{
						position: 'relative',
						marginBottom: '0.6rem',
						marginTop: '0.2rem',
					}}
				>
					<input
						type="text"
						value={typeInput}
						onChange={(e) => {
							setTypeInput(e.target.value);
							setShowSuggestions(true);
						}}
						onFocus={() => setShowSuggestions(true)}
						onBlur={() =>
							setTimeout(() => setShowSuggestions(false), 120)
						}
						placeholder="e.g. peer, rival, advisor…"
						style={s}
					/>
					{showSuggestions && filteredSuggestions.length > 0 && (
						<div
							style={{
								position: 'absolute',
								top: '100%',
								left: 0,
								right: 0,
								background: 'var(--surface-container-lowest)',
								border: '1px solid var(--outline-variant)',
								borderRadius: '7px',
								boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
								zIndex: 40,
								marginTop: 2,
								overflow: 'hidden',
							}}
						>
							{filteredSuggestions.map((t) => (
								<div
									key={t}
									onMouseDown={() => {
										setTypeInput(t);
										setShowSuggestions(false);
									}}
									style={{
										padding: '0.4rem 0.7rem',
										fontSize: '0.82rem',
										cursor: 'pointer',
										color: 'var(--text-primary)',
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.background =
											'var(--surface-container-high)')
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.background =
											'transparent')
									}
								>
									{t}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Sentiment */}
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

				{/* Strength */}
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
						onClick={handleConfirm}
						disabled={!typeInput.trim()}
						style={{
							padding: '0.5rem 1.1rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '7px',
							fontSize: '0.82rem',
							fontWeight: 600,
							cursor: typeInput.trim()
								? 'pointer'
								: 'not-allowed',
							opacity: typeInput.trim() ? 1 : 0.5,
						}}
					>
						{isEdit ? 'Save' : 'Add'}
					</button>
				</div>
			</div>
		</div>
	);
}
