import { type SourceFile, SyntaxKind } from "ts-morph";

/**
 * Extracts exported names from a CommonJS module.
 * Inspects assignments to `module.exports`, `exports`, and property assignments.
 * Also captures standard ES exports if present.
 */
export function extractCommonJsExports(sourceFile: SourceFile): string[] {
  const exported = new Set<string>();

  // 1. Inspect binary expressions for assignments to module.exports or exports
  const binaryExprs = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (const binary of binaryExprs) {
    if (binary.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) continue;

    const left = binary.getLeft();
    const leftText = left.getText();

    // Pattern: exports.<name> = ...
    if (leftText.startsWith("exports.") && leftText.length > 8) {
      const prop = leftText.slice(8).trim();
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
        exported.add(prop);
      }
    }
    // Pattern: module.exports.<name> = ...
    else if (leftText.startsWith("module.exports.") && leftText.length > 15) {
      const prop = leftText.slice(15).trim();
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
        exported.add(prop);
      }
    }
    // Pattern: module.exports = ...
    else if (leftText === "module.exports" || leftText === "exports") {
      const right = binary.getRight();
      if (right.isKind(SyntaxKind.ObjectLiteralExpression)) {
        for (const prop of right.getProperties()) {
          if ("getName" in prop && typeof (prop as { getName?: () => string }).getName === "function") {
            const name = (prop as { getName: () => string }).getName();
            if (name) exported.add(name);
          }
        }
      } else if (right.isKind(SyntaxKind.FunctionExpression)) {
        const name = right.getName();
        exported.add(name || "default");
      } else if (right.isKind(SyntaxKind.ClassExpression)) {
        const name = right.getName();
        exported.add(name || "default");
      } else if (right.isKind(SyntaxKind.Identifier)) {
        exported.add(right.getText());
      } else {
        exported.add("default");
      }
    }
  }

  // 2. Also check if file uses ES exports
  for (const name of sourceFile.getExportedDeclarations().keys()) {
    exported.add(name);
  }

  return Array.from(exported).sort();
}
