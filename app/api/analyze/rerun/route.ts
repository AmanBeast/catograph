import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runPipeline } from "@/lib/pipeline/runner";
import { createServerDbClient } from "@/lib/db/server";

export async function POST(req: Request) {
  try {
    const { orgId, getToken } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context is required." },
        { status: 401 }
      );
    }

    const token = await getToken();
    const body = await req.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId is required to re-run an analysis." },
        { status: 400 }
      );
    }

    const supabase = await createServerDbClient({ token, orgId });

    // Verify existing analysis and project ownership
    const { data: analysis, error: analErr } = await supabase
      .from("analyses")
      .select(`
        id,
        project_id,
        project:projects (
          id,
          repo_url,
          name
        )
      `)
      .eq("id", analysisId)
      .eq("org_id", orgId)
      .single();

    if (analErr || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found or access denied." },
        { status: 404 }
      );
    }

    const project = Array.isArray(analysis.project)
      ? analysis.project[0]
      : analysis.project;

    if (!project?.repo_url) {
      return NextResponse.json(
        { error: "Repository URL not found for this project." },
        { status: 400 }
      );
    }

    // Delete previous files, edges, insights, routes, and file_roles associated with this analysis for a fresh re-run
    await supabase.from("routes").delete().eq("analysis_id", analysisId);
    await supabase.from("file_roles").delete().eq("analysis_id", analysisId);
    await supabase.from("insights").delete().eq("analysis_id", analysisId);
    await supabase.from("edges").delete().eq("analysis_id", analysisId);
    await supabase.from("files").delete().eq("analysis_id", analysisId);

    // Reset analysis status
    await supabase
      .from("analyses")
      .update({
        status: "pending",
        stage: "pending",
        stage_message: "Re-run started...",
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        total_files: 0,
        parsed_files: 0,
        skipped_files: 0,
        coverage_percent: 0,
      })
      .eq("id", analysisId);

    // Kick off pipeline in background
    runPipeline({
      analysisId,
      projectId: project.id,
      repoUrl: project.repo_url,
      orgId,
      token,
    }).catch((pipelineErr) => {
      console.error("[Background Pipeline Re-run Failure]", pipelineErr);
    });

    return NextResponse.json({
      analysisId,
      message: "Re-run started successfully.",
    });
  } catch (err: any) {
    console.error("[API /api/analyze/rerun Error]", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while re-running analysis." },
      { status: 500 }
    );
  }
}
