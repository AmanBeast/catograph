"use client";

import React from "react";
import type { ParseResult } from "@/lib/parser/types";
import type { FoldingResult } from "@/lib/canvas/folding";
import { GraphCanvas } from "./graph-canvas";
import { CoverageBanner } from "./coverage-banner";

interface CanvasCenterProps {
  data: ParseResult;
  repoName?: string;
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

export function CanvasCenter({
  data,
  repoName = "Repository",
  folding,
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
}: CanvasCenterProps) {
  const { coverage, files, folders } = data;

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--bg-canvas)]">
      {/* Workspace Bar */}
      <div className="h-8 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] select-none z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">CANVAS</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">{repoName}</span>
          <span className="text-[10px] text-[var(--accent)] border border-[var(--accent-muted)] px-1 py-0.2 rounded bg-[var(--bg-subtle)]">
            MAP
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">FILES:</span>
            <span className="text-[var(--text-primary)] font-medium">{files.length}</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">FOLDERS:</span>
            <span className="text-[var(--text-primary)] font-medium">{folders.length}</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">INTERNAL EDGES:</span>
            <span className="text-[var(--incoming)] font-medium">
              {coverage?.internalResolvedEdges ?? 0}
            </span>
          </span>
        </div>
      </div>

      {/* Coverage Banner (Phase 7): Appears when graph is partial (< 95%) */}
      {coverage && (
        <CoverageBanner
          coveragePercent={
            coverage.totalFilesFound > 0
              ? (coverage.filesParsedCount / coverage.totalFilesFound) * 100
              : 100
          }
          totalFiles={coverage.totalFilesFound}
          parsedFiles={coverage.filesParsedCount}
          skippedFiles={coverage.filesSkippedCount}
          unresolvedEdgesCount={coverage.unresolvedImports}
        />
      )}

      {/* Interactive Map Viewport */}
      <div className="flex-1 relative overflow-hidden">
        <GraphCanvas
          data={data}
          folding={folding}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFilePath}
          hoveredFilePath={hoveredFilePath}
          hoveredNodeId={hoveredNodeId}
          selectedCategory={selectedCategory}
          activeWalkPaths={activeWalkPaths}
          onSelectNode={onSelectNode}
          onSelectFile={onSelectFile}
          onHoverFile={onHoverFile}
          onHoverNode={onHoverNode}
        />
      </div>
    </main>
  );
}
