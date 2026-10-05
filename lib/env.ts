/**
 * Environment configuration validator.
 * Fails loudly at startup if any required environment variable is missing.
 */

function requireEnv(key: string, alternativeKey?: string): string {
  const value = process.env[key] || (alternativeKey ? process.env[alternativeKey] : undefined);
  if (!value || value.trim() === "") {
    const label = alternativeKey ? `${key} (or ${alternativeKey})` : key;
    throw new Error(
      `[Cartograph Boot Error] Missing required environment variable: "${label}". ` +
        `Application cannot start without valid configuration. Please check your .env.local file.`
    );
  }
  return value.trim();
}

export function validateEnv() {
  return {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    CLERK_SECRET_KEY: requireEnv("CLERK_SECRET_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_KEY: requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    ),
  };
}

export const env = validateEnv();
