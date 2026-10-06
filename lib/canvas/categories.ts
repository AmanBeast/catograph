import type { ParsedFile, FileRole } from "@/lib/parser/types";
import {
  deriveFrameworkRailCategories,
  normalizeFrameworkName,
  classifyFileRoleByPath,
  type RailCategory,
  type FrameworkName,
} from "@/lib/adapters/taxonomy";

export interface FileCategory {
  id: string; // Category key (role id or extension)
  name: string; // Display label (e.g. "Controllers", "Page routes", ".ts")
  extension?: string;
  color: string;
  count: number;
  order?: number;
}

/**
 * Derives file categories for the left rail.
 * Reshapes categories according to the detected framework (Next.js, NestJS, React),
 * or falls back to concrete extension categories when generic.
 */
export function deriveFileCategories(
  files: ParsedFile[],
  framework?: string | null,
  fileRoles?: FileRole[]
): FileCategory[] {
  const normFramework: FrameworkName = normalizeFrameworkName(framework);

  const fileRolesMap = fileRoles && fileRoles.length > 0
    ? new Map<string, string>(fileRoles.map((fr) => [fr.filePath, fr.role]))
    : undefined;

  const railCategories: RailCategory[] = deriveFrameworkRailCategories(
    normFramework,
    files,
    fileRolesMap
  );

  return railCategories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    count: c.count,
    order: c.order,
  }));
}

/**
 * Checks whether a given file matches an active category filter.
 */
export function isFileMatchingCategory(
  file: ParsedFile,
  categoryId: string,
  framework?: string | null,
  fileRolesMap?: Map<string, string>
): boolean {
  const normFramework = normalizeFrameworkName(framework);

  // If generic, match extension
  if (normFramework === "generic") {
    return (file.extension?.toLowerCase() || "other") === categoryId.toLowerCase();
  }

  // If framework, match role
  const role = fileRolesMap?.get(file.path) || classifyFileRoleByPath(normFramework, file.path);
  if (role === categoryId) return true;

  // Fallback to extension match
  return (file.extension?.toLowerCase() || "other") === categoryId.toLowerCase();
}
