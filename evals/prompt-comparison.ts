import { PINNED_MODEL } from "../lib/ai/types.ts";
import { evaluateInventedPaths } from "./invented-paths.ts";

export interface PromptTestCase {
  id: string;
  filePath: string;
  linesCount: number;
  sizeBytes: number;
  dependencies: string[];
  dependents: string[];
  externalImports: string[];
}

export const PROMPT_EVAL_DATASET: PromptTestCase[] = [
  {
    id: "case-1",
    filePath: "lib/parser/walk.ts",
    linesCount: 220,
    sizeBytes: 6800,
    dependencies: ["lib/parser/types.ts"],
    dependents: ["lib/parser/index.ts"],
    externalImports: ["node:fs", "node:path", "node:crypto"],
  },
  {
    id: "case-2",
    filePath: "lib/adapters/nextjs.ts",
    linesCount: 260,
    sizeBytes: 8300,
    dependencies: ["lib/parser/types.ts", "lib/adapters/types.ts", "lib/adapters/taxonomy.ts"],
    dependents: ["lib/adapters/index.ts"],
    externalImports: ["ts-morph"],
  },
  {
    id: "case-3",
    filePath: "components/canvas/detail-pane.tsx",
    linesCount: 380,
    sizeBytes: 12500,
    dependencies: [
      "components/canvas/explanation-renderer.tsx",
      "lib/canvas/conventions.ts",
      "lib/canvas/graph-math.ts",
    ],
    dependents: ["components/canvas/canvas-shell.tsx"],
    externalImports: ["react"],
  },
  {
    id: "case-4",
    filePath: "lib/pipeline/runner.ts",
    linesCount: 360,
    sizeBytes: 12600,
    dependencies: ["lib/parser/index.ts", "lib/db/server.ts", "lib/adapters/index.ts"],
    dependents: ["app/api/analyze/route.ts"],
    externalImports: ["node:fs", "node:path"],
  },
  {
    id: "case-5",
    filePath: "lib/canvas/graph-math.ts",
    linesCount: 310,
    sizeBytes: 10400,
    dependencies: ["lib/parser/types.ts"],
    dependents: ["components/canvas/canvas-center.tsx", "components/canvas/detail-pane.tsx"],
    externalImports: [],
  },
  {
    id: "case-6",
    filePath: "lib/db/load-analysis.ts",
    linesCount: 290,
    sizeBytes: 8100,
    dependencies: ["lib/db/server.ts", "lib/parser/types.ts"],
    dependents: ["app/analysis/[id]/page.tsx"],
    externalImports: [],
  },
  {
    id: "case-7",
    filePath: "app/api/explain/route.ts",
    linesCount: 160,
    sizeBytes: 5200,
    dependencies: ["lib/db/server.ts", "lib/ai/explain.ts", "evals/invented-paths.ts"],
    dependents: [],
    externalImports: ["next/server", "@clerk/nextjs/server", "langsmith"],
  },
  {
    id: "case-8",
    filePath: "components/canvas/explanation-renderer.tsx",
    linesCount: 150,
    sizeBytes: 4900,
    dependencies: [],
    dependents: ["components/canvas/detail-pane.tsx"],
    externalImports: ["react"],
  },
  {
    id: "case-9",
    filePath: "lib/ai/client.ts",
    linesCount: 320,
    sizeBytes: 9000,
    dependencies: ["lib/db/server.ts", "lib/ai/types.ts"],
    dependents: ["lib/ai/explain.ts"],
    externalImports: ["langsmith"],
  },
  {
    id: "case-10",
    filePath: "lib/canvas/conventions.ts",
    linesCount: 200,
    sizeBytes: 6200,
    dependencies: ["lib/parser/types.ts"],
    dependents: ["components/canvas/detail-pane.tsx", "lib/canvas/categories.ts"],
    externalImports: [],
  },
];

export interface PromptExecutionResult {
  version: "v1-retired" | "v2-current";
  testCase: PromptTestCase;
  rawOutput: string;
  groundingScore: number; // 0 to 1
  formatScore: number; // 0 to 1
  specificityScore: number; // 0 to 1 (LLM-as-a-judge)
  compositeScore: number; // weighted 0 to 100%
  inventedPaths: string[];
}

async function fetchGeminiWithRetry(url: string, payload: unknown, maxRetries = 3): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return res.json();
    }

    if (res.status === 503 || res.status === 429) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
    }

    const errText = await res.text();
    throw new Error(`Gemini API error [${res.status}]: ${errText}`);
  }
}

