import { loadEnv } from "../../lib/load-env.ts";
loadEnv();

import {
  PROMPT_EVAL_DATASET,
  runPromptV1Retired,
  runPromptV2Current,
  evaluateFormatCompliance,
  evaluateSpecificityJudge,
  type PromptExecutionResult,
} from "../../evals/prompt-comparison.ts";
import { evaluateInventedPaths } from "../../evals/invented-paths.ts";
import { Client as LangSmithClient, RunTree } from "langsmith";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Error: Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment.");
    process.exit(1);
  }

  const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY?.trim());
  const lsClient = hasLangSmith ? new LangSmithClient() : null;

  console.log(`\n======================================================`);
  console.log(` Cartograph Phase 11 — Prompt Versions Side-by-Side Eval`);
  console.log(` Experiments: 'v1-retired' vs 'v2-current'`);
  console.log(` Dataset:     ${PROMPT_EVAL_DATASET.length} architectural test cases`);
  console.log(` Tracing:     ${hasLangSmith ? "LangSmith active (project: " + (process.env.LANGSMITH_PROJECT || "Cartograph") + ")" : "Local only"}`);
  console.log(` Note: Specificity & Utility uses a model as judge —`);
  console.log(`       "is this specific enough to be useful" has no exact formula.`);
  console.log(`======================================================\n`);

  const v1Results: PromptExecutionResult[] = [];
  const v2Results: PromptExecutionResult[] = [];

  for (let i = 0; i < PROMPT_EVAL_DATASET.length; i++) {
    const testCase = PROMPT_EVAL_DATASET[i];
    console.log(`[${i + 1}/${PROMPT_EVAL_DATASET.length}] Evaluating ${testCase.filePath} ...`);

    const shownContext = [
      testCase.filePath,
      ...testCase.dependencies,
      ...testCase.dependents,
      ...testCase.externalImports,
    ];

    // --- Run V1 (Retired) ---
    process.stdout.write(`  • Running v1-retired ... `);
    let v1Output = "";
    try {
      v1Output = await runPromptV1Retired(testCase, apiKey);
      const grounding = evaluateInventedPaths(v1Output, shownContext);
      const format = evaluateFormatCompliance(v1Output);
      const specificity = await evaluateSpecificityJudge(testCase.filePath, v1Output, apiKey);
      const composite = (grounding.score * 0.4 + format * 0.3 + specificity * 0.3) * 100;

      v1Results.push({
        version: "v1-retired",
        testCase,
        rawOutput: v1Output,
        groundingScore: grounding.score,
        formatScore: format,
        specificityScore: specificity,
        compositeScore: composite,
        inventedPaths: grounding.inventedPaths,
      });

      console.log(`Composite: ${composite.toFixed(1)}% (Grounding: ${(grounding.score * 100).toFixed(0)}%, Format: ${(format * 100).toFixed(0)}%, Specificity: ${(specificity * 100).toFixed(0)}%)`);

      // Log to LangSmith if configured
      if (hasLangSmith) {
        try {
          const run = new RunTree({
            name: "eval_prompt_v1_retired",
            run_type: "llm",
            inputs: { filePath: testCase.filePath, version: "v1-retired" },
            project_name: process.env.LANGSMITH_PROJECT || "Cartograph",
            extra: {
              metadata: {
                experiment: "prompt-v1-retired",
                version: "v1-retired",
                composite_score: composite,
                grounding_score: grounding.score,
                format_score: format,
                specificity_score: specificity,
              },
            },
          });
          await run.postRun();
          await run.end({
            outputs: { output: v1Output },
            usage_metadata: { total_tokens: 0 },
          });
          await run.patchRun();
        } catch {
          // Non-blocking
        }
      }
    } catch (err: unknown) {
      console.log(`Failed (${err instanceof Error ? err.message : String(err)})`);
    }

    await sleep(400);

    // --- Run V2 (Current) ---
    process.stdout.write(`  • Running v2-current ... `);
    let v2Output = "";
    try {
      v2Output = await runPromptV2Current(testCase, apiKey);
      const grounding = evaluateInventedPaths(v2Output, shownContext);
      const format = evaluateFormatCompliance(v2Output);
      const specificity = await evaluateSpecificityJudge(testCase.filePath, v2Output, apiKey);
      const composite = (grounding.score * 0.4 + format * 0.3 + specificity * 0.3) * 100;

      v2Results.push({
        version: "v2-current",
        testCase,
        rawOutput: v2Output,
        groundingScore: grounding.score,
        formatScore: format,
        specificityScore: specificity,
        compositeScore: composite,
        inventedPaths: grounding.inventedPaths,
      });

      console.log(`Composite: ${composite.toFixed(1)}% (Grounding: ${(grounding.score * 100).toFixed(0)}%, Format: ${(format * 100).toFixed(0)}%, Specificity: ${(specificity * 100).toFixed(0)}%)`);

      // Log to LangSmith if configured
      if (hasLangSmith) {
        try {
          const run = new RunTree({
            name: "eval_prompt_v2_current",
            run_type: "llm",
            inputs: { filePath: testCase.filePath, version: "v2-current" },
            project_name: process.env.LANGSMITH_PROJECT || "Cartograph",
            extra: {
              metadata: {
                experiment: "prompt-v2-current",
                version: "v2-current",
                composite_score: composite,
                grounding_score: grounding.score,
                format_score: format,
                specificity_score: specificity,
              },
            },
          });
          await run.postRun();
          await run.end({
            outputs: { output: v2Output },
            usage_metadata: { total_tokens: 0 },
          });
          await run.patchRun();
        } catch {
          // Non-blocking
        }
      }
    } catch (err: unknown) {
      console.log(`Failed (${err instanceof Error ? err.message : String(err)})`);
    }

    console.log();
    await sleep(400);
  }

  // --- Compute Averages ---
  const calcAvg = (arr: PromptExecutionResult[], key: "groundingScore" | "formatScore" | "specificityScore" | "compositeScore") => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, r) => acc + (key === "compositeScore" ? r[key] : r[key] * 100), 0);
    return sum / arr.length;
  };

  const v1Grounding = calcAvg(v1Results, "groundingScore");
  const v2Grounding = calcAvg(v2Results, "groundingScore");

  const v1Format = calcAvg(v1Results, "formatScore");
  const v2Format = calcAvg(v2Results, "formatScore");

  const v1Specificity = calcAvg(v1Results, "specificityScore");
  const v2Specificity = calcAvg(v2Results, "specificityScore");

  const v1Composite = calcAvg(v1Results, "compositeScore");
  const v2Composite = calcAvg(v2Results, "compositeScore");

  const deltaGrounding = v2Grounding - v1Grounding;
  const deltaFormat = v2Format - v1Format;
  const deltaSpecificity = v2Specificity - v1Specificity;
  const deltaComposite = v2Composite - v1Composite;

  // --- SIDE BY SIDE COMPARISON DASHBOARD ---
  console.log(`\n========================================================================`);
  console.log(` PROMPT VERSIONS SIDE-BY-SIDE EVALUATION DASHBOARD`);
  console.log(`========================================================================`);
  console.log(`┌────────────────────────────────────┬────────────┬────────────┬────────────┐`);
  console.log(`│ Evaluation Metric                  │ v1-retired │ v2-current │ Delta      │`);
  console.log(`├────────────────────────────────────┼────────────┼────────────┼────────────┤`);
  console.log(`│ Grounding (No Invented Paths)      │ ${v1Grounding.toFixed(1).padStart(8)}%  │ ${v2Grounding.toFixed(1).padStart(8)}%  │ ${(deltaGrounding >= 0 ? "+" : "") + deltaGrounding.toFixed(1).padStart(8)}%  │`);
  console.log(`│ Format Compliance (Strict bounds)  │ ${v1Format.toFixed(1).padStart(8)}%  │ ${v2Format.toFixed(1).padStart(8)}%  │ ${(deltaFormat >= 0 ? "+" : "") + deltaFormat.toFixed(1).padStart(8)}%  │`);
  console.log(`│ Specificity & Utility (Model Judge)│ ${v1Specificity.toFixed(1).padStart(8)}%  │ ${v2Specificity.toFixed(1).padStart(8)}%  │ ${(deltaSpecificity >= 0 ? "+" : "") + deltaSpecificity.toFixed(1).padStart(8)}%  │`);
  console.log(`├────────────────────────────────────┼────────────┼────────────┼────────────┤`);
  console.log(`│ OVERALL COMPOSITE SCORE            │ ${v1Composite.toFixed(1).padStart(8)}%  │ ${v2Composite.toFixed(1).padStart(8)}%  │ ${(deltaComposite >= 0 ? "+" : "") + deltaComposite.toFixed(1).padStart(8)}%  │`);
  console.log(`└────────────────────────────────────┴────────────┴────────────┴────────────┘`);

  const winner = deltaComposite >= 0 ? "v2-current" : "v1-retired";
  const absDelta = Math.abs(deltaComposite).toFixed(1);

  console.log(`\nVerifiable Conclusion:`);
  console.log(`  ${winner} is better by +${absDelta}% overall`);
  console.log(`  (Grounding delta: ${deltaGrounding >= 0 ? "+" : ""}${deltaGrounding.toFixed(1)}%, Format compliance delta: ${deltaFormat >= 0 ? "+" : ""}${deltaFormat.toFixed(1)}%).\n`);

  if (hasLangSmith) {
    console.log(`LangSmith Tracing Dashboard:`);
    console.log(`  Both experiments are recorded under project "${process.env.LANGSMITH_PROJECT || "Cartograph"}"`);
    console.log(`  View side-by-side runs: https://smith.langchain.com\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
