import type { ParsedFile, Edge } from "@/lib/parser/types";

export interface FoldedNode {
  id: string; // The folder identifier, e.g. "src/utils" or "."
  folder: string;
  label: string; // Shortest unique name among active nodes
  files: ParsedFile[];
  fileCount: number;
  fanIn: number; // Unique files outside this node that depend on files inside it
  fanOut: number; // Unique files outside this node that files inside it depend on
  height: number;
  width: number;
}

export interface FoldedEdge {
  id: string;
  source: string; // File path of importer
  target: string; // File path of imported
  sourceNodeId: string; // FoldedNode id containing source
  targetNodeId: string; // FoldedNode id containing target
  kind: "import" | "re_export" | "dynamic";
}

export interface FoldingResult {
  nodes: FoldedNode[];
  edges: FoldedEdge[];
  nodeByFile: Map<string, string>; // file path -> node id
  threshold: number;
}

/**
 * Returns parent directory path.
 * Root folder "." has no parent (returns null).
 */
function getParent(folder: string): string | null {
  if (folder === "." || !folder) return null;
  const lastSlash = folder.lastIndexOf("/");
  if (lastSlash === -1) return ".";
  return folder.substring(0, lastSlash);
}

/**
 * Computes depth of directory hierarchy.
 * "." has depth 0, "src" has depth 1, "src/utils" has depth 2.
 */
function getDepth(folder: string): number {
  if (folder === "." || !folder) return 0;
  return folder.split("/").length;
}

/**
 * Derives the shortest unique suffix label for each node path
 * so labels are concise and never ambiguous.
 */
export function computeShortestUniqueLabels(paths: string[]): Map<string, string> {
  const result = new Map<string, string>();

  for (const fullPath of paths) {
    if (fullPath === ".") {
      result.set(fullPath, "root");
      continue;
    }

    const segments = fullPath.split("/");
    let candidate = segments[segments.length - 1];

    for (let depth = 1; depth <= segments.length; depth++) {
      candidate = segments.slice(-depth).join("/");
      // Check if this candidate is unique across all paths
      const conflicts = paths.filter((p) => {
        if (p === fullPath) return false;
        if (p === ".") return candidate === "root" || candidate === ".";
        return p === candidate || p.endsWith("/" + candidate);
      });

      if (conflicts.length === 0) {
        break;
      }
    }

    result.set(fullPath, candidate);
  }

  return result;
}

/**
 * Computes node height carrying dependent importance.
 * Height carries how many things depend on it.
 * Width comes from the label so long names do not appear important.
 */
export function calculateNodeDimensions(fanIn: number, label: string): { width: number; height: number } {
  // Width based purely on label length (approx 7.5px per character + padding + badges)
  const charWidth = 7.5;
  const labelWidth = Math.max(160, Math.min(320, Math.ceil(label.length * charWidth) + 70));

  // Height carries fanIn (how many things depend on this folder)
  // Base height 54px for zero dependents, scaling smoothly up to 130px for high fan-in
  const minHeight = 54;
  const maxHeight = 130;
  const scaledBonus = Math.min(76, Math.round(Math.sqrt(fanIn) * 12));
  const height = Math.min(maxHeight, minHeight + scaledBonus);

  return { width: labelWidth, height };
}

/**
 * Single folding pass at a fixed threshold.
 * Working from the deepest directory upward, any directory holding
 * fewer than `threshold` files merges into its parent.
 * Constraint: computed fresh each pass so merges don't pollute subsequent runs.
 */
function runFoldingPass(files: ParsedFile[], threshold: number): Map<string, ParsedFile[]> {
  const folderMap = new Map<string, ParsedFile[]>();

  for (const file of files) {
    const folder = file.folder || ".";
    const existing = folderMap.get(folder);
    if (existing) {
      existing.push(file);
    } else {
      folderMap.set(folder, [file]);
    }
  }

  // Find maximum depth present in repository
  const depths = Array.from(folderMap.keys()).map(getDepth);
  const maxDepth = Math.max(0, ...depths);

  // Traverse from deepest directory upward
  for (let d = maxDepth; d > 0; d--) {
    const foldersAtDepth = Array.from(folderMap.keys()).filter((f) => getDepth(f) === d);

    for (const folder of foldersAtDepth) {
      const fileList = folderMap.get(folder);
      if (!fileList) continue;

      if (fileList.length < threshold) {
        const parent = getParent(folder);
        if (parent !== null) {
          const parentList = folderMap.get(parent);
          if (parentList) {
            parentList.push(...fileList);
          } else {
            folderMap.set(parent, [...fileList]);
          }
          folderMap.delete(folder);
        }
      }
    }
  }

  // Check if root "." has fewer than 2 files and there are other nodes
  // If root has 1 file and other nodes exist, merge root file into the most related child or largest node
  const rootFiles = folderMap.get(".");
  if (rootFiles && rootFiles.length < 2 && folderMap.size > 1) {
    // Find the largest folder to adopt root file so no single-file node exists
    let largestFolder: string | null = null;
    let maxCount = -1;
    for (const [folder, list] of folderMap.entries()) {
      if (folder !== "." && list.length > maxCount) {
        maxCount = list.length;
        largestFolder = folder;
      }
    }
    if (largestFolder) {
      folderMap.get(largestFolder)!.push(...rootFiles);
      folderMap.delete(".");
    }
  }

  return folderMap;
}

