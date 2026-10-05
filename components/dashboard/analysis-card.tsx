import React from "react";
import Link from "next/link";
import type { AnalysisRow } from "@/lib/db/analyses";

interface AnalysisCardProps {
  analysis: AnalysisRow;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const isComplete = analysis.status === "complete";
  const isFailed = analysis.status === "failed";
  const isParsing = analysis.status === "parsing" || analysis.status === "graphing" || analysis.status === "pending";

  // Phase 7 Stale detection constraint:
  // "The dashboard marks any unfinished run past a few minutes old as stale, so the difference between working and abandoned is legible without opening it."
  const startedTime = new Date(analysis.started_at || analysis.created_at).getTime();
  const isStale = !isComplete && !isFailed && Date.now() - startedTime > 5 * 60 * 1000;

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-3 rounded space-y-2 hover:border-[var(--text-secondary)] transition-colors select-text flex flex-col justify-between">
      <div className="space-y-2">
        {/* Top Header: Repo Name + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Link
              href={`/analysis/${analysis.id}`}
              className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline truncate"
            >
              {analysis.project?.name || "Unnamed Repository"}
            </Link>
            {analysis.project?.default_branch && (
              <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.2 rounded bg-[var(--bg-subtle)]">
                {analysis.project.default_branch}
              </span>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-medium uppercase tracking-wide">
            {isStale ? (
              <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Stale
              </span>
            ) : isComplete ? (
              <span className="inline-flex items-center gap-1 text-[var(--incoming)] bg-[var(--incoming)]/10 px-1.5 py-0.5 rounded border border-[var(--incoming)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)]" />
                Complete
              </span>
            ) : isParsing ? (
              <span className="inline-flex items-center gap-1 text-[var(--outgoing)] bg-[var(--outgoing)]/10 px-1.5 py-0.5 rounded border border-[var(--outgoing)]/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--outgoing)]" />
                {analysis.stage || "Parsing"}
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                {analysis.status}
              </span>
            )}
          </div>
        </div>

        {/* Metrics or Stage Message */}
        <div className="text-[11px] text-[var(--text-secondary)]">
          {isStale ? (
            <div className="text-amber-500/90 text-[10px] leading-relaxed">
              Process stopped unexpectedly mid-parse (&gt; 5m old). Marked as stale.
            </div>
          ) : isComplete ? (
            <div className="flex items-center gap-3">
              <span>
                Files: <strong className="text-[var(--text-primary)]">{analysis.parsed_files}</strong> / {analysis.total_files}
              </span>
              <span>&bull;</span>
              <span>
                Coverage: <strong className="text-[var(--text-primary)]">{Number(analysis.coverage_percent).toFixed(1)}%</strong>
              </span>
              {analysis.skipped_files > 0 && (
                <>
                  <span>&bull;</span>
                  <span className="text-[var(--text-muted)]">{analysis.skipped_files} skipped</span>
                </>
              )}
            </div>
          ) : isParsing ? (
            <div className="flex items-center gap-2 text-[var(--outgoing)] text-[10px]">
              <span className="font-semibold">{analysis.stage || "In progress"}</span>
              {analysis.stage_message && <span>— {analysis.stage_message}</span>}
            </div>
          ) : isFailed ? (
            <div className="text-red-500 truncate text-[10px]">
              {analysis.error_message || "Analysis stopped unexpectedly"}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer Info: Repo URL + Timestamp + Link */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="truncate max-w-xs">{analysis.project?.repo_url || "No URL"}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
          <Link
            href={`/analysis/${analysis.id}`}
            className="text-[var(--accent)] hover:underline font-medium ml-1"
          >
            {isComplete ? "Explore Map →" : "View Progress →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
