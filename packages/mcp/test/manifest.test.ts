/**
 * Getting the catalog: live first, the bundled snapshot when that fails, and
 * never a manifest this server cannot read.
 */

import { describe, expect, it, vi } from "vitest";
import {
  ManifestError,
  SUPPORTED_SCHEMA_VERSION,
  loadManifest,
  parseManifest,
  readSnapshot,
} from "../src/manifest.js";

const snapshot = readSnapshot();

const respond = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("parseManifest", () => {
  it("accepts the manifest pnpm gen writes", () => {
    expect(parseManifest(snapshot).schemaVersion).toBe(SUPPORTED_SCHEMA_VERSION);
  });

  it("refuses a newer schema and says how to update", () => {
    expect(() => parseManifest({ ...snapshot, schemaVersion: 99 })).toThrow(
      /npx -y @zoblocks\/mcp@latest/,
    );
  });

  it("refuses a manifest without components", () => {
    expect(() => parseManifest({ ...snapshot, components: [] })).toThrow(ManifestError);
  });

  it("refuses something that is not a manifest at all", () => {
    expect(() => parseManifest({ hello: "world" })).toThrow(ManifestError);
  });
});

describe("loadManifest", () => {
  it("reads the live manifest from the registry", async () => {
    const fetchImpl = respond(snapshot);
    const loaded = await loadManifest({ fetchImpl, registry: "https://mirror.example.org/" });
    expect(loaded.source).toBe("live");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://mirror.example.org/ai/manifest.json",
      expect.anything(),
    );
  });

  it("falls back to the snapshot on an HTTP error, and says so", async () => {
    const log = vi.fn();
    const loaded = await loadManifest({
      fetchImpl: respond({}, 404),
      log,
      snapshot: () => snapshot,
    });
    expect(loaded.source).toBe("snapshot");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/404.*bundled catalog/));
  });

  it("falls back to the snapshot when the network is not there", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const loaded = await loadManifest({ fetchImpl, snapshot: () => snapshot, log: () => {} });
    expect(loaded.source).toBe("snapshot");
  });

  it("falls back rather than serve a live manifest it cannot read", async () => {
    const log = vi.fn();
    const loaded = await loadManifest({
      fetchImpl: respond({ ...snapshot, schemaVersion: 99 }),
      snapshot: () => snapshot,
      log,
    });
    expect(loaded.source).toBe("snapshot");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/schema 99/));
  });

  it("does not touch the network when offline", async () => {
    const fetchImpl = respond(snapshot);
    const loaded = await loadManifest({ offline: true, fetchImpl, snapshot: () => snapshot });
    expect(loaded.source).toBe("snapshot");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("names a missing snapshot rather than failing obscurely", () => {
    expect(() => readSnapshot(["/nonexistent/manifest.json"])).toThrow(/pnpm gen/);
  });
});
