import { describe, expect, it, vi } from "vitest";
import {
  type ConsentConfig,
  ConsentConfigError,
  type ConsentStateV1,
  createConsentManager,
  createMemoryStorage,
  resolvePurposes,
} from "../src";

const baseConfig = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "1",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  purposes: [
    { id: "newsletter", category: "marketing" },
    { id: "ads", category: "marketing" },
    { id: "analytics", category: "statistics" },
  ],
  services: [
    { id: "mailtool", name: "Mail tool", category: "marketing", purposes: ["newsletter"] },
    { id: "adnet", name: "Ad network", category: "marketing", purposes: ["ads", "newsletter"] },
  ],
  storage: createMemoryStorage(),
  now: () => new Date("2026-10-12T12:00:00.000Z"),
  ...overrides,
});

describe("purposes", () => {
  it("adds an implicit purpose for categories without one", () => {
    expect(resolvePurposes(baseConfig()).map((p) => p.id)).toEqual([
      "newsletter",
      "ads",
      "analytics",
      "necessary",
    ]);
  });

  it("rejects unknown categories and unknown service purposes", () => {
    expect(() =>
      createConsentManager(baseConfig({ purposes: [{ id: "x", category: "nope" }] })),
    ).toThrow(ConsentConfigError);
    expect(() =>
      createConsentManager(
        baseConfig({
          services: [{ id: "s", name: "S", category: "marketing", purposes: ["nope"] }],
        }),
      ),
    ).toThrow(/unknown purpose/);
  });

  it("grants every purpose of a category together with the category", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.update({ marketing: true });
    expect(manager.getSnapshot().purposes).toEqual({
      newsletter: true,
      ads: true,
      analytics: false,
      necessary: true,
    });
    expect(manager.hasPurposeConsent("ads")).toBe(true);
  });

  it("lets a single purpose be declined inside a granted category", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.acceptAll();
    await manager.setPurposeConsent("ads", false);
    expect(manager.hasPurposeConsent("ads")).toBe(false);
    expect(manager.hasPurposeConsent("newsletter")).toBe(true);
    expect(manager.hasConsent("marketing")).toBe(true);
    // A service runs only while all of its purposes are granted.
    expect(manager.hasServiceConsent("mailtool")).toBe(true);
    expect(manager.hasServiceConsent("adnet")).toBe(false);
  });

  it("does not grant a purpose inside a declined category", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.rejectAll();
    await manager.setPurposeConsent("ads", true);
    expect(manager.hasPurposeConsent("ads")).toBe(false);
  });

  it("re-granting the category resets declined purposes", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.acceptAll();
    await manager.setPurposeConsent("ads", false);
    await manager.update({ marketing: false });
    await manager.update({ marketing: true });
    expect(manager.hasPurposeConsent("ads")).toBe(true);
  });

  it("reports revoked purposes in the event", async () => {
    const manager = createConsentManager(baseConfig());
    await manager.acceptAll();
    const revoked = vi.fn();
    manager.on("consent_revoked", revoked);
    await manager.setPurposeConsent("ads", false);
    expect(revoked).toHaveBeenCalledWith({
      type: "consent_revoked",
      categories: [],
      purposes: ["ads"],
      origin: "local",
    });
    await manager.reset();
    expect(revoked).toHaveBeenLastCalledWith({
      type: "consent_revoked",
      categories: ["statistics", "marketing"],
      purposes: expect.arrayContaining(["newsletter", "analytics"]),
      origin: "local",
    });
  });

  it("rejects an unknown purpose", async () => {
    const manager = createConsentManager(baseConfig());
    await expect(manager.setPurposeConsent("nope", true)).rejects.toThrow(ConsentConfigError);
  });
});

describe("decisions stored by 1.x", () => {
  const stored: ConsentStateV1 = {
    schema: 1,
    version: "1",
    timestamp: "2026-10-01T00:00:00.000Z",
    categories: { necessary: true, statistics: false, marketing: true },
    services: {},
    source: "banner",
  };

  it("keeps its meaning: purposes follow their category", () => {
    const manager = createConsentManager(baseConfig({ storage: createMemoryStorage(stored) }));
    expect(manager.getSnapshot().needsConsent).toBe(false);
    expect(manager.getSnapshot().purposes).toEqual({
      newsletter: true,
      ads: true,
      analytics: false,
      necessary: true,
    });
    expect(manager.exportState()?.schema).toBe(2);
  });

  it("is accepted as initialState and by importState", async () => {
    const ssr = createConsentManager(baseConfig({ initialState: stored }));
    expect(ssr.hasPurposeConsent("newsletter")).toBe(true);
    const manager = createConsentManager(baseConfig());
    expect(await manager.importState(stored)).toBe(true);
    expect(manager.hasPurposeConsent("ads")).toBe(true);
  });
});
