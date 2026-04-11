# Auto-layout Implementation Guide

## Overview

Implemented professional, Dagre-based auto-layout for both relationship graphs and scenario trees in the Small World component.

## What Changed

### 1. **Layout Utilities** (`src/utils/layoutUtils.js`)

New utility file that provides Dagre-based layout algorithms:

#### `dagreLayout(nodes, edges, options)`

Used for **Agent Relationship Graph** - handles arbitrary relationship networks

- **Direction**: Left-to-right (LR) for hierarchical view of relationships
- **Respects**: Number and direction of edges for intelligent positioning
- **Options**: `direction`, `rankSep` (120px), `nodeSep` (80px)

#### `dagreTreeLayout(nodes, edges, options)`

Used for **Scenario Branch Graph** - optimized for tree structures

- **Direction**: Top-to-bottom (TB) for parent-child relationships
- **Handles**: Multiple root scenarios with proper spacing
- **Options**: `rankSep` (140px), `nodeSep` (90px)

### 2. **Agent Relationship Graph** (`src/components/sw/AgentRelationshipGraph.jsx`)

**Changes:**

- Replaced custom grid layout with Dagre hierarchical layout
- Updated `GraphController` to use relationship data for layout computation
- Maintains auto-layout button ("Auto-layout" button in toolbar)
- Preserves position caching in localStorage for user experience
- Edges are now factored into layout positioning

**Result:** Relationships are now displayed in a clean hierarchical structure that respects the flow of connections.

### 3. **Scenario Branch Graph** (`src/components/sw/ScenarioBranchGraph.jsx`)

**Changes:**

- Replaced complex custom tree algorithm with Dagre tree layout
- Removed manual width/spacing constants (cleaner code)
- Maintains all visual styling and interactions
- Better automatic spacing for multiple root scenarios

**Result:** Scenario trees now benefit from professional graph layout engine while keeping all UI polish.

## Usage

### For End Users

- **Agent Relations Tab**: Click the "Auto-layout" button to reorganize the graph
- Positions are automatically saved, so layouts persist across sessions
- Dragging nodes still works and updates saved positions

### For Developers

```javascript
// Import the layout utilities
import {
	dagreLayout,
	dagreTreeLayout,
	dagreCircularLayout,
} from './utils/layoutUtils';

// Layout a relationship graph
const positions = dagreLayout(nodes, edges, {
	direction: 'LR', // left-to-right
	rankSep: 130, // spacing between ranks
	nodeSep: 90, // spacing between nodes
});

// Layout a tree structure
const positions = dagreTreeLayout(nodes, edges, {
	rankSep: 140, // vertical spacing
	nodeSep: 90, // horizontal spacing
});
```

## Configuration Options

### `dagreLayout` (Relationship Graphs)

- `direction`: 'LR' | 'TB' | 'RL' | 'BT'
    - LR: Left-to-right (default for relationships)
    - TB: Top-to-bottom (alternative view)
    - RL: Right-to-left
    - BT: Bottom-to-top
- `rankSep`: Vertical (TB/BT) or horizontal (LR/RL) spacing between ranks (default: 120)
- `nodeSep`: Spacing between nodes in same rank (default: 80)

### `dagreTreeLayout` (Scenario Trees)

- `rankSep`: Vertical spacing between tree depths (default: 140)
- `nodeSep`: Horizontal spacing between sibling nodes (default: 90)

## Dependencies

- **dagre**: Already installed in `frontend/package.json`
- **@xyflow/react**: Existing dependency for React Flow visualization

## Benefits

✅ Professional, automatic graph layouts  
✅ Handles complex relationship networks intelligently  
✅ Works with multiple disconnected graphs  
✅ Maintains all interactive features (dragging, clicking, styling)  
✅ Positions persist in localStorage  
✅ Cleaner, more maintainable code  
✅ Respects graph topology and edge relationships

## Testing

The implementation has been validated:

- No TypeScript/ESLint errors
- Backward compatible with existing UI/UX
- Maintains all highlighting and selection features
- Edge context menus and relationship editing still work
- Scenario branching and tree highlighting preserved
