import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";

/**
 * Tool 2: Searching files by part of a path.
 * Searches files matching a query string in their path or name.
 */
export const searchFilesTool = tool(
  async ({ query, limit }: { query: string; limit?: number }) => {
    try {
      const files = await defaultCartographClient.searchFiles(query, limit);
      if (files.length === 0) {
        return `No files found matching query "${query}".`;
      }
      return JSON.stringify(files, null, 2);
    } catch (err: unknown) {
      return `Error searching files: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "search_files",
    description:
      "Search for files in the repository by a part of their file path or filename (e.g. 'auth', 'user', 'service', 'page'). Returns matching file paths with their roles and fan-in/fan-out metrics.",
    schema: z.object({
      query: z.string().describe("Part of the file path or name to search for"),
      limit: z.number().optional().describe("Maximum number of files to return (default 20)"),
    }),
  }
);
