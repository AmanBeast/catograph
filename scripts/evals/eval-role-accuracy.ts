import { loadEnv } from "../../lib/load-env.ts";
loadEnv();

import {
  HELD_OUT_ROLE_DATASET,
  predictFileRole,
  type RoleEvaluationOutcome,
  type RoleAccuracySummary,
} from "../../evals/role-accuracy.ts";
import type { AllowedUnmatchedRole } from "../../lib/ai/types.ts";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Error: Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment.");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(` Cartograph Phase 11 — Role Accuracy Evaluator`);
  console.log(` Held-out Ground Truth Dataset: ${HELD_OUT_ROLE_DATASET.length} files`);
  console.log(` Target Roles: service, repository, model, util, config, component, hook`);
  console.log(`======================================================\n`);

  const outcomes: RoleEvaluationOutcome[] = [];
  const roles: AllowedUnmatchedRole[] = [
    "service",
    "repository",
    "model",
    "util",
    "config",
    "component",
    "hook",
  ];

  const breakdown: Record<AllowedUnmatchedRole, { total: number; correct: number; accuracy: number }> = {
    service: { total: 0, correct: 0, accuracy: 0 },
    repository: { total: 0, correct: 0, accuracy: 0 },
    model: { total: 0, correct: 0, accuracy: 0 },
    util: { total: 0, correct: 0, accuracy: 0 },
    config: { total: 0, correct: 0, accuracy: 0 },
    component: { total: 0, correct: 0, accuracy: 0 },
    hook: { total: 0, correct: 0, accuracy: 0 },
  };

  let totalCorrect = 0;
  const startTime = Date.now();

  for (let i = 0; i < HELD_OUT_ROLE_DATASET.length; i++) {
    const testCase = HELD_OUT_ROLE_DATASET[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(2)}/${HELD_OUT_ROLE_DATASET.length}] Evaluating ${testCase.filePath.padEnd(42)} ... `);

    try {
      const res = await predictFileRole(testCase, apiKey);
      const isCorrect = res.predictedRole === testCase.groundTruthRole;
      if (isCorrect) totalCorrect++;

      breakdown[testCase.groundTruthRole].total++;
      if (isCorrect) {
        breakdown[testCase.groundTruthRole].correct++;
      }

      outcomes.push({
        testCase,
        predictedRole: res.predictedRole,
        correct: isCorrect,
        explanationSnippet: res.summary.slice(0, 80),
      });

      console.log(`${isCorrect ? "✓ MATCH" : "✗ MISMATCH"} (Expected: ${testCase.groundTruthRole}, Got: ${res.predictedRole})`);

      // Gentle pause to stay well within free tier rate limits
      await sleep(400);
    } catch (err: unknown) {
      console.log(`ERROR (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalEvaluated = outcomes.length;
  const overallAccuracy = totalEvaluated > 0 ? (totalCorrect / totalEvaluated) * 100 : 0;

  // Calculate breakdown percentages
  for (const r of roles) {
    const b = breakdown[r];
    b.accuracy = b.total > 0 ? (b.correct / b.total) * 100 : 0;
  }

  console.log(`\n------------------------------------------------------`);
  console.log(` Role Accuracy Results (${elapsedSec}s)`);
  console.log(`------------------------------------------------------`);
  console.log(` Total Files Evaluated: ${totalEvaluated} (requirement >= 30: ${totalEvaluated >= 30 ? "PASS ✓" : "FAIL ✗"})`);
  console.log(` Overall Accuracy:      ${overallAccuracy.toFixed(1)}% (${totalCorrect}/${totalEvaluated} correct)\n`);

  console.log(` Breakdown by Non-Structural Role:`);
  console.log(` ┌──────────────┬───────┬─────────┬──────────┐`);
  console.log(` │ Role         │ Total │ Correct │ Accuracy │`);
  console.log(` ├──────────────┼───────┼─────────┼──────────┤`);
  for (const r of roles) {
    const b = breakdown[r];
    console.log(` │ ${r.padEnd(12)} │ ${b.total.toString().padStart(5)} │ ${b.correct.toString().padStart(7)} │ ${b.accuracy.toFixed(1).padStart(7)}% │`);
  }
  console.log(` └──────────────┴───────┴─────────┴──────────┘`);

  const mismatches = outcomes.filter((o) => !o.correct);
  if (mismatches.length > 0) {
    console.log(`\nMismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      console.log(`  • ${m.testCase.filePath}: expected '${m.testCase.groundTruthRole}', got '${m.predictedRole}'`);
    }
  }

  console.log(`\n======================================================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
