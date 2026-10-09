import type { AllowedUnmatchedRole } from "../lib/ai/types.ts";
import { PINNED_MODEL } from "../lib/ai/types.ts";
import { sanitizeExplanationOutput } from "../lib/ai/clean.ts";

export interface RoleEvalTestCase {
  filePath: string;
  groundTruthRole: AllowedUnmatchedRole;
  sizeBytes: number;
  linesCount: number;
  dependencies: string[];
  dependents: string[];
}

/**
 * Gold-standard held-out dataset of 35 real-world files where conventions
 * establish certain ground truth, all belonging to the 7 permitted non-structural roles.
 * Scoring strictly on roles the classifier is allowed to return.
 */
export const HELD_OUT_ROLE_DATASET: RoleEvalTestCase[] = [
  // 1. Services (business logic, orchestration)
  {
    filePath: "src/services/auth.service.ts",
    groundTruthRole: "service",
    sizeBytes: 3420,
    linesCount: 120,
    dependencies: ["src/repositories/user.repository.ts", "src/utils/crypto.ts"],
    dependents: ["src/api/login.ts", "src/api/register.ts"],
  },
  {
    filePath: "lib/services/payment-processor.ts",
    groundTruthRole: "service",
    sizeBytes: 4180,
    linesCount: 155,
    dependencies: ["lib/models/transaction.model.ts", "lib/utils/currency.ts"],
    dependents: ["lib/handlers/checkout.ts"],
  },
  {
    filePath: "src/services/user-sync.service.ts",
    groundTruthRole: "service",
    sizeBytes: 2890,
    linesCount: 95,
    dependencies: ["src/repositories/user.repository.ts", "src/services/mailer.service.ts"],
    dependents: ["src/jobs/sync-users.ts"],
  },
  {
    filePath: "src/services/mailer.service.ts",
    groundTruthRole: "service",
    sizeBytes: 2150,
    linesCount: 78,
    dependencies: ["src/config/mail.config.ts", "src/utils/template.ts"],
    dependents: ["src/services/auth.service.ts", "src/services/user-sync.service.ts"],
  },
  {
    filePath: "src/services/notification.service.ts",
    groundTruthRole: "service",
    sizeBytes: 3100,
    linesCount: 110,
    dependencies: ["src/models/notification.model.ts", "src/utils/queue.ts"],
    dependents: ["src/events/dispatcher.ts"],
  },

  // 2. Repositories (database persistence, queries)
  {
    filePath: "src/repositories/user.repository.ts",
    groundTruthRole: "repository",
    sizeBytes: 4500,
    linesCount: 140,
    dependencies: ["src/models/user.model.ts", "src/db/connection.ts"],
    dependents: ["src/services/auth.service.ts", "src/services/user-sync.service.ts"],
  },
  {
    filePath: "lib/repositories/order.repository.ts",
    groundTruthRole: "repository",
    sizeBytes: 3890,
    linesCount: 130,
    dependencies: ["lib/models/order.model.ts", "lib/db/client.ts"],
    dependents: ["lib/services/payment-processor.ts"],
  },
  {
    filePath: "src/repositories/product.repository.ts",
    groundTruthRole: "repository",
    sizeBytes: 2950,
    linesCount: 102,
    dependencies: ["src/models/product.model.ts", "src/db/connection.ts"],
    dependents: ["src/services/catalog.service.ts"],
  },
  {
    filePath: "src/repositories/session.repository.ts",
    groundTruthRole: "repository",
    sizeBytes: 1980,
    linesCount: 68,
    dependencies: ["src/models/session.model.ts", "src/db/redis.ts"],
    dependents: ["src/services/auth.service.ts"],
  },
  {
    filePath: "lib/repositories/audit-log.repository.ts",
    groundTruthRole: "repository",
    sizeBytes: 2400,
    linesCount: 82,
    dependencies: ["lib/models/audit-log.model.ts", "lib/db/client.ts"],
    dependents: ["lib/services/audit.service.ts"],
  },

  // 3. Models (data schemas, entities)
  {
    filePath: "src/models/user.model.ts",
    groundTruthRole: "model",
    sizeBytes: 1850,
    linesCount: 65,
    dependencies: [],
    dependents: ["src/repositories/user.repository.ts", "src/services/auth.service.ts"],
  },
  {
    filePath: "lib/models/order.model.ts",
    groundTruthRole: "model",
    sizeBytes: 2200,
    linesCount: 75,
    dependencies: ["lib/models/item.model.ts"],
    dependents: ["lib/repositories/order.repository.ts"],
  },
  {
    filePath: "src/models/product.model.ts",
    groundTruthRole: "model",
    sizeBytes: 1600,
    linesCount: 55,
    dependencies: [],
    dependents: ["src/repositories/product.repository.ts"],
  },
  {
    filePath: "src/models/session.model.ts",
    groundTruthRole: "model",
    sizeBytes: 1400,
    linesCount: 48,
    dependencies: [],
    dependents: ["src/repositories/session.repository.ts"],
  },
  {
    filePath: "lib/models/transaction.model.ts",
    groundTruthRole: "model",
    sizeBytes: 2100,
    linesCount: 72,
    dependencies: [],
    dependents: ["lib/services/payment-processor.ts"],
  },

  // 4. Utilities (pure helper functions, formatters)
  {
    filePath: "src/utils/crypto.ts",
    groundTruthRole: "util",
    sizeBytes: 1540,
    linesCount: 52,
    dependencies: [],
    dependents: ["src/services/auth.service.ts", "src/utils/token.ts"],
  },
  {
    filePath: "lib/utils/format-currency.ts",
    groundTruthRole: "util",
    sizeBytes: 980,
    linesCount: 35,
    dependencies: [],
    dependents: ["lib/services/payment-processor.ts", "components/price-tag.tsx"],
  },
  {
    filePath: "src/utils/date-helpers.ts",
    groundTruthRole: "util",
    sizeBytes: 2100,
    linesCount: 74,
    dependencies: [],
    dependents: ["src/components/timestamp.tsx", "src/services/report.service.ts"],
  },
  {
    filePath: "src/helpers/slugify.ts",
    groundTruthRole: "util",
    sizeBytes: 850,
    linesCount: 30,
    dependencies: [],
    dependents: ["src/services/catalog.service.ts"],
  },
  {
    filePath: "lib/utils/string-sanitize.ts",
    groundTruthRole: "util",
    sizeBytes: 1200,
    linesCount: 42,
    dependencies: [],
    dependents: ["lib/services/user-sync.service.ts"],
  },

  // 5. Config (environment & application setup)
  {
    filePath: "tailwind.config.ts",
    groundTruthRole: "config",
    sizeBytes: 1450,
    linesCount: 48,
    dependencies: [],
    dependents: [],
  },
  {
    filePath: "next.config.ts",
    groundTruthRole: "config",
    sizeBytes: 890,
    linesCount: 32,
    dependencies: [],
    dependents: [],
  },
  {
    filePath: "src/config/mail.config.ts",
    groundTruthRole: "config",
    sizeBytes: 1100,
    linesCount: 38,
    dependencies: [],
    dependents: ["src/services/mailer.service.ts"],
  },
  {
    filePath: "tsconfig.json",
    groundTruthRole: "config",
    sizeBytes: 1250,
    linesCount: 45,
    dependencies: [],
    dependents: [],
  },
  {
    filePath: "eslint.config.js",
    groundTruthRole: "config",
    sizeBytes: 1320,
    linesCount: 44,
    dependencies: [],
    dependents: [],
  },

  // 6. Components (UI widgets & elements)
  {
    filePath: "components/canvas/detail-pane.tsx",
    groundTruthRole: "component",
    sizeBytes: 12000,
    linesCount: 340,
    dependencies: ["components/canvas/explanation-renderer.tsx", "hooks/use-canvas-zoom.ts"],
    dependents: ["components/canvas/canvas-shell.tsx"],
  },
  {
    filePath: "components/ui/button.tsx",
    groundTruthRole: "component",
    sizeBytes: 2400,
    linesCount: 80,
    dependencies: [],
    dependents: ["components/canvas/detail-pane.tsx", "components/navbar.tsx"],
  },
  {
    filePath: "components/modal/confirm-dialog.tsx",
    groundTruthRole: "component",
    sizeBytes: 3100,
    linesCount: 95,
    dependencies: ["components/ui/button.tsx"],
    dependents: ["components/canvas/detail-pane.tsx"],
  },
  {
    filePath: "components/navbar/user-menu.tsx",
    groundTruthRole: "component",
    sizeBytes: 2800,
    linesCount: 88,
    dependencies: ["components/ui/button.tsx", "hooks/use-media-query.ts"],
    dependents: ["components/navbar.tsx"],
  },
  {
    filePath: "components/canvas/explanation-renderer.tsx",
    groundTruthRole: "component",
    sizeBytes: 4900,
    linesCount: 150,
    dependencies: [],
    dependents: ["components/canvas/detail-pane.tsx"],
  },

  // 7. Hooks (reusable client react hooks)
  {
    filePath: "hooks/use-canvas-zoom.ts",
    groundTruthRole: "hook",
    sizeBytes: 2600,
    linesCount: 92,
    dependencies: [],
    dependents: ["components/canvas/canvas-center.tsx"],
  },
  {
    filePath: "hooks/use-local-storage.ts",
    groundTruthRole: "hook",
    sizeBytes: 1800,
    linesCount: 60,
    dependencies: [],
    dependents: ["components/canvas/detail-pane.tsx"],
  },
  {
    filePath: "hooks/use-debounce.ts",
    groundTruthRole: "hook",
    sizeBytes: 1100,
    linesCount: 40,
    dependencies: [],
    dependents: ["components/search/search-input.tsx"],
  },
  {
    filePath: "hooks/use-media-query.ts",
    groundTruthRole: "hook",
    sizeBytes: 1400,
    linesCount: 48,
    dependencies: [],
    dependents: ["components/navbar/user-menu.tsx"],
  },
  {
    filePath: "hooks/use-keyboard-shortcut.ts",
    groundTruthRole: "hook",
    sizeBytes: 1750,
    linesCount: 56,
    dependencies: [],
    dependents: ["components/canvas/canvas-shell.tsx"],
  },
];

