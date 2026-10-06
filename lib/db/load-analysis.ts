import { createServerDbClient } from "./server";
import type { ParseResult, ParsedFile, Edge, ExtractedRoute, FileRole, ImportKind } from "@/lib/parser/types";
import { detectFrameworkAdapter } from "@/lib/adapters";

export interface LoadedAnalysisData {
  analysis: {
    id: string;
    status: string;
    stage: string | null;
    stage_message: string | null;
    commit_hash: string | null;
    framework: string | null;
    error_message: string | null;
    coverage_percent: number;
    total_files: number;
    parsed_files: number;
    skipped_files: number;
    repoName: string;
    repoUrl: string;
    defaultBranch: string;
  };
  parseResult: ParseResult | null;
}

/**
 * Loads a completed analysis from the database and reconstructs the ParseResult graph.
 * Purely reads stored rows from Supabase — no static/preview JSON files.
 */
export async function loadAnalysisData(analysisId: string): Promise<LoadedAnalysisData | null> {
  const supabase = await createServerDbClient();

  const { data: analysis, error: analErr } = await supabase
    .from("analyses")
    .select(`
      id,
      status,
      stage,
      stage_message,
      commit_hash,
      framework,
      error_message,
      coverage_percent,
      total_files,
      parsed_files,
      skipped_files,
      project:projects (
        id,
        name,
        repo_url,
        default_branch
      )
    `)
    .eq("id", analysisId)
    .single();

  if (analErr || !analysis) {
    return null;
  }

  const project = Array.isArray(analysis.project)
    ? analysis.project[0]
    : analysis.project;

  const baseInfo = {
    id: analysis.id,
    status: analysis.status,
    stage: analysis.stage,
    stage_message: analysis.stage_message,
    commit_hash: analysis.commit_hash,
    framework: analysis.framework || null,
    error_message: analysis.error_message,
    coverage_percent: Number(analysis.coverage_percent || 0),
    total_files: analysis.total_files || 0,
    parsed_files: analysis.parsed_files || 0,
    skipped_files: analysis.skipped_files || 0,
    repoName: project?.name || "Repository",
    repoUrl: project?.repo_url || "",
    defaultBranch: project?.default_branch || "main",
  };

  if (analysis.status !== "complete") {
    return {
      analysis: baseInfo,
      parseResult: null,
    };
  }

  // Load files
  const { data: rawFiles } = await supabase
    .from("files")
    .select("id, path, name, extension, size_bytes, lines_count, fan_in, fan_out, status, skip_reason")
    .eq("analysis_id", analysisId);

  const fileIdToPath = new Map<string, string>();
  const parsedFiles: ParsedFile[] = [];
  const foldersMap = new Map<string, number>();

  for (const f of rawFiles || []) {
    fileIdToPath.set(f.id, f.path);

    if (f.status === "parsed") {
      const folder = f.path.includes("/")
        ? f.path.substring(0, f.path.lastIndexOf("/"))
        : ".";

      foldersMap.set(folder, (foldersMap.get(folder) || 0) + 1);

      parsedFiles.push({
        id: f.path,
        path: f.path,
        folder,
        name: f.name,
        extension: f.extension || "",
        linesCount: f.lines_count || 0,
        sizeBytes: f.size_bytes || 0,
        contentHash: "",
        fanIn: f.fan_in || 0,
        fanOut: f.fan_out || 0,
      });
    }
  }

  // Load edges
  const { data: rawEdges } = await supabase
    .from("edges")
    .select(`
      id,
      source_file_id,
      target_file_id,
      raw_import_path,
      import_kind,
      is_resolved,
      unresolved_reason
    `)
    .eq("analysis_id", analysisId);

  const edges: Edge[] = [];
  let internalResolvedEdges = 0;
  let unresolvedImports = 0;
  let externalImports = 0;

  for (const e of rawEdges || []) {
    const sourcePath = fileIdToPath.get(e.source_file_id);
    if (!sourcePath) continue;

    const targetPath = e.target_file_id ? fileIdToPath.get(e.target_file_id) : null;

    if (e.is_resolved && targetPath) {
      internalResolvedEdges++;
      edges.push({
        source: sourcePath,
        target: targetPath,
        rawSpecifier: e.raw_import_path,
        kind: e.import_kind as ImportKind,
        status: "resolved",
      });
    } else if (e.is_resolved && !targetPath) {
      externalImports++;
      edges.push({
        source: sourcePath,
        target: e.raw_import_path,
        rawSpecifier: e.raw_import_path,
        kind: e.import_kind as ImportKind,
        status: "external",
      });
    } else {
      unresolvedImports++;
      edges.push({
        source: sourcePath,
        target: e.raw_import_path,
        rawSpecifier: e.raw_import_path,
        kind: e.import_kind as ImportKind,
        status: "unresolved",
        unresolvedReason: e.unresolved_reason,
      });
    }
  }

  // Load routes (Phase 8)
  const { data: rawRoutes } = await supabase
    .from("routes")
    .select("id, file_id, method, pattern, is_dynamic")
    .eq("analysis_id", analysisId);

  const routes: ExtractedRoute[] = [];
  for (const r of rawRoutes || []) {
    const filePath = fileIdToPath.get(r.file_id);
    if (filePath) {
      routes.push({
        id: r.id,
        filePath,
        method: r.method,
        pattern: r.pattern,
        isDynamic: Boolean(r.is_dynamic),
      });
    }
  }

  // Load file roles (Phase 8)
  const { data: rawRoles } = await supabase
    .from("file_roles")
    .select("id, file_id, role, confidence")
    .eq("analysis_id", analysisId);

  const fileRoles: FileRole[] = [];
  for (const fr of rawRoles || []) {
    const filePath = fileIdToPath.get(fr.file_id);
    if (filePath) {
      fileRoles.push({
        filePath,
        role: fr.role,
        confidence: Number(fr.confidence || 1.0),
      });
    }
  }

  // If framework wasn't recorded or routes/roles empty (e.g. pre-Phase-8 analysis), derive dynamically
  let detectedFramework = baseInfo.framework;
  if (!detectedFramework) {
    const adapter = detectFrameworkAdapter("", parsedFiles, edges);
    detectedFramework = adapter.name;
    if (routes.length === 0) {
      routes.push(...adapter.extractRoutes(parsedFiles));
    }
    if (fileRoles.length === 0) {
      fileRoles.push(...adapter.classifyFiles(parsedFiles));
    }
  }

  const folders: string[] = Array.from(foldersMap.keys()).sort();

  const parseResult: ParseResult = {
    repoPath: baseInfo.repoName,
    framework: detectedFramework,
    files: parsedFiles,
    skippedFiles: [],
    edges,
    folders,
    routes,
    fileRoles,
    coverage: {
      totalFilesFound: baseInfo.total_files || parsedFiles.length,
      filesParsedCount: baseInfo.parsed_files || parsedFiles.length,
      filesSkippedCount: baseInfo.skipped_files || 0,
      distinctFoldersCount: folders.length,
      totalImportsSeen: edges.length,
      internalResolvedEdges,
      externalImports,
      unresolvedImports,
      reExportsFound: 0,
      reExportsResolved: 0,
      reExportsUnresolved: 0,
      failures: [],
      skipSummary: {},
    },
  };

  return {
    analysis: {
      ...baseInfo,
      framework: detectedFramework,
    },
    parseResult,
  };
}
