import type { ParsedFile, Edge, ExtractedRoute, FileRole } from "@/lib/parser/types";

/**
 * Pluggable framework knowledge adapter interface.
 * All framework-specific classification and routing knowledge lives in adapters,
 * completely decoupled from the core parser.
 */
export interface FrameworkAdapter {
  name: string;
  detect(repoDir: string, files: ParsedFile[], edges?: Edge[]): boolean;
  classifyFiles(files: ParsedFile[], repoDir?: string): FileRole[];
  extractRoutes(files: ParsedFile[], repoDir?: string): ExtractedRoute[];
  identifyRole(filePath: string): string | null;
}
