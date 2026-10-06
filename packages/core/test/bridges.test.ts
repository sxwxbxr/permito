import { afterEach, describe, expect, it } from "vitest";
import {
  connectIntegrations,
  connectMatomo,
  connectMicrosoftClarity,
  connectMicrosoftUet,
  createConsentManager,
  createMemoryStorage,
  getMatomoDefaultScript,
  getMicrosoftUetDefaultScript,
  pushIntegrationDefaults,
} from "../src";
import { createConsentUI } from "../src/ui";

type W = Window & Record<string, unknown>;
const w = window as unknown as W;

const createManager = () =>
  createConsentManager({
    consentVersion: "1",
    categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
    storage: createMemoryStorage(),
  });

afterEach(() => {
  delete w.uetq;
  delete w._paq;
  delete w.clarity;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("Microsoft UET", () => {
  it("renders a denied default and sends updates only on change", async () => {
    expect(getMicrosoftUetDefaultScript()).toContain('"consent","default",{"ad_storage":"denied"}');
    const manager = createManager();
    const stop = connectMicrosoftUet(manager);
    expect(w.uetq).toBeUndefined();
    await manager.acceptAll();
    await manager.update({ statistics: false, marketing: true });
    await manager.rejectAll();
    expect(w.uetq).toEqual([
      "consent",
      "update",
      { ad_storage: "granted" },
      "consent",
      "update",
      { ad_storage: "denied" },
    ]);
    stop();
  });

  it("uses a loaded UET object's push", async () => {
    const calls: unknown[][] = [];
    w.uetq = { push: (...args: unknown[]) => calls.push(args) };
    const manager = createManager();
    connectMicrosoftUet(manager);
    await manager.acceptAll();
    expect(calls).toEqual([["consent", "update", { ad_storage: "granted" }]]);
  });
});

describe("Microsoft Clarity", () => {
  it("queues consentv2 signals in the Clarity stub", async () => {
    const manager = createManager();
    connectMicrosoftClarity(manager);
    await manager.update({ statistics: true, marketing: false });
    const queue = (w.clarity as { q: IArguments[] }).q.map((args) => Array.from(args));
    expect(queue).toEqual([["consentv2", { ad_Storage: "denied", analytics_Storage: "granted" }]]);
  });

  it("calls an existing clarity function", async () => {
    const calls: unknown[][] = [];
    w.clarity = (...args: unknown[]) => calls.push(args);
    const manager = createManager();
    connectMicrosoftClarity(manager, { analytics: ["statistics", "marketing"] });
    await manager.acceptAll();
    expect(calls).toEqual([["consentv2", { ad_Storage: "granted", analytics_Storage: "granted" }]]);
  });
});

describe("Matomo", () => {
  it("requires consent by default and gives or forgets it", async () => {
    expect(getMatomoDefaultScript()).toContain('["requireConsent"]');
    expect(getMatomoDefaultScript({ mode: "cookies" })).toContain('["requireCookieConsent"]');
    const manager = createManager();
    connectMatomo(manager);
    await manager.acceptAll();
    await manager.rejectAll();
    expect(w._paq).toEqual([["setConsentGiven"], ["forgetConsentGiven"]]);
  });

  it("supports cookie consent mode", async () => {
    const manager = createManager();
    connectMatomo(manager, { mode: "cookies" });
    await manager.acceptAll();
    expect(w._paq).toEqual([["setCookieConsentGiven"]]);
  });

  it("applies a stored decision on load", async () => {
    const storage = createMemoryStorage();
    const first = createConsentManager({
      consentVersion: "1",
      categories: [{ id: "necessary", required: true }, { id: "statistics" }],
      storage,
    });
    await first.acceptAll();
    const second = createConsentManager({
      consentVersion: "1",
      categories: [{ id: "necessary", required: true }, { id: "statistics" }],
      storage,
    });
    connectMatomo(second);
    expect(w._paq).toEqual([["setConsentGiven"]]);
  });
});

describe("integrations", () => {
  it("pushes defaults and connects all enabled bridges", async () => {
    pushIntegrationDefaults({ microsoftUet: true, matomo: true, clarity: true });
    expect(w.uetq).toEqual(["consent", "default", { ad_storage: "denied" }]);
    expect(w._paq).toEqual([["requireConsent"]]);
    const manager = createManager();
    const stop = connectIntegrations(manager, { microsoftUet: true, matomo: true, clarity: true });
    await manager.acceptAll();
    expect((w._paq as unknown[]).slice(-1)[0]).toEqual(["setConsentGiven"]);
    expect((w.uetq as unknown[]).slice(-3)).toEqual([
      "consent",
      "update",
      { ad_storage: "granted" },
    ]);
    stop();
    await manager.rejectAll();
    expect((w._paq as unknown[]).slice(-1)[0]).toEqual(["setConsentGiven"]);
  });

  it("is wired into createConsentUI", async () => {
    const ui = createConsentUI({
      config: {
        consentVersion: "1",
        categories: [{ id: "necessary", required: true }, { id: "statistics" }],
        storage: createMemoryStorage(),
      },
      matomo: true,
      injectStyles: false,
    });
    await ui.manager.acceptAll();
    expect(w._paq).toEqual([["setConsentGiven"]]);
    ui.destroy();
  });
});
