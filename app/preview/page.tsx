import React from "react";
import previewDataRaw from "@/lib/preview-data.json";
import type { ParseResult } from "@/lib/parser/types";
import { CanvasShell } from "@/components/canvas/canvas-shell";

export const metadata = {
  title: "Canvas Preview — Cartograph",
  description: "Phase 4 canvas preview rendered against scaffolding repository data.",
};

export default function PreviewPage() {
  const data = previewDataRaw as unknown as ParseResult;

  return <CanvasShell data={data} repoName="honojs/hono" />;
}
