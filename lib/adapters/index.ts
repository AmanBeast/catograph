import { nextjsAdapter } from "./nextjs";
import { nestjsAdapter } from "./nestjs";
import { reactAdapter } from "./react";
import { fallbackAdapter } from "./fallback";
import type { FrameworkAdapter } from "./types";
import type { ParsedFile, Edge } from "@/lib/parser/types";

/**
 * Detection order is strictly fixed: first match wins.
 * Next.js -> NestJS -> React -> generic (fallback).
 */
export const REGISTERED_ADAPTERS: FrameworkAdapter[] = [
  nextjsAdapter,
  nestjsAdapter,
  reactAdapter,
  fallbackAdapter,
];

/**
 * Detects the appropriate framework adapter for a repository in fixed priority order.
 * Guaranteed to return an adapter (returns fallbackAdapter if nothing matches).
 */
export function detectFrameworkAdapter(
  repoDir: string,
  files: ParsedFile[],
  edges: Edge[] = []
): FrameworkAdapter {
  for (const adapter of REGISTERED_ADAPTERS) {
    if (adapter.detect(repoDir, files, edges)) {
      return adapter;
    }
  }
  return fallbackAdapter;
}

export * from "./types";
export * from "./taxonomy";
export * from "./nextjs";
export * from "./nestjs";
export * from "./react";
export * from "./fallback";
