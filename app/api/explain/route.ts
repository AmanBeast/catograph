import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerDbClient } from "@/lib/db/server";
import { explainFile, explainFolder } from "@/lib/ai/explain";
import { evaluateInventedPaths } from "@/evals/invented-paths";
import { Client as LangSmithClient } from "langsmith";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { orgId: clerkOrgId, userId } = await auth().catch(() => ({ orgId: null, userId: null }));

    const body = await req.json();
    const {
      analysisId,
      targetType = "file",
      filePath,
      folderPath,
      contentHash: clientContentHash,
      commitHash: clientCommitHash,
      sizeBytes = 0,
      linesCount = 0,
      currentRole = null,
      dependencies = [],
      dependents = [],
      externalImports = [],
      files = [],
      incomingDependents = [],
      outgoingDependencies = [],
      forceRefresh = false,
    } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: "Missing analysisId parameter." },
        { status: 400 }
      );
    }

    const supabase = await createServerDbClient();

    // Look up analysis to resolve org_id and commit_hash
    const { data: analysis, error: analErr } = await supabase
      .from("analyses")
      .select("id, org_id, commit_hash")
      .eq("id", analysisId)
      .maybeSingle();

    if (analErr || !analysis) {
      return NextResponse.json(
        { error: "Analysis record not found." },
        { status: 404 }
      );
    }

    const orgId = analysis.org_id || clerkOrgId || "default_org";
    const currentCommit = analysis.commit_hash || clientCommitHash || null;

    if (targetType === "file") {
      if (!filePath) {
        return NextResponse.json(
          { error: "Missing filePath for file explanation." },
          { status: 400 }
        );
      }

      // Look up file record
      const { data: fileRow } = await supabase
        .from("files")
        .select("id, content_hash")
        .eq("analysis_id", analysisId)
        .eq("path", filePath)
        .maybeSingle();

      const effectiveContentHash =
        clientContentHash ||
        fileRow?.content_hash ||
        crypto.createHash("sha256").update(filePath).digest("hex");

      const result = await explainFile({
        filePath,
        contentHash: effectiveContentHash,
        commitHash: currentCommit,
        sizeBytes,
        linesCount,
        currentRole,
        dependencies,
        dependents,
        externalImports,
        analysisId,
        orgId,
        forceRefresh,
      });

      // Live Evaluation: Invented-path check against exact context shown
      const shownPaths = [filePath, ...dependencies, ...dependents, ...externalImports];
      const evalResult = evaluateInventedPaths(result.summary, shownPaths);

      // Submit feedback to LangSmith run if active
      if (result.traceRunId && process.env.LANGSMITH_API_KEY) {
        try {
          const lsClient = new LangSmithClient();
          await lsClient.createFeedback(result.traceRunId, "invented_path_score", {
            score: evalResult.score,
            comment: evalResult.summary,
          });
        } catch (fbErr) {
          console.warn("[Live Eval] Failed to log LangSmith feedback:", fbErr);
        }
      }

      // Record eval score in database if stored row exists
      if (result.id) {
        try {
          await supabase
            .from("explanations")
            .update({
              eval_score: evalResult.score,
              eval_details: evalResult,
            })
            .eq("id", result.id);
        } catch (dbErr) {
          console.warn("[Live Eval] Failed to update eval score in DB:", dbErr);
        }
      }

      // Staleness check:
      // If stored explanation's content_hash or commit_hash differs from active file/commit
      let isStale = false;
      if (result.contentHash && effectiveContentHash && result.contentHash !== effectiveContentHash) {
        isStale = true;
      }
      if (result.commitHash && currentCommit && result.commitHash !== currentCommit) {
        isStale = true;
      }

      return NextResponse.json({
        ...result,
        isStale,
        evalScore: evalResult.score,
        evalDetails: evalResult,
      });
    } else if (targetType === "folder") {
      if (!folderPath) {
        return NextResponse.json(
          { error: "Missing folderPath for folder explanation." },
          { status: 400 }
        );
      }

      // Compute composite folder hash if not provided
      const folderFingerprint = (files as Array<{ path: string }>)
        .map((f) => f.path)
        .sort()
        .join("|");
      const effectiveContentHash =
        clientContentHash ||
        crypto.createHash("sha256").update(`${folderPath}:${folderFingerprint}`).digest("hex");

      const result = await explainFolder({
        folderPath,
        fileCount: files.length,
        contentHash: effectiveContentHash,
        commitHash: currentCommit,
        files,
        incomingDependents,
        outgoingDependencies,
        analysisId,
        orgId,
        forceRefresh,
      });

      // Live Evaluation for folder
      const shownPaths = [
        folderPath,
        ...files.map((f: { path: string }) => f.path),
        ...incomingDependents,
        ...outgoingDependencies,
      ];
      const evalResult = evaluateInventedPaths(result.summary, shownPaths);

      if (result.traceRunId && process.env.LANGSMITH_API_KEY) {
        try {
          const lsClient = new LangSmithClient();
          await lsClient.createFeedback(result.traceRunId, "invented_path_score", {
            score: evalResult.score,
            comment: evalResult.summary,
          });
        } catch (fbErr) {
          console.warn("[Live Eval] Failed to log LangSmith feedback:", fbErr);
        }
      }

      if (result.id) {
        try {
          await supabase
            .from("explanations")
            .update({
              eval_score: evalResult.score,
              eval_details: evalResult,
            })
            .eq("id", result.id);
        } catch (dbErr) {
          console.warn("[Live Eval] Failed to update eval score in DB:", dbErr);
        }
      }

      let isStale = false;
      if (result.commitHash && currentCommit && result.commitHash !== currentCommit) {
        isStale = true;
      }

      return NextResponse.json({
        ...result,
        isStale,
        evalScore: evalResult.score,
        evalDetails: evalResult,
      });
    } else {
      return NextResponse.json(
        { error: `Invalid targetType: ${targetType}` },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    console.error("[POST /api/explain error]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate explanation." },
      { status: 500 }
    );
  }
}
