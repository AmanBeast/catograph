"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { ParseResult } from "@/lib/parser/types";
import { computeRepositoryFolding } from "@/lib/canvas/folding";
import { deriveFileCategories } from "@/lib/canvas/categories";
import {
  computeTransitiveWalk,
  type TransitiveWalkDirection,
  type TransitiveWalkResult,
} from "@/lib/canvas/graph-math.ts";
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

  // Phase 6: Left Rail category filter and Active Transitive Walk / Insight highlight state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeWalkResult, setActiveWalkResult] = useState<TransitiveWalkResult | null>(null);
  const [insightHighlightPaths, setInsightHighlightPaths] = useState<Set<string> | null>(null);

  // Compute repository folding
  const folding = useMemo(() => {
    return computeRepositoryFolding(data.files, data.edges);
  }, [data.files, data.edges]);

  // Derive categories strictly by file extension
  const categories = deriveFileCategories(data.files);

  // Unified active paths for canvas highlighting
  const activeWalkPaths = useMemo(() => {
    if (activeWalkResult) return activeWalkResult.allPaths;
    if (insightHighlightPaths) return insightHighlightPaths;
    return null;
  }, [activeWalkResult, insightHighlightPaths]);

  const handleSelectFile = useCallback((filePath: string | null) => {
    setSelectedFilePath(filePath);
    setActiveWalkResult(null);
    setInsightHighlightPaths(null);
  }, []);

  const handleTriggerWalk = useCallback(
    (direction: TransitiveWalkDirection | null) => {
      if (!direction || !selectedFilePath) {
        setActiveWalkResult(null);
      } else {
        const res = computeTransitiveWalk(selectedFilePath, data.edges, direction, 2);
        setActiveWalkResult(res);
        setInsightHighlightPaths(null);
      }
    },
    [selectedFilePath, data.edges]
  );

  const handleHighlightInsight = useCallback(
    (files: string[], primaryFile: string) => {
      setActiveWalkResult(null);
      setInsightHighlightPaths(new Set(files));
      setSelectedFilePath(primaryFile);
      const owner = folding.nodeByFile.get(primaryFile);
      if (owner) setSelectedNodeId(owner);
    },
    [folding.nodeByFile]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono">
      {/* Top Header */}
      <CanvasHeader repoName={repoName} />

      {/* Three Columns Workspace: Fixed structure */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Categories Rail (by extension) */}
        <LeftRail
          categories={categories}
          totalFiles={data.files.length}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Center Column: Graph Canvas Viewport with Folding & Panels */}
        <CanvasCenter
          data={data}
          repoName={repoName}
          folding={folding}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFilePath}
          hoveredFilePath={hoveredFilePath}
          hoveredNodeId={hoveredNodeId}
          selectedCategory={selectedCategory}
          activeWalkPaths={activeWalkPaths}
          onSelectNode={setSelectedNodeId}
          onSelectFile={handleSelectFile}
          onHoverFile={setHoveredFilePath}
          onHoverNode={setHoveredNodeId}
        />

        {/* Right Column: Detail Inspector Pane (Phase 5 & 6) */}
        <DetailPane
          data={data}
          repoName={repoName}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFilePath}
          hoveredFilePath={hoveredFilePath}
          hoveredNodeId={hoveredNodeId}
          foldedNodes={folding.nodes}
          activeWalkResult={activeWalkResult}
          onSelectNode={setSelectedNodeId}
          onSelectFile={handleSelectFile}
          onHoverFile={setHoveredFilePath}
          onHoverNode={setHoveredNodeId}
          onTriggerWalk={handleTriggerWalk}
          onHighlightInsight={handleHighlightInsight}
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
          {selectedCategory && (
            <>
              <span className="text-[var(--border)]">|</span>
              <span className="flex items-center gap-1 text-[var(--accent)]">
                <span>FILTER:</span>
                <span className="font-semibold">.{selectedCategory}</span>
              </span>
            </>
          )}
          {activeWalkResult && (
            <>
              <span className="text-[var(--border)]">|</span>
              <span className="flex items-center gap-1 text-[var(--incoming)]">
                <span>WALK:</span>
                <span className="font-semibold">{activeWalkResult.direction}</span>
              </span>
            </>
          )}
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">SELECTED:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {selectedFilePath || selectedNodeId || "None"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[var(--text-muted)]">PHASE 6 READY</span>
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
