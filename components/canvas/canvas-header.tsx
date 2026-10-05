"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface CanvasHeaderProps {
  repoName?: string;
}

export function CanvasHeader({ repoName = "honojs/hono" }: CanvasHeaderProps) {
  return (
    <header className="h-10 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between select-none">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase text-[var(--text-primary)] hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-xs bg-[var(--accent)] inline-block" />
          <span>Cartograph</span>
        </Link>

        <div className="h-4 w-px bg-[var(--border)]" />

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[var(--text-muted)]">CANVAS /</span>
          <span className="text-[var(--text-primary)] font-medium">{repoName}</span>
          <span className="text-[10px] text-[var(--accent)] border border-[var(--accent-muted)] px-1 py-0.2 rounded bg-[var(--bg-subtle)] font-normal">
            SCAFFOLDING DATA
          </span>
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 border border-[var(--border)] px-2 py-0.5 rounded bg-[var(--bg-subtle)] transition-colors"
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
