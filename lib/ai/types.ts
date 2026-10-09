/**
 * Phase 10: AI Architectural Explanation & Classification Types
 */

export const PINNED_MODEL = "gemini-3.5-flash-lite";

export type AllowedUnmatchedRole =
  | "service"
  | "repository"
  | "model"
  | "util"
  | "config"
  | "component"
  | "hook";

export interface ExplanationNeighbor {
  path: string;
  name: string;
  extension?: string;
  role?: string;
}

export interface ExplainFileParams {
  filePath: string;
  contentHash: string;
  commitHash?: string | null;
  sizeBytes: number;
  linesCount: number;
  currentRole?: string | null;
  dependencies: string[]; // imports
  dependents: string[]; // imported by
  externalImports?: string[];
  analysisId: string;
  orgId: string;
  forceRefresh?: boolean;
}

export interface ExplainFolderParams {
  folderPath: string;
  fileCount: number;
  contentHash: string;
  commitHash?: string | null;
  files: Array<{ path: string; name: string; linesCount: number; role?: string }>;
  incomingDependents: string[]; // external files that import into this folder
  outgoingDependencies: string[]; // external files this folder imports
  analysisId: string;
  orgId: string;
  forceRefresh?: boolean;
}

export interface ExplanationResult {
  id?: string;
  targetKey: string;
  targetType: "file" | "folder";
  summary: string;
  role?: AllowedUnmatchedRole | null;
  cached: boolean;
  tokenCount: number;
  modelVersion: string;
  contentHash: string;
  commitHash?: string | null;
  isStale: boolean;
  tracingConfigured: boolean;
  traced: boolean;
  traceRunId?: string;
  evalScore?: number;
  evalDetails?: {
    score: number;
    passed: boolean;
    totalPaths: number;
    validPaths: string[];
    inventedPaths: string[];
    summary: string;
  };
}
