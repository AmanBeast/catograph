/**
 * Framework taxonomy and rail category definitions.
 * Pure TypeScript, zero Node.js/AST/filesystem dependencies.
 * Client-bundle safe so browser components can render the rail without pulling in parsers.
 */

import type { ParsedFile } from "@/lib/parser/types";

export type FrameworkName = "Next.js" | "NestJS" | "React" | "generic";

export interface TaxonomyRoleDef {
  id: string; // Internal role key
  name: string; // Concrete human-readable category name
  color: string; // Palette color
  order: number; // Fixed reading order
}

/**
 * Fixed reading order taxonomies per framework.
 * Routable surfaces first, followed by internal layers, then plumbing/utilities.
 */
export const FRAMEWORK_TAXONOMIES: Record<FrameworkName, TaxonomyRoleDef[]> = {
  "Next.js": [
    { id: "page_route", name: "Page routes", color: "#38bdf8", order: 1 },
    { id: "api_endpoint", name: "API endpoints", color: "#10b981", order: 2 },
    { id: "server_action", name: "Server actions", color: "#f59e0b", order: 3 },
    { id: "component", name: "Components", color: "#818cf8", order: 4 },
    { id: "utility", name: "Utilities", color: "#94a3b8", order: 5 },
  ],
  NestJS: [
    { id: "controller", name: "Controllers", color: "#f43f5e", order: 1 },
    { id: "service", name: "Services", color: "#06b6d4", order: 2 },
    { id: "module", name: "Modules", color: "#a855f7", order: 3 },
    { id: "entity", name: "Entities", color: "#10b981", order: 4 },
    { id: "dto", name: "DTOs", color: "#14b8a6", order: 5 },
    { id: "guard", name: "Guards", color: "#f97316", order: 6 },
    { id: "utility", name: "Utilities", color: "#94a3b8", order: 7 },
  ],
  React: [
    { id: "page", name: "Pages", color: "#38bdf8", order: 1 },
    { id: "component", name: "Components", color: "#818cf8", order: 2 },
    { id: "hook", name: "Hooks", color: "#f59e0b", order: 3 },
    { id: "context", name: "Context", color: "#a855f7", order: 4 },
    { id: "utility", name: "Utilities", color: "#94a3b8", order: 5 },
  ],
  generic: [
    { id: "source", name: "Source files", color: "#3b82f6", order: 1 },
    { id: "utility", name: "Utilities", color: "#94a3b8", order: 2 },
  ],
};

export interface RailCategory {
  id: string; // Category key (role id or extension)
  name: string; // Display label (e.g. "Controllers", "Page routes", ".ts")
  color: string;
  count: number;
  order: number;
}

/**
 * Standard palette for generic extensions.
 */
const EXTENSION_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#0284c7",
  js: "#f59e0b",
  jsx: "#ea580c",
  mjs: "#d97706",
  cjs: "#b45309",
  json: "#10b981",
  css: "#ec4899",
  svg: "#8b5cf6",
  md: "#64748b",
};

/**
 * Normalizes framework name string into a supported FrameworkName union.
 */
export function normalizeFrameworkName(raw?: string | null): FrameworkName {
  if (!raw) return "generic";
  const lower = raw.toLowerCase();
  if (lower.includes("next")) return "Next.js";
  if (lower.includes("nest")) return "NestJS";
  if (lower.includes("react")) return "React";
  return "generic";
}

/**
 * Fast client-safe role classifier based on file paths and conventions.
 * Used when DB file_roles are not yet populated or when rendering statically.
 */
