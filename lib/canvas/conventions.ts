import type { ParsedFile, Edge } from "@/lib/parser/types";

export type FileConventionKind =
  | "route"
  | "middleware"
  | "test"
  | "type"
  | "component"
  | "hook"
  | "util"
  | "config"
  | "style"
  | "document"
  | "unclassified";

export interface FileConvention {
  kind: FileConventionKind;
  label: string;
  isIdentified: boolean;
  color: string;
}

const CONVENTION_CONFIG: Record<FileConventionKind, { label: string; color: string }> = {
  route: { label: "Route / Endpoint", color: "#06b6d4" }, // Cyan
  middleware: { label: "Middleware", color: "#8b5cf6" }, // Purple
  test: { label: "Test Suite", color: "#10b981" }, // Emerald
  type: { label: "Type Definition", color: "#3b82f6" }, // Blue
  component: { label: "UI Component", color: "#f59e0b" }, // Amber
  hook: { label: "React Hook", color: "#ec4899" }, // Pink
  util: { label: "Utility / Helper", color: "#6366f1" }, // Indigo
  config: { label: "Configuration", color: "#64748b" }, // Slate
  style: { label: "Stylesheet", color: "#f43f5e" }, // Rose
  document: { label: "Documentation", color: "#71717a" }, // Zinc
  unclassified: { label: "General Source", color: "#94a3b8" }, // Neutral
};

/**
 * Identifies a file's architectural role based on standard directory and naming conventions.
 */
export function identifyFileConvention(file: ParsedFile): FileConvention {
  const normPath = file.path.toLowerCase();
  const name = file.name.toLowerCase();

  // 1. Tests
  if (
    /\.(test|spec)\.[jt]sx?$/.test(name) ||
    normPath.includes("__tests__/") ||
    normPath.includes("/test/") ||
    normPath.includes("/tests/") ||
    normPath.startsWith("test/") ||
    normPath.startsWith("tests/")
  ) {
    return {
      kind: "test",
      label: CONVENTION_CONFIG.test.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.test.color,
    };
  }

  // 2. Types & Interfaces
  if (
    /\.(d\.ts|types?\.[jt]sx?|interfaces?\.[jt]sx?)$/.test(name) ||
    name === "types.ts" ||
    name === "type.ts" ||
    normPath.includes("/types/") ||
    normPath.startsWith("types/")
  ) {
    return {
      kind: "type",
      label: CONVENTION_CONFIG.type.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.type.color,
    };
  }

  // 3. Middleware
  if (
    normPath.includes("/middleware/") ||
    normPath.startsWith("middleware/") ||
    name.startsWith("middleware.")
  ) {
    return {
      kind: "middleware",
      label: CONVENTION_CONFIG.middleware.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.middleware.color,
    };
  }

  // 4. Routes & Endpoints
  if (
    normPath.includes("/router/") ||
    normPath.includes("/routes/") ||
    normPath.includes("/api/") ||
    normPath.includes("/pages/") ||
    normPath.includes("/app/") ||
    normPath.startsWith("routes/") ||
    normPath.startsWith("router/") ||
    normPath.startsWith("pages/") ||
    normPath.startsWith("app/") ||
    /^(route|page|layout|loading|error|not-found)\.[jt]sx?$/.test(name)
  ) {
    return {
      kind: "route",
      label: CONVENTION_CONFIG.route.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.route.color,
    };
  }

  // 5. Hooks
  if (
    /^use[a-z0-9_-]/i.test(name) ||
    normPath.includes("/hooks/") ||
    normPath.startsWith("hooks/")
  ) {
    return {
      kind: "hook",
      label: CONVENTION_CONFIG.hook.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.hook.color,
    };
  }

  // 6. Components
  if (
    (file.extension === "tsx" || file.extension === "jsx") &&
    (normPath.includes("/components/") ||
      normPath.startsWith("components/") ||
      /^[A-Z]/.test(name))
  ) {
    return {
      kind: "component",
      label: CONVENTION_CONFIG.component.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.component.color,
    };
  }

  // 7. Config files
  if (
    name.includes(".config.") ||
    name.startsWith("tsconfig") ||
    name === "package.json" ||
    name.startsWith(".env") ||
    name.endsWith(".rc") ||
    name.includes(".rc.")
  ) {
    return {
      kind: "config",
      label: CONVENTION_CONFIG.config.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.config.color,
    };
  }

  // 8. Utilities & Helpers
  if (
    normPath.includes("/utils/") ||
    normPath.includes("/util/") ||
    normPath.includes("/helpers/") ||
    normPath.includes("/helper/") ||
    normPath.startsWith("utils/") ||
    normPath.startsWith("helpers/")
  ) {
    return {
      kind: "util",
      label: CONVENTION_CONFIG.util.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.util.color,
    };
  }

  // 9. Styles
  if (["css", "scss", "sass", "less"].includes(file.extension)) {
    return {
      kind: "style",
      label: CONVENTION_CONFIG.style.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.style.color,
    };
  }

  // 10. Documentation
  if (["md", "mdx", "txt"].includes(file.extension)) {
    return {
      kind: "document",
      label: CONVENTION_CONFIG.document.label,
      isIdentified: true,
      color: CONVENTION_CONFIG.document.color,
    };
  }

  // No convention could identify this file
  return {
    kind: "unclassified",
    label: CONVENTION_CONFIG.unclassified.label,
    isIdentified: false,
    color: CONVENTION_CONFIG.unclassified.color,
  };
}

