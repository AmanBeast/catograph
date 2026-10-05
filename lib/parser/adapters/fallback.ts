import type { FrameworkAdapter } from "./types.ts";

/**
 * Fallback adapter assuming no framework at all.
 * Provides neutral default handling when no framework adapter is applied.
 */
export const fallbackAdapter: FrameworkAdapter = {
  name: "fallback",
  identifyRole(_filePath: string): string | null {
    return null;
  },
  extractRoutes(_filePath: string) {
    return [];
  },
};
