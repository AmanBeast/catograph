import path from "node:path";
import fs from "node:fs";
import type { FrameworkAdapter } from "./types";
import type { ParsedFile, Edge, ExtractedRoute, FileRole } from "@/lib/parser/types";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

/**
 * Next.js Framework Adapter.
 * Extracts roles from path conventions and directives.
 * Extracts exact routes from App Router and Pages Router specifications.
 */
export const nextjsAdapter: FrameworkAdapter = {
  name: "Next.js",

  detect(repoDir: string, files: ParsedFile[], edges: Edge[] = []): boolean {
    // 1. Check package.json dependencies if present
    if (repoDir) {
      const pkgPath = path.join(repoDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          if ("next" in allDeps) return true;
        } catch {
          // Ignore invalid package.json and fallback to file analysis
        }
      }

    }

    // Check next.config.js / next.config.mjs / next.config.ts via parsed files list
    if (files.some((f) => f.name === "next.config.js" || f.name === "next.config.mjs" || f.name === "next.config.ts")) {
      return true;
    }

    // 2. Check external edge imports
    for (const e of edges) {
      if (e.status === "external") {
        const lower = e.target.toLowerCase();
        if (lower === "next" || lower.startsWith("next/")) return true;
      }
    }

    // 3. Check App router or Pages router file structure
    for (const f of files) {
      const p = f.path.replace(/\\/g, "/");
      if (
        /(?:^|\/)app\/layout\.(?:tsx|jsx|js|ts)$/.test(p) ||
        /(?:^|\/)app\/page\.(?:tsx|jsx|js|ts)$/.test(p) ||
        /(?:^|\/)src\/app\/layout\.(?:tsx|jsx|js|ts)$/.test(p) ||
        /(?:^|\/)pages\/_app\.(?:tsx|jsx|js|ts)$/.test(p)
      ) {
        return true;
      }
    }

    return false;
  },

  identifyRole(filePath: string): string | null {
    const norm = filePath.replace(/\\/g, "/");

    // App Router Page
    if (
      /(?:^|\/)app\/(?:.*\/)?page\.(?:tsx|jsx|js|ts)$/.test(norm) ||
      /(?:^|\/)src\/app\/(?:.*\/)?page\.(?:tsx|jsx|js|ts)$/.test(norm)
    ) {
      return "page_route";
    }

    // App Router API route
    if (
      /(?:^|\/)app\/(?:.*\/)?route\.(?:ts|js|tsx|jsx)$/.test(norm) ||
      /(?:^|\/)src\/app\/(?:.*\/)?route\.(?:ts|js|tsx|jsx)$/.test(norm)
    ) {
      return "api_endpoint";
    }

    // Pages Router API
    if (/(?:^|\/)pages\/api\//.test(norm) || /(?:^|\/)src\/pages\/api\//.test(norm)) {
      return "api_endpoint";
    }

    // Pages Router Page
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
  },

  classifyFiles(files: ParsedFile[], repoDir?: string): FileRole[] {
    return files.map((file) => {
      let role = this.identifyRole(file.path) || "utility";

      // Check for "use server" directive if file is on disk and not yet classified as page/api
      if (repoDir && (role === "utility" || role === "component")) {
        try {
          const abs = path.join(repoDir, file.path);
          if (fs.existsSync(abs)) {
            const head = fs.readFileSync(abs, "utf-8").slice(0, 500);
            if (head.includes('"use server"') || head.includes("'use server'")) {
              role = "server_action";
            }
          }
        } catch {
          // Ignore read errors
        }
      }

      return {
        filePath: file.path,
        role,
        confidence: 1.0,
      };
    });
  },

  extractRoutes(files: ParsedFile[], repoDir?: string): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    for (const file of files) {
      const norm = file.path.replace(/\\/g, "/");

      // 1. App Router Page: app/**/page.(tsx|jsx|js|ts)
      const appPageMatch = norm.match(/(?:^|\/)(?:src\/)?app\/(.*\/)?page\.(?:tsx|jsx|js|ts)$/);
      if (appPageMatch) {
        const rawSub = appPageMatch[1] || "";
        const pattern = normalizeAppRouterPattern(rawSub);
        routes.push({
          filePath: file.path,
          method: "GET",
          pattern,
          isDynamic: pattern.includes("["),
        });
        continue;
      }

      // 2. App Router API Route: app/**/route.(ts|js|tsx|jsx)
      const appRouteMatch = norm.match(/(?:^|\/)(?:src\/)?app\/(.*\/)?route\.(?:ts|js|tsx|jsx)$/);
      if (appRouteMatch) {
        const rawSub = appRouteMatch[1] || "";
        const pattern = normalizeAppRouterPattern(rawSub);
        const isDynamic = pattern.includes("[");

        // Inspect exported HTTP methods from file if repoDir is provided
        const exportedMethods = getAppRouterExportedMethods(repoDir, file.path);

        if (exportedMethods.length > 0) {
          for (const method of exportedMethods) {
            routes.push({
              filePath: file.path,
              method,
              pattern,
              isDynamic,
            });
          }
        } else {
          // Fallback if file cannot be read from disk: route exists under ALL
          routes.push({
            filePath: file.path,
            method: "ALL",
            pattern,
            isDynamic,
          });
        }
        continue;
      }

      // 3. Pages Router API: pages/api/**
      const pagesApiMatch = norm.match(/(?:^|\/)(?:src\/)?pages\/api\/(.+)\.(?:ts|js|tsx|jsx)$/);
      if (pagesApiMatch) {
        let sub = pagesApiMatch[1];
        if (sub.endsWith("/index") || sub === "index") {
          sub = sub.replace(/(?:^|\/)index$/, "");
        }
        const pattern = `/api${sub ? `/${sub}` : ""}`;
        routes.push({
          filePath: file.path,
          method: "ALL",
          pattern,
          isDynamic: pattern.includes("["),
        });
        continue;
      }

      // 4. Pages Router Page: pages/** (not api)
      const pagesPageMatch = norm.match(/(?:^|\/)(?:src\/)?pages\/(.+)\.(?:tsx|jsx|js|ts)$/);
      if (pagesPageMatch) {
        const sub = pagesPageMatch[1];
        if (
          sub.startsWith("api/") ||
          sub === "_app" ||
          sub === "_document" ||
          sub === "_error"
        ) {
          continue;
        }

        let cleanSub = sub;
        if (cleanSub.endsWith("/index") || cleanSub === "index") {
          cleanSub = cleanSub.replace(/(?:^|\/)index$/, "");
        }
        const pattern = cleanSub ? `/${cleanSub}` : "/";
        routes.push({
          filePath: file.path,
          method: "GET",
          pattern,
          isDynamic: pattern.includes("["),
        });
      }
    }

    return routes;
  },
};

/**
 * Normalizes an App Router path by removing route groups e.g. (auth), (shell).
 */
function normalizeAppRouterPattern(rawSub: string): string {
  // Split segments and filter out route groups e.g. (group)
  const segments = rawSub
    .split("/")
    .filter(Boolean)
    .filter((s) => !/^\([^)]+\)$/.test(s));

  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

/**
 * Reads route.ts file from disk and parses exported HTTP method functions.
 */
function getAppRouterExportedMethods(repoDir: string | undefined, relativePath: string): string[] {
  if (!repoDir) return [];
  try {
    const fullPath = path.join(repoDir, relativePath);
    if (!fs.existsSync(fullPath)) return [];
    const content = fs.readFileSync(fullPath, "utf-8");

    const foundMethods: string[] = [];
    for (const m of HTTP_METHODS) {
      // Check export function GET / export async function GET / export const GET
      const regex = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${m}\\b`);
      if (regex.test(content)) {
        foundMethods.push(m);
      }
    }
    return foundMethods;
  } catch {
    return [];
  }
}
