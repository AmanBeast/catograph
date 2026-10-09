import { execSync } from "node:child_process";
import path from "node:path";

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runScript(label: string, scriptRelPath: string) {
  console.log(`\n======================================================`);
  console.log(` RUNNING EVALUATION SUITE: ${label}`);
  console.log(`======================================================\n`);
  try {
    execSync(`node --experimental-strip-types ${scriptRelPath}`, {
      stdio: "inherit",
      cwd: path.resolve(__dirname, "../.."),
    });
  } catch (err) {
    console.error(`Evaluation suite failed: ${label}`);
    process.exit(1);
  }
}

async function main() {
  console.log(`\n========================================================================`);
  console.log(` CARTOGRAPH PHASE 11 — COMPLETE EVALUATION SUITE`);
  console.log(`========================================================================`);

  // 1. Invented-Path Check (Deterministic live + synthetic)
  runScript("1. Invented-Path Check", "scripts/evals/eval-invented-paths.ts");

  // 2. Role Accuracy (35 held-out ground truth files)
  runScript("2. Role Accuracy (Held-out Ground Truth)", "scripts/evals/eval-role-accuracy.ts");

  // 3. Prompt Versions Side-by-Side Comparison (v1-retired vs v2-current)
  runScript("3. Prompt Versions Comparison", "scripts/evals/eval-prompt-versions.ts");

  console.log(`\n========================================================================`);
  console.log(` ALL PHASE 11 EVALUATIONS COMPLETE`);
  console.log(`========================================================================\n`);
}

main().catch(console.error);
