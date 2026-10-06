import { afterEach, describe, expect, it } from "vitest";
import { type ConsentConfig, createMemoryStorage } from "../src";
import { type ConsentUI, createConsentUI } from "../src/ui";

const config = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "1",
  language: "en",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  services: [{ id: "youtube", name: "YouTube", provider: "Google", category: "marketing" }],
  storage: createMemoryStorage(),
  ...overrides,
});

let ui: ConsentUI | null = null;
afterEach(() => {
  ui?.destroy();
  ui = null;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const buttonByText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent === text,
  );

describe("createConsentUI", () => {
  it("shows the banner with equal accept and reject buttons", () => {
    ui = createConsentUI({ config: config(), privacyPolicyUrl: "/privacy" });
    const banner = q('[data-permito="banner"]');
    expect(banner).not.toBeNull();
    const accept = buttonByText(banner as HTMLElement, "Accept all");
    const reject = buttonByText(banner as HTMLElement, "Reject all");
    expect(accept?.className).toBe(reject?.className);
    expect(banner?.querySelector("a")?.getAttribute("href")).toBe("/privacy");
    expect(document.activeElement).toBe(banner);
  });

  it("hides the banner after a decision and shows the settings button", async () => {
    ui = createConsentUI({ config: config() });
    buttonByText(q('[data-permito="banner"]') as HTMLElement, "Reject all")?.click();
    await Promise.resolve();
    expect(q('[data-permito="banner"]')).toBeNull();
    expect(q('[data-permito="preferences-button"]')).not.toBeNull();
    expect(ui.manager.hasConsent("statistics")).toBe(false);
  });

  it("saves individual choices from the preference center", async () => {
    ui = createConsentUI({ config: config() });
    ui.openPreferences();
    const dialog = q('[data-permito="preferences"]') as HTMLElement;
    expect(q('[data-permito="banner"]')).toBeNull();
    const statistics = dialog.querySelector<HTMLInputElement>('input[id$="-statistics"]');
    statistics?.click();
    buttonByText(dialog, "Save selection")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.manager.hasConsent("statistics")).toBe(true);
    expect(ui.manager.hasConsent("marketing")).toBe(false);
    expect(q('[data-permito="preferences"]')).toBeNull();
  });

  it("toggling a category resets its service switches", () => {
    ui = createConsentUI({ config: config() });
    ui.openPreferences();
    const dialog = q('[data-permito="preferences"]') as HTMLElement;
    const youtube = dialog.querySelector<HTMLInputElement>('input[id$="-service-youtube"]');
    const marketing = dialog.querySelector<HTMLInputElement>('input[id$="-marketing"]');
    expect(youtube?.checked).toBe(false);
    marketing?.click();
    expect(youtube?.checked).toBe(true);
  });

  it("closes on Escape and opens from data-permito-open links", () => {
    document.body.innerHTML = '<a href="#" data-permito-open>Cookie settings</a>';
    ui = createConsentUI({ config: config() });
    (document.querySelector("[data-permito-open]") as HTMLElement).click();
    const dialog = q('[data-permito="preferences"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(q('[data-permito="preferences"]')).toBeNull();
  });

  it("renders text as text, never as HTML", () => {
    ui = createConsentUI({
      config: config({
        services: [{ id: "x", name: "<img src=x onerror=alert(1)>", category: "marketing" }],
      }),
    });
    ui.openPreferences();
    expect(document.querySelector("img")).toBeNull();
  });

  it("removes everything on destroy", () => {
    ui = createConsentUI({ config: config() });
    ui.destroy();
    ui = null;
    expect(document.querySelector(".pmt-root")).toBeNull();
  });
});
