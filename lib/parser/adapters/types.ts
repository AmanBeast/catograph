/**
 * Pluggable framework knowledge adapter interface.
 * All framework-specific classification and routing knowledge lives in adapters,
 * completely decoupled from the core parser.
 */

export interface FrameworkAdapter {
  name: string;
  identifyRole(filePath: string): string | null;
  extractRoutes?(filePath: string): Array<{ method: string; pattern: string; isDynamic: boolean }>;
}
