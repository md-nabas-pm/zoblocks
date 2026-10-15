/*
 * The main navigation, shared by the header and the mobile menu.
 *
 * It was two literal arrays, one in each, and they had to be edited in
 * lockstep — the kind of pair that drifts the first time someone is in a hurry.
 *
 * Four slots: the docs, the catalogue, the blocks and Premium. Premium was two
 * slots, Marketplace and Pro, until 16 Sep 2026.
 *
 * Install and Compare were promoted here briefly during the content audit,
 * on the argument that they are the two highest-intent pages for a developer
 * and an engineering lead. Rahul reversed that on 4 Sep 2026 — the header is
 * for what the product *is*, and those two are how you get it and why.
 *
 * "Docs" came back on 28 Sep 2026, pointing at `/docs`, which absorbed the
 * old `/install` page. The problem it answers is different from the audit's:
 * a first-time developer looking for how to start found nothing in the header
 * and had to know to scroll to the footer. Compare stays in the footer and
 * the command palette.
 *
 * "Blocks" rather than "Showcase": the page's own eyebrow, heading and
 * landmark all say Blocks, and "showcase" additionally promises customer work
 * that the page then has to walk back in its first paragraph.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Paths this item is current for. Defaults to its own `href`. */
  match?: readonly string[];
}

export const NAV: readonly NavItem[] = [
  { href: "/docs", label: "Docs" },
  { href: "/components", label: "Components" },
  { href: "/showcase", label: "Blocks" },
  { href: "/premium", label: "Premium" },
];

/** Whether a nav item is the current section: its own path, or any it claims. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  return (item.match ?? [item.href]).some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}
