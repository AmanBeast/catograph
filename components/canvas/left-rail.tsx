import React from "react";
import type { FileCategory } from "@/lib/canvas/categories";

interface LeftRailProps {
  categories: FileCategory[];
  totalFiles: number;
}

export function LeftRail({ categories, totalFiles }: LeftRailProps) {
  return (
    <aside className="w-56 lg:w-64 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] select-none">
      {/* Column Header */}
      <div className="h-8 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <span className="w-1.5 h-1.5 rounded-xs bg-[var(--accent)]" />
          <span>CATEGORIES</span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.2 rounded bg-[var(--bg-surface)]">
          {categories.length}
        </span>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between px-2 py-1.5 rounded border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors cursor-default"
            title={`${category.name}: ${category.count} files`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Colour swatch */}
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: category.color }}
              />
              {/* Category Name */}
              <span className="text-[11px] font-mono text-[var(--text-primary)] truncate font-medium">
                {category.name}
              </span>
            </div>

            {/* File Count */}
            <span className="text-[10px] font-mono text-[var(--text-secondary)] tabular-nums shrink-0 ml-2">
              {category.count}
            </span>
          </div>
        ))}
      </div>

      {/* Rail Footer Telemetry */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-subtle)] p-2.5 text-[10px] text-[var(--text-secondary)] space-y-1">
        <div className="flex justify-between items-center text-[var(--text-muted)]">
          <span>PARSED FILES</span>
          <span className="font-mono text-[var(--text-primary)]">{totalFiles}</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] leading-tight pt-1">
          Static file classification derived from parser contract.
        </div>
      </div>
    </aside>
  );
}
