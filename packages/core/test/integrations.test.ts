import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activateBlockedElements,
  connectGoogleConsentMode,
  createConsentManager,
  createMemoryStorage,
  format,
  getConsentModeDefaultScript,
  getTranslations,
  isUrlAllowed,
  loadScript,
  localize,
  resetLoadedScripts,
  toGoogleConsent,
} from "../src";

const createManager = () =>
  createConsentManager({
    consentVersion: "1",
    categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
    services: [{ id: "youtube", name: "YouTube", category: "marketing" }],
    storage: createMemoryStorage(),
  });

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  resetLoadedScripts();
  delete (window as unknown as Record<string, unknown>).dataLayer;
});

describe("Google Consent Mode v2", () => {
  it("maps categories to consent types", () => {
    expect(toGoogleConsent({ necessary: true, statistics: true, marketing: false })).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
    });
  });

  it("produces a default snippet that denies everything except security", () => {
    const snippet = getConsentModeDefaultScript();
    const win = window as unknown as { dataLayer: IArguments[] };
    new Function(snippet)();
    const [args] = win.dataLayer;
    expect(Array.from(args as IArguments)).toEqual([
      "consent",
      "default",
      expect.objectContaining({
        analytics_storage: "denied",
        ad_storage: "denied",
        security_storage: "granted",
        wait_for_update: 500,
      }),
    ]);
  });

  it("pushes updates only after a decision and only on change", async () => {
    const manager = createManager();
    const stop = connectGoogleConsentMode(manager);
    const win = window as unknown as { dataLayer?: IArguments[] };
    expect(win.dataLayer).toBeUndefined();

    await manager.update({ statistics: true });
    await manager.update({ statistics: true });
    expect(win.dataLayer).toHaveLength(1);
    const args = Array.from(win.dataLayer?.[0] as IArguments);
    expect(args[1]).toBe("update");
    expect(args[2]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
    stop();
  });
});

describe("script loading", () => {
  it("injects a script once and resolves on load", async () => {
    const promise = loadScript({ src: "https://example.com/a.js", nonce: "abc" });
    const again = loadScript({ src: "https://example.com/a.js" });
    expect(again).toBe(promise);
    const script = document.head.querySelector("script") as HTMLScriptElement;
    expect(script.src).toBe("https://example.com/a.js");
    expect(script.nonce).toBe("abc");
    script.dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBe(script);
  });

  it("enforces the allowlist", async () => {
    expect(isUrlAllowed("https://evil.test/x.js", ["https://example.com/"])).toBe(false);
    expect(isUrlAllowed("https://example.com/x.js", [/^https:\/\/example\.com\//])).toBe(true);
    await expect(
      loadScript({ src: "https://evil.test/x.js", allowlist: ["https://example.com/"] }),
    ).rejects.toThrow(/allowlist/);
  });

  it("activates blocked markup only after consent", async () => {
    document.body.innerHTML = `
      <script type="text/plain" data-consent-category="statistics"
              data-consent-src="https://example.com/stats.js" data-domain="x"></script>
      <iframe data-consent-service="youtube" data-consent-src="https://www.youtube-nocookie.com/embed/1"></iframe>
    `;
    const manager = createManager();
    const stop = activateBlockedElements(manager);
    expect(document.querySelector('script[src="https://example.com/stats.js"]')).toBeNull();
    expect(document.querySelector("iframe")?.getAttribute("src")).toBeNull();

    await manager.update({ statistics: true });
    const script = document.querySelector(
      'script[src="https://example.com/stats.js"]',
    ) as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.type).toBe("");
    expect(script.getAttribute("data-domain")).toBe("x");
    expect(document.querySelector("iframe")?.getAttribute("src")).toBeNull();

    await manager.setServiceConsent("youtube", true);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/1",
    );
    stop();
  });

  it("does not activate URLs outside the allowlist", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = `<script type="text/plain" data-consent-category="statistics"
      data-consent-src="https://evil.test/x.js"></script>`;
    const manager = createManager();
    activateBlockedElements(manager, { allowlist: ["https://example.com/"] });
    await manager.update({ statistics: true });
    expect(document.querySelector('script[src="https://evil.test/x.js"]')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("i18n", () => {
  it("resolves regional variants and falls back", () => {
    expect(getTranslations("de-CH").close).toBe("Schliessen");
    expect(getTranslations("de-AT").close).toBe("Schließen");
    expect(getTranslations("fr-CH").acceptAll).toBe("Tout accepter");
    expect(getTranslations("xx").acceptAll).toBe("Accept all");
  });

  it("applies overrides", () => {
    const t = getTranslations("de", {
      acceptAll: "OK",
      categories: { marketing: { name: "Werbung" } },
    });
    expect(t.acceptAll).toBe("OK");
    expect(t.categories.marketing?.name).toBe("Werbung");
    expect(t.categories.marketing?.description).toContain("Werbung");
  });

  it("localizes text maps", () => {
    expect(localize({ de: "Hallo", en: "Hello" }, "de-CH")).toBe("Hallo");
    expect(localize({ de: "Hallo", en: "Hello" }, "it")).toBe("Hello");
    expect(localize("plain", "fr")).toBe("plain");
    expect(format("{a} und {b}", { a: "x" })).toBe("x und {b}");
  });
});
