/**
 * Typed contract for the Cartograph dependency parser.
 * Downstream visualization and database phases read this contract directly.
 */

export type ImportKind = "import" | "re_export" | "dynamic";

export type ResolutionStatus = "resolved" | "external" | "unresolved";

export interface ParsedFile {
  id: string; // Normalized relative file path (e.g. "lib/parser/index.ts")
  path: string; // Relative path with forward slashes
  folder: string; // Exact directory hierarchy (e.g. "lib/parser", "." for root)
  name: string; // Basename including extension (e.g. "index.ts")
  extension: string; // File extension without dot (e.g. "ts")
  linesCount: number; // Real line count
  sizeBytes: number; // File size in bytes
  contentHash: string; // SHA-256 digest of file content
  fanIn: number; // Number of unique repository files that import this file
  fanOut: number; // Number of unique repository files this file imports
}

export interface SkippedFile {
  path: string; // Normalized relative path
  folder: string; // Directory of the file
  reason: string; // Explicit human-readable reason for skipping
}

export interface Edge {
  source: string; // Relative path of the importing file
  target: string; // Relative path of the target file, or external package name
  rawSpecifier: string; // Literal import string as written in the AST
  kind: ImportKind; // "import" | "re_export" | "dynamic"
  status: ResolutionStatus; // "resolved" | "external" | "unresolved"
  unresolvedReason?: string; // Explicit explanation when status is "unresolved"
}

export interface FailureDetail {
  sourceFile: string;
  rawSpecifier: string;
  kind: ImportKind;
  reason: string;
}

export interface CoverageReport {
  totalFilesFound: number;
  filesParsedCount: number;
  filesSkippedCount: number;
  distinctFoldersCount: number;
  totalImportsSeen: number;
  internalResolvedEdges: number;
  externalImports: number;
  unresolvedImports: number;
  reExportsFound: number;
  reExportsResolved: number;
  reExportsUnresolved: number;
  failures: FailureDetail[];
  skipSummary: Record<string, number>;
}

export interface ParseResult {
  repoPath: string;
  files: ParsedFile[];
  skippedFiles: SkippedFile[];
  edges: Edge[];
  coverage: CoverageReport;
  folders: string[];
}
