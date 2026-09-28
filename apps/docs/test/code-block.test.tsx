/**
 * The copy action every code sample and command on the site now shares.
 *
 * Three promises, each one a regression it replaced: the exact text reaches
 * the clipboard, a screen reader hears that it did, and a clipboard the
 * browser refuses is survived quietly rather than thrown at the reader.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock, CommandBlock, CopyButton } from "@/components/site/code-block";
import { InstallCommand } from "@/components/site/interactions";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("copies the exact text and announces it", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyButton text="npx @zoblocks/cli init" what="command" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    });

    expect(writeText).toHaveBeenCalledWith("npx @zoblocks/cli init");
    expect(screen.getByRole("button", { name: "Command copied" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Command copied to clipboard");
  });

  it("withdraws the announcement after two seconds", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton text="x" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Code copied to clipboard");

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("survives a clipboard the browser refuses", async () => {
    mockClipboard(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    render(<CopyButton text="x" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });

    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("CodeBlock", () => {
  it("names the file in the copy button and copies the whole sample", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    const code = 'import { defineConfig } from "vite";\n\nexport default defineConfig({});';
    render(<CodeBlock title="vite.config.ts" language="ts" code={code} />);

    expect(screen.getByText("vite.config.ts")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy vite.config.ts" }));
    });
    expect(writeText).toHaveBeenCalledWith(code);
  });

  it("keeps the scrolling region reachable by keyboard", () => {
    const { container } = render(<CodeBlock code="x" />);
    expect(container.querySelector("pre")).toHaveAttribute("tabindex", "0");
  });
});

describe("CommandBlock", () => {
  it("copies every line, in order, as one paste", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CommandBlock commands={["cd my-app", "npx @zoblocks/cli init"]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy commands" }));
    });
    expect(writeText).toHaveBeenCalledWith("cd my-app\nnpx @zoblocks/cli init");
  });
});

describe("InstallCommand", () => {
  it("keeps the accessible names it had before it shared the button", async () => {
    mockClipboard(() => Promise.resolve());
    render(<InstallCommand command="npx @zoblocks/cli add pulse-loader" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy command: npx @zoblocks/cli add pulse-loader" }),
      );
    });
    expect(screen.getByRole("button", { name: "Command copied" })).toBeInTheDocument();
  });
});
