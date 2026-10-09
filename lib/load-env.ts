import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads environment variables from .env.local and .env for standalone scripts
 * outside the Next.js runtime.
 */
export function loadEnv(startDir = process.cwd()): Record<string, string> {
  const candidates = [
    path.resolve(startDir, ".env.local"),
    path.resolve(startDir, ".env"),
    path.resolve(startDir, "cartograph", ".env.local"),
    path.resolve(startDir, "cartograph", ".env"),
    path.resolve(__dirname, "..", ".env.local"),
    path.resolve(__dirname, "..", ".env"),
  ];

  const loaded: Record<string, string> = {};

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();

        // Strip matching outer quotes
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }

        // Only set if not already set or if empty
        if (!process.env[key] || process.env[key] === "") {
          process.env[key] = val;
        }
        loaded[key] = val;
      }
    } catch {
      // Continue to next candidate if read fails
    }
  }

  return loaded;
}