export interface RoleEvaluationOutcome {
  testCase: RoleEvalTestCase;
  predictedRole: AllowedUnmatchedRole | "unknown";
  correct: boolean;
  explanationSnippet: string;
}

export interface RoleAccuracySummary {
  total: number;
  correct: number;
  accuracyPercentage: number;
  breakdown: Record<AllowedUnmatchedRole, { total: number; correct: number; accuracy: number }>;
  outcomes: RoleEvaluationOutcome[];
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
 * Predicts role for a file by hiding its ground-truth role and passing to the model.
 */
export async function predictFileRole(
  testCase: RoleEvalTestCase,
  apiKey: string
): Promise<{ predictedRole: AllowedUnmatchedRole | "unknown"; summary: string }> {
  const systemInstruction = `You are Cartograph's architectural intelligence engine.
Explain the file strictly based on its provided imports and importers.
At the very end of your response, output exactly one non-structural role classification in the format: [ROLE: <role>].
Allowed roles are ONLY: service, repository, model, util, config, component, hook.
You must NEVER use page, route, or controller.`;

  const prompt = `Explain the following repository file:
File: \`${testCase.filePath}\`
Lines: ${testCase.linesCount} lines (${testCase.sizeBytes} bytes)
No structural role identified.

Neighbouring dependencies (files it imports):
${testCase.dependencies.length > 0 ? testCase.dependencies.map((d) => `- \`${d}\``).join("\n") : "- None"}

Neighbouring dependents (files that import it):
${testCase.dependents.length > 0 ? testCase.dependents.map((d) => `- \`${d}\``).join("\n") : "- None"}

Explain what this file does in the context of these real neighbours and assign its non-structural role.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_MODEL}:generateContent?key=${apiKey}`;

  const data = await fetchGeminiWithRetry(url, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
  });

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = sanitizeExplanationOutput(rawText);

  return {
    predictedRole: (parsed.role as AllowedUnmatchedRole) || "unknown",
    summary: parsed.summary,
  };
}
