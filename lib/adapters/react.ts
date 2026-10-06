import path from "node:path";
import fs from "node:fs";
import type { FrameworkAdapter } from "./types";
import type { ParsedFile, Edge, ExtractedRoute, FileRole } from "@/lib/parser/types";

/**
 * React Framework Adapter.
 * Identifies React applications that do not use Next.js.
 * Classifies files into Pages, Components, Hooks, Context, and Utilities.
 */
export const reactAdapter: FrameworkAdapter = {
  name: "React",

  detect(repoDir: string, files: ParsedFile[], edges: Edge[] = []): boolean {
    // 1. Check package.json dependencies
    if (repoDir) {
      const pkgPath = path.join(repoDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          if ("react" in allDeps && !("next" in allDeps)) {
            return true;
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    // 2. Check external edge imports
    for (const e of edges) {
      if (e.status === "external") {
        const lower = e.target.toLowerCase();
        if ((lower === "react" || lower === "react-dom") && !lower.startsWith("next")) {
          return true;
        }
      }
    }

    // 3. Check presence of .tsx / .jsx files
    const hasJsx = files.some((f) => f.extension === "tsx" || f.extension === "jsx");
    return hasJsx;
  },

  identifyRole(filePath: string): string | null {
    const norm = filePath.replace(/\\/g, "/");

    if (
      /(?:^|\/)pages\//.test(norm) ||
      /(?:^|\/)views\//.test(norm) ||
      /(?:^|\/)screens\//.test(norm) ||
      /page\.(?:tsx|jsx|js|ts)$/.test(norm)
    ) {
      return "page";
    }

    if (
      /(?:^|\/)hooks\//.test(norm) ||
      /(?:^|\/)use[A-Z0-9].*\.(?:ts|js|tsx)$/.test(norm)
    ) {
      return "hook";
    }

    if (
      /(?:^|\/)context\//.test(norm) ||
      /context\.(?:ts|tsx|js)$/i.test(norm)
    ) {
      return "context";
    }

    if (norm.endsWith(".tsx") || norm.endsWith(".jsx")) {
      return "component";
    }

    return "utility";
  },

  classifyFiles(files: ParsedFile[]): FileRole[] {
    return files.map((file) => ({
      filePath: file.path,
      role: this.identifyRole(file.path) || "utility",
      confidence: 1.0,
    }));
  },

  extractRoutes(): ExtractedRoute[] {
    // Pure React without Next.js or static routing maps:
    // Routes are exact or absent. Absent beats approximate.
    return [];
  },
};
