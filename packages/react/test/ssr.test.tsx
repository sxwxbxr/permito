// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ConsentBanner,
  type ConsentConfig,
  ConsentGate,
  ConsentIframe,
  ConsentScript,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
} from "../src";
import { readConsentFromCookieHeader } from "../src/server";

const config: ConsentConfig = {
  consentVersion: "1",
  language: "de",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }],
};

const page = (cfg: ConsentConfig) =>
  renderToString(
    <PermitoProvider config={cfg}>
      <ConsentGate category="statistics" fallback={<span>blocked</span>}>
        <span>allowed</span>
      </ConsentGate>
      <ConsentScript category="statistics" src="https://example.com/a.js" />
      <ConsentIframe category="statistics" src="https://example.com/embed" title="Embed" />
      <ConsentBanner />
      <PreferenceCenter />
      <PreferencesButton />
    </PermitoProvider>,
  );

describe("server rendering", () => {
  it("renders without window or document and without any gated content", () => {
    expect(typeof window).toBe("undefined");
    const html = page(config);
    expect(html).toContain("blocked");
    expect(html).not.toContain("allowed");
    expect(html).not.toContain("example.com/a.js");
    expect(html).not.toContain("<iframe");
    // The banner is client-only to avoid hydration mismatches and flashes.
    expect(html).not.toContain('data-permito="banner"');
  });

  it("renders allowed content from the request cookie", () => {
    const state = {
      schema: 1,
      version: "1",
      timestamp: "2026-10-02T00:00:00.000Z",
      categories: { necessary: true, statistics: true },
      services: {},
      source: "banner",
    };
    const header = `permito_consent=${encodeURIComponent(JSON.stringify(state))}`;
    const html = page({ ...config, initialState: readConsentFromCookieHeader(header) });
    expect(html).toContain("allowed");
    expect(html).toContain("<iframe");
    expect(html).not.toContain("example.com/a.js");
  });
});
