"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressView } from "@/components/pipeline/progress-view";
import { CanvasShell } from "@/components/canvas/canvas-shell";
import type { LoadedAnalysisData } from "@/lib/db/load-analysis";

interface AnalysisClientProps {
  initialData: LoadedAnalysisData;
}

export function AnalysisClient({ initialData }: AnalysisClientProps) {
  const router = useRouter();
  const { analysis, parseResult } = initialData;
  const [isReRunning, setIsReRunning] = useState(false);

  const handleComplete = () => {
    setIsReRunning(false);
    router.refresh();
  };

  const handleReRun = async () => {
    try {
      setIsReRunning(true);
      const res = await fetch("/api/analyze/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to restart analysis");
      }
    } catch (err: any) {
      alert(err.message || "Failed to restart analysis");
      setIsReRunning(false);
    }
  };

  // If analysis is already complete, not currently re-running, and parseResult is loaded:
  if (analysis.status === "complete" && parseResult && !isReRunning) {
    return (
      <CanvasShell
        data={parseResult}
        repoName={analysis.repoName}
        commitHash={analysis.commit_hash}
        onReRun={handleReRun}
        isReRunning={isReRunning}
      />
    );
  }

  // Otherwise, render the live progress view
  return (
    <ProgressView
      analysisId={analysis.id}
      repoName={analysis.repoName}
      repoUrl={analysis.repoUrl}
      initialStatus={isReRunning ? "pending" : analysis.status}
      initialStage={isReRunning ? "pending" : analysis.stage}
      initialStageMessage={isReRunning ? "Re-run started..." : analysis.stage_message}
      initialCommitHash={analysis.commit_hash}
      initialErrorMessage={null}
      onComplete={handleComplete}
    />
  );
}
