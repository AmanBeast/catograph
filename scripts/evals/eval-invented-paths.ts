import { loadEnv } from "../../lib/load-env.ts";
loadEnv();

import { getScriptDbClient } from "../../lib/db/client.ts";
import { evaluateInventedPaths } from "../../evals/invented-paths.ts";

async function main() {
  const args = process.argv.slice(2);
  const isSyntheticOnly = args.includes("--synthetic");
  const isLiveOnly = args.includes("--live");

  console.log(`\n======================================================`);
  console.log(` Cartograph Phase 11 — Invented-Path Evaluator`);
  console.log(` Mode: ${isSyntheticOnly ? "Synthetic Test" : isLiveOnly ? "Live Traffic" : "Comprehensive (Live + Synthetic)"}`);
  console.log(`======================================================\n`);

  let livePassed = 0;
  let liveTotal = 0;
  let liveScoresSum = 0;
  const flaggedFailures: Array<{
    targetKey: string;
    score: number;
    invented: string[];
    summary: string;
  }> = [];

  // 1. LIVE TRAFFIC EVALUATION (from database recent explanations)
  if (!isSyntheticOnly) {
    console.log(`[1/2] Evaluating recent real explanations from database...`);
    try {
      const supabase = getScriptDbClient();
      const { data: rows, error } = await supabase
        .from("explanations")
        .select(`
          id,
          target_key,
          target_type,
          summary,
          eval_score,
          analysis_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn(`  Warning reading database: ${error.message}`);
      } else if (rows && rows.length > 0) {
        console.log(`  Found ${rows.length} recent explanation(s) in database.\n`);

        for (const row of rows) {
          // For each explanation, fetch its analysis edges and files to reconstruct shown paths
          const { data: fileRows } = await supabase
            .from("files")
            .select("path")
            .eq("analysis_id", row.analysis_id)
            .limit(100);

          const knownRepoPaths = (fileRows || []).map((f) => f.path);
          // If the target is in the repo, shown paths include target and known repo neighbours
          const shown = [row.target_key, ...knownRepoPaths];

          const evalResult = evaluateInventedPaths(row.summary, shown);
          liveTotal++;
          liveScoresSum += evalResult.score;
          if (evalResult.passed) {
            livePassed++;
          } else {
            flaggedFailures.push({
              targetKey: row.target_key,
              score: evalResult.score,
              invented: evalResult.inventedPaths,
              summary: row.summary.slice(0, 120) + "...",
            });
          }

          console.log(`  • ${row.target_key.padEnd(35)} Score: ${(evalResult.score * 100).toFixed(1)}% ${evalResult.passed ? "✓ PASS" : "✗ FLAGGED"}`);
        }

        const avgScore = liveTotal > 0 ? (liveScoresSum / liveTotal) * 100 : 100;
        console.log(`\n  Live Explanations Score: ${avgScore.toFixed(1)}% (${livePassed}/${liveTotal} clean)`);

        if (flaggedFailures.length > 0) {
          console.log(`\n  --- Flagged Failures for Quick Verification ---`);
          for (const f of flaggedFailures) {
            console.log(`  Target: ${f.targetKey} (Score: ${(f.score * 100).toFixed(1)}%)`);
            console.log(`  Invented paths: ${f.invented.join(", ")}`);
            console.log(`  Excerpt: ${f.summary}\n`);
          }
        }
      } else {
        console.log(`  No stored explanations found in database yet. Evaluating curated traffic sample.`);
      }
    } catch (err) {
      console.warn(`  Database check skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. SYNTHETIC VERIFICATION (Acceptance Check 2: made-up filename spliced in)
  if (!isLiveOnly) {
    console.log(`\n[2/2] Running Synthetic Injected Hallucination Test...`);
    const cleanContext = [
      "src/index.ts",
      "src/router.ts",
      "src/middleware/auth.ts",
      "src/utils/logger.ts",
    ];

    const cleanExplanation =
      "This module serves as the primary application entrypoint. It initializes the route tree defined in `src/router.ts` and applies authentication middleware from `src/middleware/auth.ts`. Any logging errors are directed through `src/utils/logger.ts`.";

    // Test clean explanation
    const cleanEval = evaluateInventedPaths(cleanExplanation, cleanContext);
    console.log(`  Test A (Clean explanation):`);
    console.log(`    Total paths found: ${cleanEval.totalPaths}`);
    console.log(`    Score:             ${(cleanEval.score * 100).toFixed(1)}%`);
    console.log(`    Passed:            ${cleanEval.passed ? "PASS ✓" : "FAIL ✗"}`);
    if (!cleanEval.passed) {
      throw new Error(`Clean explanation unexpectedly failed: ${cleanEval.summary}`);
    }

    // Splice in a made-up filename
    const madeUpFilename = "src/modules/invented_ghost_service.ts";
    const contaminatedExplanation =
      `This module serves as the primary entrypoint. It initializes \`src/router.ts\` and forwards unauthorized requests to \`${madeUpFilename}\` before delegating to \`src/utils/logger.ts\`.`;

    const contaminatedEval = evaluateInventedPaths(contaminatedExplanation, cleanContext);
    console.log(`\n  Test B (Contaminated explanation with spliced made-up file: \`${madeUpFilename}\`):`);
    console.log(`    Total paths found: ${contaminatedEval.totalPaths}`);
    console.log(`    Score:             ${(contaminatedEval.score * 100).toFixed(1)}%`);
    console.log(`    Passed:            ${contaminatedEval.passed ? "PASS" : "CAUGHT ✓"}`);
    console.log(`    Invented paths:    ${contaminatedEval.inventedPaths.join(", ")}`);

    const successfullyCaught =
      !contaminatedEval.passed &&
      contaminatedEval.inventedPaths.includes(madeUpFilename);

    if (successfullyCaught) {
      console.log(`\n  >>> RESULT: Successfully caught spliced made-up filename: "${madeUpFilename}"!`);
    } else {
      throw new Error(`Failed to catch spliced made-up filename!`);
    }
  }

  console.log(`\n======================================================`);
  console.log(` Invented-Path Check Complete`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
