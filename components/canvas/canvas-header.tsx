"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface CanvasHeaderProps {
  repoName?: string;
  commitHash?: string | null;
  onReRun?: () => void;
  isReRunning?: boolean;
}

export function CanvasHeader({
  repoName = "Repository",
  commitHash,
  onReRun,
  isReRunning = false,
}: CanvasHeaderProps) {
  return (
    <header className="h-10 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between select-none font-mono">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--text-primary)] hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-xs bg-[var(--accent)] inline-block" />
          <span>Cartograph</span>
        </Link>

        <div className="h-4 w-px bg-[var(--border)]" />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">CANVAS /</span>
          <span className="text-[var(--text-primary)] font-medium">{repoName}</span>
          {commitHash && (
            <span className="text-[10px] text-[var(--text-secondary)] border border-[var(--border)] px-1.5 py-0.2 rounded bg-[var(--bg-subtle)]">
              {commitHash.substring(0, 7)}
            </span>
          )}
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="flex items-center gap-2.5">
        {onReRun && (
          <button
            type="button"
            onClick={onReRun}
            disabled={isReRunning}
            className="text-[11px] px-2.5 py-1 rounded border border-[var(--border)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="Re-run pipeline analysis for this repository"
          >
            <span>⟳</span>
            <span>{isReRunning ? "Re-running..." : "Re-run"}</span>
          </button>
        )}

        <Link
          href="/"
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 border border-[var(--border)] px-2 py-0.5 rounded bg-[var(--bg-subtle)] transition-colors"
        >
          <span>&larr;</span>
          <span>Dashboard</span>
        </Link>
        <div className="h-4 w-px bg-[var(--border)]" />
        <ThemeToggle />
      </div>
    </header>
  );
}
