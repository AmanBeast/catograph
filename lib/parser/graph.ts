import type { ParsedFile, Edge } from "./types.ts";

/**
 * Computes fan-in and fan-out metrics across all parsed files as a pure calculation.
 * Duplicate edges between the same source and target are deduplicated before calculation.
 * Only internal resolved edges contribute to fan-in and fan-out.
 */
export function computeFanInOut(files: ParsedFile[], edges: Edge[]): void {
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();

  for (const f of files) {
    fanInMap.set(f.path, 0);
    fanOutMap.set(f.path, 0);
  }

  // Deduplicate connection pairs (source -> target)
  const seenPairs = new Set<string>();

  for (const edge of edges) {
    if (edge.status === "resolved" && fanInMap.has(edge.target) && fanOutMap.has(edge.source)) {
      const pairKey = `${edge.source}->${edge.target}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        fanOutMap.set(edge.source, (fanOutMap.get(edge.source) || 0) + 1);
        fanInMap.set(edge.target, (fanInMap.get(edge.target) || 0) + 1);
      }
    }
  }

  for (const f of files) {
    f.fanIn = fanInMap.get(f.path) || 0;
    f.fanOut = fanOutMap.get(f.path) || 0;
  }
}
