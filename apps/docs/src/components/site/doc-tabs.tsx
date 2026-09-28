"use client";

/**
 * A choice between parallel instructions — Next.js or Vite, antd or MUI.
 *
 * An APG tablist with automatic activation, like `SectionTabs`, but shaped as
 * a segmented control inside the prose column rather than a sticky bar over
 * the page: it chooses between versions of one step, not between sections.
 *
 * Every panel renders on the server and stays in the document, hidden rather
 * than unmounted, so search and the axe audit read all of them and a reader
 * who prints gets every path. With `hash` set, the choice is written to the
 * URL so a link can open on a framework — "here is the Vite setup" in a
 * support reply lands on Vite.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DocTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function DocTabs({
  tabs,
  label,
  hash = false,
  className,
}: {
  tabs: readonly DocTab[];
  /** The accessible name of the tablist: "Your starting point". */
  label: string;
  /** Read and write the selection as the URL hash. One per page. */
  hash?: boolean;
  className?: string;
}) {
  const ids = tabs.map((tab) => tab.id);
  const key = ids.join("|");
  const [active, setActive] = React.useState(ids[0] ?? "");
  const list = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();

  React.useEffect(() => {
    if (!hash) return;
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (key.split("|").includes(id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [hash, key]);

  const select = (id: string) => {
    setActive(id);
    // Handing the router its own state back keeps the App Router's patched
    // `replaceState` from scrolling to the top — see `SectionTabs`.
    if (hash) window.history.replaceState(window.history.state, "", `#${id}`);
  };

  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = ids.indexOf(active);
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (index + 1) % ids.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + ids.length) % ids.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ids.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const id = ids[next]!;
    select(id);
    list.current?.querySelector<HTMLButtonElement>(`[data-id="${id}"]`)?.focus();
  };

  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = (id: string) => `${uid}-panel-${id}`;

  return (
    <div className={className}>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className="scroll-hidden flex gap-1 overflow-x-auto rounded-xl border border-rule bg-paper-sunk p-1"
      >
        {tabs.map((tab) => {
          const current = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-id={tab.id}
              id={tabId(tab.id)}
              aria-selected={current}
              aria-controls={panelId(tab.id)}
              tabIndex={current ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm transition-colors duration-200",
                current
                  ? "bg-paper font-medium text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] ring-1 ring-rule-strong"
                  : "text-graphite hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={panelId(tab.id)}
          aria-labelledby={tabId(tab.id)}
          hidden={tab.id !== active}
          tabIndex={0}
          className="mt-6 rounded-lg"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
