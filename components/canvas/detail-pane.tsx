"use client";

import React, { useState, useMemo } from "react";
import type { ParseResult, ParsedFile } from "@/lib/parser/types";
import type { FoldedNode } from "@/lib/canvas/folding";
import {
  computeRepositorySummary,
  identifyFileConvention,
} from "@/lib/canvas/conventions";

export interface DetailPaneProps {
  data: ParseResult;
  repoName?: string;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  hoveredFilePath: string | null;
  hoveredNodeId: string | null;
  foldedNodes: FoldedNode[];
  onSelectNode: (nodeId: string | null) => void;
  onSelectFile: (filePath: string | null) => void;
  onHoverFile: (filePath: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DetailPane({
  data,
  repoName = "honojs/hono",
  selectedNodeId,
  selectedFilePath,
  hoveredFilePath,
  hoveredNodeId,
  foldedNodes,
  onSelectNode,
  onSelectFile,
  onHoverFile,
  onHoverNode,
}: DetailPaneProps) {
  // Tab state survives changing selection as required by Phase 5 spec
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");

  // Fast map lookup for files
  const fileMap = useMemo(() => {
    const map = new Map<string, ParsedFile>();
    for (const f of data.files) {
      map.set(f.path, f);
    }
    return map;
  }, [data.files]);

  // Compute repository-level summary metrics (resting state)
  const repoSummary = useMemo(() => {
    return computeRepositorySummary(data.files, data.edges, repoName);
  }, [data.files, data.edges, repoName]);

  // Selected file details
  const selectedFile = useMemo(() => {
    if (!selectedFilePath) return null;
    return fileMap.get(selectedFilePath) || null;
  }, [selectedFilePath, fileMap]);

  // Selected file dependents (internal files that import this file)
  const fileDependents = useMemo(() => {
    if (!selectedFilePath) return [];
    const set = new Set<string>();
    for (const e of data.edges) {
      if (e.status === "resolved" && e.target === selectedFilePath && fileMap.has(e.source)) {
        set.add(e.source);
      }
    }
    return Array.from(set).sort();
  }, [selectedFilePath, data.edges, fileMap]);

  // Selected file dependencies (internal files this file imports)
  const fileDependencies = useMemo(() => {
    if (!selectedFilePath) return [];
    const set = new Set<string>();
    for (const e of data.edges) {
      if (e.status === "resolved" && e.source === selectedFilePath && fileMap.has(e.target)) {
        set.add(e.target);
      }
    }
    return Array.from(set).sort();
  }, [selectedFilePath, data.edges, fileMap]);

  // Non-code asset dependencies (e.g. resolved .json, assets outside parsed code files)
  const fileAssetImports = useMemo(() => {
    if (!selectedFilePath) return [];
    const set = new Set<string>();
    for (const e of data.edges) {
      if (e.status === "resolved" && e.source === selectedFilePath && !fileMap.has(e.target)) {
        set.add(e.target);
      }
    }
    return Array.from(set).sort();
  }, [selectedFilePath, data.edges, fileMap]);

  // Selected file external dependencies (e.g. npm packages, node built-ins)
  const fileExternalImports = useMemo(() => {
    if (!selectedFilePath) return [];
    const set = new Set<string>();
    for (const e of data.edges) {
      if (e.status === "external" && e.source === selectedFilePath) {
        set.add(e.target);
      }
    }
    return Array.from(set).sort();
  }, [selectedFilePath, data.edges]);

  // Selected folder details (when a folded node is selected without a file)
  const selectedFolderNode = useMemo(() => {
    if (!selectedNodeId || selectedFilePath) return null;
    return foldedNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, selectedFilePath, foldedNodes]);

  // File kind breakdown for selected folder
  const folderFileBreakdown = useMemo(() => {
    if (!selectedFolderNode) return [];
    const counts: Record<string, { count: number; lines: number; color: string }> = {};

    for (const f of selectedFolderNode.files) {
      const conv = identifyFileConvention(f);
      const key = conv.label;
      if (!counts[key]) {
        counts[key] = { count: 0, lines: 0, color: conv.color };
      }
      counts[key].count += 1;
      counts[key].lines += f.linesCount;
    }

    return Object.entries(counts)
      .map(([label, val]) => ({
        label,
        count: val.count,
        lines: val.lines,
        color: val.color,
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedFolderNode]);

  const hasSelection = Boolean(selectedFile || selectedFolderNode);

  return (
    <aside className="w-80 lg:w-96 shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] select-none overflow-hidden font-mono text-xs">
      {/* Top Header & Context */}
      <div className="h-9 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-xs shrink-0 ${
              hasSelection ? "bg-[var(--accent)]" : "bg-[var(--incoming)]"
            }`}
          />
          <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate">
            {selectedFile
              ? "FILE INSPECTOR"
              : selectedFolderNode
              ? "FOLDER INSPECTOR"
              : "REPOSITORY SUMMARY"}
          </span>
        </div>

        {hasSelection ? (
          <button
            type="button"
            onClick={() => {
              onSelectFile(null);
              onSelectNode(null);
            }}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            title="Deselect to return to Repository Summary"
          >
            ✕ CLEAR
          </button>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.2 rounded bg-[var(--bg-surface)]">
            RESTING STATE
          </span>
        )}
      </div>

      {/* Tabs Bar: Structure | Explanation (state persists across selection changes) */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("structure")}
          className={`flex-1 py-2 text-[11px] font-medium text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === "structure"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-subtle)]/50"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Structure
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("explanation")}
          className={`flex-1 py-2 text-[11px] font-medium text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === "explanation"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-subtle)]/50"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Explanation
        </button>
      </div>

      {/* Pane Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
        {/* ========================================================================= */}
        {/* TAB: EXPLANATION (Empty state as specified until model calls in Phase 8)    */}
        {/* ========================================================================= */}
        {activeTab === "explanation" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
            <div className="w-10 h-10 rounded border border-dashed border-[var(--border)] flex items-center justify-center mb-3 text-[var(--text-secondary)]">
              <svg
                className="w-5 h-5 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
              AI Architectural Explanation
            </span>
            <p className="text-[10px] text-[var(--text-muted)] max-w-[240px] leading-relaxed mb-3">
              {selectedFile
                ? `Synthesis for ${selectedFile.name} will appear here when an AI model is connected. It will explain this file in the context of its ${fileDependents.length} dependents and ${fileDependencies.length} dependencies.`
                : selectedFolderNode
                ? `Synthesis for folder ${selectedFolderNode.label} (${selectedFolderNode.fileCount} files) will describe its boundaries and architecture once an AI model is connected.`
                : "Whole-repository architectural synthesis will appear here once an AI model is configured in Phase 8."}
            </p>
            <span className="text-[9px] text-[var(--text-secondary)] border border-[var(--border)] px-2 py-0.5 rounded bg-[var(--bg-subtle)]">
              MODEL CALL PENDING (PHASE 8)
            </span>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB: STRUCTURE                                                            */
          /* ========================================================================= */
          <>
            {/* --------------------------------------------------------------------- */}
            {/* CASE 1: SPECIFIC FILE SELECTED                                        */}
            {/* --------------------------------------------------------------------- */}
            {selectedFile ? (
              <div className="flex flex-col gap-4">
                {/* File Header Card */}
                <div className="border border-[var(--border)] rounded bg-[var(--bg-subtle)]/40 p-2.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] break-all leading-tight">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] break-all mt-0.5">
                        {selectedFile.path}
                      </div>
                    </div>
                    {(() => {
                      const conv = identifyFileConvention(selectedFile);
                      return (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium border"
                          style={{
                            borderColor: `${conv.color}40`,
                            backgroundColor: `${conv.color}15`,
                            color: conv.color,
                          }}
                        >
                          {conv.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Metrics 4-cell Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-[10px]">
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">LINES OF CODE</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {selectedFile.linesCount} lines
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">FILE SIZE</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatBytes(selectedFile.sizeBytes)}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">
                        DEPENDENTS (FAN-IN)
                      </span>
                      <span className="font-semibold text-[var(--incoming)] flex items-center gap-0.5">
                        <span>↓</span>
                        <span>{selectedFile.fanIn}</span>
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">
                        DEPENDENCIES (FAN-OUT)
                      </span>
                      <span className="font-semibold text-[var(--outgoing)] flex items-center gap-0.5">
                        <span>↑</span>
                        <span>{selectedFile.fanOut}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Dependents (Files that import this file) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)]" />
                      <span>DEPENDENTS</span>
                    </span>
                    <span className="text-[var(--incoming)] bg-[var(--bg-subtle)] border border-[var(--border)] px-1 rounded">
                      {fileDependents.length}
                    </span>
                  </div>

                  {fileDependents.length === 0 ? (
                    <div className="text-[10px] text-[var(--text-muted)] italic py-1 px-2 border border-dashed border-[var(--border)] rounded bg-[var(--bg-subtle)]/20">
                      No internal repository files import this file directly (entry point or leaf).
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                      {fileDependents.map((depPath) => {
                        const depFile = fileMap.get(depPath);
                        const isHovered = hoveredFilePath === depPath;

                        return (
                          <div
                            key={depPath}
                            onClick={() => onSelectFile(depPath)}
                            onMouseEnter={() => onHoverFile(depPath)}
                            onMouseLeave={() => onHoverFile(null)}
                            className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-[10px] ${
                              isHovered
                                ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                                : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                            }`}
                            title={`Click to inspect: ${depPath}`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold truncate">
                                {depFile?.name || depPath}
                              </div>
                              <div className="text-[9px] text-[var(--text-muted)] truncate">
                                {depPath}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                              {depFile && <span>{depFile.linesCount}L</span>}
                              <span className="text-[var(--incoming)]">↓{depFile?.fanIn ?? 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Dependencies (Files this file imports) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--outgoing)]" />
                      <span>DEPENDENCIES</span>
                    </span>
                    <span className="text-[var(--outgoing)] bg-[var(--bg-subtle)] border border-[var(--border)] px-1 rounded">
                      {fileDependencies.length}
                    </span>
                  </div>

                  {fileDependencies.length === 0 ? (
                    <div className="text-[10px] text-[var(--text-muted)] italic py-1 px-2 border border-dashed border-[var(--border)] rounded bg-[var(--bg-subtle)]/20">
                      No internal repository dependencies.
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                      {fileDependencies.map((depPath) => {
                        const depFile = fileMap.get(depPath);
                        const isHovered = hoveredFilePath === depPath;

                        return (
                          <div
                            key={depPath}
                            onClick={() => onSelectFile(depPath)}
                            onMouseEnter={() => onHoverFile(depPath)}
                            onMouseLeave={() => onHoverFile(null)}
                            className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-[10px] ${
                              isHovered
                                ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                                : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                            }`}
                            title={`Click to inspect: ${depPath}`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold truncate">
                                {depFile?.name || depPath}
                              </div>
                              <div className="text-[9px] text-[var(--text-muted)] truncate">
                                {depPath}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                              {depFile && <span>{depFile.linesCount}L</span>}
                              <span className="text-[var(--incoming)]">↓{depFile?.fanIn ?? 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Non-code Asset Imports (e.g. JSON files) */}
                {fileAssetImports.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                        <span>RESOLVED ASSETS</span>
                      </span>
                      <span className="text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border)] px-1 rounded">
                        {fileAssetImports.length}
                      </span>
                    </div>

                    <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                      {fileAssetImports.map((assetPath) => (
                        <div key={assetPath} className="p-2 text-[10px] text-[var(--text-secondary)] font-mono truncate">
                          {assetPath}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: External Packages (if any) */}
                {fileExternalImports.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                        <span>EXTERNAL PACKAGES</span>
                      </span>
                      <span className="text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border)] px-1 rounded">
                        {fileExternalImports.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 p-2 border border-[var(--border)] rounded bg-[var(--bg-subtle)]/30">
                      {fileExternalImports.map((pkg) => (
                        <span
                          key={pkg}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]"
                        >
                          {pkg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedFolderNode ? (
              /* --------------------------------------------------------------------- */
              /* CASE 2: FOLDED FOLDER SELECTED                                         */
              /* --------------------------------------------------------------------- */
              <div className="flex flex-col gap-4">
                {/* Folder Header Card */}
                <div className="border border-[var(--border)] rounded bg-[var(--bg-subtle)]/40 p-2.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                        {selectedFolderNode.label}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] break-all mt-0.5">
                        {selectedFolderNode.folder}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shrink-0">
                      Folder Node
                    </span>
                  </div>

                  {/* Metrics 4-cell Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-[10px]">
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">TOTAL FILES</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {selectedFolderNode.fileCount} files
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">TOTAL LINES</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {selectedFolderNode.files
                          .reduce((acc, f) => acc + f.linesCount, 0)
                          .toLocaleString()}{" "}
                        lines
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">
                        EXTERNAL FAN-IN
                      </span>
                      <span className="font-semibold text-[var(--incoming)] flex items-center gap-0.5">
                        <span>↓</span>
                        <span>{selectedFolderNode.fanIn} in</span>
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[var(--text-muted)] text-[9px]">
                        EXTERNAL FAN-OUT
                      </span>
                      <span className="font-semibold text-[var(--outgoing)] flex items-center gap-0.5">
                        <span>↑</span>
                        <span>{selectedFolderNode.fanOut} out</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Kinds Breakdown inside this folder */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span>KINDS OF FILES INSIDE</span>
                    <span className="text-[var(--text-muted)] font-mono">
                      {folderFileBreakdown.length} types
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                    {folderFileBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="p-2 flex items-center justify-between text-[10px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-[var(--text-primary)] truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[9px] text-[var(--text-muted)] shrink-0">
                          <span>{item.lines.toLocaleString()}L</span>
                          <span className="px-1 py-0.2 rounded border border-[var(--border)] bg-[var(--bg-subtle)] font-semibold text-[var(--text-secondary)]">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Files inside folder list */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span>CONTAINED FILES</span>
                    <span className="text-[var(--text-muted)] font-mono">
                      {selectedFolderNode.files.length}
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)] max-h-60 overflow-y-auto custom-scrollbar">
                    {selectedFolderNode.files.map((file) => {
                      const isHovered = hoveredFilePath === file.path;

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() => onHoverFile(file.path)}
                          onMouseLeave={() => onHoverFile(null)}
                          className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-[10px] ${
                            isHovered
                              ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                              : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                          }`}
                          title={`Click to inspect: ${file.path}`}
                        >
                          <span className="truncate pr-2">{file.name}</span>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                            <span>{file.linesCount}L</span>
                            <span className="text-[var(--incoming)]">↓{file.fanIn}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* --------------------------------------------------------------------- */
              /* CASE 3: RESTING STATE (NOTHING SELECTED) - REPO SUMMARY               */
              /* --------------------------------------------------------------------- */
              <div className="flex flex-col gap-4">
                {/* Repository Overview Card */}
                <div className="border border-[var(--border)] rounded bg-[var(--bg-subtle)]/40 p-2.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                      REPOSITORY
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium border border-[var(--accent-muted)] bg-[var(--accent-muted)]/20 text-[var(--accent)]">
                      {repoSummary.framework}
                    </span>
                  </div>

                  <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                    {repoName}
                  </div>

                  {/* 3-cell metric summary */}
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[var(--border-subtle)] text-center">
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[9px] text-[var(--text-muted)]">FILES</span>
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">
                        {repoSummary.totalFiles}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[9px] text-[var(--text-muted)]">IMPORTS</span>
                      <span className="text-[12px] font-bold text-[var(--incoming)]">
                        {repoSummary.totalImports}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[9px] text-[var(--text-muted)]">ROUTES</span>
                      <span className="text-[12px] font-bold text-[#06b6d4]">
                        {repoSummary.routesCount}
                      </span>
                    </div>
                  </div>

                  {/* Unclassified Convention Count Note */}
                  <div className="flex items-center justify-between text-[10px] bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Unclassified files</span>
                    <span className="text-[var(--text-muted)] font-mono font-semibold">
                      {repoSummary.unclassifiedCount}
                    </span>
                  </div>
                </div>

                {/* Ranked List 1: What the repository leans on most */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)]" />
                      <span>MOST DEPENDED ON</span>
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-normal">
                      ordered by fan-in
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                    {repoSummary.mostDependedOn.map((file) => {
                      const isHovered = hoveredFilePath === file.path;

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() => onHoverFile(file.path)}
                          onMouseLeave={() => onHoverFile(null)}
                          className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-[10px] ${
                            isHovered
                              ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                              : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                          }`}
                          title={`Click to inspect: ${file.path}`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold truncate">{file.name}</div>
                            <div className="text-[9px] text-[var(--text-muted)] truncate">
                              {file.folder}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                            <span className="text-[var(--text-muted)]">{file.linesCount}L</span>
                            <span
                              className="px-1 py-0.2 rounded font-semibold text-[var(--incoming)] bg-[var(--incoming)]/10"
                              title={`${file.fanIn} dependent files`}
                            >
                              ↓{file.fanIn}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranked List 2: Files nothing imports at all (where reading starts) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--outgoing)]" />
                      <span>WHERE READING STARTS</span>
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-normal">
                      fan-in: 0
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded bg-[var(--bg-surface)]">
                    {repoSummary.entryPoints.map((file) => {
                      const isHovered = hoveredFilePath === file.path;

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() => onHoverFile(file.path)}
                          onMouseLeave={() => onHoverFile(null)}
                          className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-[10px] ${
                            isHovered
                              ? "bg-[var(--accent-muted)]/20 text-[var(--accent)] font-medium"
                              : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                          }`}
                          title={`Click to inspect entry point: ${file.path}`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold truncate">{file.name}</div>
                            <div className="text-[9px] text-[var(--text-muted)] truncate">
                              {file.folder}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                            <span className="text-[var(--text-muted)]">{file.linesCount}L</span>
                            <span
                              className="px-1 py-0.2 rounded font-semibold text-[var(--outgoing)] bg-[var(--outgoing)]/10"
                              title={`Imports ${file.fanOut} files`}
                            >
                              ↑{file.fanOut}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pane Footer */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-subtle)] p-2 text-[10px] text-[var(--text-muted)] flex items-center justify-between font-mono shrink-0">
        <span>DETAIL PANE</span>
        <span className="text-[var(--text-secondary)]">PHASE 5 COMPLETE</span>
      </div>
    </aside>
  );
}
