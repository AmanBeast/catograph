"use client";

import React, { useState } from "react";

export interface CoverageBannerProps {
  coveragePercent: number;
  totalFiles: number;
  parsedFiles: number;
  skippedFiles: number;
  unresolvedEdgesCount?: number;
}

/**
 * Coverage Banner for the Canvas.
 * Appears when the dependency graph is partial (coverage < 95% or unresolved imports).
 *
 * Constraints per Phase 7 specification:
 * - May collapse, but collapses to a single line that still names the figure.
 * - A graph that is quietly 30% complete must never be able to look complete.
 */
export function CoverageBanner({
  coveragePercent,
  totalFiles,
  parsedFiles,
  skippedFiles,
  unresolvedEdgesCount = 0,
}: CoverageBannerProps) {
  const isPartial = coveragePercent < 95 || skippedFiles > 0 || unresolvedEdgesCount > 0;
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isPartial) return null;

  const formattedPercent = Number(coveragePercent).toFixed(1);

  if (isCollapsed) {
    return (
      <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-[11px] font-mono select-none z-20 text-amber-600 dark:text-amber-400">
        <div className="flex items-center gap-2 truncate">
          <span>⚠️</span>
          <span className="font-semibold">Partial Graph:</span>
          <span>
            <strong className="text-[var(--text-primary)]">{formattedPercent}%</strong> resolved
          </span>
          {unresolvedEdgesCount > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              ({unresolvedEdgesCount} unresolved imports)
            </span>
          )}
          {skippedFiles > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              ({skippedFiles} skipped files)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="text-[10px] hover:underline font-medium text-[var(--text-primary)] cursor-pointer shrink-0 ml-2"
        >
          Details ▼
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 p-2.5 font-mono select-none z-20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>PARTIAL GRAPH WARNING</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[var(--text-primary)] font-bold">
                {formattedPercent}% COVERAGE
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              This repository contains unmapped dependencies or skipped assets.{" "}
              <strong className="text-[var(--text-primary)]">
                {parsedFiles} of {totalFiles}
              </strong>{" "}
              files parsed
              {skippedFiles > 0 ? `, ${skippedFiles} skipped` : ""}
              {unresolvedEdgesCount > 0
                ? `, and ${unresolvedEdgesCount} imports could not be statically resolved`
                : ""}
              . Graph maths and paths represent the verified subset.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] px-2 py-0.5 rounded cursor-pointer shrink-0 transition-colors"
          title="Collapse to single line"
        >
          Collapse ▲
        </button>
      </div>
    </div>
  );
}
