import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";

/**
 * Tool 3: Listing files by role.
 * Lists files classified under an architectural role:
 * service, repository, model, util, config, component, hook, route, middleware, test, type.
 */
export const listFilesByRoleTool = tool(
  async ({ role, limit }: { role: string; limit?: number }) => {
    try {
      const files = await defaultCartographClient.listFilesByRole(role, limit);
      if (files.length === 0) {
        return `No files found with architectural role "${role}".`;
      }
      return JSON.stringify(files, null, 2);
    } catch (err: unknown) {
      return `Error listing files by role: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "list_files_by_role",
    description:
      "List files classified under a specific architectural role (e.g. 'service', 'repository', 'model', 'util', 'config', 'component', 'hook', 'route', 'middleware', 'test', 'type').",
    schema: z.object({
      role: z
        .string()
        .describe("Architectural role to filter by (e.g. 'service', 'repository', 'component', 'hook', 'route')"),
      limit: z.number().optional().describe("Maximum number of files to return (default 30)"),
    }),
  }
);
