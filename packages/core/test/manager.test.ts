import { describe, expect, it, vi } from "vitest";
import {
  type ConsentConfig,
  ConsentConfigError,
  type ConsentState,
  createConsentManager,
  createMemoryStorage,
} from "../src";

const baseConfig = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  services: [
    { id: "ga", name: "Google Analytics", category: "statistics" },
    { id: "youtube", name: "YouTube", category: "marketing" },
    { id: "cdn", name: "CDN", category: "marketing", requiresConsent: false },
  ],
  storage: createMemoryStorage(),
  now: () => new Date("2026-10-02T12:00:00.000Z"),
  ...overrides,
});

const storedState = (overrides: Partial<ConsentState> = {}): ConsentState => ({
  schema: 1,
  version: "2026-10",
  timestamp: "2026-10-01T00:00:00.000Z",
  categories: { necessary: true, statistics: true, marketing: false },
  services: {},
  source: "banner",
  ...overrides,
});

describe("defaults", () => {
  it("grants only required categories before a decision", () => {
    const manager = createConsentManager(baseConfig());
    const snapshot = manager.getSnapshot();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.needsConsent).toBe(true);
    expect(snapshot.decision).toBeNull();
    expect(snapshot.categories).toEqual({ necessary: true, statistics: false, marketing: false });
    expect(manager.hasServiceConsent("ga")).toBe(false);
  });

  it("treats services that the operator marked as not requiring consent as allowed", () => {
    const manager = createConsentManager(baseConfig());
    expect(manager.hasServiceConsent("cdn")).toBe(true);
  });

  it("uses opt-out only when explicitly configured", () => {
    const manager = createConsentManager(
      baseConfig({ region: "US", regionRules: { US: { mode: "opt-out" } } }),
    );
    expect(manager.getSnapshot().mode).toBe("opt-out");
    expect(manager.hasConsent("statistics")).toBe(true);
    expect(manager.getSnapshot().decision).toBeNull();
  });

  it("falls back to opt-in for regions without rules", () => {
    const manager = createConsentManager(
      baseConfig({ region: "CH", regionRules: { US: { mode: "opt-out" } } }),
    );
    expect(manager.getSnapshot().mode).toBe("opt-in");
  });
});

describe("decisions", () => {
  it("accepts all and persists the decision", async () => {
    const storage = createMemoryStorage();
    const manager = createConsentManager(baseConfig({ storage }));
    await manager.acceptAll("banner");
    expect(manager.getSnapshot().needsConsent).toBe(false);
    expect(manager.hasConsent("marketing")).toBe(true);
    expect(manager.hasServiceConsent("youtube")).toBe(true);
    expect(storage.get()).toEqual({
      schema: 1,
      version: "2026-10",
      timestamp: "2026-10-02T12:00:00.000Z",
      categories: { necessary: true, statistics: true, marketing: true },
      services: {},
      source: "banner",
    });
  });

  it("rejects all but keeps required categories", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.rejectAll();
    expect(manager.getSnapshot().categories).toEqual({
      necessary: true,
      statistics: false,
      marketing: false,
    });
    expect(manager.getSnapshot().needsConsent).toBe(false);
  });

  it("updates single categories and ignores unknown ids", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.update({ statistics: true, unknown: true });
    expect(manager.getSnapshot().categories).toEqual({
      necessary: true,
      statistics: true,
      marketing: false,
    });
  });

  it("cannot decline required categories", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.update({ necessary: false });
    expect(manager.hasConsent("necessary")).toBe(true);
  });

  it("allows granting a single service without its category", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.setServiceConsent("youtube", true, "embed");
    expect(manager.hasConsent("marketing")).toBe(false);
    expect(manager.hasServiceConsent("youtube")).toBe(true);
    expect(manager.getSnapshot().decision?.source).toBe("embed");
  });

  it("resets service overrides when their category changes", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.setServiceConsent("youtube", true);
    await manager.update({ marketing: true });
    await manager.update({ marketing: false });
    expect(manager.hasServiceConsent("youtube")).toBe(false);
  });

  it("rejects unknown services", async () => {
    const manager = createConsentManager(baseConfig());
    await expect(manager.setServiceConsent("nope", true)).rejects.toThrow(ConsentConfigError);
  });

  it("reset clears storage and asks again", async () => {
    const storage = createMemoryStorage();
    const manager = createConsentManager(baseConfig({ storage }));
    await manager.acceptAll();
    await manager.reset();
    expect(storage.get()).toBeNull();
    expect(manager.getSnapshot().needsConsent).toBe(true);
    expect(manager.hasConsent("marketing")).toBe(false);
  });
});

