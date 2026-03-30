import React, { useMemo } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const ConceptCooccurrenceGraph = ({ cooccurrenceData }) => {
	// Build nodes and edges from co-occurrence data
	const { initialNodes, initialEdges } = useMemo(() => {
		if (!cooccurrenceData || cooccurrenceData.length === 0) {
			return { initialNodes: [], initialEdges: [] };
		}

		// Extract unique concepts
		const conceptSet = new Set();
		cooccurrenceData.forEach((item) => {
			conceptSet.add(item.pair[0]);
			conceptSet.add(item.pair[1]);
		});

		const concepts = Array.from(conceptSet);

		// Calculate node sizes based on how many connections they have
		const connectionCount = {};
		cooccurrenceData.forEach((item) => {
			connectionCount[item.pair[0]] =
				(connectionCount[item.pair[0]] || 0) + 1;
			connectionCount[item.pair[1]] =
				(connectionCount[item.pair[1]] || 0) + 1;
		});

		// Create nodes in a circular layout
		const nodes = concepts.map((concept, index) => {
			const angle = (index / concepts.length) * 2 * Math.PI;
			const radius = 200 + concepts.length * 5; // Adjust radius based on number of nodes
			const x = 400 + radius * Math.cos(angle);
			const y = 300 + radius * Math.sin(angle);

			const connections = connectionCount[concept] || 1;
			const nodeSize = Math.min(80 + connections * 15, 150);

			// Color based on connectivity
			let nodeColor = '#3b82f6'; // blue
			if (connections > 5) {
				nodeColor = '#10b981'; // green - highly connected
			} else if (connections <= 2) {
				nodeColor = '#f59e0b'; // orange - loosely connected
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
				},
			};
		});

		// Create edges with weights based on Jaccard similarity
		const edges = cooccurrenceData.map((item, index) => {
			const jaccard = item.jaccard;

			// Edge styling based on strength
			let strokeColor = '#94a3b8'; // default gray
			let strokeWidth = 1;

			if (jaccard >= 0.8) {
				strokeColor = '#10b981'; // green for strong
				strokeWidth = 4;
			} else if (jaccard >= 0.5) {
				strokeColor = '#3b82f6'; // blue for medium
				strokeWidth = 3;
			} else if (jaccard >= 0.3) {
				strokeColor = '#f59e0b'; // orange for weak
				strokeWidth = 2;
			}

			return {
				id: `e-${item.pair[0]}-${item.pair[1]}-${index}`,
				source: item.pair[0],
				target: item.pair[1],
				label: jaccard.toFixed(2),
				type: 'default',
				animated: jaccard >= 0.7, // Animate strong connections
				style: {
					stroke: strokeColor,
					strokeWidth: strokeWidth,
				},
				labelStyle: {
					fontSize: '10px',
					fontWeight: 600,
					fill: strokeColor,
				},
				labelBgStyle: {
					fill: 'rgba(255,255,255,0.9)',
				},
			};
		});

		return { initialNodes: nodes, initialEdges: edges };
	}, [cooccurrenceData]);

	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, , onEdgesChange] = useEdgesState(initialEdges);

	if (!cooccurrenceData || cooccurrenceData.length === 0) {
		return (
			<div
				style={{
					padding: '2rem',
					textAlign: 'center',
					color: 'var(--text-secondary)',
				}}
			>
				No co-occurrence data available
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
				Concept Co-occurrence Network
			</h4>
			<p
				style={{
					fontSize: '0.85rem',
					color: 'var(--text-secondary)',
					marginBottom: '1rem',
				}}
			>
				Interactive graph showing how concepts co-occur in agent
				communications. Node size = connectivity. Edge thickness =
				strength (Jaccard similarity). Green edges = strong coupling
				(0.8+), blue = medium (0.5+), orange = weak (0.3+).
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
					gap: '1.5rem',
					flexWrap: 'wrap',
					fontSize: '0.75rem',
					color: 'var(--text-secondary)',
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
							width: '3px',
							height: '16px',
							background: '#10b981',
						}}
					/>
					<span>Strong (0.8+)</span>
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
							width: '2px',
							height: '16px',
							background: '#3b82f6',
						}}
					/>
					<span>Medium (0.5+)</span>
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
							width: '2px',
							height: '16px',
							background: '#f59e0b',
						}}
					/>
					<span>Weak (0.3+)</span>
				</div>
			</div>
		</div>
	);
};

export default ConceptCooccurrenceGraph;
