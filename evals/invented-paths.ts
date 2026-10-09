/**
 * Deterministic Invented-Path Evaluator (Phase 11)
 *
 * Constraints:
 * 1. Deterministic set-membership code, NOT a model grading a model.
 * 2. Extracts all path-shaped tokens from an explanation.
 * 3. Verifies each candidate against the exact set of paths the model was shown.
 * 4. Anything not in the shown set was invented (hallucinated).
 */

const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "scss",
  "sass",
  "less",
  "md",
  "mdx",
  "mjs",
  "cjs",
  "sql",
  "yaml",
  "yml",
  "html",
  "svg",
  "graphql",
  "gql",
  "toml",
  "env",
]);

const IGNORED_PREFIXES = ["http://", "https://", "ftp://", "git://"];

const IGNORED_MIME_TYPES = new Set([
  "application/json",
  "text/plain",
  "text/html",
  "application/javascript",
  "application/xml",
]);

export interface PathEvaluationResult {
  score: number; // 1.0 = perfect (0 invented), 0.0 = all invented
  passed: boolean;
  totalPaths: number;
  validPaths: string[];
  inventedPaths: string[];
  summary: string;
}

/**
 * Normalizes a path string for comparison.
 */
export function normalizePath(p: string): string {
  let cleaned = p.replace(/[`'"]/g, "").replace(/\\/g, "/").trim();
  // Strip leading ./
  cleaned = cleaned.replace(/^\.\//, "");
  // Strip leading /
  cleaned = cleaned.replace(/^\//, "");
  // Strip trailing /
  cleaned = cleaned.replace(/\/$/, "");
  return cleaned;
}

/**
 * Tests if a token looks like a file path.
 */
function isPathShaped(token: string): boolean {
  const norm = token.replace(/[`'"]/g, "").trim();
  if (!norm || norm.length < 2) return false;

  // Ignore URLs
  for (const prefix of IGNORED_PREFIXES) {
    if (norm.startsWith(prefix)) return false;
  }

  // Ignore MIME types
  if (IGNORED_MIME_TYPES.has(norm.toLowerCase())) return false;

  // Has a forward slash and valid path characters
  const hasSlash = norm.includes("/");
  
  // Has a recognized file extension
  const dotIdx = norm.lastIndexOf(".");
  const ext = dotIdx !== -1 ? norm.slice(dotIdx + 1).toLowerCase() : "";
  const hasCodeExtension = CODE_EXTENSIONS.has(ext);

  // Must have a slash OR a code extension to be path-shaped
  if (!hasSlash && !hasCodeExtension) return false;

  // Exclude purely numeric or semver patterns like 1.0.0 or 2.117.2
  if (/^\d+\.\d+(\.\d+)?$/.test(norm)) return false;

  // Exclude simple method calls like obj.method or math.min
  if (!hasSlash && !norm.includes("/") && !hasCodeExtension) return false;

  return true;
}

/**
 * Extracts candidate path tokens from raw text.
 */
export function extractPathTokens(text: string): string[] {
  const candidates = new Set<string>();

  // 1. Extract tokens in backticks (`...`)
  const backtickRegex = /`([^`]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = backtickRegex.exec(text)) !== null) {
    const raw = match[1].replace(/[`'"]/g, "").trim();
    if (isPathShaped(raw)) {
      candidates.add(normalizePath(raw));
    }
  }

  // 2. Extract prose paths (words with slashes or code extensions)
  // Split on whitespace or common punctuation boundaries including backticks
  const words = text.split(/[\s,;:()\[\]{}"'<>`]+/);
  for (const word of words) {
    // Strip trailing punctuation
    const cleaned = word.replace(/[`.,:;?!)]+$/, "").replace(/^[`.,:;?(]+/, "").trim();
    if (cleaned && isPathShaped(cleaned)) {
      candidates.add(normalizePath(cleaned));
    }
  }

  return Array.from(candidates);
}

/**
 * Evaluates an explanation against the exact set of paths shown to the model.
 */
export function evaluateInventedPaths(
  explanation: string,
  shownPaths: string[] | Set<string>
): PathEvaluationResult {
  const shownSet = new Set<string>();
  const shownBasenames = new Set<string>();

  const pathList = Array.isArray(shownPaths) ? shownPaths : Array.from(shownPaths);
  for (const p of pathList) {
    const norm = normalizePath(p);
    shownSet.add(norm);
    const base = norm.split("/").pop();
    if (base) {
      shownBasenames.add(base);
    }
  }

  const foundPaths = extractPathTokens(explanation);
  const validPaths: string[] = [];
  const inventedPaths: string[] = [];

  for (const path of foundPaths) {
    const norm = normalizePath(path);
    // Exact path match
    if (shownSet.has(norm)) {
      validPaths.push(path);
      continue;
    }

    // Basename match (e.g. model referenced 'runner.ts' instead of 'lib/pipeline/runner.ts')
    // only if the candidate doesn't contain a mismatching folder
    const hasFolder = norm.includes("/");
    if (!hasFolder && shownBasenames.has(norm)) {
      validPaths.push(path);
      continue;
    }

    // Anything else is invented!
    inventedPaths.push(path);
  }

  const total = validPaths.length + inventedPaths.length;
  const score = total === 0 ? 1.0 : validPaths.length / total;
  const passed = inventedPaths.length === 0;

  return {
    score: Number(score.toFixed(4)),
    passed,
    totalPaths: total,
    validPaths,
    inventedPaths,
    summary: passed
      ? `All ${validPaths.length} path token(s) verified against context.`
      : `Flagged ${inventedPaths.length} invented path(s): ${inventedPaths.join(", ")}`,
  };
}