describe("loading", () => {
  it("loads a valid stored decision", () => {
    const manager = createConsentManager(
      baseConfig({ storage: createMemoryStorage(storedState()) }),
    );
    expect(manager.getSnapshot().needsConsent).toBe(false);
    expect(manager.hasConsent("statistics")).toBe(true);
  });

  it("asks again when the consent version changed", () => {
    const manager = createConsentManager(
      baseConfig({ storage: createMemoryStorage(storedState({ version: "2025-01" })) }),
    );
    expect(manager.getSnapshot().needsConsent).toBe(true);
    expect(manager.hasConsent("statistics")).toBe(false);
  });

  it("asks again when the policy version changed", () => {
    const manager = createConsentManager(
      baseConfig({
        policyVersion: "v2",
        storage: createMemoryStorage(storedState({ policyVersion: "v1" })),
      }),
    );
    expect(manager.getSnapshot().needsConsent).toBe(true);
  });

  it("does not grant newly added categories from an old decision", () => {
    const manager = createConsentManager(
      baseConfig({
        categories: [
          { id: "necessary", required: true },
          { id: "statistics" },
          { id: "marketing" },
          { id: "preferences" },
        ],
        storage: createMemoryStorage(storedState()),
      }),
    );
    expect(manager.hasConsent("preferences")).toBe(false);
  });

  it("ignores corrupt storage", () => {
    const storage = { get: () => ({ foo: 1 }) as never, set: () => {}, clear: () => {} };
    const manager = createConsentManager(baseConfig({ storage }));
    expect(manager.getSnapshot().needsConsent).toBe(true);
  });

  it("supports async storage", async () => {
    const storage = {
      get: async () => storedState(),
      set: async () => {},
      clear: async () => {},
    };
    const manager = createConsentManager(baseConfig({ storage }));
    expect(manager.getSnapshot().ready).toBe(false);
    expect(manager.getSnapshot().needsConsent).toBe(false);
    await manager.ready;
    expect(manager.getSnapshot().ready).toBe(true);
    expect(manager.hasConsent("statistics")).toBe(true);
  });

  it("uses initialState without touching storage", () => {
    const get = vi.fn(() => null);
    const manager = createConsentManager(
      baseConfig({ initialState: storedState(), storage: { get, set: () => {}, clear: () => {} } }),
    );
    expect(get).not.toHaveBeenCalled();
    expect(manager.hasConsent("statistics")).toBe(true);
  });
});

describe("events", () => {
  it("emits updates, revocations and service changes", async () => {
    const manager = createConsentManager(baseConfig());
    const events: string[] = [];
    manager.on("consent_updated", () => events.push("updated"));
    manager.on("consent_revoked", (e) => events.push(`revoked:${e.categories.join(",")}`));
    manager.on("service_allowed", (e) => events.push(`allowed:${e.serviceId}`));
    manager.on("service_blocked", (e) => events.push(`blocked:${e.serviceId}`));

    await manager.acceptAll();
    await manager.update({ marketing: false });

    expect(events).toEqual([
      "allowed:ga",
      "allowed:youtube",
      "updated",
      "blocked:youtube",
      "updated",
      "revoked:marketing",
    ]);
  });

  it("notifies subscribers and supports unsubscribe", async () => {
    const manager = createConsentManager(baseConfig());
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    await manager.acceptAll();
    unsubscribe();
    await manager.rejectAll();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the snapshot reference stable between changes", () => {
    const manager = createConsentManager(baseConfig());
    expect(manager.getSnapshot()).toBe(manager.getSnapshot());
  });
});

describe("import and export", () => {
  it("round-trips a decision", async () => {
    const a = createConsentManager(baseConfig());
    await a.update({ statistics: true });
    const exported = a.exportState();
    const b = createConsentManager(baseConfig());
    expect(await b.importState(exported)).toBe(true);
    expect(b.hasConsent("statistics")).toBe(true);
    expect(b.getSnapshot().decision?.source).toBe("import");
  });

  it("refuses invalid or outdated imports", async () => {
    const manager = createConsentManager(baseConfig());
    expect(await manager.importState({ nope: true })).toBe(false);
    expect(await manager.importState(storedState({ version: "old" }))).toBe(false);
  });
});

describe("config validation", () => {
  it("rejects services with unknown categories", () => {
    expect(() =>
      createConsentManager(baseConfig({ services: [{ id: "x", name: "X", category: "nope" }] })),
    ).toThrow(ConsentConfigError);
  });

  it("rejects duplicate categories", () => {
    expect(() =>
      createConsentManager(baseConfig({ categories: [{ id: "a" }, { id: "a" }], services: [] })),
    ).toThrow(/Duplicate category/);
  });
});
