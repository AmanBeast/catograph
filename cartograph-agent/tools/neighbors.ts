import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";

/**
 * Tool 4: Direct neighbours of a file.
 * Returns incoming dependents (files that import this file) and outgoing dependencies (files this file imports).
 */
export const getFileNeighborsTool = tool(
  async ({ filePath }: { filePath: string }) => {
    try {
      const neighbors = await defaultCartographClient.getFileNeighbors(filePath);
      return JSON.stringify(neighbors, null, 2);
    } catch (err: unknown) {
      return `Error getting neighbors for file "${filePath}": ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "get_file_neighbors",
    description:
      "Get the direct neighbours of a specific file: all files that directly import it (incoming dependents) and all files it directly imports (outgoing dependencies).",
    schema: z.object({
      filePath: z.string().describe("Exact file path in the repository (e.g. 'lib/auth/session.ts')"),
    }),
  }
);
