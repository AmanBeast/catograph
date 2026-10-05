"use client";

import React, { useState, useMemo } from "react";
import type { ParseResult } from "@/lib/parser/types";
import { computeRepositoryFolding } from "@/lib/canvas/folding";
import { deriveFileCategories } from "@/lib/canvas/categories";
import { CanvasHeader } from "./canvas-header";
import { LeftRail } from "./left-rail";
import { CanvasCenter } from "./canvas-center";
import { DetailPane } from "./detail-pane";

interface CanvasShellProps {
  data: ParseResult;
  repoName?: string;
}

export function CanvasShell({ data, repoName = "honojs/hono" }: CanvasShellProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [hoveredFilePath, setHoveredFilePath] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute repository folding
  const folding = useMemo(() => {
    return computeRepositoryFolding(data.files, data.edges);
  }, [data.files, data.edges]);

  // Derive categories strictly by file extension
  const categories = deriveFileCategories(data.files);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono">
      {/* Top Header */}
      <CanvasHeader repoName={repoName} />

      {/* Three Columns Workspace: Fixed structure */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Categories Rail (by extension) */}
        <LeftRail categories={categories} totalFiles={data.files.length} />

        {/* Center Column: Graph Canvas Viewport with Folding & Panels */}
        <CanvasCenter
          data={data}
          folding={folding}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFilePath}
          hoveredFilePath={hoveredFilePath}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={setSelectedNodeId}
          onSelectFile={setSelectedFilePath}
          onHoverFile={setHoveredFilePath}
          onHoverNode={setHoveredNodeId}
        />

        {/* Right Column: Detail Inspector Pane (Phase 5) */}
        <DetailPane
          data={data}
          repoName={repoName}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFilePath}
          hoveredFilePath={hoveredFilePath}
          hoveredNodeId={hoveredNodeId}
          foldedNodes={folding.nodes}
          onSelectNode={setSelectedNodeId}
          onSelectFile={setSelectedFilePath}
          onHoverFile={setHoveredFilePath}
          onHoverNode={setHoveredNodeId}
        />
      </div>

      {/* Telemetry Status Footer */}
      <footer className="h-6 border-t border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between text-[10px] text-[var(--text-secondary)] select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">REPO:</span>
            <span className="text-[var(--text-primary)] font-medium">{repoName}</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">EXTENSIONS:</span>
            <span className="text-[var(--text-primary)]">{categories.length} types</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">FILES:</span>
            <span className="text-[var(--incoming)] font-medium">{data.files.length}</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">SELECTED:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {selectedFilePath || selectedNodeId || "None"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[var(--text-muted)]">INTERACTIVE MAP</span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)] inline-block" />
            <span>STANDALONE CANVAS</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
