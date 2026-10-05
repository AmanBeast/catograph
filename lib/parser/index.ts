import path from "node:path";
import { Project, SyntaxKind, type StringLiteral } from "ts-morph";
import { walkRepository, normalizePath } from "./walk.ts";
import { loadTsConfigPaths, resolveImportSpecifier } from "./resolver.ts";
import { computeFanInOut } from "./graph.ts";
import { fallbackAdapter } from "./adapters/fallback.ts";
import type { FrameworkAdapter } from "./adapters/types.ts";
import type {
  ParseResult,
  ParsedFile,
  SkippedFile,
  Edge,
  CoverageReport,
  FailureDetail,
  ImportKind,
} from "./types.ts";

export interface ParseOptions {
  adapter?: FrameworkAdapter;
  includeNodeModules?: boolean;
}

/**
 * Parses a repository on disk into files, edges, and coverage metrics.
 * Runs completely locally with no network calls and zero UI/database dependencies.
 */
export async function parseRepository(
  repoPath: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const absoluteRepoRoot = path.resolve(repoPath);

  // 1. Walk repository on disk
  const { codeFiles, skippedFiles } = walkRepository(absoluteRepoRoot, {
    includeNodeModules: options.includeNodeModules,
  });

  // Track all files existing in repository (code and non-code assets)
  const allRepoFiles = new Set<string>();
  for (const c of codeFiles) {
    allRepoFiles.add(c.relativePath);
  }
  for (const s of skippedFiles) {
    allRepoFiles.add(s.path);
  }

  // 2. Load TypeScript path aliases if tsconfig.json is present
  const tsConfigPaths = loadTsConfigPaths(absoluteRepoRoot);

  // 3. Initialize TypeScript AST parser
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
    },
  });

  const parsedFiles: ParsedFile[] = [];
  const edges: Edge[] = [];
  const failures: FailureDetail[] = [];

  let reExportsFound = 0;
  let reExportsResolved = 0;
  let reExportsUnresolved = 0;

  for (const codeFile of codeFiles) {
    parsedFiles.push({
      id: codeFile.relativePath,
      path: codeFile.relativePath,
      folder: codeFile.folder,
      name: codeFile.name,
      extension: codeFile.extension,
      linesCount: codeFile.linesCount,
      sizeBytes: codeFile.sizeBytes,
      contentHash: codeFile.contentHash,
      fanIn: 0,
      fanOut: 0,
    });

    // Parse AST
    let sourceFile;
    try {
      sourceFile = project.createSourceFile(codeFile.relativePath, codeFile.content, {
        overwrite: true,
      });
    } catch {
      continue;
    }

    const rawImports: Array<{ specifier: string; kind: ImportKind }> = [];

    // Plain imports: import ... from '...' or import '...'
    const importDecls = sourceFile.getImportDeclarations();
    for (const decl of importDecls) {
      const spec = decl.getModuleSpecifierValue();
      if (spec) {
        rawImports.push({ specifier: spec, kind: "import" });
      }
    }

    // Re-exports: export ... from '...' or export * from '...'
    const exportDecls = sourceFile.getExportDeclarations();
    for (const decl of exportDecls) {
      if (decl.hasModuleSpecifier()) {
        const spec = decl.getModuleSpecifierValue();
        if (spec) {
          rawImports.push({ specifier: spec, kind: "re_export" });
        }
      }
    }

    // Dynamic imports: import('...') with string literal
    const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExprs) {
      if (callExpr.getExpression().getKind() === SyntaxKind.ImportKeyword) {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          if (firstArg.getKind() === SyntaxKind.StringLiteral) {
            const spec = (firstArg as StringLiteral).getLiteralText();
            rawImports.push({ specifier: spec, kind: "dynamic" });
          } else {
            // Non-literal dynamic import
            const rawText = firstArg.getText();
            const failure = {
              sourceFile: codeFile.relativePath,
              rawSpecifier: rawText,
              kind: "dynamic" as const,
              reason: "Dynamic import with non-literal expression cannot be resolved statically",
            };
            failures.push(failure);
            edges.push({
              source: codeFile.relativePath,
              target: rawText,
              rawSpecifier: rawText,
              kind: "dynamic",
              status: "unresolved",
              unresolvedReason: failure.reason,
            });
          }
        }
      }
    }

    // Resolve each discovered specifier
    for (const item of rawImports) {
      if (item.kind === "re_export") {
        reExportsFound++;
      }

      const resolved = resolveImportSpecifier(
        codeFile.relativePath,
        item.specifier,
        allRepoFiles,
        tsConfigPaths
      );

      const edge: Edge = {
        source: codeFile.relativePath,
        target: resolved.target,
        rawSpecifier: item.specifier,
        kind: item.kind,
        status: resolved.status,
        unresolvedReason: resolved.reason,
      };

      edges.push(edge);

      if (resolved.status === "unresolved") {
        failures.push({
          sourceFile: codeFile.relativePath,
          rawSpecifier: item.specifier,
          kind: item.kind,
          reason: resolved.reason || "Module not found",
        });

        if (item.kind === "re_export") {
          reExportsUnresolved++;
        }
      } else if (item.kind === "re_export") {
        reExportsResolved++;
      }
    }
  }

  // 4. Compute fan-in and fan-out
  computeFanInOut(parsedFiles, edges);

  // 5. Build skip reason summary
  const skipSummary: Record<string, number> = {};
  for (const s of skippedFiles) {
    skipSummary[s.reason] = (skipSummary[s.reason] || 0) + 1;
  }

  // 6. Distinct folders
  const folderSet = new Set<string>();
  for (const f of parsedFiles) {
    folderSet.add(f.folder);
  }
  const folders = Array.from(folderSet).sort();

  // 7. Compile Coverage Report
  const internalResolved = edges.filter((e) => e.status === "resolved").length;
  const externalCount = edges.filter((e) => e.status === "external").length;
  const unresolvedCount = edges.filter((e) => e.status === "unresolved").length;

  const coverage: CoverageReport = {
    totalFilesFound: parsedFiles.length + skippedFiles.length,
    filesParsedCount: parsedFiles.length,
    filesSkippedCount: skippedFiles.length,
    distinctFoldersCount: folders.length,
    totalImportsSeen: edges.length,
    internalResolvedEdges: internalResolved,
    externalImports: externalCount,
    unresolvedImports: unresolvedCount,
    reExportsFound,
    reExportsResolved,
    reExportsUnresolved,
    failures,
    skipSummary,
  };

  return {
    repoPath: absoluteRepoRoot,
    files: parsedFiles,
    skippedFiles,
    edges,
    coverage,
    folders,
  };
}

export * from "./types.ts";
export * from "./adapters/types.ts";
export * from "./adapters/fallback.ts";
