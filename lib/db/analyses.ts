import { createServerDbClient } from "@/lib/db/server";

export interface ProjectInfo {
  id: string;
  name: string;
  repo_url: string;
  default_branch: string;
}

export interface AnalysisRow {
  id: string;
  org_id: string;
  project_id: string;
  status: "pending" | "parsing" | "graphing" | "complete" | "failed" | "stale";
  stage: string | null;
  stage_message: string | null;
  error_message: string | null;
  commit_hash: string | null;
  total_files: number;
  parsed_files: number;
  skipped_files: number;
  coverage_percent: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  project?: ProjectInfo | null;
}

/**
 * Reads all analyses visible to the current authenticated database client.
 *
 * CRITICAL CONSTRAINT:
 * Do NOT filter by organization in application code.
 * Who may read a row is decided entirely by the database policy, never application code.
 */
export async function getDashboardAnalyses(): Promise<AnalysisRow[]> {
  const supabase = await createServerDbClient();

  const { data, error } = await supabase
    .from("analyses")
    .select(`
      id,
      org_id,
      project_id,
      status,
      stage,
      stage_message,
      error_message,
      commit_hash,
      total_files,
      parsed_files,
      skipped_files,
      coverage_percent,
      started_at,
      completed_at,
      created_at,
      project:projects (
        id,
        name,
        repo_url,
        default_branch
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Dashboard] Query failed:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    return {
      ...row,
      project: project ?? null,
    };
  }) as AnalysisRow[];
}
