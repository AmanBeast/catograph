import React from "react";

/**
 * Illustrations for Cartograph Landing Page.
 * Strictly adheres to Phase 13 specifications:
 * - Drawn, not captured (clean vector SVGs).
 * - Unlabelled (no directory or fake file names).
 * - Colors taken directly from canvas tokens and convention roles.
 * - Static (no movement or animation).
 * - Scales cleanly to phone width.
 */

// Convention Role Color Tokens
const C_ROUTE = "#06b6d4"; // Cyan
const C_MIDDLEWARE = "#8b5cf6"; // Purple
const C_COMPONENT = "#f59e0b"; // Amber
const C_HOOK = "#ec4899"; // Pink
const C_UTIL = "#6366f1"; // Indigo
const C_MODEL = "#3b82f6"; // Blue
const C_INCOMING = "var(--incoming)"; // Green
const C_OUTGOING = "var(--outgoing)"; // Amber

/**
 * 1. Hero Graph Illustration
 * Architectural canvas map with folder boundary and connected modules.
 */
export function HeroGraphIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-xs select-none transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 540 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[var(--border)]"
      >
        {/* Background Grid Dots */}
        <pattern id="hero-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.4" />
        </pattern>
        <rect width="540" height="300" fill="url(#hero-grid)" />

        {/* Folder Boundary Container */}
        <rect
          x="190"
          y="20"
          width="330"
          height="260"
          rx="6"
          fill="var(--bg-subtle)"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Folder Header Bar */}
        <rect x="200" y="30" width="80" height="8" rx="2" fill="var(--text-muted)" opacity="0.4" />

        {/* Directed Dependency Edges */}
        {/* Route -> Controller */}
        <path d="M120 70 C160 70, 190 85, 230 85" stroke="currentColor" strokeWidth="1.5" />
        {/* Route -> Middleware */}
        <path d="M120 70 C150 70, 170 145, 230 145" stroke="currentColor" strokeWidth="1.5" />
        {/* Middleware -> Service */}
        <path d="M300 145 C330 145, 340 115, 370 115" stroke="currentColor" strokeWidth="1.5" />
        {/* Controller -> Service */}
        <path d="M300 85 C330 85, 340 115, 370 115" stroke="currentColor" strokeWidth="1.5" />
        {/* Service -> Model */}
        <path d="M440 115 C460 115, 470 155, 470 185" stroke="currentColor" strokeWidth="1.5" />
        {/* Hook -> Component */}
        <path d="M120 220 C170 220, 190 205, 240 205" stroke="currentColor" strokeWidth="1.5" />
        {/* Component -> Util */}
        <path d="M310 205 C340 205, 350 235, 380 235" stroke="currentColor" strokeWidth="1.5" />
        {/* Service -> Util */}
        <path d="M405 135 L405 215" stroke="currentColor" strokeWidth="1.5" />

        {/* Node 1: Route Entry Point (Cyan) */}
        <g transform="translate(50, 50)">
          <rect width="70" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_ROUTE} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 2: Hook (Pink) */}
        <g transform="translate(50, 200)">
          <rect width="70" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_HOOK} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 3: Controller / Handler (Cyan) */}
        <g transform="translate(230, 65)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_ROUTE} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 4: Middleware (Purple) */}
        <g transform="translate(230, 125)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_MIDDLEWARE} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 5: UI Component (Amber) */}
        <g transform="translate(240, 185)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_COMPONENT} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 6: Domain Service (Indigo) */}
        <g transform="translate(370, 95)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_UTIL} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 7: Utility Helper (Indigo) */}
        <g transform="translate(380, 215)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_UTIL} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Node 8: Data Model (Blue) */}
        <g transform="translate(435, 185)">
          <rect width="70" height="38" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill={C_MODEL} />
          <rect x="28" y="15" width="28" height="7" rx="1.5" fill="var(--text-muted)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 2. Section 1 Illustration: AST Parsing & Edge Resolution
 * Depicts AST import resolution between internal files and external libraries.
 */
