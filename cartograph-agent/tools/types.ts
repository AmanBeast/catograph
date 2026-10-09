/**
/**
 * Types for the Cartograph Agent tools and data interface.
 */

export interface AnalysisSummary {
  repoName: string;
  framework: string | null;
  totalFiles: number;
  parsedFiles: number;
  skippedFiles: number;
  coveragePercent: number;
  totalEdges: number;
  totalRoutes: number;
  cycleCount: number;
}

export interface FileSearchResult {
  path: string;
  role: string;
  fanIn: number;
  fanOut: number;
  linesCount: number;
}

export interface FileRoleResult {
  path: string;
  role: string;
  linesCount: number;
}

export interface FileNeighbor {
  path: string;
  status: "resolved" | "external" | "unresolved";
  kind: string;
}

export interface FileNeighborsResult {
  filePath: string;
  incomingDependents: FileNeighbor[];
  outgoingDependencies: FileNeighbor[];
}

export type WalkDirection = "blast_radius" | "dependency_chain";

export interface TransitiveWalkOutput {
  startFilePath: string;
  direction: WalkDirection;
  depth: number;
  totalCount: number;
  levels: Record<number, string[]>;
  summary: string;
}

export interface ExtractedRouteItem {
  method: string;
  pattern: string;
  filePath: string;
  isDynamic: boolean;
}
