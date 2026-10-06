import type { FrameworkAdapter } from "./types";
import type { ParsedFile, ExtractedRoute, FileRole } from "@/lib/parser/types";

/**
 * Generic Fallback Adapter.
 * Applied when no specific framework adapter matches.
 * Renders repository with generic extension roles and an empty route table.
 */
export const fallbackAdapter: FrameworkAdapter = {
  name: "generic",

  detect(): boolean {
    return true;
  },

  identifyRole(filePath: string): string | null {
    const ext = filePath.split(".").pop()?.toLowerCase() || "ts";
    return ext;
  },

  classifyFiles(files: ParsedFile[]): FileRole[] {
    return files.map((file) => ({
      filePath: file.path,
      role: file.extension?.toLowerCase() || "ts",
      confidence: 1.0,
    }));
  },

  extractRoutes(): ExtractedRoute[] {
    return [];
  },
};
