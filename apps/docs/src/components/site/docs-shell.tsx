/**
 * The frame of the documentation page: a hero, an "On this page" rail, and
 * the pieces every section is built from.
 *
 * One page, deliberately. It was two for a few days — a beginner guide and an
 * install reference — and the two repeated each other's setup steps with
 * small differences, which is the one thing setup instructions must not do.
 * The component pages are the rest of the manual.
 *
 * No hooks, so it renders on the server: the rail is plain anchors, and the
 * only client code on the page is the copy buttons and the switches.
 */

import { Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocEntry {
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function DocsHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl section-major px-5 sm:px-8">
        <p className="eyebrow eyebrow-rule text-graphite" data-reveal>
          {eyebrow}
        </p>
        <h1 className="display-lg mt-4 max-w-3xl text-balance" data-reveal>
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-graphite" data-reveal>
          {lede}
        </p>
        {children ? (
          <div className="mt-8 max-w-2xl" data-reveal>
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function DocsShell({
  toc,
  children,
}: {
  toc: readonly TocEntry[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-10 py-10 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-14 lg:py-14">
        {/* Hidden on a phone, where it would sit above the content it indexes
            and push it a screen down. */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <nav aria-label="On this page">
            <p className="axis-label">On this page</p>
            <ul className="mt-3 space-y-0.5 border-l border-rule">
              {toc.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-3 text-[0.8125rem] text-graphite transition-colors duration-200 hover:border-rule-strong hover:text-ink"
                  >
                    {entry.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections, steps, callouts
// ---------------------------------------------------------------------------

export function DocSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-rule py-10 first:border-t-0 first:pt-0"
    >
      <h2 className="display-sm text-balance">{title}</h2>
      {intro ? (
        <div className="mt-4 max-w-2xl space-y-3 text-pretty leading-relaxed text-graphite">
          {intro}
        </div>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

/**
 * One numbered instruction: what to do, the command or file, and what you
 * should see afterwards.
 *
 * The "you should see" line is the part a beginner needs most and a reference
 * page never has. Without it, a step that silently did nothing and a step
 * that worked look the same until three steps later.
 */
export function DocStep({
  n,
  title,
  children,
  check,
  id,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
  check?: React.ReactNode;
  /** An anchor, so another part of the page can link to this exact step. */
  id?: string;
}) {
  return (
    <li id={id} className="relative grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-x-4">
      <span
        aria-hidden="true"
        className="numeric flex size-8 items-center justify-center rounded-full border border-rule-strong bg-paper text-xs font-semibold text-brand-deep"
      >
        {n}
      </span>
      <div className="min-w-0 pb-9">
        <h3 className="pt-1 text-base font-semibold tracking-tight text-ink">{title}</h3>
        {children ? (
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-graphite">{children}</div>
        ) : null}
        {check ? (
          <p className="mt-3 flex gap-2 text-sm leading-relaxed text-graphite">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-deep" />
            <span>
              <span className="font-medium text-ink">You should see: </span>
              {check}
            </span>
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** A numbered run of `DocStep`s. An `<ol>`, so the count is announced. */
export function DocSteps({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ol className={cn("relative", className)}>{children}</ol>;
}

export function Callout({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-rule bg-paper-sunk/60 px-4 py-3.5 text-sm leading-relaxed text-graphite",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-deep" />
      <div className="min-w-0">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}

/** Inline code in prose. The size every page on the site already uses. */
export function C({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.8125rem] text-ink">{children}</code>;
}
