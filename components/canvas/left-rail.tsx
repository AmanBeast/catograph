"use client";

import React from "react";
import type { FileCategory } from "@/lib/canvas/categories";

interface LeftRailProps {
  categories: FileCategory[];
  totalFiles: number;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function LeftRail({
  categories,
  totalFiles,
  selectedCategory,
  onSelectCategory,
}: LeftRailProps) {
  return (
    <aside className="w-56 lg:w-64 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] select-none font-mono">
      {/* Column Header */}
      <div className="h-9 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <span className="w-1.5 h-1.5 rounded-xs bg-[var(--accent)]" />
          <span>CATEGORIES</span>
        </div>
        {selectedCategory ? (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] px-1 py-0.5 rounded cursor-pointer transition-colors"
            title="Clear filter"
          >
            ✕ CLEAR
          </button>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.2 rounded bg-[var(--bg-surface)]">
            {categories.length}
          </span>
        )}
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;

          return (
            <div
              key={category.id}
              onClick={() => onSelectCategory(isSelected ? null : category.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded border transition-all cursor-pointer ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)] shadow-xs"
                  : "border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              }`}
              title={`Click to filter by ${category.name} (${category.count} files)`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Colour swatch */}
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                {/* Category Name */}
                <span className="text-[11px] truncate font-medium">
                  {category.name}
                </span>
              </div>

              {/* File Count */}
              <span
                className={`text-[10px] tabular-nums shrink-0 ml-2 ${
                  isSelected ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {category.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rail Footer Telemetry */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-subtle)] p-2.5 text-[10px] text-[var(--text-secondary)] space-y-1">
        <div className="flex justify-between items-center text-[var(--text-muted)]">
          <span>{selectedCategory ? "FILTER ACTIVE" : "PARSED FILES"}</span>
          <span className="font-mono text-[var(--text-primary)] font-semibold">
            {selectedCategory
              ? `.${selectedCategory}`
              : totalFiles}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] leading-tight pt-0.5">
          {selectedCategory
            ? "Dims non-matching files on canvas while preserving map structure."
            : "Click category to highlight files across all folder modules."}
        </div>
      </div>
    </aside>
  );
}
