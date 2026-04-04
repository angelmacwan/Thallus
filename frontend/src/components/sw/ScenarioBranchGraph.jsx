import React, { useEffect } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	MarkerType,
	useNodesState,
	useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, GitBranch } from 'lucide-react';

const STATUS_COLOR = {
	idle: '#6366f1',
	running: '#f59e0b',
	completed: '#16a34a',
	failed: '#dc2626',
	pending: '#94a3b8',
};

function ScenarioNode({ data }) {
	const color = STATUS_COLOR[data.status] || '#94a3b8';
	return (
		<div
			onClick={() => data.onClick && data.onClick(data.scenario)}
			style={{
				padding: '0.55rem 0.85rem',
				background: 'var(--surface-container-lowest)',
				border: `2px solid ${color}`,
				borderRadius: '10px',
				minWidth: '130px',
				cursor: 'pointer',
				boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
			}}
		>
			<div
				style={{
					fontSize: '0.78rem',
					fontWeight: 700,
					color: 'var(--text-primary)',
					marginBottom: 2,
				}}
			>
				{data.label}
			</div>
			<div
				style={{
					fontSize: '0.65rem',
					fontWeight: 600,
					color,
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
					marginBottom: 4,
				}}
			>
				{data.status}
			</div>
			<button
				onClick={(e) => {
					e.stopPropagation();
					data.onBranch && data.onBranch(data.scenario);
				}}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: '0.25rem',
					fontSize: '0.65rem',
					padding: '2px 7px',
					background: 'var(--secondary-container)',
					color: 'var(--on-secondary-container)',
					border: 'none',
					borderRadius: 5,
					cursor: 'pointer',
					fontWeight: 600,
				}}
			>
				<GitBranch size={10} /> Branch
			</button>
		</div>
	);
}

const nodeTypes = { scenarioNode: ScenarioNode };

function layoutTree(scenarios) {
	// BFS layered layout
	const children = {};
	const roots = [];
	for (const s of scenarios) {
		if (!s.parent_scenario_id) {
			roots.push(s.scenario_id);
		} else {
			if (!children[s.parent_scenario_id])
				children[s.parent_scenario_id] = [];
			children[s.parent_scenario_id].push(s.scenario_id);
		}
	}

	const positions = {};
	const colCountPerDepth = {};

	const assignPositions = (id, depth) => {
		if (!colCountPerDepth[depth]) colCountPerDepth[depth] = 0;
		const col = colCountPerDepth[depth]++;
		positions[id] = { x: col * 220, y: depth * 130 };
		(children[id] || []).forEach((cid) => assignPositions(cid, depth + 1));
	};
	roots.forEach((id) => assignPositions(id, 0));

	return positions;
}

export default function ScenarioBranchGraph({
	scenarios,
	onSelectScenario,
	onBranchFrom,
	onCreate,
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	useEffect(() => {
		if (!scenarios || scenarios.length === 0) {
			setNodes([]);
			setEdges([]);
			return;
		}
		const positions = layoutTree(scenarios);

		const n = scenarios.map((s) => ({
			id: s.scenario_id,
			position: positions[s.scenario_id] || { x: 0, y: 0 },
			type: 'scenarioNode',
			data: {
				label: s.name,
				status: s.status || 'idle',
				scenario: s,
				onClick: onSelectScenario,
				onBranch: onBranchFrom,
			},
		}));

		const e = scenarios
			.filter((s) => s.parent_scenario_id)
			.map((s) => ({
				id: `e-${s.parent_scenario_id}-${s.scenario_id}`,
				source: s.parent_scenario_id,
				target: s.scenario_id,
				markerEnd: { type: MarkerType.ArrowClosed },
				style: { stroke: 'var(--outline-variant)', strokeWidth: 2 },
			}));

		setNodes(n);
		setEdges(e);
	}, [scenarios]);

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			{/* Empty state */}
			{(!scenarios || scenarios.length === 0) && (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '0.5rem',
						zIndex: 5,
						pointerEvents: 'none',
					}}
				>
					<GitBranch
						size={32}
						color="var(--text-secondary)"
					/>
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
							margin: 0,
						}}
					>
						No scenarios yet
					</p>
				</div>
			)}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				fitView
				style={{
					background: 'var(--surface-container-low)',
					borderRadius: '12px',
				}}
			>
				<Background
					gap={20}
					color="var(--outline-variant)"
				/>
				<Controls />
			</ReactFlow>

			{/* Add root scenario FAB */}
			<button
				onClick={() => onCreate(null)}
				style={{
					position: 'absolute',
					bottom: 16,
					right: 16,
					display: 'flex',
					alignItems: 'center',
					gap: '0.4rem',
					padding: '0.5rem 1rem',
					background: 'var(--accent-color)',
					color: '#fff',
					border: 'none',
					borderRadius: '8px',
					fontSize: '0.82rem',
					fontWeight: 600,
					cursor: 'pointer',
					zIndex: 10,
					boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				}}
			>
				<Plus size={14} /> New Scenario
			</button>
		</div>
	);
}
