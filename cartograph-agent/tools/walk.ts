import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";
import type { WalkDirection } from "./types.js";

/**
 * Tool 5: Transitive walk in either direction.
 * - blast_radius: traverses upstream to find all files affected if this file changes.
 * - dependency_chain: traverses downstream to find everything this file depends on.
 */
export const transitiveWalkTool = tool(
  async ({
    filePath,
    direction = "blast_radius",
    depth = 2,
  }: {
    filePath: string;
    direction?: "blast_radius" | "dependency_chain";
    depth?: number;
  }) => {
    try {
      const walk = await defaultCartographClient.transitiveWalk(
        filePath,
        direction as WalkDirection,
        depth
      );
      return JSON.stringify(walk, null, 2);
    } catch (err: unknown) {
      return `Error performing transitive walk for "${filePath}": ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  {
    name: "transitive_walk",
    description:
      "Perform a transitive graph traversal starting from a file. Use direction 'blast_radius' to find all upstream files that would be broken or affected if this file changes. Use direction 'dependency_chain' to find all downstream modules this file depends on. Depth can be 1 to 5 (default 2).",
    schema: z.object({
      filePath: z.string().describe("Starting file path in the repository (e.g. 'lib/auth/session.ts')"),
      direction: z
        .enum(["blast_radius", "dependency_chain"])
        .default("blast_radius")
        .describe("Walk direction: 'blast_radius' (upstream callers) or 'dependency_chain' (downstream dependencies)"),
      depth: z
        .number()
        .min(1)
        .max(5)
        .default(2)
        .optional()
        .describe("Maximum traversal depth (default 2, max 5)"),
    }),
  }
);
