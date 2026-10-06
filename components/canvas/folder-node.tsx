"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import type { FoldedNode } from "@/lib/canvas/folding";
import type { ParsedFile } from "@/lib/parser/types";
import { MAX_PANEL_ROWS } from "@/lib/canvas/layout";
import { isFileMatchingCategory } from "@/lib/canvas/categories";

export interface FolderNodeData {
  node: FoldedNode;
  isOpen: boolean;
  isSelected: boolean;
  selectedFilePath: string | null;
  hoveredFilePath: string | null;
  hoveredNodeId?: string | null;
  selectedCategory?: string | null;
  activeWalkPaths?: Set<string> | null;
  isDimmed: boolean;
  onToggleOpen: (folderId: string) => void;
  onSelectNode: (folderId: string) => void;
  onSelectFile: (filePath: string) => void;
  onHoverFile?: (filePath: string | null) => void;
  onHoverNode?: (folderId: string | null) => void;
  [key: string]: unknown;
}

interface FolderNodeProps {
  data: FolderNodeData;
}

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#0284c7",
  js: "#f59e0b",
  jsx: "#ea580c",
  mjs: "#d97706",
  json: "#10b981",
  css: "#ec4899",
};

function areFolderNodePropsEqual(prev: FolderNodeProps, next: FolderNodeProps): boolean {
  const p = prev.data;
  const n = next.data;

  if (
    p.node !== n.node ||
    p.isOpen !== n.isOpen ||
    p.isSelected !== n.isSelected ||
    p.isDimmed !== n.isDimmed ||
    p.selectedCategory !== n.selectedCategory ||
    p.selectedFilePath !== n.selectedFilePath ||
    p.activeWalkPaths !== n.activeWalkPaths
  ) {
    return false;
  }

  // Only open panels need to re-render when a hovered file belongs to this node
  if (p.isOpen && n.isOpen) {
    const pHasHovered = Boolean(p.hoveredFilePath && p.node.files.some((f) => f.path === p.hoveredFilePath));
    const nHasHovered = Boolean(n.hoveredFilePath && n.node.files.some((f) => f.path === n.hoveredFilePath));
    if (pHasHovered || nHasHovered) {
      if (p.hoveredFilePath !== n.hoveredFilePath) {
        return false;
      }
    }
  }

  return true;
}