export function ParsingGraphIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-xs select-none transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 440 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[var(--border)]"
      >
        {/* Background Grid */}
        <pattern id="parse-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.3" />
        </pattern>
        <rect width="440" height="240" fill="url(#parse-grid)" />

        {/* Resolved Edges */}
        <path d="M90 70 L170 70" stroke="currentColor" strokeWidth="1.5" />
        <path d="M90 70 C120 70, 140 140, 170 140" stroke="currentColor" strokeWidth="1.5" />
        <path d="M240 70 L320 70" stroke="currentColor" strokeWidth="1.5" />
        <path d="M240 140 C280 140, 280 170, 320 170" stroke="currentColor" strokeWidth="1.5" />
        <path d="M240 70 L320 170" stroke="currentColor" strokeWidth="1.5" />

        {/* Unresolved External Edge (dashed line to external boundary) */}
        <path d="M90 170 L170 170" stroke="var(--outgoing)" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Nodes */}
        {/* Source File A */}
        <g transform="translate(30, 50)">
          <rect width="60" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_ROUTE} />
          <rect x="25" y="16" width="22" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Source File B */}
        <g transform="translate(30, 150)">
          <rect width="60" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_MIDDLEWARE} />
          <rect x="25" y="16" width="22" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Target Resolved 1 */}
        <g transform="translate(170, 50)">
          <rect width="70" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_UTIL} />
          <rect x="26" y="16" width="30" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Target Resolved 2 */}
        <g transform="translate(170, 120)">
          <rect width="70" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_COMPONENT} />
          <rect x="26" y="16" width="30" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* External Unresolved Module (amber badge) */}
        <g transform="translate(170, 180)">
          <rect
            width="70"
            height="32"
            rx="4"
            fill="var(--bg-subtle)"
            stroke="var(--outgoing)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <circle cx="14" cy="16" r="3" fill="var(--outgoing)" />
          <rect x="24" y="13" width="32" height="6" rx="1" fill="var(--outgoing)" opacity="0.5" />
        </g>

        {/* Target Leaf 1 */}
        <g transform="translate(320, 50)">
          <rect width="60" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_MODEL} />
          <rect x="25" y="16" width="22" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Target Leaf 2 */}
        <g transform="translate(320, 150)">
          <rect width="60" height="38" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="4" fill={C_UTIL} />
          <rect x="25" y="16" width="22" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 3. Section 2 Illustration: Blast Radius & Dependency Chains
 * Concentric BFS walk showing upstream impact and downstream chains.
 */
export function BlastRadiusIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-xs select-none transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 440 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[var(--border)]"
      >
        {/* Concentric Depth Circles around Inspected Module */}
        <circle cx="220" cy="120" r="95" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        <circle cx="220" cy="120" r="55" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />

        {/* Traversed Edges */}
        {/* Upstream blast radius (Incoming green) */}
        <path d="M220 120 L150 70" stroke={C_INCOMING} strokeWidth="1.5" />
        <path d="M220 120 L130 145" stroke={C_INCOMING} strokeWidth="1.5" />
        <path d="M150 70 L70 50" stroke={C_INCOMING} strokeWidth="1.5" strokeDasharray="2 2" />

        {/* Downstream chain (Outgoing amber) */}
        <path d="M220 120 L290 85" stroke={C_OUTGOING} strokeWidth="1.5" />
        <path d="M220 120 L310 160" stroke={C_OUTGOING} strokeWidth="1.5" />
        <path d="M310 160 L380 175" stroke={C_OUTGOING} strokeWidth="1.5" strokeDasharray="2 2" />

        {/* Level 2 Upstream Node */}
        <g transform="translate(45, 30)">
          <rect width="50" height="32" rx="4" fill="var(--bg-canvas)" stroke={C_INCOMING} strokeWidth="1.5" />
          <circle cx="12" cy="16" r="3.5" fill={C_INCOMING} />
          <rect x="22" y="13" width="18" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>

        {/* Level 1 Upstream Node A */}
        <g transform="translate(125, 50)">
          <rect width="55" height="34" rx="4" fill="var(--bg-canvas)" stroke={C_INCOMING} strokeWidth="1.5" />
          <circle cx="13" cy="17" r="3.5" fill={C_INCOMING} />
          <rect x="24" y="14" width="20" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>

        {/* Level 1 Upstream Node B */}
        <g transform="translate(105, 130)">
          <rect width="55" height="34" rx="4" fill="var(--bg-canvas)" stroke={C_INCOMING} strokeWidth="1.5" />
          <circle cx="13" cy="17" r="3.5" fill={C_INCOMING} />
          <rect x="24" y="14" width="20" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>

        {/* Selected Center Focus Node (Inspected Module) */}
        <g transform="translate(185, 100)">
          <rect width="70" height="40" rx="5" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="15" cy="20" r="4.5" fill="var(--accent)" />
          <rect x="27" y="17" width="30" height="6" rx="1.5" fill="var(--text-primary)" />
        </g>

        {/* Level 1 Downstream Node A */}
        <g transform="translate(265, 65)">
          <rect width="55" height="34" rx="4" fill="var(--bg-canvas)" stroke={C_OUTGOING} strokeWidth="1.5" />
          <circle cx="13" cy="17" r="3.5" fill={C_OUTGOING} />
          <rect x="24" y="14" width="20" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>

        {/* Level 1 Downstream Node B */}
        <g transform="translate(285, 145)">
          <rect width="55" height="34" rx="4" fill="var(--bg-canvas)" stroke={C_OUTGOING} strokeWidth="1.5" />
          <circle cx="13" cy="17" r="3.5" fill={C_OUTGOING} />
          <rect x="24" y="14" width="20" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>

        {/* Level 2 Downstream Node */}
        <g transform="translate(355, 160)">
          <rect width="50" height="32" rx="4" fill="var(--bg-canvas)" stroke={C_OUTGOING} strokeWidth="1.5" />
          <circle cx="12" cy="16" r="3.5" fill={C_OUTGOING} />
          <rect x="22" y="13" width="18" height="5" rx="1" fill="var(--text-muted)" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 4. Section 3 Illustration: Framework Architecture & Conventions
 * Multi-layer architectural flow: routes -> controllers -> services -> models.
 */
