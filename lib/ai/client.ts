import { RunTree } from "langsmith";
import { createServerDbClient } from "../db/server";
import type { ExplanationResult, AllowedUnmatchedRole } from "./types";

/**
 * Pinned model version per Phase 10 specification:
 * Model versions are pinned exactly, never to a moving alias,
 * and the model name is part of the cache key.
 */
export const PINNED_MODEL = "gemini-3.5-flash-lite";

/**
 * Checks if LangSmith tracing is configured in the environment.
 */
export function isTracingConfigured(): boolean {
  return Boolean(process.env.LANGSMITH_API_KEY?.trim());
}

/**
 * Gets the Gemini API key from environment variables.
 */
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || !key.trim()) {
    throw new Error(
      "Missing GEMINI_API_KEY or GOOGLE_API_KEY. Please ensure the key is configured in your environment."
    );
  }
  return key.trim();
}

interface TracedCallParams {
  runName: string;
  targetType: "file" | "folder";
  targetKey: string;
  contentHash: string;
  commitHash?: string | null;
  orgId: string;
  analysisId: string;
  fileId?: string | null;
  forceRefresh?: boolean;
  prompt: string;
  systemInstruction?: string;
  parseOutput: (rawText: string) => { summary: string; role?: AllowedUnmatchedRole | null };
}

/**
 * The single wrapped AI client invocation function for Cartograph.
 *
 * Requirements:
 * 1. Every call through it is traced with LangSmith.
 * 2. If tracing is unconfigured, calls still succeed without crashing.
 * 3. The cache read happens INSIDE the traced call, not before it.
 * 4. A cache hit registers in the trace as a recorded run with 0 tokens.
 * 5. Model version is pinned and part of the cache key.
 */
export async function invokeTracedAiCall(
  params: TracedCallParams
): Promise<ExplanationResult> {
  const {
    runName,
    targetType,
    targetKey,
    contentHash,
    commitHash,
    orgId,
    analysisId,
    fileId,
    forceRefresh = false,
    prompt,
    systemInstruction,
    parseOutput,
  } = params;

  const tracingConfigured = isTracingConfigured();
  let runTree: RunTree | null = null;

  // Initialize LangSmith RunTree if tracing is configured
  if (tracingConfigured) {
    try {
      runTree = new RunTree({
        name: runName,
        run_type: "llm",
        inputs: {
          targetType,
          targetKey,
          contentHash,
          prompt,
        },
        project_name: process.env.LANGSMITH_PROJECT || "Cartograph",
        extra: {
          metadata: {
            model: PINNED_MODEL,
            target_type: targetType,
            target_key: targetKey,
            content_hash: contentHash,
            org_id: orgId,
            analysis_id: analysisId,
            force_refresh: forceRefresh,
          },
        },
      });

      await runTree.postRun();
    } catch (err) {
      console.warn(
        "[LangSmith] Failed to post run, continuing execution:",
        err instanceof Error ? err.message : String(err)
      );
      runTree = null;
    }
  }

  const supabase = await createServerDbClient();

  // -------------------------------------------------------------------------
  // CACHE CHECK (Inside the traced call!)
  // -------------------------------------------------------------------------
  if (!forceRefresh && contentHash) {
    try {
      const { data: cachedRow } = await supabase
        .from("explanations")
        .select("id, summary, role, model_version, token_count, content_hash, commit_hash")
        .eq("org_id", orgId)
        .eq("target_key", targetKey)
        .eq("content_hash", contentHash)
        .eq("model_version", PINNED_MODEL)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedRow && cachedRow.summary) {
        // Cache hit! Record 0 tokens in trace per Phase 10 spec
        if (runTree) {
          try {
            await runTree.end({
              outputs: {
                cached: true,
                summary: cachedRow.summary,
                role: cachedRow.role,
              },
              usage_metadata: {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
              },
            });
            await runTree.patchRun();
          } catch (err) {
            console.warn("[LangSmith] Failed to patch cache-hit run:", err);
          }
        }

        return {
          id: cachedRow.id,
          targetKey,
          targetType,
          summary: cachedRow.summary,
          role: (cachedRow.role as AllowedUnmatchedRole) || null,
          cached: true,
          tokenCount: 0, // Cache hits record 0 tokens
          modelVersion: PINNED_MODEL,
          contentHash,
          commitHash: cachedRow.commit_hash || commitHash || null,
          isStale: false,
          tracingConfigured,
          traced: Boolean(runTree),
          traceRunId: runTree?.id,
        };
      }
    } catch (cacheErr) {
      console.warn("[AI Cache] Cache lookup error, proceeding with generation:", cacheErr);
    }
  }

  // -------------------------------------------------------------------------
  // CACHE MISS: Call Gemini gemini-3.5-flash-lite
  // -------------------------------------------------------------------------
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_MODEL}:generateContent?key=${apiKey}`;

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let rawResponseText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${errBody}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("No text response returned by model.");
    }

    rawResponseText = textPart;
    inputTokens = data.usageMetadata?.promptTokenCount || 0;
    outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    totalTokens = data.usageMetadata?.totalTokenCount || inputTokens + outputTokens;
  } catch (apiErr) {
    // Record error in trace if active
    if (runTree) {
      try {
        await runTree.end({
          error: apiErr instanceof Error ? apiErr.message : String(apiErr),
        });
        await runTree.patchRun();
      } catch {
        // Ignore trace error
      }
    }
    throw apiErr;
  }

  // Parse structured or formatted output
  const parsed = parseOutput(rawResponseText);

  // Close and record active trace
  if (runTree) {
    try {
      await runTree.end({
        outputs: {
          cached: false,
          summary: parsed.summary,
          role: parsed.role,
        },
        usage_metadata: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
        },
      });
      await runTree.patchRun();
    } catch (err) {
      console.warn("[LangSmith] Failed to patch active run:", err);
    }
  }

  // -------------------------------------------------------------------------
  // PERSIST TO DATABASE CACHE
  // -------------------------------------------------------------------------
  let savedId: string | undefined;
  try {
    const insertPayload: Record<string, unknown> = {
      org_id: orgId,
      analysis_id: analysisId,
      file_id: fileId || null,
      target_type: targetType,
      target_key: targetKey,
      content_hash: contentHash,
      commit_hash: commitHash || null,
      summary: parsed.summary,
      role: parsed.role || null,
      model_version: PINNED_MODEL,
      token_count: totalTokens,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("explanations")
      .insert(insertPayload)
      .select("id")
      .single();

    if (!insertErr && inserted) {
      savedId = inserted.id;
    }
  } catch (dbErr) {
    console.warn("[AI Cache] Failed to persist explanation cache:", dbErr);
  }

  return {
    id: savedId,
    targetKey,
    targetType,
    summary: parsed.summary,
    role: parsed.role || null,
    cached: false,
    tokenCount: totalTokens,
    modelVersion: PINNED_MODEL,
    contentHash,
    commitHash: commitHash || null,
    isStale: false,
    tracingConfigured,
    traced: Boolean(runTree),
    traceRunId: runTree?.id,
  };
}
