"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface AnalyzeFormProps {
  className?: string;
  compact?: boolean;
}

export function AnalyzeForm({ className = "", compact = false }: AnalyzeFormProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate repository analysis.");
      }

      // Redirect immediately to analysis progress page or existing analysis
      router.push(`/analysis/${data.analysisId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while submitting.");
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`flex items-center gap-1.5 ${className}`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="github.com/owner/repo"
            disabled={loading}
            className="w-full h-8 px-2.5 rounded border border-[var(--border)] bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !repoUrl.trim()}
          className="h-8 px-3 rounded bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-50 text-white text-xs font-medium font-mono cursor-pointer transition-colors shrink-0"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch gap-2 p-2 border border-[var(--border)] rounded bg-[var(--bg-surface)] shadow-sm"
      >
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs font-mono select-none">
            https://github.com/
          </span>
          <input
            type="text"
            value={repoUrl.replace(/^https:\/\/github\.com\//i, "")}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val.startsWith("http://") || val.startsWith("https://")) {
                setRepoUrl(val);
              } else {
                setRepoUrl(`https://github.com/${val}`);
              }
            }}
            placeholder="owner/repo"
            disabled={loading}
            className="w-full h-9 pl-38 pr-3 rounded border border-[var(--border)] bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !repoUrl.trim()}
          className="h-9 px-4 rounded bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-50 text-white text-xs font-semibold font-mono cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
              <span>Starting Pipeline...</span>
            </>
          ) : (
            <>
              <span>Analyze Repository</span>
              <span>&rarr;</span>
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <div className="p-2 border border-red-500/30 rounded bg-red-500/10 text-red-500 text-xs font-mono flex items-center gap-2">
          <span>✕</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
