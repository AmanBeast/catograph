import React from "react";
import { LandingHeader } from "./landing-header";
import { HeroForm } from "./hero-form";
import {
  HeroGraphIllustration,
  ParsingGraphIllustration,
  BlastRadiusIllustration,
  FrameworkAnatomyIllustration,
} from "./illustrations";

interface LandingPageProps {
  isSignedIn?: boolean;
}

export function LandingPage({ isSignedIn = false }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-muted)] selection:text-[var(--text-primary)] transition-colors">
      {/* Sticky Navigation Header */}
      <LandingHeader isSignedIn={isSignedIn} />

      {/* Main Single-Column Container (capped around 1140px, centred, 24px gutter) */}
      <main className="max-w-[1140px] mx-auto px-6">
        {/* ==================================================================== */}
        {/* HERO SECTION                                                         */}
        {/* ==================================================================== */}
        <section className="pt-16 pb-20 lg:pt-28 lg:pb-32 flex flex-col items-start gap-8">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-mono text-[var(--text-secondary)] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--incoming)] inline-block" />
            <span>ARCHITECTURAL DEPENDENCY MAPPER</span>
          </div>

          {/* Headline (leading near 1.1, negative letter-spacing) */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.08] text-[var(--text-primary)] max-w-4xl">
            Understand any TypeScript repository from its real imports.
          </h1>

          {/* Subhead (capped by measure: ~64 characters) */}
          <p className="text-base sm:text-lg text-[var(--text-secondary)] font-mono leading-relaxed max-w-[64ch]">
            Cartograph statically parses every import, maps the architecture into an interactive canvas, and calculates blast radius. The AI explains what the parser found; it never decides what is there.
          </p>

          {/* The Hero takes a repository URL straight into the flow */}
          <div className="w-full pt-2">
            <HeroForm isSignedIn={isSignedIn} />
          </div>

          {/* Hero Inline SVG Illustration */}
          <div className="w-full pt-6">
            <HeroGraphIllustration />
          </div>
        </section>

        {/* Hairline Separator */}
        <hr className="border-0 border-t border-[var(--border)] m-0" />

        {/* ==================================================================== */}
        {/* SECTION 1: WHAT THE THING DOES                                       */}
        {/* ==================================================================== */}
        <section className="py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent)] font-medium">
              01 &middot; Static AST Analysis
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] leading-[1.12]">
              Every edge comes from a resolved import. Nothing is guessed.
            </h2>
            {/* Capped measure: ~46 characters beside figure */}
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              We run full TypeScript AST resolution across every source file. Internal imports become directed edges. Unresolved imports are counted with their exact error reason, never guessed.
            </p>
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              Directories collapse into boundary nodes so monorepos stay legible without hiding cross-boundary leaks.
            </p>
          </div>

          <div className="lg:col-span-6">
            <ParsingGraphIllustration />
          </div>
        </section>

        {/* Hairline Separator */}
        <hr className="border-0 border-t border-[var(--border)] m-0" />

        {/* ==================================================================== */}
        {/* SECTION 2: HOW IT WORKS                                              */}
        {/* ==================================================================== */}
        <section className="py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <BlastRadiusIllustration />
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent)] font-medium">
              02 &middot; Graph Calculations
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] leading-[1.12]">
              Blast radius and dependency chains as pure functions.
            </h2>
            {/* Capped measure: ~46 characters beside figure */}
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              Transitive walks calculate upstream dependents before you make a change. Cycle detection runs over an explicit heap stack, preventing call-stack recursion limits.
            </p>
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              Explanations operate only on the visible neighborhood, and every generated response is deterministically evaluated for invented paths.
            </p>
          </div>
        </section>

        {/* Hairline Separator */}
        <hr className="border-0 border-t border-[var(--border)] m-0" />

        {/* ==================================================================== */}
        {/* SECTION 3: WHICH FRAMEWORKS IT UNDERSTANDS                           */}
        {/* ==================================================================== */}
        <section className="py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent)] font-medium">
              03 &middot; Framework Adapters
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] leading-[1.12]">
              Convention-aware without framework coupling.
            </h2>
            {/* Capped measure: ~46 characters beside figure */}
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              Specialized adapters detect Next.js App Router and Pages Router endpoints, Express.js HTTP methods and router mounts, and CommonJS module patterns.
            </p>
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed max-w-[46ch]">
              Files are classified by architectural role: services, repositories, models, utilities, configs, components, and hooks.
            </p>
          </div>

          <div className="lg:col-span-6">
            <FrameworkAnatomyIllustration />
          </div>
        </section>

        {/* Hairline Separator */}
        <hr className="border-0 border-t border-[var(--border)] m-0" />

        {/* ==================================================================== */}
        {/* SECTION 4: WHAT IT DELIBERATELY DOESN'T DO (At the very end)         */}
        {/* ==================================================================== */}
        <section className="py-24 lg:py-32 space-y-12">
          <div className="space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
              04 &middot; Intentional Omissions
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] leading-[1.12]">
              What Cartograph deliberately does not do.
            </h2>
            {/* Capped measure: ~64 characters across full width */}
            <p className="text-base text-[var(--text-secondary)] font-mono leading-relaxed max-w-[64ch]">
              Most developer tools try to review your code. We explain it. Here is what we refuse to build:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
            {/* Item 1 */}
            <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-6 space-y-3 transition-colors">
              <div className="font-mono text-xs font-semibold uppercase text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--text-muted)]">✕</span>
                <span>No code grading or severity scores</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                We will never assign an arbitrary grade, letter score, or &ldquo;code smell&rdquo; rating. Quality judgments are subjective; import edges are facts.
              </p>
            </div>

            {/* Item 2 */}
            <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-6 space-y-3 transition-colors">
              <div className="font-mono text-xs font-semibold uppercase text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--text-muted)]">✕</span>
                <span>No hallucinated connections</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                If an edge appears, it corresponds to a real file path resolved on disk. We never prompt an LLM to guess whether two files look related.
              </p>
            </div>

            {/* Item 3 */}
            <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-6 space-y-3 transition-colors">
              <div className="font-mono text-xs font-semibold uppercase text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--text-muted)]">✕</span>
                <span>No social proof or marketing fluff</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                No testimonial carousels, customer logo walls, or manufactured metrics. Everything described on this page is verifiable on your own repository.
              </p>
            </div>

            {/* Item 4 */}
            <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-6 space-y-3 transition-colors">
              <div className="font-mono text-xs font-semibold uppercase text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--text-muted)]">✕</span>
                <span>No unconstrained AI</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                Explanations are strictly constrained to the parser&rsquo;s output. If an explanation references a path that was not in the shown graph, our live evaluator flags it immediately.
              </p>
            </div>
          </div>
        </section>

        {/* Quiet Footer */}
        <footer className="py-12 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-[var(--text-muted)] gap-4 select-none">
          <div>
            Cartograph &middot; Architectural dependency mapper for TypeScript.
          </div>
          <div className="flex items-center gap-3">
            <span>AST Parsed</span>
            <span>&middot;</span>
            <span>LangSmith Traced</span>
            <span>&middot;</span>
            <span>RLS Protected</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