/**
 * Computes deterministic folding for the repository.
 * Starts with threshold 2, and climbs until node count lands under ~24
 * and every node holds > 1 file.
 */
export function computeRepositoryFolding(
  files: ParsedFile[],
  edges: Edge[],
  targetMaxNodes = 24
): FoldingResult {
  let selectedThreshold = 2;
  let finalFolderMap = runFoldingPass(files, 2);

  // If node count exceeds targetMaxNodes, raise threshold until it lands under roughly two dozen
  for (let t = 2; t <= 50; t++) {
    const pass = runFoldingPass(files, t);
    const minFilesPerNode = Math.min(...Array.from(pass.values()).map((v) => v.length));

    // Must satisfy: <= targetMaxNodes AND every node has > 1 file
    if (pass.size <= targetMaxNodes && minFilesPerNode > 1) {
      selectedThreshold = t;
      finalFolderMap = pass;
      break;
    }

    if (t === 50) {
      // Fallback
      selectedThreshold = t;
      finalFolderMap = pass;
    }
  }

  // Build mapping from file path -> node id
  const nodeByFile = new Map<string, string>();
  for (const [nodeId, fileList] of finalFolderMap.entries()) {
    for (const f of fileList) {
      nodeByFile.set(f.path, nodeId);
    }
  }

  // Pre-calculate external fan-in and fan-out for each folded node
  const nodeFanIn = new Map<string, Set<string>>();
  const nodeFanOut = new Map<string, Set<string>>();
  const foldedEdges: FoldedEdge[] = [];

  for (const nodeId of finalFolderMap.keys()) {
    nodeFanIn.set(nodeId, new Set());
    nodeFanOut.set(nodeId, new Set());
  }

  // Process resolved edges between internal files
  const seenEdgeIds = new Set<string>();
  for (const edge of edges) {
    if (edge.status !== "resolved") continue;

    const sourceNodeId = nodeByFile.get(edge.source);
    const targetNodeId = nodeByFile.get(edge.target);

    // Verify both endpoints exist
    if (!sourceNodeId || !targetNodeId) continue;

    const edgeId = `${edge.source}->${edge.target}`;
    if (seenEdgeIds.has(edgeId)) continue;
    seenEdgeIds.add(edgeId);

    foldedEdges.push({
      id: edgeId,
      source: edge.source,
      target: edge.target,
      sourceNodeId,
      targetNodeId,
      kind: edge.kind,
    });

    if (sourceNodeId !== targetNodeId) {
      nodeFanOut.get(sourceNodeId)?.add(edge.target);
      nodeFanIn.get(targetNodeId)?.add(edge.source);
    }
  }

  // Compute unique shortest labels
  const folderPaths = Array.from(finalFolderMap.keys());
  const labels = computeShortestUniqueLabels(folderPaths);

  // Construct deterministic FoldedNode list
  const nodes: FoldedNode[] = [];

  // Sort folders alphabetically for deterministic order
  folderPaths.sort();

  for (const folder of folderPaths) {
    const fileList = finalFolderMap.get(folder) || [];
    const label = labels.get(folder) || folder;
    const fanInCount = nodeFanIn.get(folder)?.size || 0;
    const fanOutCount = nodeFanOut.get(folder)?.size || 0;
    const { width, height } = calculateNodeDimensions(fanInCount, label);

    // Sort files within node alphabetically by path for determinism
    fileList.sort((a, b) => a.path.localeCompare(b.path));

    nodes.push({
      id: folder,
      folder,
      label,
      files: fileList,
      fileCount: fileList.length,
      fanIn: fanInCount,
      fanOut: fanOutCount,
      height,
      width,
    });
  }

  return {
    nodes,
    edges: foldedEdges,
    nodeByFile,
    threshold: selectedThreshold,
  };
}
