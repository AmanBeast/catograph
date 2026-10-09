import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";

/**
 * Tool 6: The route table.
 * Returns discovered HTTP routes/endpoints, their HTTP methods, and handler files.
 */
export const getRouteTableTool = tool(
  async ({
    methodFilter,
    pathFilter,
  }: {
    methodFilter?: string;
    pathFilter?: string;
  }) => {
    try {
      const routes = await defaultCartographClient.getRouteTable(
        methodFilter,
        pathFilter
      );
      if (routes.length === 0) {
        return "No routes found matching the specified filters.";
      }
      return JSON.stringify(routes, null, 2);
    } catch (err: unknown) {
      return `Error fetching route table: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  {
    name: "get_route_table",
    description:
      "Get the route table of API and page endpoints discovered in the repository, including HTTP methods (GET, POST, etc.), URL path patterns, and their backing handler files.",
    schema: z.object({
      methodFilter: z
        .string()
        .optional()
        .describe("Optional HTTP method filter (e.g. 'GET', 'POST', 'DELETE')"),
      pathFilter: z
        .string()
        .optional()
        .describe("Optional path substring filter (e.g. '/api/auth')"),
    }),
  }
);
