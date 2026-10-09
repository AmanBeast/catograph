"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface HeroFormProps {
  isSignedIn?: boolean;
}

export function HeroForm({ isSignedIn = false }: HeroFormProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed) return;

    // Normalize URL
    let fullUrl = trimmed;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = `https://github.com/${fullUrl.replace(/^github\.com\//, "")}`;
    }

    if (!isSignedIn) {
      // User is signed out: save target repo in sessionStorage and redirect to sign-in
      try {
        sessionStorage.setItem("cartograph_pending_repo", fullUrl);
      } catch {
        // sessionStorage might be restricted in private mode
      }
      setLoading(true);
      router.push(`/sign-in?redirect_url=/`);
      return;
    }

    // User is signed in: start analysis immediately
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: fullUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate repository analysis.");
      }

      router.push(`/analysis/${data.analysisId}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setRepoUrl(`https://github.com/${preset}`);
  };

  return (
    <div className="w-full max-w-xl space-y-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 border border-[var(--border)] rounded-md bg-[var(--bg-surface)] shadow-xs transition-colors"
      >
        <div className="relative flex-1 flex items-center">
          <span className="pl-3.5 text-[var(--text-muted)] text-xs font-mono select-none pointer-events-none hidden sm:inline">
            github.com/
          </span>
          <input
            type="text"
            value={repoUrl.replace(/^https?:\/\/github\.com\//i, "")}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val.startsWith("http://") || val.startsWith("https://")) {
                setRepoUrl(val);
              } else {
                setRepoUrl(`https://github.com/${val}`);
              }
            }}
            placeholder="owner/repository"
            disabled={loading}
            className="w-full h-10 px-3 sm:px-2 rounded bg-transparent focus:outline-none text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !repoUrl.trim()}
          className="h-10 px-5 rounded bg-[var(--accent)] hover:opacity-95 disabled:opacity-50 text-white text-xs font-medium font-mono cursor-pointer transition-opacity shrink-0 flex items-center justify-center gap-2 select-none"
        >
          {loading ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze Repository</span>
              <span aria-hidden="true">&rarr;</span>
            </>
          )}
        </button>
      </form>

      {/* Preset suggestions for fast verification */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
        <span>Try a sample:</span>
        <button
          type="button"
          onClick={() => handlePresetClick("expressjs/express")}
          className="hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors cursor-pointer"
        >
          expressjs/express
        </button>
        <span>&middot;</span>
        <button
          type="button"
          onClick={() => handlePresetClick("trpc/trpc")}
          className="hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors cursor-pointer"
        >
          trpc/trpc
        </button>
        <span>&middot;</span>
        <button
          type="button"
          onClick={() => handlePresetClick("fastify/fastify")}
          className="hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors cursor-pointer"
        >
          fastify/fastify
        </button>
      </div>

      {errorMessage && (
        <div className="p-2.5 border border-red-500/30 rounded bg-red-500/10 text-red-500 text-xs font-mono flex items-center gap-2">
          <span>✕</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
