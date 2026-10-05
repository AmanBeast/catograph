import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ParsedFile, SkippedFile } from "./types.ts";

const CODE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

const IGNORED_DIRECTORIES: Record<string, string> = {
  ".git": "Version control metadata directory (.git)",
  node_modules: "Package dependencies directory (node_modules)",
  ".next": "Next.js build and cache directory (.next)",
  dist: "Build output directory (dist)",
  build: "Build output directory (build)",
  out: "Static export directory (out)",
  ".turbo": "Turborepo cache directory (.turbo)",
  ".agents": "Agent customization directory (.agents)",
  ".claude": "Tool metadata directory (.claude)",
  coverage: "Test coverage report directory (coverage)",
};

export interface WalkOptions {
  includeNodeModules?: boolean;
}

export interface WalkResult {
  codeFiles: Array<{
    relativePath: string;
    absolutePath: string;
    folder: string;
    name: string;
    extension: string;
    linesCount: number;
    sizeBytes: number;
    contentHash: string;
    content: string;
  }>;
  skippedFiles: SkippedFile[];
}

/**
 * Normalizes all path separators to forward slashes for cross-platform consistency.
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function classifySkippedReason(fileName: string, ext: string): string {
  if (fileName.endsWith(".d.ts")) {
    return "Ambient TypeScript type declaration (.d.ts)";
  }
  if (ext === "json" || ext === "json5") {
    return "JSON configuration or data file";
  }
  if (ext === "md" || ext === "mdx" || ext === "txt") {
    return "Documentation or text file";
  }
  if (ext === "css" || ext === "scss" || ext === "sass" || ext === "less") {
    return "Stylesheet file";
  }
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"].includes(ext)) {
    return "Image asset";
  }
  if (["woff", "woff2", "ttf", "eot", "otf"].includes(ext)) {
    return "Font asset";
  }
  if (["yml", "yaml", "toml", "ini"].includes(ext)) {
    return "Configuration markup file";
  }
  if (fileName.startsWith(".env")) {
    return "Environment variable file";
  }
  if (fileName.startsWith(".git") || fileName.startsWith(".npm") || fileName.startsWith(".pnpm")) {
    return "Dotfile or VCS configuration";
  }
  if (ext === "lock" || fileName.includes("lock")) {
    return "Package manager lockfile";
  }
  if (ext === "tsbuildinfo") {
    return "TypeScript incremental build cache";
  }
  return `Non-executable or non-source extension (.${ext || "none"})`;
}

/**
 * Recursively walks a repository on disk without making network calls.
 * Gathers all source code modules and logs explicit reasons for every skipped file.
 */
export function walkRepository(repoRoot: string, options: WalkOptions = {}): WalkResult {
  const codeFiles: WalkResult["codeFiles"] = [];
  const skippedFiles: SkippedFile[] = [];

  function traverse(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err: unknown) {
      const rel = normalizePath(path.relative(repoRoot, currentDir));
      skippedFiles.push({
        path: rel || ".",
        folder: rel ? normalizePath(path.dirname(rel)) : ".",
        reason: `Unreadable directory: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    // Sort alphabetically for deterministic ordering
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = normalizePath(path.relative(repoRoot, fullPath));
      const folderPath = normalizePath(path.dirname(relPath));
      const folder = folderPath === "." ? "." : folderPath;

      if (entry.isDirectory()) {
        const ignoredReason = IGNORED_DIRECTORIES[entry.name];
        if (ignoredReason && !options.includeNodeModules) {
          skippedFiles.push({
            path: relPath,
            folder,
            reason: ignoredReason,
          });
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        const name = entry.name;
        const lastDot = name.lastIndexOf(".");
        const ext = lastDot !== -1 ? name.slice(lastDot + 1).toLowerCase() : "";

        // Check if declaration file (.d.ts)
        if (name.endsWith(".d.ts")) {
          skippedFiles.push({
            path: relPath,
            folder,
            reason: "Ambient TypeScript type declaration (.d.ts)",
          });
          continue;
        }

        if (CODE_EXTENSIONS.has(ext)) {
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            const linesCount = content.length === 0 ? 0 : content.split(/\r?\n/).length;
            const sizeBytes = Buffer.byteLength(content, "utf8");
            const contentHash = crypto.createHash("sha256").update(content).digest("hex");

            codeFiles.push({
              relativePath: relPath,
              absolutePath: fullPath,
              folder,
              name,
              extension: ext,
              linesCount,
              sizeBytes,
              contentHash,
              content,
            });
          } catch (readErr: unknown) {
            skippedFiles.push({
              path: relPath,
              folder,
              reason: `Failed to read file: ${readErr instanceof Error ? readErr.message : String(readErr)}`,
            });
          }
        } else {
          skippedFiles.push({
            path: relPath,
            folder,
            reason: classifySkippedReason(name, ext),
          });
        }
      }
    }
  }

  traverse(repoRoot);

  return { codeFiles, skippedFiles };
}
