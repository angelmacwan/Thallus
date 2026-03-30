import React, { useMemo } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const NarrativeTransitionsGraph = ({ narrativeData }) => {
	// Build nodes and edges from narrative transitions
	const { initialNodes, initialEdges } = useMemo(() => {
		if (
			!narrativeData ||
			!narrativeData.top_transitions ||
			narrativeData.top_transitions.length === 0
		) {
			return { initialNodes: [], initialEdges: [] };
		}

		const transitions = narrativeData.top_transitions;

		// Extract unique concepts
		const conceptSet = new Set();
		transitions.forEach((trans) => {
			conceptSet.add(trans.from);
			conceptSet.add(trans.to);
		});

		const concepts = Array.from(conceptSet);

		// Calculate node importance (incoming + outgoing transitions)
		const nodeImportance = {};
		transitions.forEach((trans) => {
			nodeImportance[trans.from] =
				(nodeImportance[trans.from] || 0) + trans.count;
			nodeImportance[trans.to] =
				(nodeImportance[trans.to] || 0) + trans.count;
		});

		// Calculate in-degree and out-degree for coloring
		const outDegree = {};
		const inDegree = {};
		transitions.forEach((trans) => {
			outDegree[trans.from] = (outDegree[trans.from] || 0) + 1;
			inDegree[trans.to] = (inDegree[trans.to] || 0) + 1;
		});

		// Create nodes in a force-directed style layout
		// Position based on role (source vs target heavy)
		const nodes = concepts.map((concept, index) => {
			const out = outDegree[concept] || 0;
			const in_deg = inDegree[concept] || 0;
			const total = out + in_deg;

			// X position: sources on left, sinks on right, balanced in middle
			const balanceRatio = total > 0 ? out / total : 0.5;
			const x = 100 + balanceRatio * 600;

			// Y position: distribute vertically with slight randomness
			const y = 150 + (index * 400) / concepts.length;

			const importance = nodeImportance[concept] || 1;
			const nodeSize = Math.min(60 + importance * 8, 140);

			// Color based on role
			let nodeColor = '#3b82f6'; // blue - balanced
			if (out > in_deg * 1.5) {
				nodeColor = '#8b5cf6'; // purple - source (narrative starter)
			} else if (in_deg > out * 1.5) {
				nodeColor = '#ec4899'; // pink - sink (narrative endpoint)
			}

			return {
				id: concept,
				data: {
					label: concept,
				},
				position: { x, y },
				style: {
					background: nodeColor,
					color: 'white',
					border: '2px solid rgba(255,255,255,0.3)',
					borderRadius: '50%',
					width: nodeSize,
					height: nodeSize,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '12px',
					fontWeight: 600,
					padding: '8px',
					textAlign: 'center',
					wordBreak: 'break-word',
					boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
				},
			};
		});

		// Create directed edges
		const edges = transitions.map((trans, index) => {
			const count = trans.count;

			// Edge styling based on frequency
			let strokeColor = '#94a3b8';
			let strokeWidth = 2;

			if (count >= 5) {
				strokeColor = '#10b981'; // green - high frequency
				strokeWidth = 5;
			} else if (count >= 3) {
				strokeColor = '#3b82f6'; // blue - medium
				strokeWidth = 4;
			} else if (count >= 1) {
				strokeColor = '#f59e0b'; // orange - low
				strokeWidth = 3;
			}

			return {
				id: `e-${trans.from}-${trans.to}-${index}`,
				source: trans.from,
				target: trans.to,
				label: `${count}×`,
				type: 'smoothstep',
				animated: count >= 4,
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: strokeColor,
					width: 20,
					height: 20,
				},
				style: {
					stroke: strokeColor,
					strokeWidth: strokeWidth,
				},
				labelStyle: {
					fontSize: '11px',
					fontWeight: 700,
					fill: strokeColor,
				},
				labelBgStyle: {
					fill: 'rgba(255,255,255,0.95)',
					fillOpacity: 0.9,
				},
			};
		});

		return { initialNodes: nodes, initialEdges: edges };
	}, [narrativeData]);

	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, , onEdgesChange] = useEdgesState(initialEdges);

	if (
		!narrativeData ||
		!narrativeData.top_transitions ||
		narrativeData.top_transitions.length === 0
	) {
		return (
			<div
				style={{
					padding: '2rem',
					textAlign: 'center',
					color: 'var(--text-secondary)',
				}}
			>
				No narrative transitions available
			</div>
		);
	}

	return (
		<div
			style={{
				background: 'var(--surface-container-low)',
				padding: '1.5rem',
				borderRadius: '12px',
			}}
		>
			<h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
				Narrative Transitions Flow
			</h4>
			<p
				style={{
					fontSize: '0.85rem',
					color: 'var(--text-secondary)',
					marginBottom: '1rem',
				}}
			>
				Directed graph showing sequential concept flow in agent
				communications (from → to). Arrow thickness = transition
				frequency. Purple nodes = narrative starters, pink = endpoints,
				blue = transitional concepts.
			</p>
			<div
				style={{
					height: '600px',
					background: 'var(--surface-container)',
					borderRadius: '8px',
					border: '1px solid var(--outline-variant)',
				}}
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					fitView
					attributionPosition="bottom-left"
					minZoom={0.2}
					maxZoom={2}
				>
					<Background
						color="#94a3b8"
						gap={16}
					/>
					<Controls />
					<MiniMap
						nodeColor={(node) => {
							return node.style.background || '#3b82f6';
						}}
						maskColor="rgba(0,0,0,0.1)"
					/>
				</ReactFlow>
			</div>
			<div
				style={{
					marginTop: '1rem',
					display: 'flex',
					gap: '2rem',
					flexWrap: 'wrap',
					fontSize: '0.75rem',
					color: 'var(--text-secondary)',
				}}
			>
				<div>
					<strong
						style={{ display: 'block', marginBottom: '0.5rem' }}
					>
						Node Colors:
					</strong>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.25rem',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '16px',
									height: '16px',
									borderRadius: '50%',
									background: '#8b5cf6',
								}}
							/>
							<span>Source (starts narratives)</span>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '16px',
									height: '16px',
									borderRadius: '50%',
									background: '#3b82f6',
								}}
							/>
							<span>Transitional (balanced)</span>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '16px',
									height: '16px',
									borderRadius: '50%',
									background: '#ec4899',
								}}
							/>
							<span>Sink (ends narratives)</span>
						</div>
					</div>
				</div>
				<div>
					<strong
						style={{ display: 'block', marginBottom: '0.5rem' }}
					>
						Edge Thickness:
					</strong>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.25rem',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '5px',
									height: '16px',
									background: '#10b981',
								}}
							/>
							<span>High frequency (5+)</span>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '4px',
									height: '16px',
									background: '#3b82f6',
								}}
							/>
							<span>Medium (3-4)</span>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<div
								style={{
									width: '3px',
									height: '16px',
									background: '#f59e0b',
								}}
							/>
							<span>Low (1-2)</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NarrativeTransitionsGraph;
