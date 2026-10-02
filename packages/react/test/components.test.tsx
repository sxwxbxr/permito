import { resetLoadedScripts } from "@permito/core";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConsentBanner,
  type ConsentConfig,
  ConsentGate,
  ConsentIframe,
  ConsentScript,
  createMemoryStorage,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
  useConsent,
} from "../src";

const config = (overrides: Partial<ConsentConfig> = {}): ConsentConfig => ({
  consentVersion: "1",
  language: "de",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  services: [
    {
      id: "youtube",
      name: "YouTube",
      provider: "Google Ireland Ltd.",
      category: "marketing",
      purpose: { de: "Videos einbetten", en: "Embed videos" },
      cookies: [{ name: "VISITOR_INFO1_LIVE", duration: { de: "6 Monate" } }],
      privacyPolicyUrl: "https://policies.google.com/privacy",
    },
  ],
  storage: createMemoryStorage(),
  ...overrides,
});

function App({ cfg = config() }: { cfg?: ConsentConfig }) {
  return (
    <PermitoProvider config={cfg} privacyPolicyUrl="/datenschutz">
      <main>
        <h1>Shop</h1>
        <button type="button">Seite</button>
        <ConsentGate category="statistics" fallback={<p>Statistik aus</p>}>
          <p>Statistik an</p>
        </ConsentGate>
        <ConsentIframe
          service="youtube"
          src="https://www.youtube-nocookie.com/embed/x"
          title="Video"
        />
        <Status />
      </main>
      <ConsentBanner />
      <PreferenceCenter />
      <PreferencesButton />
    </PermitoProvider>
  );
}

function Status() {
  const { categories, resetConsent } = useConsent();
  return (
    <>
      <output data-testid="status">{JSON.stringify(categories)}</output>
      <button type="button" onClick={resetConsent}>
        Widerrufen
      </button>
    </>
  );
}

afterEach(() => resetLoadedScripts());

async function runAxe(container: Element) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}

describe("ConsentBanner", () => {
  it("shows on first visit with equal accept and reject buttons and focuses itself", () => {
    render(<App />);
    const banner = screen.getByRole("dialog", { name: "Ihre Privatsphäre" });
    expect(document.activeElement).toBe(banner);
    const accept = within(banner).getByRole("button", { name: "Alle akzeptieren" });
    const reject = within(banner).getByRole("button", { name: "Alle ablehnen" });
    expect(accept.className).toBe(reject.className);
    expect(within(banner).getByRole("link", { name: "Datenschutzerklärung" })).toHaveProperty(
      "href",
      expect.stringContaining("/datenschutz"),
    );
    expect(screen.getByText("Statistik aus")).toBeTruthy();
  });

  it("renders into document.body so transformed ancestors cannot clip it", () => {
    render(
      <div style={{ transform: "translateZ(0)" }} data-testid="wrapper">
        <App />
      </div>,
    );
    const banner = screen.getByRole("dialog", { name: "Ihre Privatsphäre" });
    expect(screen.getByTestId("wrapper").contains(banner)).toBe(false);
    expect(banner.parentElement).toBe(document.body);
  });

  it("accepts all", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Alle akzeptieren" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Statistik an")).toBeTruthy();
    expect(screen.getByTitle("Video").tagName).toBe("IFRAME");
  });

  it("rejects all", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Alle ablehnen" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Statistik aus")).toBeTruthy();
    expect(screen.getByTestId("status").textContent).toBe(
      JSON.stringify({ necessary: true, statistics: false, marketing: false }),
    );
  });

  it("is not shown when a valid decision exists", () => {
    render(
      <App
        cfg={config({
          storage: createMemoryStorage({
            schema: 1,
            version: "1",
            timestamp: "2026-10-02T00:00:00.000Z",
            categories: { necessary: true, statistics: true, marketing: false },
            services: {},
            source: "banner",
          }),
        })}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Statistik an")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Datenschutz-Einstellungen öffnen" })).toBeTruthy();
  });

  it("comes back after revoking", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Alle akzeptieren" }));
    await user.click(screen.getByRole("button", { name: "Widerrufen" }));
    expect(screen.getByRole("dialog", { name: "Ihre Privatsphäre" })).toBeTruthy();
    expect(screen.getByText("Statistik aus")).toBeTruthy();
  });

  it("has no axe violations", async () => {
    render(<App />);
    expect(await runAxe(document.body)).toEqual([]);
  });
});

