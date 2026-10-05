import type { ParsedFile } from "@/lib/parser/types";

export interface FileCategory {
  id: string; // e.g. "ts", "tsx", "js", "json"
  name: string; // e.g. ".ts", ".tsx", ".js"
  extension: string;
  color: string;
  count: number;
}

/**
 * Standard palette for extensions: fact-based rather than guessed roles.
 * Palette provides clear distinction across common web and repository extensions.
 */
const EXTENSION_COLORS: Record<string, string> = {
  ts: "#3178c6", // TypeScript Blue
  tsx: "#0284c7", // React / TSX Sky Blue
  js: "#f59e0b", // JavaScript Amber
  jsx: "#ea580c", // JSX Orange
  mjs: "#d97706", // MJS Warm Amber
  cjs: "#b45309", // CJS Ochre
  json: "#10b981", // JSON Green
  css: "#ec4899", // CSS Pink
  svg: "#8b5cf6", // SVG Purple
  md: "#64748b", // Markdown Slate
};

const FALLBACK_PALETTE = [
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#84cc16", // Lime
  "#a855f7", // Violet
  "#f43f5e", // Rose
  "#64748b", // Slate
];

/**
 * Derives file categories strictly and factually from the file extensions.
 * No role guessing or heuristic classification.
 */
export function deriveFileCategories(files: ParsedFile[]): FileCategory[] {
  const counts: Record<string, number> = {};

  for (const file of files) {
    const ext = file.extension.toLowerCase() || "other";
    counts[ext] = (counts[ext] || 0) + 1;
  }

  const sortedExts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  let fallbackIdx = 0;

  return sortedExts.map((ext) => {
    const color =
      EXTENSION_COLORS[ext] ||
      FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length];

    return {
      id: ext,
      name: `.${ext}`,
      extension: ext,
      color,
      count: counts[ext],
    };
  });
}
