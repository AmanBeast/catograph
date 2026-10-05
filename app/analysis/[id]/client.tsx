"use client";

import React from "react";
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

  const handleComplete = () => {
    router.refresh();
  };

  // If analysis is already complete and parseResult is loaded, render the Interactive Map!
  if (analysis.status === "complete" && parseResult) {
    return (
      <CanvasShell
        data={parseResult}
        repoName={analysis.repoName}
      />
    );
  }

  // Otherwise, render the live progress view
  return (
    <ProgressView
      analysisId={analysis.id}
      repoName={analysis.repoName}
      repoUrl={analysis.repoUrl}
      initialStatus={analysis.status}
      initialStage={analysis.stage}
      initialStageMessage={analysis.stage_message}
      initialCommitHash={analysis.commit_hash}
      initialErrorMessage={analysis.error_message}
      onComplete={handleComplete}
    />
  );
}