describe("PreferenceCenter", () => {
  it("opens as a modal with focus inside, saves a selection and restores focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    const customize = screen.getByRole("button", { name: "Einstellungen" });
    await user.click(customize);

    const dialog = screen.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.queryByRole("dialog", { name: "Ihre Privatsphäre" })).toBeNull();

    const necessary = within(dialog).getByRole("switch", { name: "Notwendig" });
    expect((necessary as HTMLInputElement).checked).toBe(true);
    expect((necessary as HTMLInputElement).disabled).toBe(true);

    const statistics = within(dialog).getByRole("switch", { name: "Statistik" });
    expect((statistics as HTMLInputElement).checked).toBe(false);
    await user.click(statistics);
    await user.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Statistik an")).toBeTruthy();
    expect(screen.getByTestId("status").textContent).toBe(
      JSON.stringify({ necessary: true, statistics: true, marketing: false }),
    );
  });

  it("closes on Escape and shows the banner again when nothing was decided", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Datenschutz-Einstellungen" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Ihre Privatsphäre" })).toBeTruthy();
  });

  it("traps focus with Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    const dialog = screen.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
    for (let i = 0; i < 20; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 20; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("lists services with provider, purpose and cookies, and allows a single service", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    const dialog = screen.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
    expect(within(dialog).getByText("Google Ireland Ltd.")).toBeTruthy();
    expect(within(dialog).getByText("Videos einbetten")).toBeTruthy();
    expect(within(dialog).getByText(/VISITOR_INFO1_LIVE \(Speicherdauer: 6 Monate\)/)).toBeTruthy();

    await user.click(within(dialog).getByRole("switch", { name: "YouTube" }));
    await user.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));
    expect(screen.getByTitle("Video").tagName).toBe("IFRAME");
    expect(screen.getByText("Statistik aus")).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    expect(await runAxe(document.body)).toEqual([]);
  });
});

describe("ConsentIframe", () => {
  it("shows a placeholder and loads once without storing consent", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("YouTube ist blockiert")).toBeTruthy();
    expect(
      screen.getByText(/Wenn Sie ihn laden, werden Daten an Google Ireland Ltd\. übertragen/),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Einmal laden" }));
    expect(screen.getByTitle("Video").getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/x",
    );
    expect(screen.getByRole("dialog", { name: "Ihre Privatsphäre" })).toBeTruthy();
  });

  it("can always allow the service", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Immer erlauben" }));
    expect(screen.getByTitle("Video").tagName).toBe("IFRAME");
    expect(screen.getByTestId("status").textContent).toContain('"marketing":false');
  });
});

describe("ConsentScript", () => {
  it("loads the script only after consent", async () => {
    const cfg = config();
    const user = userEvent.setup();
    render(
      <PermitoProvider config={cfg}>
        <ConsentScript category="statistics" src="https://example.com/stats.js" />
        <ConsentBanner />
      </PermitoProvider>,
    );
    expect(document.querySelector('script[src="https://example.com/stats.js"]')).toBeNull();
    await user.click(screen.getByRole("button", { name: "Alle akzeptieren" }));
    expect(document.querySelector('script[src="https://example.com/stats.js"]')).not.toBeNull();
  });
});

describe("PreferencesButton", () => {
  it("reopens the preference center with the current choice", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Alle akzeptieren" }));
    await user.click(screen.getByRole("button", { name: "Datenschutz-Einstellungen öffnen" }));
    const dialog = screen.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
    const marketing = within(dialog).getByRole("switch", { name: "Marketing" }) as HTMLInputElement;
    expect(marketing.checked).toBe(true);
    await user.click(marketing);
    await user.click(within(dialog).getByRole("button", { name: "Auswahl speichern" }));
    expect(screen.getByText("YouTube ist blockiert")).toBeTruthy();
  });
});

describe("Google Consent Mode", () => {
  it("pushes updates through the provider option", async () => {
    const user = userEvent.setup();
    render(
      <PermitoProvider config={config()} googleConsentMode>
        <ConsentBanner />
      </PermitoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Alle ablehnen" }));
    const layer = (window as unknown as { dataLayer: IArguments[] }).dataLayer;
    expect(Array.from(layer[layer.length - 1] as IArguments)[2]).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
    });
    await act(async () => {});
  });
});

describe("errors", () => {
  it("throws a clear error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ConsentBanner />)).toThrow(/inside <PermitoProvider>/);
    spy.mockRestore();
  });
});
