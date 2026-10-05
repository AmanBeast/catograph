"use client";

import React from "react";
import { useTheme, type ThemePreference } from "./theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: ThemePreference; label: string }[] = [
    { value: "system", label: "Sys" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className="inline-flex items-center rounded border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5 text-xs font-mono"
    >
      {options.map((opt) => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`px-2 py-0.5 rounded transition-none text-xs ${
              isActive
                ? "bg-[var(--accent)] text-white font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
