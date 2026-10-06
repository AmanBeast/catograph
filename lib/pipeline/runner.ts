import { fetchAndExtractRepo, cleanupExtractDir } from "./fetcher.ts";
import { parseRepository } from "@/lib/parser/index.ts";
import { computeCodebaseInsights } from "@/lib/canvas/graph-math.ts";
import { createServerDbClient } from "@/lib/db/server.ts";
import { detectFrameworkAdapter } from "@/lib/adapters";

export interface PipelineParams {
  analysisId: string;
  projectId: string;
  repoUrl: string;
  orgId: string;
  token?: string | null;
}

export type PipelineStage =
  | "pending"
  | "fetching"
  | "extracting"
  | "parsing"
  | "graphing"
  | "storing"
  | "complete"
  | "failed";

const STAGE_MESSAGES: Record<PipelineStage, string> = {
  pending: "Queued for analysis...",
  fetching: "Downloading repository archive from GitHub...",
  extracting: "Extracting repository files and inspecting tree...",
  parsing: "Parsing TypeScript modules and constructing AST...",
  graphing: "Resolving module dependencies and computing metrics...",
  storing: "Saving files, edges, and metrics to database...",
  complete: "Analysis complete",
  failed: "Analysis failed",
};

/**
 * Executes the complete repository analysis pipeline:
 * Fetch archive -> Extract -> Parse AST -> Resolve Graph -> Store Rows.
 *
 * Guaranteed constraints:
 * 1. Top-level catch writes a 'failed' state with the stage name and exact error message,
 *    never leaving a row stuck mid-parse.
 * 2. Realtime triggers publish progress updates live as the stage advances.
 * 3. Temporary disk archives are strictly cleaned up in finally block.
 */
