import { describe, expect, it } from "vitest";
import {
  getTranslations,
  resolveLanguage,
  serviceFromTemplate,
  serviceTemplates,
  translations,
} from "../src";

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();

describe("translations", () => {
  it.each(["es", "nl", "pl", "pt"])("%s is complete and keeps the placeholders", (code) => {
    const reference = translations.en as unknown as Record<string, unknown>;
    const texts = translations[code] as unknown as Record<string, unknown>;
    expect(Object.keys(texts).sort()).toEqual(Object.keys(reference).sort());
    for (const [key, value] of Object.entries(texts)) {
      if (typeof value === "string") {
        expect(value.trim(), key).not.toBe("");
        expect(placeholders(value), key).toBe(placeholders(reference[key] as string));
      }
    }
    const categories = translations[code]?.categories ?? {};
    expect(Object.keys(categories).sort()).toEqual(
      Object.keys(translations.en?.categories ?? {}).sort(),
    );
  });

  it("resolves regional tags to the new languages", () => {
    expect(resolveLanguage("es-MX")).toBe("es");
    expect(resolveLanguage("pt-BR")).toBe("pt");
    expect(getTranslations("nl-BE").acceptAll).toBe("Alles accepteren");
  });
});

describe("serviceTemplates", () => {
  it("offers 15 templates with a privacy policy URL and no cookie claims", () => {
    const all = Object.values(serviceTemplates);
    expect(all).toHaveLength(15);
    for (const template of all) {
      expect(template.privacyPolicyUrl).toMatch(/^https:\/\//);
      expect(template.cookies).toBeUndefined();
    }
  });

  it("copies a template and lets overrides win", () => {
    const service = serviceFromTemplate("youtube", { category: "preferences" });
    expect(service).toMatchObject({ id: "youtube", category: "preferences", provider: "Google" });
    expect(serviceTemplates.youtube?.category).toBe("marketing");
  });

  it("throws a helpful error for an unknown id", () => {
    expect(() => serviceFromTemplate("nope")).toThrow(/Available: youtube/);
  });
});
