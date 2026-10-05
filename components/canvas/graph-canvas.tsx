"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge as FlowEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ParseResult } from "@/lib/parser/types";
import {
  computeRepositoryFolding,
  type FoldedNode,
  type FoldedEdge,
  type FoldingResult,
} from "@/lib/canvas/folding";
import { computeDagreLayout } from "@/lib/canvas/layout";
import { FolderNode, type FolderNodeData } from "./folder-node";

const nodeTypes = {
  folderNode: FolderNode,
};

interface GraphCanvasInnerProps {
  data: ParseResult;
  folding?: FoldingResult;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  hoveredFilePath?: string | null;
  hoveredNodeId?: string | null;
  selectedCategory?: string | null;
  activeWalkPaths?: Set<string> | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectFile: (filePath: string | null) => void;
  onHoverFile?: (filePath: string | null) => void;
  onHoverNode?: (nodeId: string | null) => void;
}

function GraphCanvasInner({
  data,
  folding: propFolding,
  selectedNodeId,
  selectedFilePath,
  hoveredFilePath = null,
  hoveredNodeId = null,
  selectedCategory = null,
  activeWalkPaths = null,
  onSelectNode,
  onSelectFile,
  onHoverFile = () => {},
  onHoverNode = () => {},
}: GraphCanvasInnerProps) {
  const { fitView, getZoom } = useReactFlow();
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());
  const initialFitDone = useRef(false);

  // Compute repository folding or use provided folding
  const folding = useMemo(() => {
    return propFolding || computeRepositoryFolding(data.files, data.edges);
  }, [propFolding, data.files, data.edges]);

  // Toggle open/closed folder panel
  const handleToggleOpen = useCallback(
    (folderId: string) => {
      setOpenPanels((prev) => {
        const next = new Set(prev);
        if (next.has(folderId)) {
          next.delete(folderId);
        } else {
          next.add(folderId);
        }
        return next;
      });

      // Refit on open: may ONLY ever zoom out, never in
      setTimeout(() => {
        const currentZoom = getZoom();
        fitView({
          maxZoom: currentZoom, // Guarantees refit only zooms out or retains current scale
          padding: 0.15,
          duration: 250,
        });
      }, 50);
    },
    [fitView, getZoom]
  );

  // Determine active/highlighted sets for dimming
  const activeElements = useMemo(() => {
    const activeNodes = new Set<string>();
    const activeEdges = new Set<string>();

    const targetFile = hoveredFilePath || selectedFilePath;
    const targetNode = hoveredNodeId || selectedNodeId;

    if (targetFile) {
      // Highlighting around target file
      for (const e of folding.edges) {
        if (e.source === targetFile || e.target === targetFile) {
          activeEdges.add(e.id);
          activeNodes.add(e.sourceNodeId);
          activeNodes.add(e.targetNodeId);
        }
      }
      const ownerNode = folding.nodeByFile.get(targetFile);
      if (ownerNode) activeNodes.add(ownerNode);
    } else if (targetNode) {
      // Highlighting around target node
      activeNodes.add(targetNode);
      for (const e of folding.edges) {
        if (e.sourceNodeId === targetNode || e.targetNodeId === targetNode) {
          activeEdges.add(e.id);
          activeNodes.add(e.sourceNodeId);
          activeNodes.add(e.targetNodeId);
        }
      }
    }

    // Direct edge between selected file and hovered neighbor file
    if (selectedFilePath && hoveredFilePath && selectedFilePath !== hoveredFilePath) {
      for (const e of folding.edges) {
        if (
          (e.source === selectedFilePath && e.target === hoveredFilePath) ||
          (e.source === hoveredFilePath && e.target === selectedFilePath)
        ) {
          activeEdges.add(e.id);
        }
      }
    }

    // Active walk paths (Blast radius / Dependency chain / Insight highlight)
    if (activeWalkPaths && activeWalkPaths.size > 0) {
      for (const p of activeWalkPaths) {
        const owner = folding.nodeByFile.get(p);
        if (owner) activeNodes.add(owner);
      }
      for (const e of folding.edges) {
        if (activeWalkPaths.has(e.source) && activeWalkPaths.has(e.target)) {
          activeEdges.add(e.id);
        }
      }
    }

    return {
      hasSelection: Boolean(
        selectedFilePath ||
        selectedNodeId ||
        hoveredFilePath ||
        hoveredNodeId ||
        (activeWalkPaths && activeWalkPaths.size > 0)
      ),
      activeNodes,
      activeEdges,
    };
  }, [
    selectedFilePath,
    selectedNodeId,
    hoveredFilePath,
    hoveredNodeId,
    activeWalkPaths,
    folding,
  ]);

  // Compute layout and React Flow nodes
  const flowNodes: Node<FolderNodeData>[] = useMemo(() => {
    const positions = computeDagreLayout(folding.nodes, folding.edges, openPanels);

    return folding.nodes.map((node: FoldedNode) => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const isOpen = openPanels.has(node.id);
      const isSelected = selectedNodeId === node.id;
      const isDimmed =
        activeElements.hasSelection && !activeElements.activeNodes.has(node.id);

      return {
        id: node.id,
        type: "folderNode",
        position: { x: pos.x, y: pos.y },
        data: {
          node,
          isOpen,
          isSelected,
          selectedFilePath,
          hoveredFilePath,
          hoveredNodeId,
          selectedCategory,
          activeWalkPaths,
          isDimmed,
          onToggleOpen: handleToggleOpen,
          onSelectNode: (id: string) => {
            onSelectNode(selectedNodeId === id ? null : id);
            onSelectFile(null);
          },
          onSelectFile: (filePath: string) => {
            onSelectFile(selectedFilePath === filePath ? null : filePath);
            const owner = folding.nodeByFile.get(filePath);
            if (owner) onSelectNode(owner);
          },
          onHoverFile,
          onHoverNode,
        },
      };
    });
  }, [
    folding,
    openPanels,
    selectedNodeId,
    selectedFilePath,
    hoveredFilePath,
    hoveredNodeId,
    selectedCategory,
    activeWalkPaths,
    activeElements,
    handleToggleOpen,
    onSelectNode,
    onSelectFile,
    onHoverFile,
    onHoverNode,
  ]);

  // Compute React Flow edges
  const flowEdges: FlowEdge[] = useMemo(() => {
    const edgesList: FlowEdge[] = [];
    const foldedBundleMap = new Map<string, number>();

    for (const e of folding.edges) {
      const isSourceOpen = openPanels.has(e.sourceNodeId);
      const isTargetOpen = openPanels.has(e.targetNodeId);

      // Both nodes folded: Bundle duplicate edges between identical folder boxes
      if (!isSourceOpen && !isTargetOpen) {
        if (e.sourceNodeId === e.targetNodeId) continue; // Skip intra-folder loops when folded
        const bundleKey = `${e.sourceNodeId}->${e.targetNodeId}`;
        const count = (foldedBundleMap.get(bundleKey) || 0) + 1;
        foldedBundleMap.set(bundleKey, count);

        // Only emit one edge per folder pair when folded
        if (count === 1) {
          const isEdgeActive =
            !activeElements.hasSelection ||
            (activeElements.activeNodes.has(e.sourceNodeId) &&
              activeElements.activeNodes.has(e.targetNodeId));

          edgesList.push({
            id: `bundle:${bundleKey}`,
            source: e.sourceNodeId,
            target: e.targetNodeId,
            sourceHandle: "node-out",
            targetHandle: "node-in",
            type: "smoothstep",
            animated: false,
            style: {
              stroke: isEdgeActive ? "var(--incoming)" : "var(--border)",
              strokeWidth: isEdgeActive ? 1.5 : 1,
              opacity: isEdgeActive ? 0.75 : 0.15,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 8,
              height: 8,
              color: isEdgeActive ? "var(--incoming)" : "var(--border)",
            },
          });
        }
      } else {
        // At least one node is open as a panel: Connect directly to the specific file row
        const sourceHandle = isSourceOpen ? `file-out-${e.source}` : "node-out";
        const targetHandle = isTargetOpen ? `file-in-${e.target}` : "node-in";
        const isEdgeActive =
          !activeElements.hasSelection || activeElements.activeEdges.has(e.id);

        const isWalkEdge =
          activeWalkPaths !== null &&
          activeWalkPaths.has(e.source) &&
          activeWalkPaths.has(e.target);

        const isHoverEdge =
          Boolean(
            (selectedFilePath &&
              hoveredFilePath &&
              ((e.source === selectedFilePath && e.target === hoveredFilePath) ||
                (e.source === hoveredFilePath && e.target === selectedFilePath))) ||
              (hoveredFilePath &&
                !selectedFilePath &&
                (e.source === hoveredFilePath || e.target === hoveredFilePath))
          );

        edgesList.push({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          sourceHandle,
          targetHandle,
          type: "smoothstep",
          animated: isHoverEdge || isWalkEdge || (isEdgeActive && activeElements.hasSelection),
          style: {
            stroke: isHoverEdge
              ? "var(--accent)"
              : isWalkEdge
              ? "var(--accent)"
              : isEdgeActive
              ? e.source === (hoveredFilePath || selectedFilePath)
                ? "var(--outgoing)"
                : "var(--incoming)"
              : "var(--border)",
            strokeWidth: isHoverEdge ? 2.5 : isWalkEdge ? 2 : isEdgeActive ? 1.5 : 0.75,
            opacity: isHoverEdge ? 1 : isWalkEdge ? 1 : isEdgeActive ? 0.9 : 0.15,
            zIndex: isHoverEdge ? 20 : isWalkEdge ? 15 : 0,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: isHoverEdge ? 9 : 7,
            height: isHoverEdge ? 9 : 7,
            color: isHoverEdge
              ? "var(--accent)"
              : isWalkEdge
              ? "var(--accent)"
              : isEdgeActive
              ? e.source === (hoveredFilePath || selectedFilePath)
                ? "var(--outgoing)"
                : "var(--incoming)"
              : "var(--border)",
          },
        });
      }
    }

    return edgesList;
  }, [folding.edges, openPanels, activeElements, selectedFilePath, hoveredFilePath, activeWalkPaths]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync state when dependencies change
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Initial fit on load
  useEffect(() => {
    if (!initialFitDone.current && nodes.length > 0) {
      initialFitDone.current = true;
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
    }
  }, [nodes, fitView]);

  return (
    <div
      className="flex-1 w-full h-full relative"
      onClick={() => {
        onSelectNode(null);
        onSelectFile(null);
        onHoverFile(null);
        onHoverNode(null);
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background
          color="var(--border)"
          gap={16}
          size={1}
          className="bg-[var(--bg-canvas)]"
        />
        <Controls
          showInteractive={false}
          className="!bg-[var(--bg-surface)] !border !border-[var(--border)] !rounded !shadow-xs"
        />
        <MiniMap
          nodeColor="var(--border)"
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-[var(--bg-surface)] !border !border-[var(--border)] !rounded"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
