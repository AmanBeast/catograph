import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultCartographClient } from "./client.js";

/**
 * Tool 1: Summary of the whole analysis.
 * Returns high-level metrics: framework, total files, parsed files, skipped files,
 * coverage percentage, edge count, route count, and cycle count.
 */
export const getAnalysisSummaryTool = tool(
  async () => {
    try {
      const summary = await defaultCartographClient.getAnalysisSummary();
      return JSON.stringify(summary, null, 2);
    } catch (err: unknown) {
      return `Error fetching analysis summary: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "get_analysis_summary",
    description:
      "Get a high-level summary of the entire repository analysis, including framework detected, total and parsed file counts, coverage %, total dependency edges, and total routes.",
    schema: z.object({}),
  }
);