export const FolderNode = memo(function FolderNode({ data }: FolderNodeProps) {
  const {
    node,
    isOpen,
    isSelected,
    selectedFilePath,
    hoveredFilePath,
    selectedCategory = null,
    activeWalkPaths = null,
    isDimmed,
    onToggleOpen,
    onSelectNode,
    onSelectFile,
    onHoverFile,
    onHoverNode,
  } = data;

  const updateNodeInternals = useUpdateNodeInternals();
  const listRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFileMouseEnter = useCallback((filePath: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    onHoverFile?.(filePath);
  }, [onHoverFile]);

  const handleFileMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      onHoverFile?.(null);
      hoverTimeoutRef.current = null;
    }, 40);
  }, [onHoverFile]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    updateNodeInternals(node.id);
  }, [node.id, updateNodeInternals]);

  useEffect(() => {
    if (isOpen) {
      updateNodeInternals(node.id);
    }
  }, [isOpen, node.id, updateNodeInternals]);

  useEffect(() => {
    if (!isOpen || !selectedFilePath || !listRef.current) return;
    const selectedEl = listRef.current.querySelector<HTMLElement>('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isOpen, selectedFilePath]);

  const matchedFilesCount = selectedCategory
    ? node.files.filter((f) => isFileMatchingCategory(f, selectedCategory)).length
    : node.files.length;
  const isDimmedByCategory = selectedCategory !== null && matchedFilesCount === 0;

  const isNodeInActiveWalk = activeWalkPaths ? node.files.some((f) => activeWalkPaths.has(f.path)) : false;
  const isDimmedByWalk = activeWalkPaths !== null && !isNodeInActiveWalk;

  const opacityClass = isDimmed || isDimmedByCategory || isDimmedByWalk ? "opacity-25" : "opacity-100";

  // When node is OPEN: Renders as a Panel containing file rows
  if (isOpen) {
    const hasMoreFiles = node.files.length > MAX_PANEL_ROWS;

    return (
      <div
        className={`w-[320px] rounded border ${
          isSelected
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
            : isNodeInActiveWalk
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
            : "border-[var(--border)]"
        } bg-[var(--bg-surface)] shadow-md text-xs font-mono select-none ${opacityClass}`}
      >
        {/* Node-level target handle at left */}
        <Handle
          type="target"
          position={Position.Left}
          id="node-in"
          className="!bg-[var(--border)] !w-2 !h-2 pointer-events-none"
        />

        {/* Panel Header: Clicking or double clicking closes back to single node */}
        <div
          data-panel-header="true"
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen(node.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onToggleOpen(node.id);
          }}
          className="h-9 px-2.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] cursor-pointer"
          title={`Click or double-click to fold back (${node.folder})`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Collapse indicator chevron */}
            <span className="text-[10px] text-[var(--text-muted)] font-bold">▼</span>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
              {node.label}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] border border-[var(--border)] px-1 rounded bg-[var(--bg-surface)] shrink-0">
              {selectedCategory ? `${matchedFilesCount}/${node.fileCount}` : node.fileCount}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono">
            <span className="text-[var(--incoming)] flex items-center gap-0.5" title="Incoming dependents (fan-in)">
              <span>↓</span>
              <span>{node.fanIn}</span>
            </span>
            <span className="text-[var(--outgoing)] flex items-center gap-0.5" title="Outgoing dependencies (fan-out)">
              <span>↑</span>
              <span>{node.fanOut}</span>
            </span>
          </div>
        </div>

        {/* File Rows List - scrollable through all files */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="max-h-[240px] overflow-y-auto overflow-x-hidden nowheel nodrag custom-scrollbar py-1 flex flex-col divide-y divide-[var(--border-subtle)]"
        >
          {node.files.map((file: ParsedFile) => {
            const isFileSelected = selectedFilePath === file.path;
            const isFileHovered = hoveredFilePath === file.path;
            const isRowDimmedByCategory =
              selectedCategory !== null && !isFileMatchingCategory(file, selectedCategory);
            const isInActiveWalk = activeWalkPaths ? activeWalkPaths.has(file.path) : false;
            const isRowDimmedByWalk = activeWalkPaths !== null && !isInActiveWalk;
            const isRowDimmed = isRowDimmedByCategory || isRowDimmedByWalk;
            const extColor = EXT_COLORS[file.extension] || "var(--text-muted)";

            return (
              <div
                key={file.path}
                data-file-row="true"
                data-selected={isFileSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFile(file.path);
                }}
                onMouseEnter={() => handleFileMouseEnter(file.path)}
                onMouseLeave={handleFileMouseLeave}
                className={`relative h-6 px-2.5 flex items-center justify-between cursor-pointer text-[11px] ${
                  isRowDimmed ? "opacity-20 hover:opacity-80" : "opacity-100"
                } ${
                  isFileSelected
                    ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                    : isInActiveWalk
                    ? "bg-[var(--accent-muted)]/30 text-[var(--accent)] ring-1 ring-[var(--accent)] font-medium"
                    : isFileHovered
                    ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                    : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                }`}
                title={file.path}
              >
                {/* File Row Target Handle (incoming edge to this file) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`file-in-${file.path}`}
                  className="!w-1.5 !h-1.5 !bg-[var(--incoming)] !border-none z-10 pointer-events-none"
                  style={{ left: "0px" }}
                />

                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: extColor }}
                  />
                  <span className="truncate">{file.name}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                  <span>{file.linesCount}L</span>
                  <span className="text-[var(--incoming)]" title="Incoming file fan-in">
                    ↓{file.fanIn}
                  </span>
                </div>

                {/* File Row Source Handle (outgoing edge from this file) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`file-out-${file.path}`}
                  className="!w-1.5 !h-1.5 !bg-[var(--outgoing)] !border-none z-10 pointer-events-none"
                  style={{ right: "0px" }}
                />
              </div>
            );
          })}
        </div>

        {/* Footer indicator when more files are scrollable */}
        {hasMoreFiles && (
          <div className="h-6 px-2.5 flex items-center justify-between text-[10px] text-[var(--text-muted)] bg-[var(--bg-subtle)]/60 border-t border-[var(--border-subtle)] font-mono shrink-0 select-none">
            <span>{node.files.length} files</span>
            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
              <span>scroll for more</span>
              <span className="text-[9px]">↕</span>
            </span>
          </div>
        )}


        {/* Node-level source handle at right */}
        <Handle
          type="source"
          position={Position.Right}
          id="node-out"
          className="!bg-[var(--border)] !w-2 !h-2 pointer-events-none"
        />
      </div>
    );
  }

  // When node is FOLDED: Single compact box whose height carries dependent fan-in
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onToggleOpen(node.id);
      }}
      style={{
        width: `${node.width}px`,
        height: `${node.height}px`,
      }}
      className={`rounded border ${
        isSelected
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-md"
          : isNodeInActiveWalk
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)] shadow-md"
          : "border-[var(--border)] hover:border-[var(--accent)] hover:ring-1 hover:ring-[var(--accent)] hover:shadow-xs"
      } bg-[var(--bg-surface)] shadow-xs cursor-pointer text-xs font-mono select-none flex flex-col justify-between p-2 relative ${opacityClass}`}
      title={`Folder: ${node.folder}\nDouble-click to open panel\n${node.fileCount} files${selectedCategory ? ` (${matchedFilesCount} matched)` : ""}, ${node.fanIn} incoming dependents`}
    >
      {/* Left Handle (Incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        id="node-in"
        className="!bg-[var(--incoming)] !w-2 !h-2 !border-none pointer-events-none"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            data-toggle-button="true"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen(node.id);
            }}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] p-0.5 rounded cursor-pointer"
            title="Open folder into panel"
          >
            ▶
          </button>
          <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
            {node.label}
          </span>
        </div>

        <span className="text-[10px] text-[var(--text-secondary)] border border-[var(--border)] px-1 rounded bg-[var(--bg-subtle)] shrink-0">
          {selectedCategory ? `${matchedFilesCount}/${node.fileCount}` : node.fileCount}
        </span>
      </div>

      {/* Metrics Row Carrying Fan-in (height-scaled area) */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
        <span
          className="text-[var(--incoming)] flex items-center gap-0.5 font-medium"
          title={`${node.fanIn} external files depend on this folder`}
        >
          <span>↓</span>
          <span>{node.fanIn} in</span>
        </span>
        <span
          className="text-[var(--outgoing)] flex items-center gap-0.5"
          title={`${node.fanOut} external files this folder depends on`}
        >
          <span>↑</span>
          <span>{node.fanOut} out</span>
        </span>
      </div>

      {/* Right Handle (Outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        id="node-out"
        className="!bg-[var(--outgoing)] !w-2 !h-2 !border-none pointer-events-none"
      />
    </div>
  );
}, areFolderNodePropsEqual);
