"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface LandingHeaderProps {
  isSignedIn?: boolean;
}

export function LandingHeader({ isSignedIn = false }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg-canvas)]/90 backdrop-blur-md select-none transition-colors">
      <div className="max-w-[1140px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[var(--text-primary)] hover:opacity-90"
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-[var(--accent)] inline-block" />
          <span>Cartograph</span>
          <span className="text-[10px] text-[var(--text-secondary)] font-normal border border-[var(--border)] px-1.5 py-0.5 rounded">
            v0.1
          </span>
        </Link>

        {/* Controls: Theme & Way In */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="h-4 w-px bg-[var(--border)]" />
          <Link
            href={isSignedIn ? "/" : "/sign-in"}
            className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] hover:border-[var(--text-muted)] text-[var(--text-primary)] font-mono text-xs font-medium transition-colors"
          >
            {isSignedIn ? "Open Workspace" : "Sign In"}
          </Link>
        </div>
      </div>
    </header>
  );
}
