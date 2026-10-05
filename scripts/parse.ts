import fs from "node:fs";
import path from "node:path";
import { parseRepository } from "../lib/parser/index.ts";

async function main() {
  const args = process.argv.slice(2);
  let targetPath = ".";
  let outputPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" || args[i] === "-o") {
      outputPath = args[i + 1] || null;
      i++;
    } else if (!args[i].startsWith("-")) {
      targetPath = args[i];
    }
  }

  const absoluteTarget = path.resolve(targetPath);
  console.log(`\n======================================================`);
  console.log(` Cartograph Repository Dependency Parser (Phase 3)`);
  console.log(` Target: ${absoluteTarget}`);
  console.log(`======================================================\n`);

  const startTime = Date.now();
  const result = await parseRepository(absoluteTarget);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  const { coverage, files, skippedFiles, edges, folders } = result;

  console.log(`--- File Discovery ---`);
  console.log(`Total files found:    ${coverage.totalFilesFound}`);
  console.log(`Files parsed:         ${coverage.filesParsedCount}`);
  console.log(`Files skipped:        ${coverage.filesSkippedCount}`);
  const addsUp = coverage.filesParsedCount + coverage.filesSkippedCount === coverage.totalFilesFound;
  console.log(`Integrity Check:      ${addsUp ? "PASS (Parsed + Skipped === Found)" : "FAIL"}\n`);

  console.log(`--- Skip Reasons (${Object.keys(coverage.skipSummary).length} categories) ---`);
  for (const [reason, count] of Object.entries(coverage.skipSummary)) {
    console.log(`  • ${count.toString().padStart(4)} files: ${reason}`);
  }
  console.log();

  console.log(`--- Folder Hierarchy ---`);
  console.log(`Distinct folders:     ${coverage.distinctFoldersCount}`);
  const previewFolders = folders.slice(0, 10);
  for (const f of previewFolders) {
    console.log(`  - ${f}`);
  }
  if (folders.length > 10) {
    console.log(`  ... and ${folders.length - 10} more`);
  }
  console.log();

  console.log(`--- Import & Edge Extraction ---`);
  console.log(`Total imports seen:   ${coverage.totalImportsSeen}`);
  console.log(`Internal resolved:    ${coverage.internalResolvedEdges}`);
  console.log(`External packages:    ${coverage.externalImports}`);
  console.log(`Unresolved imports:   ${coverage.unresolvedImports}\n`);

  console.log(`--- Re-Export Verification ---`);
  console.log(`Re-exports found:     ${coverage.reExportsFound}`);
  console.log(`Re-exports resolved:  ${coverage.reExportsResolved}`);
  console.log(`Re-exports unresolved:${coverage.reExportsUnresolved}\n`);

  if (coverage.failures.length > 0) {
    console.log(`--- Unresolved Failures (${coverage.failures.length}) ---`);
    for (const fail of coverage.failures.slice(0, 10)) {
      console.log(`  [${fail.kind}] ${fail.sourceFile} -> "${fail.rawSpecifier}"`);
      console.log(`         Reason: ${fail.reason}`);
    }
    if (coverage.failures.length > 10) {
      console.log(`  ... and ${coverage.failures.length - 10} more failures`);
    }
    console.log();
  } else {
    console.log(`--- Unresolved Failures: NONE (0 unresolved imports) ---\n`);
  }

  // Top Fan-in files
  const topFanIn = [...files].sort((a, b) => b.fanIn - a.fanIn).slice(0, 5);
  console.log(`--- Top Fan-In Files (Most imported) ---`);
  for (const f of topFanIn) {
    console.log(`  ${f.fanIn.toString().padStart(3)} incoming: ${f.path}`);
  }
  console.log();

  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, JSON.stringify(result, null, 2), "utf8");
    console.log(`Typed result written to: ${resolvedOutput}`);
  }

  console.log(`Completed in ${elapsed}s\n`);
}

main().catch((err) => {
  console.error("Parser failed:", err);
  process.exit(1);
});
