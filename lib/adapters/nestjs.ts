import path from "node:path";
import fs from "node:fs";
import { Project, SyntaxKind } from "ts-morph";
import type { FrameworkAdapter } from "./types";
import type { ParsedFile, Edge, ExtractedRoute, FileRole } from "@/lib/parser/types";

const NEST_HTTP_METHODS: Record<string, string> = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Delete: "DELETE",
  Patch: "PATCH",
  All: "ALL",
  Options: "OPTIONS",
  Head: "HEAD",
};

/**
 * NestJS Framework Adapter.
 * Classifies roles from filename suffixes (.controller.ts, .service.ts, .module.ts, .entity.ts).
 * Assembles exact routes from controller class decorator and method decorators together.
 */
export const nestjsAdapter: FrameworkAdapter = {
  name: "NestJS",

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
          if ("@nestjs/core" in allDeps || "@nestjs/common" in allDeps) {
            return true;
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    // 2. Check external edge imports
    for (const e of edges) {
      if (e.status === "external") {
        const lower = e.target.toLowerCase();
        if (lower.startsWith("@nestjs/")) return true;
      }
    }

    // 3. Check presence of NestJS file conventions
    let nestFilesCount = 0;
    for (const f of files) {
      const p = f.path.toLowerCase();
      if (
        p.endsWith(".controller.ts") ||
        p.endsWith(".service.ts") ||
        p.endsWith(".module.ts") ||
        p.endsWith(".entity.ts")
      ) {
        nestFilesCount++;
        if (nestFilesCount >= 2) return true;
      }
    }

    return false;
  },

  identifyRole(filePath: string): string | null {
    const norm = filePath.replace(/\\/g, "/").toLowerCase();

    if (norm.endsWith(".controller.ts") || norm.endsWith(".controller.js")) return "controller";
    if (norm.endsWith(".service.ts") || norm.endsWith(".service.js")) return "service";
    if (norm.endsWith(".module.ts") || norm.endsWith(".module.js")) return "module";
    if (norm.endsWith(".entity.ts") || norm.endsWith(".entity.js")) return "entity";
    if (norm.endsWith(".dto.ts") || norm.endsWith(".dto.js")) return "dto";
    if (norm.endsWith(".guard.ts") || norm.endsWith(".guard.js")) return "guard";
    if (norm.endsWith(".interceptor.ts") || norm.endsWith(".interceptor.js")) return "interceptor";
    if (norm.endsWith(".pipe.ts") || norm.endsWith(".pipe.js")) return "pipe";
    if (norm.endsWith(".middleware.ts") || norm.endsWith(".middleware.js")) return "middleware";
    if (norm.endsWith(".strategy.ts") || norm.endsWith(".strategy.js")) return "strategy";

    return "utility";
  },

  classifyFiles(files: ParsedFile[]): FileRole[] {
    return files.map((file) => ({
      filePath: file.path,
      role: this.identifyRole(file.path) || "utility",
      confidence: 1.0,
    }));
  },

  extractRoutes(files: ParsedFile[], repoDir?: string): ExtractedRoute[] {
    const controllerFiles = files.filter((f) => {
      const p = f.path.replace(/\\/g, "/").toLowerCase();
      return p.endsWith(".controller.ts") || p.endsWith(".controller.js");
    });

    if (controllerFiles.length === 0) return [];

    const routes: ExtractedRoute[] = [];

    // Initialize ts-morph project for exact decorator parsing
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, experimentalDecorators: true },
    });

    for (const cFile of controllerFiles) {
      let content = "";
      if (repoDir) {
        try {
          const abs = path.join(repoDir, cFile.path);
          if (fs.existsSync(abs)) {
            content = fs.readFileSync(abs, "utf-8");
          }
        } catch {
          continue;
        }
      }

      if (!content) continue;

      try {
        const sourceFile = project.createSourceFile(cFile.path, content, { overwrite: true });

        for (const cls of sourceFile.getClasses()) {
          const controllerDec = cls.getDecorator("Controller");
          if (!controllerDec) continue;

          // Controller prefix extraction
          let controllerPrefix = "";
          const args = controllerDec.getArguments();
          let prefixValid = true;

          if (args.length > 0) {
            const firstArg = args[0];
            if (firstArg.isKind(SyntaxKind.StringLiteral)) {
              controllerPrefix = firstArg.getLiteralText();
            } else if (firstArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const pathProp = firstArg.getProperty("path");
              if (pathProp && pathProp.isKind(SyntaxKind.PropertyAssignment)) {
                const init = pathProp.getInitializer();
                if (init && init.isKind(SyntaxKind.StringLiteral)) {
                  controllerPrefix = init.getLiteralText();
                } else {
                  prefixValid = false;
                }
              }
            } else {
              // Expression or dynamic identifier -> cannot assemble exact route without inference
              prefixValid = false;
            }
          }

          if (!prefixValid) continue;

          // Inspect method decorators
          for (const method of cls.getMethods()) {
            for (const dec of method.getDecorators()) {
              const decName = dec.getName();
              const httpMethod = NEST_HTTP_METHODS[decName];
              if (!httpMethod) continue;

              let methodSubpath = "";
              let subpathValid = true;
              const decArgs = dec.getArguments();

              if (decArgs.length > 0) {
                const firstDecArg = decArgs[0];
                if (firstDecArg.isKind(SyntaxKind.StringLiteral)) {
                  methodSubpath = firstDecArg.getLiteralText();
                } else {
                  // Non-string literal argument -> skip route (absent beats approximate)
                  subpathValid = false;
                }
              }

              if (!subpathValid) continue;

              const fullPattern = assembleNestPattern(controllerPrefix, methodSubpath);
              routes.push({
                filePath: cFile.path,
                method: httpMethod,
                pattern: fullPattern,
                isDynamic: fullPattern.includes(":") || fullPattern.includes("*"),
              });
            }
          }
        }
      } catch {
        // Continue on file parse errors without guessing
      }
    }

    return routes;
  },
};

/**
 * Assembles exact URL pattern from NestJS controller prefix and method subpath.
 * Cleans slashes, preserves parameters (e.g. :id) and ensures leading slash.
 */
function assembleNestPattern(prefix: string, subpath: string): string {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const cleanSub = subpath.replace(/^\/+|\/+$/g, "");

  const parts = [cleanPrefix, cleanSub].filter(Boolean);
  if (parts.length === 0) return "/";

  return `/${parts.join("/")}`;
}
