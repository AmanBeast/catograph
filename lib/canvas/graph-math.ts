import type { ParsedFile, Edge } from "@/lib/parser/types";
import { identifyFileConvention } from "./conventions.ts";

export type TransitiveWalkDirection = "blast_radius" | "dependency_chain";

export interface TransitiveWalkNode {
  path: string;
  depth: number;
  parentPath: string | null;
}

export interface TransitiveWalkResult {
  startFilePath: string;
  direction: TransitiveWalkDirection;
  maxDepth: number;
  nodesByDepth: Map<number, TransitiveWalkNode[]>;
  totalCount: number;
  allPaths: Set<string>;
  traversedEdges: Array<{ source: string; target: string; depth: number }>;
}

/**
 * Performs a transitive BFS walk over the dependency edge list.
 * Used for both Blast Radius (upstream dependents) and Dependency Chain (downstream dependencies).
 * Written once with direction and depth arguments.
 */
export function computeTransitiveWalk(
  startFilePath: string,
  edges: Edge[],
  direction: TransitiveWalkDirection,
  maxDepth = 2
): TransitiveWalkResult {
  // Build directed adjacency map based on requested direction
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.status !== "resolved") continue;
    // For blast radius: who imports target (target -> source)
    // For dependency chain: who source imports (source -> target)
    const from = direction === "blast_radius" ? e.target : e.source;
    const to = direction === "blast_radius" ? e.source : e.target;

    const list = adj.get(from) || [];
    if (!list.includes(to)) {
      list.push(to);
      adj.set(from, list);
    }
  }

  const visited = new Set<string>([startFilePath]);
  const nodesByDepth = new Map<number, TransitiveWalkNode[]>();
  const traversedEdges: Array<{ source: string; target: string; depth: number }> = [];

  // Iterative BFS Queue: [path, depth, parentPath]
  const queue: Array<{ path: string; depth: number; parent: string | null }> = [
    { path: startFilePath, depth: 0, parent: null },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const nextDepth = current.depth + 1;
    const neighbors = adj.get(current.path) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const walkNode: TransitiveWalkNode = {
          path: neighbor,
          depth: nextDepth,
          parentPath: current.path,
        };

        const levelList = nodesByDepth.get(nextDepth) || [];
        levelList.push(walkNode);
        nodesByDepth.set(nextDepth, levelList);

        traversedEdges.push({
          source: direction === "blast_radius" ? neighbor : current.path,
          target: direction === "blast_radius" ? current.path : neighbor,
          depth: nextDepth,
        });

        queue.push({ path: neighbor, depth: nextDepth, parent: current.path });
      }
    }
  }

  let totalCount = 0;
  for (const list of nodesByDepth.values()) {
    totalCount += list.length;
  }

  visited.delete(startFilePath);

  return {
    startFilePath,
    direction,
    maxDepth,
    nodesByDepth,
    totalCount,
    allPaths: visited,
    traversedEdges,
  };
}

export interface ImportCycle {
  id: string;
  files: string[];
  description: string;
}

/**
 * Detects import cycles iteratively using an explicit heap stack.
 * Guarantees no call stack overflow regardless of repository depth.
 */
