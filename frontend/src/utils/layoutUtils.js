import dagre from 'dagre';

/**
 * Compute hierarchical layout for directed graphs using Dagre.
 * Uses a left-to-right orientation which works well for relationship graphs.
 *
 * @param {Array} nodes - Array of node objects with id property
 * @param {Array} edges - Array of edge objects with source and target properties
 * @param {Object} options - Layout configuration
 * @returns {Object} Map of { [nodeId]: { x, y } }
 */
export function dagreLayout(nodes, edges, options = {}) {
    const {
        direction = 'LR', // LR (left-to-right), TB (top-to-bottom), RL (right-to-left), BT (bottom-to-top)
        rankSep = 120, // vertical or horizontal separation between ranks
        nodeSep = 80, // horizontal or vertical separation between nodes in a rank
    } = options;

    // Create a new directed graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: direction,
        ranksep: rankSep,
        nodesep: nodeSep,
        marginx: 30,
        marginy: 30,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes with dimensions (required by Dagre)
    nodes.forEach((node) => {
        g.setNode(node.id, { width: 160, height: 80 });
    });

    // Add edges
    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Extract positions
    const positions = {};
    g.nodes().forEach((nodeId) => {
        const node = g.node(nodeId);
        positions[nodeId] = {
            x: node.x,
            y: node.y,
        };
    });

    return positions;
}

/**
 * Compute hierarchical tree layout for scenario branching using Dagre.
 * Tree-optimized layout that emphasizes parent-child relationships.
 *
 * @param {Array} nodes - Array of node objects with id property
 * @param {Array} edges - Array of edge objects with source and target properties
 * @param {Object} options - Layout configuration
 * @returns {Object} Map of { [nodeId]: { x, y } }
 */
export function dagreTreeLayout(nodes, edges, options = {}) {
    const {
        rankSep = 140, // vertical separation between depths
        nodeSep = 90, // horizontal spacing between siblings
    } = options;

    // Create a directed graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: 'TB', // Top-to-bottom for tree layout
        ranksep: rankSep,
        nodesep: nodeSep,
        marginx: 30,
        marginy: 30,
        edgesep: 10,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes with dimensions
    nodes.forEach((node) => {
        g.setNode(node.id, { width: 200, height: 90 });
    });

    // Add edges
    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Extract positions
    const positions = {};
    g.nodes().forEach((nodeId) => {
        const node = g.node(nodeId);
        positions[nodeId] = {
            x: node.x,
            y: node.y,
        };
    });

    return positions;
}

/**
 * Force-directed layout using Dagre's hierarchical approach.
 * Good for circular/network layouts.
 *
 * @param {Array} nodes - Array of node objects with id property
 * @param {Array} edges - Array of edge objects with source and target properties
 * @returns {Object} Map of { [nodeId]: { x, y } }
 */
export function dagreCircularLayout(nodes, edges) {
    // Use right-to-left for a different perspective
    return dagreLayout(nodes, edges, {
        direction: 'LR',
        rankSep: 150,
        nodeSep: 100,
    });
}
