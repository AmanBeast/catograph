import dagre from "dagre";
import type { FoldedNode, FoldedEdge } from "./folding";

export interface NodeLayoutDimensions {
  width: number;
  height: number;
}

export interface NodeLayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MAX_PANEL_ROWS = 10;
export const ROW_HEIGHT = 24;
export const PANEL_HEADER_HEIGHT = 36;
export const PANEL_FOOTER_HEIGHT = 24;

/**
 * Computes dimensions for a node depending on whether it is folded or open as a panel.
 */
export function getNodeDimensions(node: FoldedNode, isOpen: boolean): NodeLayoutDimensions {
  if (!isOpen) {
    return {
      width: node.width,
      height: node.height,
    };
  }

  // Open panel: fixed width, height carries visible rows + header + footer
  const visibleRows = Math.min(node.files.length, MAX_PANEL_ROWS);
  const hasMore = node.files.length > MAX_PANEL_ROWS;
  const height =
    PANEL_HEADER_HEIGHT +
    visibleRows * ROW_HEIGHT +
    (hasMore ? PANEL_FOOTER_HEIGHT : 0) +
    12;

  return {
    width: 320,
    height,
  };
}

/**
 * Computes deterministic dagre layout for the active graph state.
 */
export function computeDagreLayout(
  nodes: FoldedNode[],
  edges: FoldedEdge[],
  openPanels: Set<string>
): Map<string, NodeLayoutPosition> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    ranksep: 100,
    nodesep: 32,
    align: "UL",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const isOpen = openPanels.has(node.id);
    const dims = getNodeDimensions(node, isOpen);
    g.setNode(node.id, { width: dims.width, height: dims.height });
  }

  // Deduplicate node-to-node edges for cleaner layout
  const edgePairs = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceNodeId === edge.targetNodeId) continue;
    const pairKey = `${edge.sourceNodeId}->${edge.targetNodeId}`;
    if (!edgePairs.has(pairKey)) {
      edgePairs.add(pairKey);
      g.setEdge(edge.sourceNodeId, edge.targetNodeId);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, NodeLayoutPosition>();

  for (const node of nodes) {
    const layoutNode = g.node(node.id);
    if (layoutNode) {
      // Dagre gives center (x, y); convert to top-left for React Flow
      const x = layoutNode.x - layoutNode.width / 2;
      const y = layoutNode.y - layoutNode.height / 2;
      positions.set(node.id, {
        x,
        y,
        width: layoutNode.width,
        height: layoutNode.height,
      });
    }
  }

  return positions;
}
