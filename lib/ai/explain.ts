import { invokeTracedAiCall } from "./client";
import { sanitizeExplanationOutput, ALLOWED_NON_STRUCTURAL_ROLES } from "./clean";
import type {
  ExplainFileParams,
  ExplainFolderParams,
  ExplanationResult,
  AllowedUnmatchedRole,
} from "./types";

export { sanitizeExplanationOutput };

/**
 * Explains a single file in the context of its real graph neighbours.
 */
export async function explainFile(params: ExplainFileParams): Promise<ExplanationResult> {
  const {
    filePath,
    contentHash,
    commitHash,
    sizeBytes,
    linesCount,
    currentRole,
    dependencies,
    dependents,
    externalImports = [],
    analysisId,
    orgId,
    forceRefresh,
  } = params;

  const needsRoleClassification = !currentRole || currentRole === "unknown" || currentRole === "none";

  const systemInstruction = `You are Cartograph's architectural intelligence engine.
Explain the file strictly based on its provided imports and importers.
DO NOT guess or assume any other connections.
DO NOT walk the graph.
Use ONLY these three formatting elements:
1. Inline code (\`path/or/code\`) for symbol names and repository file paths.
2. Bold (**bold text**) for architectural emphasis.
3. Bullets (- bullet) for short lists.
DO NOT use headings (#, ##, etc.). Keep the response concise (1 to 3 short paragraphs).
${
  needsRoleClassification
    ? `At the very end of your response, output exactly one non-structural role classification in the format: [ROLE: <role>].
Allowed roles are ONLY: service, repository, model, util, config, component, hook.
You must NEVER use page, route, or controller.`
    : ""
}`;

  const prompt = `Explain the following repository file:
File: \`${filePath}\`
Lines: ${linesCount} lines (${sizeBytes} bytes)
${currentRole ? `Identified role: ${currentRole}` : "No structural role identified."}

Neighbouring dependencies (files it imports):
${dependencies.length > 0 ? dependencies.map((d) => `- \`${d}\``).join("\n") : "- None (no internal imports)"}

Neighbouring dependents (files that import it):
${dependents.length > 0 ? dependents.map((d) => `- \`${d}\``).join("\n") : "- None (leaf or entry point)"}

${
  externalImports.length > 0
    ? `External libraries imported:\n${externalImports.map((e) => `- \`${e}\``).join("\n")}\n`
    : ""
}
Explain what this file does in the context of these real neighbours.`;

  return invokeTracedAiCall({
    runName: "explain_file",
    targetType: "file",
    targetKey: filePath,
    contentHash,
    commitHash,
    orgId,
    analysisId,
    forceRefresh,
    prompt,
    systemInstruction,
    parseOutput: (rawText) => sanitizeExplanationOutput(rawText),
  });
}

/**
 * Explains a folded folder (encapsulation boundaries & why neighbours point to it).
 */
export async function explainFolder(params: ExplainFolderParams): Promise<ExplanationResult> {
  const {
    folderPath,
    fileCount,
    contentHash,
    commitHash,
    files,
    incomingDependents,
    outgoingDependencies,
    analysisId,
    orgId,
    forceRefresh,
  } = params;

  const systemInstruction = `You are Cartograph's architectural intelligence engine.
Explain what is encapsulated inside this folded folder and why the rest of the repository depends on it.
The answer must be about the folder as a coherent architectural module, NOT a summary of one file in it.
DO NOT guess or assume any unlisted connections.
Use ONLY these three formatting elements:
1. Inline code (\`path/or/code\`) for symbol names and repository paths.
2. Bold (**bold text**) for architectural emphasis.
3. Bullets (- bullet) for short lists.
DO NOT use headings (#, ##, etc.). Keep the response concise (2 short paragraphs or bulleted architectural insights).`;

  const filesSummary = files
    .slice(0, 25)
    .map((f) => `- \`${f.path}\` (${f.linesCount} lines${f.role ? `, ${f.role}` : ""})`)
    .join("\n");

  const prompt = `Explain the folded folder:
Folder: \`${folderPath}\`
Contains: ${fileCount} files

Sample internal files:
${filesSummary}
${files.length > 25 ? `... and ${files.length - 25} more files.` : ""}

External neighbours that depend on this folder (incoming dependencies):
${
  incomingDependents.length > 0
    ? incomingDependents.slice(0, 15).map((d) => `- \`${d}\``).join("\n")
    : "- None (isolated or root module)"
}

External neighbours this folder depends on (outgoing dependencies):
${
  outgoingDependencies.length > 0
    ? outgoingDependencies.slice(0, 15).map((d) => `- \`${d}\``).join("\n")
    : "- None (self-contained)"
}

Explain what is in this folder, its encapsulation boundaries, and why neighbours point to it.`;

  return invokeTracedAiCall({
    runName: "explain_folder",
    targetType: "folder",
    targetKey: folderPath,
    contentHash,
    commitHash,
    orgId,
    analysisId,
    forceRefresh,
    prompt,
    systemInstruction,
    parseOutput: (rawText) => sanitizeExplanationOutput(rawText),
  });
}