export function FrameworkAnatomyIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-xs select-none transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 440 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[var(--border)]"
      >
        {/* Layer Bounding Rails */}
        <line x1="20" y1="65" x2="420" y2="65" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1="145" x2="420" y2="145" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

        {/* Connecting Edges */}
        <path d="M100 45 L100 95" stroke="currentColor" strokeWidth="1.5" />
        <path d="M100 45 C100 70, 220 70, 220 95" stroke="currentColor" strokeWidth="1.5" />
        <path d="M220 45 L220 95" stroke="currentColor" strokeWidth="1.5" />
        <path d="M340 45 L340 95" stroke="currentColor" strokeWidth="1.5" />

        <path d="M100 130 C100 155, 160 155, 160 175" stroke="currentColor" strokeWidth="1.5" />
        <path d="M220 130 C220 155, 160 155, 160 175" stroke="currentColor" strokeWidth="1.5" />
        <path d="M220 130 C220 155, 280 155, 280 175" stroke="currentColor" strokeWidth="1.5" />
        <path d="M340 130 C340 155, 280 155, 280 175" stroke="currentColor" strokeWidth="1.5" />

        {/* Top Tier: Route Endpoints (Cyan) */}
        <g transform="translate(65, 20)">
          <rect width="70" height="32" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="16" r="3.5" fill={C_ROUTE} />
          <rect x="25" y="13" width="30" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        <g transform="translate(185, 20)">
          <rect width="70" height="32" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="16" r="3.5" fill={C_ROUTE} />
          <rect x="25" y="13" width="30" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        <g transform="translate(305, 20)">
          <rect width="70" height="32" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="16" r="3.5" fill={C_ROUTE} />
          <rect x="25" y="13" width="30" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Mid Tier: Middlewares & Business Services (Purple & Indigo) */}
        <g transform="translate(65, 95)">
          <rect width="70" height="35" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="3.5" fill={C_MIDDLEWARE} />
          <rect x="25" y="14" width="32" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        <g transform="translate(185, 95)">
          <rect width="70" height="35" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="3.5" fill={C_UTIL} />
          <rect x="25" y="14" width="32" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        <g transform="translate(305, 95)">
          <rect width="70" height="35" rx="4" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="3.5" fill={C_COMPONENT} />
          <rect x="25" y="14" width="32" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Bottom Tier: Repositories & Models (Blue) */}
        <g transform="translate(125, 175)">
          <rect width="75" height="35" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="3.5" fill={C_MODEL} />
          <rect x="25" y="14" width="36" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>

        <g transform="translate(245, 175)">
          <rect width="75" height="35" rx="4" fill="var(--bg-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="3.5" fill={C_MODEL} />
          <rect x="25" y="14" width="36" height="6" rx="1" fill="var(--text-muted)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
