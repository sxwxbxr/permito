import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ConsentConfig,
  ConsentConfigError,
  type ConsentState,
  createConsentManager,
  createMemoryStorage,
  readGpcFromHeaders,
} from "../src";

const baseConfig = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  services: [{ id: "youtube", name: "YouTube", category: "marketing" }],
  storage: createMemoryStorage(),
  syncTabs: false,
  now: () => new Date("2026-10-02T12:00:00.000Z"),
  ...overrides,
});

const storedState = (overrides: Partial<ConsentState> = {}): ConsentState => ({
  schema: 1,
  version: "2026-10",
  timestamp: "2026-10-01T00:00:00.000Z",
  categories: { necessary: true, statistics: true, marketing: true },
  services: {},
  source: "banner",
  ...overrides,
});

describe("maxAgeDays", () => {
  it("keeps a decision younger than the limit and reports its expiry", () => {
    const manager = createConsentManager(
      baseConfig({ maxAgeDays: 30, storage: createMemoryStorage(storedState()) }),
    );
    const snapshot = manager.getSnapshot();
    expect(snapshot.needsConsent).toBe(false);
    expect(snapshot.expiresAt).toBe("2026-10-31T00:00:00.000Z");
  });

  it("asks again once the decision is older than the limit", () => {
    const manager = createConsentManager(
      baseConfig({
        maxAgeDays: 30,
        storage: createMemoryStorage(storedState({ timestamp: "2026-08-01T00:00:00.000Z" })),
      }),
    );
    expect(manager.getSnapshot().needsConsent).toBe(true);
    expect(manager.hasConsent("statistics")).toBe(false);
  });

  it("has no expiry without the option", () => {
    const manager = createConsentManager(
      baseConfig({
        storage: createMemoryStorage(storedState({ timestamp: "2020-01-01T00:00:00.000Z" })),
      }),
    );
    expect(manager.getSnapshot().needsConsent).toBe(false);
    expect(manager.getSnapshot().expiresAt).toBeNull();
  });

  it("rejects invalid values", () => {
    expect(() => createConsentManager(baseConfig({ maxAgeDays: 0 }))).toThrow(ConsentConfigError);
  });
});

describe("globalPrivacyControl", () => {
  const optOut = { mode: "opt-out" as const };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("declines marketing by default in opt-out mode when the signal is present", () => {
    const manager = createConsentManager(
      baseConfig({ ...optOut, globalPrivacyControl: { signal: true } }),
    );
    const snapshot = manager.getSnapshot();
    expect(snapshot.globalPrivacyControl).toBe(true);
    expect(snapshot.categories).toEqual({ necessary: true, statistics: true, marketing: false });
    expect(manager.hasServiceConsent("youtube")).toBe(false);
  });

  it("supports custom categories", () => {
    const manager = createConsentManager(
      baseConfig({
        ...optOut,
        globalPrivacyControl: { signal: true, categories: ["statistics", "marketing"] },
      }),
    );
    expect(manager.getSnapshot().categories).toEqual({
      necessary: true,
      statistics: false,
      marketing: false,
    });
  });

  it("reads navigator.globalPrivacyControl in the browser", () => {
    vi.stubGlobal("navigator", { ...navigator, globalPrivacyControl: true });
    const manager = createConsentManager(baseConfig({ ...optOut, globalPrivacyControl: true }));
    expect(manager.hasConsent("marketing")).toBe(false);
  });

  it("does nothing without the signal or when not enabled", () => {
    expect(
      createConsentManager(
        baseConfig({ ...optOut, globalPrivacyControl: { signal: false } }),
      ).hasConsent("marketing"),
    ).toBe(true);
    vi.stubGlobal("navigator", { ...navigator, globalPrivacyControl: true });
    expect(createConsentManager(baseConfig(optOut)).hasConsent("marketing")).toBe(true);
  });

  it("lets an explicit decision win", async () => {
    const manager = createConsentManager(
      baseConfig({ ...optOut, globalPrivacyControl: { signal: true } }),
    );
    await manager.acceptAll("banner");
    expect(manager.hasConsent("marketing")).toBe(true);
  });

  it("reads the Sec-GPC header", () => {
    expect(readGpcFromHeaders(new Headers({ "Sec-GPC": "1" }))).toBe(true);
    expect(readGpcFromHeaders({ "sec-gpc": "1" })).toBe(true);
    expect(readGpcFromHeaders({ "sec-gpc": ["1"] })).toBe(true);
    expect(readGpcFromHeaders(new Headers())).toBe(false);
    expect(readGpcFromHeaders(null)).toBe(false);
  });
});

describe("syncTabs", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

  it("applies a decision made by another manager on the same site", async () => {
    const tabA = createConsentManager(baseConfig({ syncTabs: true }));
    const tabB = createConsentManager(baseConfig({ syncTabs: true }));
    const updated = vi.fn();
    tabB.on("consent_updated", updated);

    await tabA.update({ statistics: true }, { source: "banner" });
    await flush();
    expect(tabB.hasConsent("statistics")).toBe(true);
    expect(tabB.getSnapshot().needsConsent).toBe(false);
    expect(updated).toHaveBeenCalledTimes(1);

    await tabA.reset();
    await flush();
    expect(tabB.getSnapshot().needsConsent).toBe(true);

    tabA.destroy();
    tabB.destroy();
  });

  it("ignores decisions for another consent version", async () => {
    const tabA = createConsentManager(baseConfig({ syncTabs: true, consentVersion: "old" }));
    const tabB = createConsentManager(baseConfig({ syncTabs: true }));
    await tabA.acceptAll();
    await flush();
    expect(tabB.getSnapshot().needsConsent).toBe(true);
    tabA.destroy();
    tabB.destroy();
  });

  it("stays local when disabled", async () => {
    const tabA = createConsentManager(baseConfig({ syncTabs: false }));
    const tabB = createConsentManager(baseConfig({ syncTabs: true }));
    await tabA.acceptAll();
    await flush();
    expect(tabB.getSnapshot().needsConsent).toBe(true);
    tabB.destroy();
  });
});

describe("syncTabs defaults", () => {
  it("does not sync managers with a custom storage unless asked", async () => {
    const config = baseConfig();
    delete config.syncTabs;
    const tabA = createConsentManager(config);
    const tabB = createConsentManager({ ...config, storage: createMemoryStorage() });
    await tabA.acceptAll();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tabB.getSnapshot().needsConsent).toBe(true);
  });
});