export function detectImportCycles(files: ParsedFile[], edges: Edge[]): ImportCycle[] {
  const fileSet = new Set(files.map((f) => f.path));
  const adj = new Map<string, string[]>();

  for (const f of files) {
    adj.set(f.path, []);
  }

  for (const e of edges) {
    if (e.status === "resolved" && fileSet.has(e.source) && fileSet.has(e.target)) {
      if (e.source !== e.target) {
        adj.get(e.source)!.push(e.target);
      }
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const rawCycles: string[][] = [];
  const seenCycleFingerprints = new Set<string>();

  // Iterative DFS across all files
  for (const start of files.map((f) => f.path)) {
    if (visited.has(start)) continue;

    const stack: Array<{ node: string; idx: number }> = [{ node: start, idx: 0 }];
    inStack.add(start);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adj.get(top.node) || [];

      if (top.idx < neighbors.length) {
        const next = neighbors[top.idx];
        top.idx++;

        if (inStack.has(next)) {
          // Cycle found! Reconstruct cycle from stack
          const cycle: string[] = [next];
          for (let i = stack.length - 1; i >= 0; i--) {
            cycle.unshift(stack[i].node);
            if (stack[i].node === next) break;
          }

          // Fingerprint cycle to avoid duplicate rotations of identical cycle
          const cycleWithoutLast = cycle.slice(0, -1);
          const sortedFingerprint = [...cycleWithoutLast].sort().join("|");
          if (!seenCycleFingerprints.has(sortedFingerprint)) {
            seenCycleFingerprints.add(sortedFingerprint);
            rawCycles.push(cycle);
          }
        } else if (!visited.has(next)) {
          inStack.add(next);
          stack.push({ node: next, idx: 0 });
        }
      } else {
        visited.add(top.node);
        inStack.delete(top.node);
        stack.pop();
      }
    }
  }

  return rawCycles.map((cycle, i) => ({
    id: `cycle-${i + 1}`,
    files: cycle,
    description: "Circular dependency detected between modules in this dependency loop.",
  }));
}

export type InsightType =
  | "unimported"
  | "cycle"
  | "high_fan_in"
  | "oversized";

export interface CodebaseInsight {
  id: string;
  type: InsightType;
  title: string;
  fixedSentence: string;
  files: string[];
  primaryFilePath: string;
  metricLabel: string;
  severity: "info" | "warning" | "caution";
}

/**
 * Four fixed sentences required by Phase 6 specification.
 * No AI model or dynamic strings are used for insight descriptions.
 */
export const INSIGHT_FIXED_SENTENCES: Record<InsightType, string> = {
  unimported:
    "Nothing imports this file, and no framework convention marks it as an entry point.",
  cycle:
    "Circular dependency detected between modules in this dependency loop.",
  high_fan_in:
    "An unusually high number of files depend directly on this module.",
  oversized:
    "File length exceeds typical single-responsibility thresholds.",
};

/**
 * Computes the four kinds of deterministic insights from the edge list.
 * Ordered strictly per specification:
 * 1. Files nothing imports (explanatory, leads the list)
 * 2. Import cycles
 * 3. Files an unusual number of things import
 * 4. Files that are simply too long
 */
export function computeCodebaseInsights(
  files: ParsedFile[],
  edges: Edge[]
): CodebaseInsight[] {
  const insights: CodebaseInsight[] = [];

  // 1. Files nothing imports (fanIn === 0, excluding framework files, routes, middleware, config, tests, entry points)
  const unimportedFiles = files.filter((f) => {
    if (f.fanIn > 0) return false;

    const conv = identifyFileConvention(f);
    // Exclude framework-reached conventions:
    if (
      conv.kind === "route" ||
      conv.kind === "middleware" ||
      conv.kind === "config" ||
      conv.kind === "document" ||
      conv.kind === "test"
    ) {
      return false;
    }

    // Exclude standard entry files
    const name = f.name.toLowerCase();
    if (
      name === "index.ts" ||
      name === "index.js" ||
      name === "index.tsx" ||
      name === "main.ts" ||
      name === "main.js"
    ) {
      return false;
    }

    return true;
  });

  for (const f of unimportedFiles) {
    insights.push({
      id: `unimported:${f.path}`,
      type: "unimported",
      title: f.name,
      fixedSentence: INSIGHT_FIXED_SENTENCES.unimported,
      files: [f.path],
      primaryFilePath: f.path,
      metricLabel: `fan-in: 0 · ${f.linesCount}L`,
      severity: "info",
    });
  }

  // 2. Import cycles
  const cycles = detectImportCycles(files, edges);
  for (const c of cycles) {
    const names = c.files.slice(0, -1).map((p) => p.split("/").pop()).join(" → ");
    insights.push({
      id: `cycle:${c.id}`,
      type: "cycle",
      title: `Cycle: ${names}`,
      fixedSentence: INSIGHT_FIXED_SENTENCES.cycle,
      files: c.files,
      primaryFilePath: c.files[0],
      metricLabel: `${c.files.length - 1} files in loop`,
      severity: "warning",
    });
  }

  // 3. Files an unusual number of things import (fan-in outlier)
  const fanInValues = files.map((f) => f.fanIn);
  const meanFanIn =
    fanInValues.reduce((a, b) => a + b, 0) / (fanInValues.length || 1);
  const variance =
    fanInValues.reduce((a, b) => a + Math.pow(b - meanFanIn, 2), 0) /
    (fanInValues.length || 1);
  const stdDevFanIn = Math.sqrt(variance);
  const unusualThreshold = Math.max(5, Math.ceil(meanFanIn + 2 * stdDevFanIn));

  const highFanInFiles = files
    .filter((f) => f.fanIn >= unusualThreshold)
    .sort((a, b) => b.fanIn - a.fanIn);

  for (const f of highFanInFiles) {
    insights.push({
      id: `high-fan-in:${f.path}`,
      type: "high_fan_in",
      title: f.name,
      fixedSentence: INSIGHT_FIXED_SENTENCES.high_fan_in,
      files: [f.path],
      primaryFilePath: f.path,
      metricLabel: `↓${f.fanIn} dependents (threshold: ≥${unusualThreshold})`,
      severity: "caution",
    });
  }

  // 4. Files that are simply too long (oversized files: >= 500 lines)
  const OVERSIZED_THRESHOLD = 500;
  const oversizedFiles = files
    .filter((f) => f.linesCount >= OVERSIZED_THRESHOLD)
    .sort((a, b) => b.linesCount - a.linesCount);

  for (const f of oversizedFiles) {
    insights.push({
      id: `oversized:${f.path}`,
      type: "oversized",
      title: f.name,
      fixedSentence: INSIGHT_FIXED_SENTENCES.oversized,
      files: [f.path],
      primaryFilePath: f.path,
      metricLabel: `${f.linesCount.toLocaleString()} lines (threshold: ≥${OVERSIZED_THRESHOLD})`,
      severity: "caution",
    });
  }

  return insights;
}
