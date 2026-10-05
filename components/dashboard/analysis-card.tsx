import React from "react";
import type { AnalysisRow } from "@/lib/db/analyses";

interface AnalysisCardProps {
  analysis: AnalysisRow;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const isComplete = analysis.status === "complete";
  const isParsing = analysis.status === "parsing";
  const isFailed = analysis.status === "failed";

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-3 rounded space-y-2 hover:border-[var(--text-secondary)] transition-none select-text">
      {/* Top Header: Repo Name + Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
            {analysis.project?.name || "Unnamed Repository"}
          </span>
          {analysis.project?.default_branch && (
            <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.2 rounded bg-[var(--bg-subtle)]">
              {analysis.project.default_branch}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-medium uppercase tracking-wide">
          {isComplete && (
            <span className="inline-flex items-center gap-1 text-[var(--incoming)] bg-[var(--incoming)]/10 px-1.5 py-0.5 rounded border border-[var(--incoming)]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)]" />
              Complete
            </span>
          )}
          {isParsing && (
            <span className="inline-flex items-center gap-1 text-[var(--outgoing)] bg-[var(--outgoing)]/10 px-1.5 py-0.5 rounded border border-[var(--outgoing)]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--outgoing)]" />
              Parsing
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Failed
            </span>
          )}
          {!isComplete && !isParsing && !isFailed && (
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              {analysis.status}
            </span>
          )}
        </div>
      </div>

      {/* Metrics or Stage Message */}
      <div className="text-[11px] text-[var(--text-secondary)]">
        {isComplete && (
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
        )}

        {isParsing && (
          <div className="flex items-center gap-2 text-[var(--outgoing)]">
            <span className="font-medium">{analysis.stage || "In progress"}</span>
            {analysis.stage_message && <span>— {analysis.stage_message}</span>}
          </div>
        )}

        {isFailed && (
          <div className="text-red-500 truncate">
            {analysis.error_message || "Analysis stopped unexpectedly"}
          </div>
        )}
      </div>

      {/* Footer Info: Repo URL + Timestamp */}
      <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <a
          href={analysis.project?.repo_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-secondary)] hover:underline truncate max-w-xs"
        >
          {analysis.project?.repo_url || "No URL"}
        </a>
        <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