export function classifyFileRoleByPath(framework: FrameworkName, filePath: string): string {
  const norm = filePath.replace(/\\/g, "/");

  if (framework === "NestJS") {
    if (norm.endsWith(".controller.ts") || norm.endsWith(".controller.js")) return "controller";
    if (norm.endsWith(".service.ts") || norm.endsWith(".service.js")) return "service";
    if (norm.endsWith(".module.ts") || norm.endsWith(".module.js")) return "module";
    if (norm.endsWith(".entity.ts") || norm.endsWith(".entity.js")) return "entity";
    if (norm.endsWith(".dto.ts") || norm.endsWith(".dto.js")) return "dto";
    if (norm.endsWith(".guard.ts") || norm.endsWith(".guard.js")) return "guard";
    return "utility";
  }

  if (framework === "Next.js") {
    // App Router Page: app/**/page.(tsx|jsx|js|ts)
    if (
      /(?:^|\/)app\/(?:.*\/)?page\.(?:tsx|jsx|js|ts)$/.test(norm) ||
      /(?:^|\/)src\/app\/(?:.*\/)?page\.(?:tsx|jsx|js|ts)$/.test(norm)
    ) {
      return "page_route";
    }

    // App Router API: app/**/route.(ts|js|tsx|jsx)
    if (
      /(?:^|\/)app\/(?:.*\/)?route\.(?:ts|js|tsx|jsx)$/.test(norm) ||
      /(?:^|\/)src\/app\/(?:.*\/)?route\.(?:ts|js|tsx|jsx)$/.test(norm)
    ) {
      return "api_endpoint";
    }

    // Pages Router API: pages/api/**
    if (
      /(?:^|\/)pages\/api\//.test(norm) ||
      /(?:^|\/)src\/pages\/api\//.test(norm)
    ) {
      return "api_endpoint";
    }

    // Pages Router Page: pages/** (excluding api, _app, _document, _error)
    if (
      (/(?:^|\/)pages\//.test(norm) || /(?:^|\/)src\/pages\//.test(norm)) &&
      !/(?:_app|_document|_error)\.(?:tsx|jsx|js|ts)$/.test(norm)
    ) {
      return "page_route";
    }

    // Server actions convention
    if (
      /(?:^|\/)actions\//.test(norm) ||
      /\.actions?\.(?:ts|js)$/.test(norm)
    ) {
      return "server_action";
    }

    // Components: .tsx or .jsx files
    if (norm.endsWith(".tsx") || norm.endsWith(".jsx")) {
      return "component";
    }

    return "utility";
  }

  if (framework === "React") {
    if (
      /(?:^|\/)pages\//.test(norm) ||
      /(?:^|\/)views\//.test(norm) ||
      /(?:^|\/)screens\//.test(norm) ||
      /page\.(?:tsx|jsx|js|ts)$/.test(norm)
    ) {
      return "page";
    }

    if (
      /(?:^|\/)hooks\//.test(norm) ||
      /(?:^|\/)use[A-Z0-9].*\.(?:ts|js|tsx)$/.test(norm)
    ) {
      return "hook";
    }

    if (
      /(?:^|\/)context\//.test(norm) ||
      /context\.(?:ts|tsx|js)$/i.test(norm)
    ) {
      return "context";
    }

    if (norm.endsWith(".tsx") || norm.endsWith(".jsx")) {
      return "component";
    }

    return "utility";
  }

  // Generic
  const ext = norm.split(".").pop()?.toLowerCase() || "ts";
  return ext;
}

/**
 * Derives left rail categories for a repository.
 * If framework is recognized, reshapes the rail strictly according to the framework's fixed reading order.
 * If framework is generic, displays concrete file extension categories.
 */
export function deriveFrameworkRailCategories(
  framework: FrameworkName,
  files: ParsedFile[],
  fileRolesMap?: Map<string, string>
): RailCategory[] {
  if (framework === "generic") {
    // Generic repository: Concrete extension categories
    const counts: Record<string, number> = {};
    for (const f of files) {
      const ext = f.extension?.toLowerCase() || "other";
      counts[ext] = (counts[ext] || 0) + 1;
    }

    const sortedExts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return sortedExts.map((ext, idx) => ({
      id: ext,
      name: `.${ext}`,
      color: EXTENSION_COLORS[ext] || "#64748b",
      count: counts[ext],
      order: idx + 1,
    }));
  }

  // Framework-specific taxonomy
  const taxonomy = FRAMEWORK_TAXONOMIES[framework];
  const counts: Record<string, number> = {};

  // Count files per role
  for (const f of files) {
    const role = fileRolesMap?.get(f.path) || classifyFileRoleByPath(framework, f.path);
    counts[role] = (counts[role] || 0) + 1;
  }

  // Build categories adhering strictly to fixed reading order
  const categories: RailCategory[] = [];

  for (const def of taxonomy) {
    const count = counts[def.id] || 0;
    // Always include routable and key architectural categories if present or core to taxonomy
    if (count > 0 || def.order <= 4) {
      categories.push({
        id: def.id,
        name: def.name,
        color: def.color,
        count,
        order: def.order,
      });
    }
  }

  return categories.sort((a, b) => a.order - b.order);
}
