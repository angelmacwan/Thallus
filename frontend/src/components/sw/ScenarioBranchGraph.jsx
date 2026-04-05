import React, { useEffect, useMemo } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	Handle,
	MarkerType,
	Position,
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
				width: '200px',
				boxSizing: 'border-box',
				cursor: 'pointer',
				boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
				position: 'relative',
			}}
		>
			<Handle
				type="target"
				position={Position.Top}
				style={{
					background: '#2563eb',
					width: 8,
					height: 8,
					border: 'none',
				}}
			/>
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
			<Handle
				type="source"
				position={Position.Bottom}
				style={{
					background: '#2563eb',
					width: 8,
					height: 8,
					border: 'none',
				}}
			/>
		</div>
	);
}

const nodeTypes = { scenarioNode: ScenarioNode };

const NODE_W = 200;
const NODE_H = 90;
const H_GAP = 20; // horizontal gap between sibling nodes (px)
const V_GAP = 110; // vertical gap between depth levels
const ROOT_GAP = 40; // extra gap between separate root trees

function normalizeScenarioTree(scenarios) {
	if (!Array.isArray(scenarios) || scenarios.length === 0) return [];

	const flat = [];
	const seen = new Set();

	const visit = (scenario, parentId = null) => {
		if (
			!scenario ||
			!scenario.scenario_id ||
			seen.has(scenario.scenario_id)
		) {
			return;
		}
		seen.add(scenario.scenario_id);

		flat.push({
			...scenario,
			parent_scenario_id: scenario.parent_scenario_id || parentId || null,
		});

		const children = Array.isArray(scenario.children)
			? [...scenario.children]
			: [];

		children
			.sort((a, b) => {
				const aTime = a?.created_at ? Date.parse(a.created_at) : 0;
				const bTime = b?.created_at ? Date.parse(b.created_at) : 0;
				if (aTime !== bTime) return aTime - bTime;
				return (a?.name || '').localeCompare(b?.name || '');
			})
			.forEach((child) => visit(child, scenario.scenario_id));
	};

	const rootCandidates = [...scenarios].sort((a, b) => {
		const aTime = a?.created_at ? Date.parse(a.created_at) : 0;
		const bTime = b?.created_at ? Date.parse(b.created_at) : 0;
		if (aTime !== bTime) return aTime - bTime;
		return (a?.name || '').localeCompare(b?.name || '');
	});

	rootCandidates.forEach((root) => visit(root));

	return flat;
}

function layoutTree(scenarios) {
	if (!Array.isArray(scenarios) || scenarios.length === 0) return {};

	const byId = new Map();
	for (const s of scenarios) {
		if (s?.scenario_id) byId.set(s.scenario_id, s);
	}

	// Build adjacency
	const children = {};
	const roots = [];

	for (const s of scenarios) {
		if (!s?.scenario_id) continue;
		if (!children[s.scenario_id]) children[s.scenario_id] = [];
	}
	for (const s of scenarios) {
		if (!s?.scenario_id) continue;
		const hasValidParent =
			s.parent_scenario_id && byId.has(s.parent_scenario_id);
		if (!hasValidParent) {
			roots.push(s.scenario_id);
		} else {
			if (!children[s.parent_scenario_id])
				children[s.parent_scenario_id] = [];
			children[s.parent_scenario_id].push(s.scenario_id);
		}
	}

	for (const nodeId of Object.keys(children)) {
		children[nodeId].sort((aId, bId) => {
			const a = byId.get(aId);
			const b = byId.get(bId);
			const aTime = a?.created_at ? Date.parse(a.created_at) : 0;
			const bTime = b?.created_at ? Date.parse(b.created_at) : 0;
			if (aTime !== bTime) return aTime - bTime;
			return (a?.name || '').localeCompare(b?.name || '');
		});
	}

	// Post-order: compute the minimum width each subtree needs
	const subtreeWidth = {};
	const widthVisited = new Set();
	const computeWidth = (id) => {
		if (widthVisited.has(id)) {
			return subtreeWidth[id] || NODE_W;
		}
		widthVisited.add(id);
		const kids = children[id] || [];
		if (kids.length === 0) {
			subtreeWidth[id] = NODE_W;
			return NODE_W;
		}
		const total =
			kids.reduce((sum, kid) => sum + computeWidth(kid), 0) +
			H_GAP * (kids.length - 1);
		subtreeWidth[id] = Math.max(NODE_W, total);
		return subtreeWidth[id];
	};
	roots.forEach((r) => computeWidth(r));

	// Pre-order: assign (x, y) by centering each node over its subtree
	const positions = {};
	const posVisited = new Set();
	const assignPos = (id, left, depth) => {
		if (posVisited.has(id)) return;
		posVisited.add(id);
		const width = subtreeWidth[id];
		positions[id] = {
			x: left + (width - NODE_W) / 2,
			y: depth * (NODE_H + V_GAP),
		};
		const kids = children[id] || [];
		let childLeft = left;
		for (const kid of kids) {
			assignPos(kid, childLeft, depth + 1);
			childLeft += subtreeWidth[kid] + H_GAP;
		}
	};

	let rootLeft = 0;
	for (const r of roots) {
		assignPos(r, rootLeft, 0);
		rootLeft += subtreeWidth[r] + ROOT_GAP;
	}

	return positions;
}

export default function ScenarioBranchGraph({
	scenarios,
	onSelectScenario,
	onBranchFrom,
	onCreate,
}) {
	const normalizedScenarios = useMemo(
		() => normalizeScenarioTree(scenarios),
		[scenarios],
	);

	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	useEffect(() => {
		if (!normalizedScenarios || normalizedScenarios.length === 0) {
			setNodes([]);
			setEdges([]);
			return;
		}
		const positions = layoutTree(normalizedScenarios);

		const n = normalizedScenarios.map((s) => ({
			id: s.scenario_id,
			position: positions[s.scenario_id] || { x: 0, y: 0 },
			type: 'scenarioNode',
			sourcePosition: Position.Bottom,
			targetPosition: Position.Top,
			data: {
				label: s.name,
				status: s.status || 'idle',
				scenario: s,
				onClick: onSelectScenario,
				onBranch: onBranchFrom,
			},
		}));

		const e = normalizedScenarios
			.filter((s) => s.parent_scenario_id)
			.map((s) => ({
				id: `e-${s.parent_scenario_id}-${s.scenario_id}`,
				source: s.parent_scenario_id,
				target: s.scenario_id,
				type: 'default',
				markerEnd: {
					type: MarkerType.ArrowClosed,
					width: 14,
					height: 14,
					color: '#2563eb',
				},
				style: {
					stroke: '#2563eb',
					strokeWidth: 2.2,
					opacity: 0.9,
				},
			}));

		setNodes(n);
		setEdges(e);
	}, [
		normalizedScenarios,
		onSelectScenario,
		onBranchFrom,
		setNodes,
		setEdges,
	]);

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
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable
				fitView
				fitViewOptions={{
					padding: 0.25,
					includeHiddenNodes: false,
				}}
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
