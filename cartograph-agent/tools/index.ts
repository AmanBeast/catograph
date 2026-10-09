import { getAnalysisSummaryTool } from "./summary.js";
import { searchFilesTool } from "./search.js";
import { listFilesByRoleTool } from "./roles.js";
import { getFileNeighborsTool } from "./neighbors.js";
import { transitiveWalkTool } from "./walk.js";
import { getRouteTableTool } from "./routes.js";

export {
  getAnalysisSummaryTool,
  searchFilesTool,
  listFilesByRoleTool,
  getFileNeighborsTool,
  transitiveWalkTool,
  getRouteTableTool,
};

/**
 * The six core graph tools specified by Phase 12:
 * 1. Summary of the whole analysis
 * 2. Searching files by part of a path
 * 3. Listing files by role
 * 4. Direct neighbours of a file
 * 5. A transitive walk in either direction
 * 6. The route table
 */
export const cartographAgentTools = [
  getAnalysisSummaryTool,
  searchFilesTool,
  listFilesByRoleTool,
  getFileNeighborsTool,
  transitiveWalkTool,
  getRouteTableTool,
];
