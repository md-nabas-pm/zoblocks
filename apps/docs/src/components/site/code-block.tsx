"use client";

/**
 * Everything on the site a reader copies: one hook, one button, two blocks.
 *
 * The copy action had been written three times — the install command, the
 * scenario code under a component preview, and the acquire button — and each
 * had drifted: one announced to a screen reader and one did not, one reset
 * after 1.6s and one after 2s, one swallowed a blocked clipboard and one let
 * the rejection escape. Code samples had no copy action at all, so a reader
 * following the install guide selected a twelve-line `vite.config.ts` by hand.
 *
 * The rules, now in one place:
 *
 *   - A blocked clipboard fails quietly. The text is on screen and selectable,
 *     so an error thrown at someone who can simply select it helps nobody.
 *   - "Copied" is announced through a polite live region and then withdrawn.
 *     A permanently rendered "Copied" is a claim about a clipboard that may
 *     have been overwritten since.
 *   - The button's accessible name says *what* it copies. Four "Copy" buttons
 *     on one page are four identical stops to a screen reader.
 */

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCopy(text: string, resetMs = 2000) {
  const [copied, setCopied] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Blocked by permissions, a non-secure origin, or no clipboard at all.
      return;
    }
    setCopied(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), resetMs);
  }, [text, resetMs]);

  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export interface CopyButtonProps {
  text: string;
  /** What is being copied, for the accessible name: "command", "vite.config.ts". */
  what?: string;
  /** Overrides the accessible name while idle. */
  ariaLabel?: string;
  /** Overrides the accessible name once copied. */
  copiedAriaLabel?: string;
  /** Overrides the live-region announcement. */
  announcement?: string;
  /**
   * `ghost` sits inside a panel that already has a border (the install
   * command); `outline` stands on its own in a toolbar.
   */
  variant?: "ghost" | "outline";
  /** Hide the text label below `sm`, leaving the icon. */
  compact?: boolean;
  className?: string;
}

export function CopyButton({
  text,
  what = "code",
  ariaLabel,
  copiedAriaLabel,
  announcement,
  variant = "ghost",
  compact = true,
  className,
}: CopyButtonProps) {
  const { copied, copy } = useCopy(text);
  const capitalised = what.charAt(0).toUpperCase() + what.slice(1);

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={
          copied ? (copiedAriaLabel ?? `${capitalised} copied`) : (ariaLabel ?? `Copy ${what}`)
        }
        className={cn(
          "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5",
          "font-mono text-[0.6875rem] uppercase tracking-wider",
          "transition-colors duration-200",
          variant === "outline" && "border border-panel-rule",
          copied
            ? "bg-trace/15 text-trace"
            : "text-panel-muted hover:bg-panel-fg/8 hover:text-panel-fg",
          className,
        )}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        <span className={compact ? "hidden sm:inline" : undefined}>
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      {/* Announced without moving focus or disturbing the button's label. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? (announcement ?? `${capitalised} copied to clipboard`) : ""}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Code block
// ---------------------------------------------------------------------------

export interface CodeBlockProps {
  code: string;
  /** A filename or a caption, shown in a header bar: `vite.config.ts`. */
  title?: string;
  /** A short language tag shown beside the title: `tsx`, `css`, `json`. */
  language?: string;
  /** Caps the height and scrolls — for full component source. */
  maxHeight?: string;
  /** Smaller type, for dense example lists. */
  size?: "sm" | "md";
  /**
   * What the copy button says it copies, when the title is a caption rather
   * than a filename: `title="Usage"` reads better as "Copy usage example".
   */
  what?: string;
  className?: string;
}

export function CodeBlock({
  code,
  title,
  language,
  maxHeight,
  size = "md",
  what: whatProp,
  className,
}: CodeBlockProps) {
  const what = whatProp ?? title ?? (language ? `${language} code` : "code");

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border border-panel-rule bg-panel",
        className,
      )}
    >
      {title || language ? (
        <div className="flex items-center gap-3 border-b border-panel-rule px-4 py-2 sm:px-5">
          {title ? (
            <span className="min-w-0 truncate font-mono text-[0.6875rem] text-panel-fg/80">
              {title}
            </span>
          ) : null}
          {language ? (
            <span className="font-mono text-[0.625rem] uppercase tracking-wider text-panel-muted">
              {language}
            </span>
          ) : null}
          <span className="flex-1" />
          <CopyButton text={code} what={what} className="-mr-2" />
        </div>
      ) : (
        <div className="absolute right-2.5 top-2.5 z-10 rounded-lg bg-panel/90">
          <CopyButton text={code} what={what} />
        </div>
      )}
      {/* `tabIndex={0}`: a region that scrolls has to be reachable by keyboard
          (axe `scrollable-region-focusable`). */}
      <pre
        tabIndex={0}
        style={maxHeight ? { maxHeight } : undefined}
        className={cn(
          "scroll-thin-dark overflow-auto p-5 font-mono leading-relaxed text-panel-fg/90",
          size === "sm" ? "text-[0.7rem]" : "text-[0.75rem]",
          // Room for the floating button over the first line.
          !title && !language && "pr-24",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Command block
// ---------------------------------------------------------------------------

/**
 * A short shell sequence — `cd my-app`, then the command — copied as one.
 *
 * Each line gets its own prompt so it reads as separate commands, but the
 * copy is the whole sequence joined by newlines: pasted into a terminal it
 * runs top to bottom, which is what "do these in order" means.
 */
export function CommandBlock({
  commands,
  title,
  className,
}: {
  commands: readonly string[];
  title?: string;
  className?: string;
}) {
  const text = commands.join("\n");
  const what = commands.length === 1 ? "command" : "commands";

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-panel-rule bg-panel px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-panel-muted">
            {title}
          </p>
        ) : null}
        <ol className="space-y-1" aria-label={title ?? "Terminal commands"}>
          {commands.map((line, i) => (
            <li key={i} className="flex gap-3 font-mono text-[0.8125rem] leading-relaxed">
              <span aria-hidden="true" className="select-none text-trace">
                $
              </span>
              <code className="min-w-0 break-words text-panel-fg/95">{line}</code>
            </li>
          ))}
        </ol>
      </div>
      <CopyButton
        text={text}
        what={what}
        ariaLabel={commands.length === 1 ? `Copy command: ${commands[0]}` : undefined}
        className="-mr-1.5 mt-0.5"
      />
    </div>
  );
}
