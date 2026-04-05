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

function CreateNode({ data }) {
	return (
		<div
			onClick={() => data.onCreate && data.onCreate()}
			style={{
				padding: '0.55rem 0.85rem',
				background: 'rgba(99,102,241,0.06)',
				border: '2px dashed var(--outline)',
				borderRadius: '10px',
				width: '200px',
				boxSizing: 'border-box',
				cursor: 'pointer',
				opacity: 0.75,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '0.4rem',
				color: 'var(--text-secondary)',
				fontSize: '0.8rem',
				fontWeight: 600,
				minHeight: '44px',
			}}
		>
			<Plus size={14} />
			New Scenario
			<Handle
				type="source"
				position={Position.Bottom}
				style={{
					background: 'transparent',
					border: 'none',
					width: 0,
					height: 0,
				}}
			/>
		</div>
	);
}

function ScenarioNode({ data }) {
	const color = STATUS_COLOR[data.status] || '#94a3b8';
	const { isHighlighted, isDimmed } = data;
	return (
		<div
			onClick={() => data.onClick && data.onClick(data.scenario)}
			style={{
				padding: '0.55rem 0.85rem',
				background: isHighlighted
					? 'var(--surface-container-low)'
					: 'var(--surface-container-lowest)',
				border: `2px solid ${color}`,
				borderRadius: '10px',
				width: '200px',
				boxSizing: 'border-box',
				cursor: 'pointer',
				boxShadow: isHighlighted
					? `0 0 0 2.5px ${color}, 0 0 14px ${color}55, 0 2px 8px rgba(0,0,0,0.12)`
					: '0 2px 8px rgba(0,0,0,0.07)',
				opacity: isDimmed ? 0.28 : 1,
				transition: 'opacity 0.2s, box-shadow 0.2s',
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
					gap: '0.3rem',
					fontSize: '0.68rem',
					padding: '3px 8px',
					background: 'var(--surface-container)',
					color: 'var(--accent-color)',
					border: '1.5px solid var(--accent-color)',
					borderRadius: 5,
					cursor: 'pointer',
					fontWeight: 700,
					marginTop: 2,
				}}
			>
				<GitBranch size={10} /> Branch here
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

const nodeTypes = { scenarioNode: ScenarioNode, createNode: CreateNode };

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
	selectedScenarioId,
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

	// Compute the full highlighted branch: ancestors + selected + all descendants
	const highlightedIds = useMemo(() => {
		if (!selectedScenarioId) return new Set();
		const byId = new Map(
			normalizedScenarios.map((s) => [s.scenario_id, s]),
		);
		if (!byId.has(selectedScenarioId)) return new Set();

		const childrenMap = {};
		for (const s of normalizedScenarios) childrenMap[s.scenario_id] = [];
		for (const s of normalizedScenarios) {
			if (s.parent_scenario_id && byId.has(s.parent_scenario_id))
				childrenMap[s.parent_scenario_id].push(s.scenario_id);
		}

		const result = new Set([selectedScenarioId]);

		// Walk ancestors to root
		let cur = byId.get(selectedScenarioId);
		while (cur?.parent_scenario_id && byId.has(cur.parent_scenario_id)) {
			result.add(cur.parent_scenario_id);
			cur = byId.get(cur.parent_scenario_id);
		}

		// Walk all descendants (BFS)
		const queue = [selectedScenarioId];
		while (queue.length) {
			const id = queue.shift();
			for (const childId of childrenMap[id] || []) {
				result.add(childId);
				queue.push(childId);
			}
		}

		return result;
	}, [selectedScenarioId, normalizedScenarios]);

	useEffect(() => {
		const positions =
			normalizedScenarios.length > 0
				? layoutTree(normalizedScenarios)
				: {};

		const hasSelection = !!selectedScenarioId;
		const scenarioNodes = normalizedScenarios.map((s) => ({
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
				isHighlighted:
					!hasSelection || highlightedIds.has(s.scenario_id),
				isDimmed: hasSelection && !highlightedIds.has(s.scenario_id),
			},
		}));

		const scenarioEdges = normalizedScenarios
			.filter((s) => s.parent_scenario_id)
			.map((s) => {
				const edgeHighlighted =
					hasSelection &&
					highlightedIds.has(s.parent_scenario_id) &&
					highlightedIds.has(s.scenario_id);
				const edgeDimmed = hasSelection && !edgeHighlighted;
				const strokeColor = edgeHighlighted ? '#818cf8' : '#2563eb';
				return {
					id: `e-${s.parent_scenario_id}-${s.scenario_id}`,
					source: s.parent_scenario_id,
					target: s.scenario_id,
					type: 'default',
					markerEnd: {
						type: MarkerType.ArrowClosed,
						width: 14,
						height: 14,
						color: strokeColor,
					},
					style: {
						stroke: strokeColor,
						strokeWidth: edgeHighlighted ? 3 : 2.2,
						opacity: edgeDimmed ? 0.18 : 0.9,
						transition: 'stroke 0.2s, opacity 0.2s',
					},
				};
			});

		// Determine root IDs (nodes with no valid parent in the set)
		const idSet = new Set(normalizedScenarios.map((s) => s.scenario_id));
		const rootIds = normalizedScenarios
			.filter(
				(s) =>
					!s.parent_scenario_id || !idSet.has(s.parent_scenario_id),
			)
			.map((s) => s.scenario_id);

		// Position create node centred above roots
		let createX = 0;
		const createY = normalizedScenarios.length > 0 ? -(NODE_H + V_GAP) : 0;
		if (rootIds.length > 0) {
			const rootXs = rootIds.map((r) => positions[r]?.x ?? 0);
			const minX = Math.min(...rootXs);
			const maxX = Math.max(...rootXs) + NODE_W;
			createX = (minX + maxX) / 2 - NODE_W / 2;
		}

		const createNode = {
			id: '__create__',
			position: { x: createX, y: createY },
			type: 'createNode',
			sourcePosition: Position.Bottom,
			data: { onCreate: () => onCreate(null) },
		};

		const createEdges = rootIds.map((rootId) => ({
			id: `e-create-${rootId}`,
			source: '__create__',
			target: rootId,
			type: 'default',
			style: {
				stroke: '#94a3b8',
				strokeWidth: 1.5,
				strokeDasharray: '5,4',
				opacity: hasSelection ? 0.15 : 0.55,
				transition: 'opacity 0.2s',
			},
			markerEnd: {
				type: MarkerType.ArrowClosed,
				width: 10,
				height: 10,
				color: '#94a3b8',
			},
		}));

		setNodes([createNode, ...scenarioNodes]);
		setEdges([...scenarioEdges, ...createEdges]);
	}, [
		normalizedScenarios,
		selectedScenarioId,
		highlightedIds,
		onSelectScenario,
		onBranchFrom,
		onCreate,
		setNodes,
		setEdges,
	]);

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
		</div>
	);
}
