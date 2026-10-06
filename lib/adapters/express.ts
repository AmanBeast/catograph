import path from "node:path";
import fs from "node:fs";
import type { FrameworkAdapter } from "./types";
import type { ParsedFile, Edge, ExtractedRoute, FileRole } from "@/lib/parser/types";

/**
 * Express Framework Adapter.
 * Classifies roles from directory conventions (routes, controllers, services, models, middleware).
 * Accepts both singular and plural folder names (routes/route, controllers/controller, etc.).
 *
 * Constraint: Express routes are NOT extracted.
 * They are assembled at runtime from routers, variables, and middleware chains,
 * and the route rule says exact or absent. An Express repository gets roles and an empty route table.
 */
export const expressAdapter: FrameworkAdapter = {
  name: "Express",

  detect(repoDir: string, files: ParsedFile[], edges: Edge[] = []): boolean {
    // 1. Check package.json dependencies
    if (repoDir) {
      const pkgPath = path.join(repoDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          if ("express" in allDeps) {
            return true;
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    // 2. Check external edge imports or requires
    for (const e of edges) {
      if (e.status === "external") {
        const lower = e.target.toLowerCase();
        if (lower === "express" || lower.startsWith("express/")) {
          return true;
        }
      }
    }

    // 3. Check presence of Express entrypoints and folder conventions
    const hasExpressEntrypoint = files.some((f) => {
      const base = f.name.toLowerCase();
      return (
        base === "app.js" ||
        base === "app.ts" ||
        base === "server.js" ||
        base === "server.ts" ||
        base === "app.cjs" ||
        base === "server.cjs"
      );
    });

    const hasRouteOrControllerFolders = files.some((f) => {
      const norm = f.path.replace(/\\/g, "/").toLowerCase();
      return (
        /(?:^|\/)(?:routes|route)\//.test(norm) ||
        /(?:^|\/)(?:controllers|controller)\//.test(norm)
      );
    });

    if (hasExpressEntrypoint && hasRouteOrControllerFolders) {
      return true;
    }

    return false;
  },

  identifyRole(filePath: string): string | null {
    const norm = filePath.replace(/\\/g, "/").toLowerCase();

    // 1. Routes (plural or singular folder or filename convention)
    if (
      /(?:^|\/)(?:routes|route)\//.test(norm) ||
      /\.(?:routes?)\.(?:js|ts|cjs|mjs)$/.test(norm)
    ) {
      return "route";
    }

    // 2. Controllers (plural or singular folder or filename convention)
    if (
      /(?:^|\/)(?:controllers|controller)\//.test(norm) ||
      /\.(?:controller|controllers)\.(?:js|ts|cjs|mjs)$/.test(norm)
    ) {
      return "controller";
    }

    // 3. Services (plural or singular folder or filename convention)
    if (
      /(?:^|\/)(?:services|service)\//.test(norm) ||
      /\.(?:service|services)\.(?:js|ts|cjs|mjs)$/.test(norm)
    ) {
      return "service";
    }

    // 4. Models / Schemas (plural or singular folder or filename convention)
    if (
      /(?:^|\/)(?:models|model|schemas|schema)\//.test(norm) ||
      /\.(?:model|models|schema|schemas)\.(?:js|ts|cjs|mjs)$/.test(norm)
    ) {
      return "model";
    }

    // 5. Middleware (singular or plural folder or filename convention)
    if (
      /(?:^|\/)(?:middleware|middlewares)\//.test(norm) ||
      /\.(?:middleware|middlewares)\.(?:js|ts|cjs|mjs)$/.test(norm)
    ) {
      return "middleware";
    }

    // 6. Plumbing / Utilities
    return "utility";
  },

  classifyFiles(files: ParsedFile[]): FileRole[] {
    return files.map((file) => ({
      filePath: file.path,
      role: this.identifyRole(file.path) || "utility",
      confidence: 1.0,
    }));
  },

  extractRoutes(): ExtractedRoute[] {
    // Constraint from Phase 9 spec:
    // Express routes are NOT extracted. They're assembled at runtime from
    // routers, variables and middleware chains, and the route rule says exact or
    // absent. An Express repository gets roles and an empty route table.
    return [];
  },
};
