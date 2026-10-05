import React from "react";

export function EmptyState({ orgName }: { orgName?: string | null }) {
  return (
    <div className="max-w-md w-full border border-dashed border-[var(--border)] rounded p-8 bg-[var(--bg-surface)]/60 text-center space-y-3">
      <div className="w-8 h-8 rounded border border-[var(--border)] bg-[var(--bg-subtle)] mx-auto flex items-center justify-center text-xs text-[var(--text-muted)] font-mono font-bold">
        0
      </div>
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          No Analyses Found
        </h3>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {orgName ? (
            <>
              Team <strong className="text-[var(--text-primary)]">{orgName}</strong> has not analysed any repositories yet.
            </>
          ) : (
            "This organization has not analysed any repositories yet."
          )}
        </p>
      </div>
      <div className="pt-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        Analyses run for this workspace will appear here with live stages and dependency graphs.
      </div>
    </div>
  );
}
