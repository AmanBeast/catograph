import path from "node:path";
import fs from "node:fs";
import { normalizePath } from "./walk.ts";
import type { ResolutionStatus } from "./types.ts";

const EXTENSIONS_TO_TRY = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const INDEX_FILES_TO_TRY = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/index.mjs", "/index.cjs"];

export interface PathAlias {
  prefix: string;
  targets: string[];
}

export interface TsConfigPaths {
  baseUrl: string;
  aliases: PathAlias[];
}

import ts from "typescript";

/**
 * Loads compilerOptions.paths and baseUrl from tsconfig.json if present.
 * Uses TypeScript compiler API to correctly parse JSONC and trailing commas.
 */
export function loadTsConfigPaths(repoRoot: string): TsConfigPaths | null {
  const tsconfigPath = path.join(repoRoot, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) return null;

  try {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) return null;

    const compilerOptions = configFile.config?.compilerOptions || {};
    const baseUrl = compilerOptions.baseUrl ? normalizePath(compilerOptions.baseUrl) : ".";
    const paths = compilerOptions.paths || {};

    const aliases: PathAlias[] = [];
    for (const [key, val] of Object.entries(paths)) {
      if (Array.isArray(val) && val.length > 0) {
        // e.g. "@/*" -> prefix "@/"
        const prefix = key.endsWith("/*") ? key.slice(0, -1) : key;
        const targets = (val as string[]).map((t) => (t.endsWith("/*") ? t.slice(0, -1) : t));
        aliases.push({ prefix, targets });
      }
    }

    return { baseUrl, aliases };
  } catch {
    return null;
  }
}

export interface ResolveResult {
  target: string;
  status: ResolutionStatus;
  reason?: string;
}

/**
 * Resolves an import module specifier against repository files.
 * Correctly handles relative imports, path aliases (@/*), external dependencies,
 * barrel index resolution, and file extensions.
 */
export function resolveImportSpecifier(
  sourceRelPath: string,
  rawSpecifier: string,
  allRepoFiles: Set<string>, // Set of all normalized relative paths existing in repository
  tsConfigPaths: TsConfigPaths | null
): ResolveResult {
  const spec = rawSpecifier.trim();

  // 1. Relative imports (./ or ../)
  if (spec.startsWith("./") || spec.startsWith("../")) {
    const sourceDir = path.dirname(sourceRelPath);
    const targetBase = normalizePath(path.normalize(path.join(sourceDir, spec)));

    // Direct check or with extensions
    for (const ext of EXTENSIONS_TO_TRY) {
      const candidate = normalizePath(targetBase + ext);
      if (allRepoFiles.has(candidate)) {
        return { target: candidate, status: "resolved" };
      }
    }

    // Index file check
    for (const indexFile of INDEX_FILES_TO_TRY) {
      const candidate = normalizePath(targetBase + indexFile);
      if (allRepoFiles.has(candidate)) {
        return { target: candidate, status: "resolved" };
      }
    }

    return {
      target: spec,
      status: "unresolved",
      reason: `Relative file not found: target '${spec}' does not resolve to an existing file in repository`,
    };
  }

  // 2. Path Aliases (e.g. "@/..." from tsconfig)
  if (tsConfigPaths && tsConfigPaths.aliases.length > 0) {
    for (const alias of tsConfigPaths.aliases) {
      if (spec.startsWith(alias.prefix)) {
        const subPath = spec.slice(alias.prefix.length);

        for (const targetPattern of alias.targets) {
          const candidateBase = normalizePath(path.normalize(path.join(tsConfigPaths.baseUrl, targetPattern, subPath)));

          for (const ext of EXTENSIONS_TO_TRY) {
            const candidate = normalizePath(candidateBase + ext);
            if (allRepoFiles.has(candidate)) {
              return { target: candidate, status: "resolved" };
            }
          }

          for (const indexFile of INDEX_FILES_TO_TRY) {
            const candidate = normalizePath(candidateBase + indexFile);
            if (allRepoFiles.has(candidate)) {
              return { target: candidate, status: "resolved" };
            }
          }
        }

        return {
          target: spec,
          status: "unresolved",
          reason: `Unresolved path alias: '${spec}' mapped under alias prefix '${alias.prefix}' but target file was not found`,
        };
      }
    }
  }

  // 3. Node built-in modules or external package dependencies
  return {
    target: spec,
    status: "external",
  };
}
