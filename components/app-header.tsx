"use client";

import React from "react";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AnalyzeForm } from "@/components/dashboard/analyze-form";

interface AppHeaderProps {
  serverOrgName?: string | null;
  serverOrgId?: string | null;
}

export function AppHeader({ serverOrgName, serverOrgId }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 flex items-center justify-between select-none">
      {/* Brand & Organization */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase text-[var(--text-primary)]">
          <span className="w-2 h-2 rounded-sm bg-[var(--accent)] inline-block" />
          <span>Cartograph</span>
          <span className="text-[10px] text-[var(--text-secondary)] font-normal border border-[var(--border)] px-1 py-0.2 rounded">v0.1</span>
        </Link>

        <div className="h-4 w-px bg-[var(--border)]" />

        {/* Organization Switcher */}
        <div className="flex items-center gap-2">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            appearance={{
              elements: {
                rootBox: "flex items-center text-xs font-mono",
                organizationSwitcherTrigger:
                  "py-1 px-2 border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] rounded text-xs font-mono",
              },
            }}
          />

          {serverOrgName && (
            <span
              title={`Server-rendered Org ID: ${serverOrgId}`}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)] inline-block" />
              <span>{serverOrgName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Live Repo Input Form (Phase 7) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <AnalyzeForm compact className="w-full" />
      </div>

      {/* Controls: Theme & User */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div className="h-4 w-px bg-[var(--border)]" />
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "w-6 h-6 rounded",
            },
          }}
        />
      </div>
    </header>
  );
}