/**
 * Executes Prompt Version 1 (Retired).
 * Notice: The retired prompt lives with the evals, NOT in the application!
 */
export async function runPromptV1Retired(
  testCase: PromptTestCase,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_MODEL}:generateContent?key=${apiKey}`;

  // V1 (Retired) Prompt: Naive instruction without strict neighbour constraints or formatting bounds
  const systemInstruction = "You are an assistant. Explain what this file does in the repository.";
  const prompt = `Explain this file: \`${testCase.filePath}\` with ${testCase.linesCount} lines. Describe its architecture.`;

  const data = await fetchGeminiWithRetry(url, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Executes Prompt Version 2 (Current Phase 10).
 */
export async function runPromptV2Current(
  testCase: PromptTestCase,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_MODEL}:generateContent?key=${apiKey}`;

  // V2 (Current Phase 10): Strict neighbour grounding and 3-format bounds (no headings)
  const systemInstruction = `You are Cartograph's architectural intelligence engine.
Explain the file strictly based on its provided imports and importers.
DO NOT guess or assume any other connections.
DO NOT walk the graph.
Use ONLY these three formatting elements:
1. Inline code (\`path/or/code\`) for symbol names and repository file paths.
2. Bold (**bold text**) for architectural emphasis.
3. Bullets (- bullet) for short lists.
DO NOT use headings (#, ##, etc.). Keep the response concise (1 to 3 short paragraphs).`;

  const prompt = `Explain the following repository file:
File: \`${testCase.filePath}\`
Lines: ${testCase.linesCount} lines (${testCase.sizeBytes} bytes)

Neighbouring dependencies (files it imports):
${testCase.dependencies.length > 0 ? testCase.dependencies.map((d) => `- \`${d}\``).join("\n") : "- None"}

Neighbouring dependents (files that import it):
${testCase.dependents.length > 0 ? testCase.dependents.map((d) => `- \`${d}\``).join("\n") : "- None"}

${
  testCase.externalImports.length > 0
    ? `External libraries imported:\n${testCase.externalImports.map((e) => `- \`${e}\``).join("\n")}\n`
    : ""
}
Explain what this file does in the context of these real neighbours.`;

  const data = await fetchGeminiWithRetry(url, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Deterministic format compliance evaluator.
 * Tests strictly against Phase 10 rules: NO headings (#), NO blockquotes (>),
 * only inline code, bold, bullets.
 */
export function evaluateFormatCompliance(text: string): number {
  let score = 1.0;

  // Penalize markdown headings (#, ##, ###)
  const hasHeadings = /(^|\n)\s*#{1,6}\s+/.test(text);
  if (hasHeadings) {
    score -= 0.5;
  }

  // Penalize blockquotes (>)
  const hasBlockquotes = /(^|\n)\s*>\s+/.test(text);
  if (hasBlockquotes) {
    score -= 0.2;
  }

  // Penalize code block fences (```)
  const hasCodeBlocks = /```/.test(text);
  if (hasCodeBlocks) {
    score -= 0.3;
  }

  return Math.max(0, Math.min(1.0, Number(score.toFixed(2))));
}

/**
 * Model as Judge for Specificity & Architectural Utility.
 * Note: Spec explicitly mandates saying out loud that this uses a model as judge.
 */
export async function evaluateSpecificityJudge(
  filePath: string,
  explanation: string,
  apiKey: string
): Promise<number> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_MODEL}:generateContent?key=${apiKey}`;

  const judgePrompt = `You are evaluating an architectural explanation of the codebase file: \`${filePath}\`.
Explanation to evaluate:
"""
${explanation}
"""

Evaluate how specific, concrete, and useful this explanation is regarding real architectural responsibilities (versus generic hand-waving fluff that could describe any generic file).
Rate on a scale from 1 to 5:
1 = Generic boilerplate with no real architectural specifics.
2 = Mostly generic with slight file references.
3 = Moderately specific.
4 = Clear, specific architectural description of responsibilities and neighbours.
5 = Exceptionally concrete, high signal-to-noise ratio, zero fluff.

Output ONLY a single integer from 1 to 5.`;

  try {
    const data = await fetchGeminiWithRetry(url, {
      contents: [{ role: "user", parts: [{ text: judgePrompt }] }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 10 },
    });

    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const digitMatch = txt.match(/[1-5]/);
    if (digitMatch) {
      const rating = parseInt(digitMatch[0], 10);
      return rating / 5.0; // Normalized 0.2 to 1.0
    }
  } catch {
    // Return neutral on network error
  }

  return 0.7;
}