/**
 * Detects the dominant framework used in the repository based on imports and signatures.
 */
export function detectFramework(
  files: ParsedFile[],
  edges: Edge[],
  repoName?: string
): string {
  const externalTargets = new Set<string>();
  for (const e of edges) {
    if (e.status === "external") {
      externalTargets.add(e.target.toLowerCase());
    }
  }

  // 1. Check external module imports
  if (
    externalTargets.has("next") ||
    Array.from(externalTargets).some((t) => t.startsWith("next/"))
  ) {
    return "Next.js";
  }

  if (
    externalTargets.has("hono") ||
    Array.from(externalTargets).some((t) => t.startsWith("hono/"))
  ) {
    return "Hono";
  }

  if (externalTargets.has("express")) return "Express";
  if (externalTargets.has("fastify")) return "Fastify";
  if (
    externalTargets.has("remix") ||
    Array.from(externalTargets).some((t) => t.startsWith("@remix-run/"))
  ) {
    return "Remix";
  }
  if (externalTargets.has("astro")) return "Astro";
  if (
    externalTargets.has("@nestjs/core") ||
    Array.from(externalTargets).some((t) => t.startsWith("@nestjs/"))
  ) {
    return "NestJS";
  }
  if (externalTargets.has("vue")) return "Vue";
  if (externalTargets.has("svelte")) return "Svelte";
  if (externalTargets.has("react")) return "React";

  // 2. Fallback to repo name clues
  const normRepo = (repoName || "").toLowerCase();
  if (normRepo.includes("hono")) return "Hono";
  if (normRepo.includes("next")) return "Next.js";
  if (normRepo.includes("express")) return "Express";

  // 3. Fallback based on file paths
  const hasAppDir = files.some(
    (f) => f.path.startsWith("app/") || f.path.startsWith("src/app/")
  );
  if (hasAppDir) return "Next.js (App Router)";

  return "Standard TypeScript / Node.js";
}

export interface RepositorySummaryMetrics {
  framework: string;
  totalFiles: number;
  totalImports: number;
  routesCount: number;
  unclassifiedCount: number;
  mostDependedOn: ParsedFile[];
  entryPoints: ParsedFile[]; // fanIn === 0, where reading starts
  conventionBreakdown: Record<FileConventionKind, number>;
}

/**
 * Computes top-level repository summary metrics for the resting detail pane.
 */
export function computeRepositorySummary(
  files: ParsedFile[],
  edges: Edge[],
  repoName?: string,
  frameworkOverride?: string,
  routesCountOverride?: number
): RepositorySummaryMetrics {
  const framework = frameworkOverride || detectFramework(files, edges, repoName);

  let routesCount = 0;
  let unclassifiedCount = 0;
  const conventionBreakdown: Record<FileConventionKind, number> = {
    route: 0,
    middleware: 0,
    test: 0,
    type: 0,
    component: 0,
    hook: 0,
    util: 0,
    config: 0,
    style: 0,
    document: 0,
    unclassified: 0,
  };

  for (const f of files) {
    const { kind, isIdentified } = identifyFileConvention(f);
    conventionBreakdown[kind] = (conventionBreakdown[kind] || 0) + 1;
    if (kind === "route") routesCount++;
    if (!isIdentified) unclassifiedCount++;
  }

  // 1. What the rest of the repository leans on most (fanIn > 0, descending)
  const mostDependedOn = [...files]
    .filter((f) => f.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || b.linesCount - a.linesCount)
    .slice(0, 10);

  // 2. Files nothing imports at all (fanIn === 0, where reading starts)
  const entryPoints = [...files]
    .filter((f) => f.fanIn === 0)
    .sort((a, b) => b.fanOut - a.fanOut || b.linesCount - a.linesCount)
    .slice(0, 10);

  // Total internal resolved imports
  const internalResolved = edges.filter((e) => e.status === "resolved").length;

  return {
    framework,
    totalFiles: files.length,
    totalImports: internalResolved,
    routesCount: routesCountOverride !== undefined ? routesCountOverride : routesCount,
    unclassifiedCount,
    mostDependedOn,
    entryPoints,
    conventionBreakdown,
  };
}
