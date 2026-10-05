import React from "react";
import { AppHeader } from "./app-header";

interface AppShellProps {
  serverOrgId: string | null;
  serverOrgName: string | null;
  serverOrgSlug: string | null;
  userEmail?: string | null;
}

export function AppShell({
  serverOrgId,
  serverOrgName,
  serverOrgSlug,
  userEmail,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono">
      {/* Top Application Header */}
      <AppHeader serverOrgName={serverOrgName} serverOrgId={serverOrgId} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central Map Canvas Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--bg-canvas)] border-r border-[var(--border)]">
          {/* Canvas Sub-header */}
          <div className="h-8 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] select-none">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">CANVAS</span>
              <span>/</span>
              <span>Dependency Graph</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)] inline-block" />
                <span>INCOMING</span>
              </span>
              <span className="flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--outgoing)] inline-block" />
                <span>OUTGOING</span>
              </span>
            </div>
          </div>

          {/* Canvas Content Grid */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="max-w-md w-full border border-dashed border-[var(--border)] rounded p-6 bg-[var(--bg-surface)]/60 text-center space-y-3">
              <div className="w-8 h-8 rounded border border-[var(--border)] bg-[var(--bg-subtle)] mx-auto flex items-center justify-center text-xs text-[var(--accent)] font-bold">
                M
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Dependency Canvas Ready
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Repository parsing and graph drawing will mount here in Phase 2 & 3.
                  Every edge is computed strictly from real syntactic imports.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] flex items-center justify-around">
                <span>Folders &rarr; Boxes</span>
                <span>Imports &rarr; Edges</span>
                <span>Arithmetic Walk</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Detail & AI Inspector Panel */}
        <aside className="w-80 lg:w-96 flex flex-col bg-[var(--bg-surface)] overflow-hidden select-none">
          {/* Inspector Section Header */}
          <div className="h-8 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">INSPECTOR</span>
            <span className="text-[10px]">0 files selected</span>
          </div>

          {/* Inspector Panel Body */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Blast Radius Section */}
            <div className="p-3 border-b border-[var(--border)] space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Structure & Blast Radius
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Select any file node on the canvas to inspect immediate imports, reverse dependencies, and 2-level ripple effects.
              </p>
            </div>

            {/* AI Lookup Section */}
            <div className="p-3 flex-1 flex flex-col space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Repository Q&A
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Questions are answered by an agent that looks facts up in the parsed structure before answering.
              </p>
              <div className="mt-auto pt-4">
                <div className="border border-[var(--border)] rounded bg-[var(--bg-subtle)] p-2 text-[11px] text-[var(--text-muted)] cursor-not-allowed">
                  Ask about dependency chains...
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Telemetry Status Bar */}
      <footer className="h-6 border-t border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between text-[10px] text-[var(--text-secondary)] select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">ORG:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {serverOrgName ? `${serverOrgName} (${serverOrgSlug || serverOrgId})` : "No Active Org"}
            </span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">IDENTITY:</span>
            <span className="text-[var(--incoming)] font-medium">TOKEN-ATTACHED</span>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">POLICY:</span>
            <span className="text-[var(--text-primary)]">RLS READY</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && <span className="text-[var(--text-muted)]">{userEmail}</span>}
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)] inline-block" />
            <span className="text-[var(--text-secondary)]">ONLINE</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
