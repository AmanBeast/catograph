import "dotenv/config";
import {
  getAnalysisSummaryTool,
  searchFilesTool,
  listFilesByRoleTool,
  getFileNeighborsTool,
  transitiveWalkTool,
  getRouteTableTool,
} from "../tools/index.js";
import { agent } from "../agent.js";
import { HumanMessage } from "@langchain/core/messages";

async function runTests() {
  console.log("======================================================");
  console.log(" Cartograph Agent — 6 Core Tools Verification Suite");
  console.log("======================================================\n");

  // 1. Tool: get_analysis_summary
  console.log("1. Testing get_analysis_summary ...");
  const summaryRes = await getAnalysisSummaryTool.invoke({});
  const summary = JSON.parse(summaryRes);
  if (!summary.repoName || typeof summary.totalFiles !== "number") {
    throw new Error("Summary tool output invalid");
  }
  console.log(`   ✓ Summary returned repo: ${summary.repoName}, total files: ${summary.totalFiles}, edges: ${summary.totalEdges}`);

  // 2. Tool: search_files
  console.log("2. Testing search_files ...");
  const searchRes = await searchFilesTool.invoke({ query: "auth" });
  const searchFiles = JSON.parse(searchRes);
  if (!Array.isArray(searchFiles) || searchFiles.length === 0) {
    throw new Error("search_files returned no results for 'auth'");
  }
  console.log(`   ✓ search_files found ${searchFiles.length} file(s) matching 'auth'`);

  // 3. Tool: list_files_by_role
  console.log("3. Testing list_files_by_role ...");
  const roleRes = await listFilesByRoleTool.invoke({ role: "service" });
  const roleFiles = JSON.parse(roleRes);
  if (!Array.isArray(roleFiles) || roleFiles.length === 0) {
    throw new Error("list_files_by_role returned no results for 'service'");
  }
  console.log(`   ✓ list_files_by_role found ${roleFiles.length} file(s) with role 'service'`);

  // 4. Tool: get_file_neighbors
  console.log("4. Testing get_file_neighbors ...");
  const neighborRes = await getFileNeighborsTool.invoke({ filePath: "lib/auth/session.ts" });
  const neighbors = JSON.parse(neighborRes);
  if (!Array.isArray(neighbors.incomingDependents) || !Array.isArray(neighbors.outgoingDependencies)) {
    throw new Error("get_file_neighbors output invalid");
  }
  console.log(`   ✓ get_file_neighbors: ${neighbors.incomingDependents.length} incoming, ${neighbors.outgoingDependencies.length} outgoing`);

  // 5. Tool: transitive_walk
  console.log("5. Testing transitive_walk (blast_radius & dependency_chain) ...");
  const walkRes = await transitiveWalkTool.invoke({
    filePath: "lib/auth/session.ts",
    direction: "blast_radius",
    depth: 2,
  });
  const walk = JSON.parse(walkRes);
  if (typeof walk.totalCount !== "number" || walk.direction !== "blast_radius") {
    throw new Error("transitive_walk output invalid");
  }
  console.log(`   ✓ transitive_walk blast_radius found ${walk.totalCount} affected file(s)`);

  // 6. Tool: get_route_table
  console.log("6. Testing get_route_table ...");
  const routesRes = await getRouteTableTool.invoke({});
  const routes = JSON.parse(routesRes);
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error("get_route_table returned empty routes");
  }
  console.log(`   ✓ get_route_table returned ${routes.length} route(s)`);

  console.log("\n======================================================");
  console.log(" ALL 6 TOOLS PASSED DIRECT VERIFICATION ✓");
  console.log("======================================================\n");

  // 7. Refusal check with agent
  console.log("7. Verifying Agent Refusal on Subjective Questions...");
  const refusalResult = await agent.invoke({
    messages: [new HumanMessage("is this code any good?")],
  });
  const refusalText = refusalResult.messages[refusalResult.messages.length - 1].content as string;
  const declines =
    refusalText.toLowerCase().includes("cannot grade") ||
    refusalText.toLowerCase().includes("cannot provide subjective") ||
    refusalText.toLowerCase().includes("subjective opinion") ||
    refusalText.toLowerCase().includes("cannot evaluate");

  if (!declines) {
    throw new Error(`Agent did not refuse subjective question as expected. Response: ${refusalText}`);
  }
  console.log("   ✓ Agent successfully declined subjective code grading.");

  console.log("\nAll agent requirements and acceptance checks verified successfully!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
