import type { AllowedUnmatchedRole } from "./types.ts";

export const ALLOWED_NON_STRUCTURAL_ROLES = new Set<AllowedUnmatchedRole>([
  "service",
  "repository",
  "model",
  "util",
  "config",
  "component",
  "hook",
]);

/**
 * Sanitizes model output to strictly satisfy Phase 10 rules:
 * - Exactly three formatting elements: inline code (`code`), bold (**bold**), and bullets (- item).
 * - NO headings (#, ##, ###).
 * - Cleans up stray unclosed asterisks, hashes, or stray backtick sequences.
 */
export function sanitizeExplanationOutput(rawText: string): {
  summary: string;
  role?: AllowedUnmatchedRole | null;
} {
  let text = rawText.trim();
  let detectedRole: AllowedUnmatchedRole | null = null;

  // Extract optional [ROLE: <role>] if present at end or within text
  const roleMatch = text.match(/\[ROLE:\s*([a-zA-Z_-]+)\]/i);
  if (roleMatch && roleMatch[1]) {
    const rawRole = roleMatch[1].toLowerCase().trim() as AllowedUnmatchedRole;
    // Strict constraint: NEVER allow page, route, or controller
    if (ALLOWED_NON_STRUCTURAL_ROLES.has(rawRole)) {
      detectedRole = rawRole;
    }
    // Remove the role marker from rendered prose
    text = text.replace(/\[ROLE:\s*[a-zA-Z_-]+\]/gi, "").trim();
  }

  // Remove code fence wrappers if the entire model response was wrapped in ```
  if (text.startsWith("```") && text.endsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  }

  // Split into lines to sanitize headings and bullet styles
  const lines = text.split("\n");
  const sanitizedLines: string[] = [];

  for (const line of lines) {
    let cleanLine = line;

    // Convert any markdown headings (#, ##, ###) to bold prose since headings are prohibited
    if (/^\s*#{1,6}\s+/.test(cleanLine)) {
      const headingContent = cleanLine.replace(/^\s*#{1,6}\s+/, "").trim();
      cleanLine = `**${headingContent}**`;
    }

    // Normalize bullets to "- "
    if (/^\s*[*•]\s+/.test(cleanLine)) {
      cleanLine = cleanLine.replace(/^\s*[*•]\s+/, "- ");
    }

    // Clean stray multiple backticks (e.g. ``` without newline) into single inline backticks
    cleanLine = cleanLine.replace(/```+/g, "`");

    sanitizedLines.push(cleanLine);
  }

  let finalSummary = sanitizedLines.join("\n").trim();

  // Remove any remaining stray standalone '#' characters
  finalSummary = finalSummary.replace(/(^|\s)#+(\s|$)/g, " ");

  return {
    summary: finalSummary,
    role: detectedRole,
  };
}
