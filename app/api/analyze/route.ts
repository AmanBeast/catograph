import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { normalizeRepoUrl } from "@/lib/pipeline/fetcher";
import { runPipeline } from "@/lib/pipeline/runner";
import { createServerDbClient } from "@/lib/db/server";

export async function POST(req: Request) {
  try {
    const { orgId, getToken } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context is required to create an analysis." },
        { status: 401 }
      );
    }

    const token = await getToken();
    const body = await req.json();
    const rawRepoUrl = body.repoUrl;

    if (!rawRepoUrl || typeof rawRepoUrl !== "string") {
      return NextResponse.json(
        { error: "A valid GitHub repository URL is required." },
        { status: 400 }
      );
    }

    // 1. Normalize repository URL
    let normalized;
    try {
      normalized = normalizeRepoUrl(rawRepoUrl);
    } catch (normErr: any) {
      return NextResponse.json(
        { error: normErr.message || "Invalid repository URL." },
        { status: 400 }
      );
    }

    const supabase = await createServerDbClient({ token, orgId });

    // 2. CONSTRAINT: One analysis per repository.
    // Check if project already exists for this organization
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id, name, default_branch")
      .eq("org_id", orgId)
      .eq("repo_url", normalized.url)
      .maybeSingle();

    if (existingProject) {
      // Find the existing analysis for this repository
      const { data: existingAnalysis } = await supabase
        .from("analyses")
        .select("id, status")
        .eq("org_id", orgId)
        .eq("project_id", existingProject.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAnalysis) {
        // Return existing analysis immediately — do NOT create a second row
        return NextResponse.json({
          analysisId: existingAnalysis.id,
          isExisting: true,
          message: "Navigating to existing analysis for this repository.",
        });
      }
    }

    // 3. Create project if it doesn't exist yet
    let projectId = existingProject?.id;
    if (!projectId) {
      const { data: newProject, error: projErr } = await supabase
        .from("projects")
        .insert({
          org_id: orgId,
          repo_url: normalized.url,
          name: normalized.repo,
          default_branch: "main",
        })
        .select("id")
        .single();

      if (projErr || !newProject) {
        return NextResponse.json(
          { error: `Failed to initialize project: ${projErr?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
      projectId = newProject.id;
    }

    // 4. Create new analysis row
    const { data: newAnalysis, error: analErr } = await supabase
      .from("analyses")
      .insert({
        org_id: orgId,
        project_id: projectId,
        status: "pending",
        stage: "pending",
        stage_message: "Queued for analysis...",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (analErr || !newAnalysis) {
      return NextResponse.json(
        { error: `Failed to create analysis record: ${analErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // 5. Kick off pipeline run asynchronously in background
    // (Do not await so user receives immediate response and redirect)
    runPipeline({
      analysisId: newAnalysis.id,
      projectId,
      repoUrl: normalized.url,
      orgId,
      token,
    }).catch((pipelineErr) => {
      console.error("[Background Pipeline Failure]", pipelineErr);
    });

    return NextResponse.json(
      {
        analysisId: newAnalysis.id,
        isExisting: false,
        message: "Analysis created and pipeline started.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[API /api/analyze Error]", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while processing analysis." },
      { status: 500 }
    );
  }
}
