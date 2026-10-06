"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { createBrowserDbClient } from "@/lib/db/client";

export interface ProgressViewProps {
  analysisId: string;
  repoName: string;
  repoUrl: string;
  initialStatus: string;
  initialStage: string | null;
  initialStageMessage: string | null;
  initialCommitHash: string | null;
  initialErrorMessage: string | null;
  onComplete: () => void;
}

const STAGES = [
  { id: "fetching", label: "Downloading archive", description: "Fetching repository tarball from GitHub" },
  { id: "extracting", label: "Extracting tree", description: "Unpacking archive and reading files" },
  { id: "parsing", label: "Parsing AST", description: "Analyzing TypeScript modules and AST" },
  { id: "graphing", label: "Resolving graph", description: "Connecting import edges and metrics" },
  { id: "storing", label: "Storing metrics", description: "Saving files, edges, and insights to database" },
  { id: "complete", label: "Complete", description: "Map generation finished" },
] as const;

export function ProgressView({
  analysisId,
  repoName,
  repoUrl,
  initialStatus,
  initialStage,
  initialStageMessage,
  initialCommitHash,
  initialErrorMessage,
  onComplete,
}: ProgressViewProps) {
  const { getToken } = useAuth();

  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState<string | null>(initialStage);
  const [stageMessage, setStageMessage] = useState<string | null>(initialStageMessage);
  const [commitHash, setCommitHash] = useState<string | null>(initialCommitHash);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);
  const [isReRunning, setIsReRunning] = useState(false);

  const getStageIndex = (stageId: string | null) => {
    if (!stageId) return 0;
    if (stageId === "failed") return -1;
    const idx = STAGES.findIndex((s) => s.id === stageId);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIndex = getStageIndex(stage);

  // Realtime subscription to per-analysis broadcast channel
  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    async function setupRealtime() {
      try {
        const token = await getToken();
        if (!isMounted) return;

        const supabase = createBrowserDbClient(token);

        // Connect to private per-analysis channel
        channel = supabase.channel(`analysis:${analysisId}`, {
          config: { private: true },
        });

        // 1. Listen for database trigger broadcast events
        channel.on("broadcast", { event: "progress" }, (payload: any) => {
          if (!isMounted || !payload?.payload) return;
          const data = payload.payload;

          if (data.status) setStatus(data.status);
          if (data.stage) setStage(data.stage);
          if (data.stage_message) setStageMessage(data.stage_message);
          if (data.commit_hash) setCommitHash(data.commit_hash);
          if (data.error_message) setErrorMessage(data.error_message);

          if (data.status === "complete") {
            setTimeout(() => {
              if (isMounted) onComplete();
            }, 600);
          }
        });

        // 2. Also subscribe to postgres_changes as backup
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "analyses",
            filter: `id=eq.${analysisId}`,
          },
          (payload: any) => {
            if (!isMounted || !payload?.new) return;
            const data = payload.new;

            if (data.status) setStatus(data.status);
            if (data.stage) setStage(data.stage);
            if (data.stage_message) setStageMessage(data.stage_message);
            if (data.commit_hash) setCommitHash(data.commit_hash);
            if (data.error_message) setErrorMessage(data.error_message);

            if (data.status === "complete") {
              setTimeout(() => {
                if (isMounted) onComplete();
              }, 600);
            }
          }
        );

        channel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            // Realtime socket connected
          }
        });
      } catch (err) {
        console.warn("[Realtime Setup Notice]:", err);
      }
    }

    setupRealtime();

    // Fast and reliable status polling interval
    const pollInterval = setInterval(async () => {
      if (status === "complete" || status === "failed") return;
      try {
        const res = await fetch(`/api/analyze/${analysisId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data && isMounted) {
          if (data.status) setStatus(data.status);
          if (data.stage) setStage(data.stage);
          if (data.stage_message) setStageMessage(data.stage_message);
          if (data.commit_hash) setCommitHash(data.commit_hash);
          if (data.error_message) setErrorMessage(data.error_message);

          if (data.status === "complete") {
            setTimeout(() => {
              if (isMounted) onComplete();
            }, 500);
          }
        }
      } catch {
        // Ignore network glitch during poll
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [analysisId, getToken, onComplete, status]);

  const handleReRun = useCallback(async () => {
    try {
      setIsReRunning(true);
      const res = await fetch("/api/analyze/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restart analysis.");
      }

      setStatus("pending");
      setStage("pending");
      setStageMessage("Re-run initiated...");
      setErrorMessage(null);
    } catch (err: any) {
      alert(err.message || "Failed to restart analysis.");
    } finally {
      setIsReRunning(false);
    }
  }, [analysisId]);

  const isFailed = status === "failed";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas)] select-none font-mono">
      <div className="max-w-xl w-full border border-[var(--border)] rounded bg-[var(--bg-surface)] shadow-lg overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="h-10 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-xs ${
                isFailed ? "bg-red-500" : "bg-[var(--incoming)] animate-pulse"
              }`}
            />
            <span className="font-semibold text-[var(--text-primary)] truncate">
              {repoName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
            {commitHash && (
              <span className="border border-[var(--border)] px-1.5 py-0.5 rounded bg-[var(--bg-surface)]">
                {commitHash.substring(0, 7)}
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded font-bold uppercase border ${
                isFailed
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "bg-[var(--accent-muted)]/20 border-[var(--accent)] text-[var(--accent)]"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Target Repo Info */}
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              Repository Pipeline
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] break-all">
              {repoUrl}
            </div>
            {commitHash && (
              <div className="text-[11px] text-[var(--text-secondary)]">
                Analyzing commit <code className="text-[var(--accent)]">{commitHash}</code>
              </div>
            )}
          </div>

          {/* Failed State Card */}
          {isFailed ? (
            <div className="border border-red-500/40 rounded bg-red-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                <span>✕</span>
                <span>ANALYSIS FAILED DURING STAGE: {stage?.toUpperCase() || "UNKNOWN"}</span>
              </div>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
                {errorMessage || stageMessage || "An unrecoverable error occurred while parsing."}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReRun}
                  disabled={isReRunning}
                  className="px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  {isReRunning ? "Restarting..." : "Re-run Analysis"}
                </button>
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* Named Stages Progress List (ticks past with real names, no generic spinner) */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Stages</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {currentStageIndex + 1} of {STAGES.length}
                </span>
              </div>

              <div className="space-y-2 border border-[var(--border)] rounded bg-[var(--bg-subtle)]/40 p-3">
                {STAGES.map((s, idx) => {
                  const isDone = idx < currentStageIndex || status === "complete";
                  const isCurrent = idx === currentStageIndex && status !== "complete";
                  const isPending = idx > currentStageIndex && status !== "complete";

                  return (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 p-2 rounded transition-colors text-xs ${
                        isCurrent
                          ? "bg-[var(--bg-surface)] border border-[var(--accent-muted)] text-[var(--text-primary)] font-medium shadow-xs"
                          : isDone
                          ? "text-[var(--text-primary)] opacity-85"
                          : "text-[var(--text-muted)] opacity-50"
                      }`}
                    >
                      {/* Step Indicator */}
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono mt-0.5">
                        {isDone ? (
                          <span className="text-[var(--incoming)] font-bold">✓</span>
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                        )}
                      </div>

                      {/* Stage Name & Live Message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{s.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-[var(--accent)] font-mono animate-pulse">
                              running...
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                          {isCurrent && stageMessage ? stageMessage : s.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-8 border-t border-[var(--border)] bg-[var(--bg-subtle)] px-4 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>PIPELINE ENGINE</span>
          <Link href="/" className="hover:text-[var(--text-primary)] hover:underline">
            Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
