import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAgent } from "langchain";
import { cartographAgentTools } from "./tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read system instructions from instructions.md per Managed Deep Agents specification
const instructionsPath = path.resolve(__dirname, "instructions.md");
const systemPrompt = fs.existsSync(instructionsPath)
  ? fs.readFileSync(instructionsPath, "utf-8")
  : "You are the Cartograph repository intelligence agent. Always use your tools to inspect the graph before answering.";

/**
 * Resolves the configured model name or provider.
 */
export function getAgentModel(): string {
  const modelEnv = process.env.MODEL;
  if (modelEnv) return modelEnv;

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return "google-genai:gemini-3.5-flash-lite";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic:claude-sonnet-5";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai:gpt-5.5";
  }

  return "google-genai:gemini-3.5-flash-lite";
}

/**
 * Factory for creating the Cartograph Deep Agent.
 */
export function createCartographAgent(options: { checkpointer?: any } = {}) {
  const model = getAgentModel();

  return createAgent({
    name: "cartograph-agent",
    model,
    tools: cartographAgentTools,
    systemPrompt,
    ...(options.checkpointer ? { checkpointer: options.checkpointer } : {}),
  });
}

/**
 * Pre-compiled default agent instance.
 */
export const agent = createCartographAgent();