export async function runPipeline({
  analysisId,
  projectId,
  repoUrl,
  orgId,
  token,
}: PipelineParams): Promise<void> {
  // In background pipeline execution, do NOT attach short-lived Clerk user session tokens
  // because user tokens expire in 60s, causing database operations on large repos to fail mid-pipeline.
  // Instead, authenticate using orgId with publishable key, which isolates queries via x-org-id without expiration.
  const supabase = await createServerDbClient({ orgId });
  let currentStage: PipelineStage = "pending";
  let extractDir: string | null = null;

  async function updateStage(
    stage: PipelineStage,
    status: "pending" | "parsing" | "graphing" | "complete" | "failed" = "parsing",
    customMessage?: string,
    extraFields?: Record<string, unknown>
  ) {
    currentStage = stage;
    const message = customMessage || STAGE_MESSAGES[stage];

    // Retry up to 3 times on transient network error
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase
        .from("analyses")
        .update({
          status,
          stage,
          stage_message: message,
          ...extraFields,
        })
        .eq("id", analysisId);

      if (!error) {
        return;
      }

      lastError = new Error(error.message);
      console.warn(`[Pipeline Stage Update Warning (${stage}) attempt ${attempt}]:`, error.message);
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 400 * attempt));
      }
    }

    if (stage === "complete" || status === "failed") {
      throw lastError || new Error(`Failed to update analysis stage to ${stage}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // STAGE 1: FETCH ARCHIVE
    // -------------------------------------------------------------------------
    await updateStage("fetching", "parsing", STAGE_MESSAGES.fetching);

    const fetched = await fetchAndExtractRepo(repoUrl);
    extractDir = fetched.extractDir;

    // Record commit hash and update project default branch
    await supabase
      .from("analyses")
      .update({
        commit_hash: fetched.commitHash,
      })
      .eq("id", analysisId);

    await supabase
      .from("projects")
      .update({
        default_branch: fetched.defaultBranch,
        name: fetched.repoName,
      })
      .eq("id", projectId);

    // -------------------------------------------------------------------------
    // STAGE 2: EXTRACTING & TREE INSPECTION
    // -------------------------------------------------------------------------
    await updateStage("extracting", "parsing", STAGE_MESSAGES.extracting);

    // -------------------------------------------------------------------------
    // STAGE 3: PARSING AST & MODULES
    // -------------------------------------------------------------------------
    await updateStage("parsing", "parsing", STAGE_MESSAGES.parsing);

    const parseResult = await parseRepository(extractDir);

    // -------------------------------------------------------------------------
    // STAGE 4: GRAPHING & METRICS DERIVATION
    // -------------------------------------------------------------------------
    await updateStage("graphing", "graphing", STAGE_MESSAGES.graphing);

    // Compute deterministic codebase insights
    const codebaseInsights = computeCodebaseInsights(
      parseResult.files,
      parseResult.edges
    );

    // Phase 8: Framework adapter detection, route extraction & role classification
    const adapter = detectFrameworkAdapter(
      extractDir,
      parseResult.files,
      parseResult.edges
    );
    const extractedRoutes = adapter.extractRoutes(parseResult.files, extractDir);
    const classifiedRoles = adapter.classifyFiles(parseResult.files, extractDir);

    // -------------------------------------------------------------------------
    // STAGE 5: STORING IN DATABASE
    // -------------------------------------------------------------------------
    await updateStage("storing", "graphing", STAGE_MESSAGES.storing);

    // 5a. Insert parsed files in batches of 200
    const filesToInsert = parseResult.files.map((file) => ({
      analysis_id: analysisId,
      org_id: orgId,
      path: file.path,
      name: file.name,
      extension: file.extension,
      size_bytes: file.sizeBytes,
      lines_count: file.linesCount,
      status: "parsed",
      fan_in: file.fanIn,
      fan_out: file.fanOut,
    }));

    const BATCH_SIZE = 200;
    for (let i = 0; i < filesToInsert.length; i += BATCH_SIZE) {
      const batch = filesToInsert.slice(i, i + BATCH_SIZE);
      const { error: fileErr } = await supabase.from("files").insert(batch);
      if (fileErr) {
        throw new Error(`Failed to store files batch ${Math.floor(i / BATCH_SIZE) + 1}: ${fileErr.message}`);
      }
    }

    // 5b. Retrieve all inserted file IDs with pagination to map path -> file_id
    const pathToFileId = new Map<string, string>();
    let fileOffset = 0;
    const CHUNK_SIZE = 1000;
    while (true) {
      const { data: insertedFiles, error: fetchErr } = await supabase
        .from("files")
        .select("id, path")
        .eq("analysis_id", analysisId)
        .range(fileOffset, fileOffset + CHUNK_SIZE - 1);

      if (fetchErr || !insertedFiles) {
        throw new Error(`Failed to retrieve file mapping: ${fetchErr?.message || "No files found"}`);
      }

      for (const f of insertedFiles) {
        pathToFileId.set(f.path, f.id);
      }

      if (insertedFiles.length < CHUNK_SIZE) {
        break;
      }
      fileOffset += CHUNK_SIZE;
    }

    // 5c. Insert edges in batches of 500
    const edgesToInsert = parseResult.edges
      .map((edge) => {
        const sourceFileId = pathToFileId.get(edge.source);
        if (!sourceFileId) return null;

        const targetFileId = edge.target ? pathToFileId.get(edge.target) || null : null;

        return {
          analysis_id: analysisId,
          org_id: orgId,
          source_file_id: sourceFileId,
          target_file_id: targetFileId,
          raw_import_path: edge.rawSpecifier,
          import_kind: edge.kind,
          is_resolved: edge.status === "resolved",
          unresolved_reason:
            edge.status === "unresolved" ? edge.unresolvedReason || "Unresolved import" : null,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const EDGE_BATCH_SIZE = 500;
    for (let i = 0; i < edgesToInsert.length; i += EDGE_BATCH_SIZE) {
      const batch = edgesToInsert.slice(i, i + EDGE_BATCH_SIZE);
      const { error: edgeErr } = await supabase.from("edges").insert(batch);
      if (edgeErr) {
        throw new Error(`Failed to store edges batch ${Math.floor(i / EDGE_BATCH_SIZE) + 1}: ${edgeErr.message}`);
      }
    }

    // 5d. Insert insights
    if (codebaseInsights.length > 0) {
      const insightsToInsert = codebaseInsights.map((ins) => ({
        analysis_id: analysisId,
        org_id: orgId,
        kind: ins.type,
        title: ins.title,
        description: ins.fixedSentence,
        metadata: {
          files: ins.files,
          primaryFilePath: ins.primaryFilePath,
          metricLabel: ins.metricLabel,
          severity: ins.severity,
        },
      }));

      for (let i = 0; i < insightsToInsert.length; i += BATCH_SIZE) {
        const batch = insightsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insErr } = await supabase.from("insights").insert(batch);
        if (insErr) {
          console.warn(`[Pipeline Warning] Failed to insert insights batch:`, insErr.message);
        }
      }
    }

    // 5e. Insert extracted routes (Phase 8)
    if (extractedRoutes.length > 0) {
      const routesToInsert = extractedRoutes
        .map((r) => {
          const fileId = pathToFileId.get(r.filePath);
          if (!fileId) return null;
          return {
            analysis_id: analysisId,
            org_id: orgId,
            file_id: fileId,
            method: r.method,
            pattern: r.pattern,
            is_dynamic: r.isDynamic,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      for (let i = 0; i < routesToInsert.length; i += BATCH_SIZE) {
        const batch = routesToInsert.slice(i, i + BATCH_SIZE);
        const { error: routeErr } = await supabase.from("routes").insert(batch);
        if (routeErr) {
          console.warn(`[Pipeline Warning] Failed to insert routes batch:`, routeErr.message);
        }
      }
    }

    // 5f. Insert classified file roles (Phase 8)
    if (classifiedRoles.length > 0) {
      const rolesToInsert = classifiedRoles
        .map((cr) => {
          const fileId = pathToFileId.get(cr.filePath);
          if (!fileId) return null;
          return {
            analysis_id: analysisId,
            org_id: orgId,
            file_id: fileId,
            role: cr.role,
            confidence: cr.confidence ?? 1.0,
          };
        })
        .filter((cr): cr is NonNullable<typeof cr> => cr !== null);

      for (let i = 0; i < rolesToInsert.length; i += BATCH_SIZE) {
        const batch = rolesToInsert.slice(i, i + BATCH_SIZE);
        const { error: roleErr } = await supabase.from("file_roles").insert(batch);
        if (roleErr) {
          console.warn(`[Pipeline Warning] Failed to insert roles batch:`, roleErr.message);
        }
      }
    }

    // -------------------------------------------------------------------------
    // STAGE 6: COMPLETE
    // -------------------------------------------------------------------------
    const totalFiles = parseResult.coverage.totalFilesFound;
    const parsedFiles = parseResult.coverage.filesParsedCount;
    const skippedFiles = parseResult.coverage.filesSkippedCount;
    const coveragePercent = totalFiles > 0 ? (parsedFiles / totalFiles) * 100 : 100;

    await updateStage("complete", "complete", STAGE_MESSAGES.complete, {
      framework: adapter.name,
      total_files: totalFiles,
      parsed_files: parsedFiles,
      skipped_files: skippedFiles,
      coverage_percent: coveragePercent,
      completed_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : String(err || "Unexpected failure occurred during repository analysis.");
    console.error(`[Pipeline Error in stage "${currentStage}"]`, errorMsg);

    try {
      await supabase
        .from("analyses")
        .update({
          status: "failed",
          stage: currentStage,
          error_message: errorMsg,
          stage_message: `Failed during ${currentStage}: ${errorMsg}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", analysisId);
    } catch (saveErr) {
      console.error("[Pipeline Failed to Write Failed State]", saveErr);
    }
  } finally {
    if (extractDir) {
      await cleanupExtractDir(extractDir);
    }
  }
}
