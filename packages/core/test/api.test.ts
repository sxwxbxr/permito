import { describe, expect, it } from "vitest";
import * as core from "../src";
import * as svelte from "../src/svelte";
import * as ui from "../src/ui";
import * as vue from "../src/vue";

/*
 * API freeze candidate (0.8). These lists are the runtime exports of every entry point. A change
 * here is a change to the public API: adding is a minor release, removing or renaming is a major
 * release after 1.0. Update a list only on purpose, and mention it in the changeset.
 */
const names = (module: object) => Object.keys(module).sort();

describe("public API", () => {
  it("@permitojs/core", () => {
    expect(names(core)).toEqual([
      "BlockedUrlError",
      "ConsentConfigError",
      "DEFAULT_CONSENT_MODE_MAPPING",
      "DEFAULT_LANGUAGE",
      "DEFAULT_MAX_AGE_SECONDS",
      "DEFAULT_STORAGE_KEY",
      "activateBlockedElements",
      "connectGoogleConsentMode",
      "connectIntegrations",
      "connectMatomo",
      "connectMicrosoftClarity",
      "connectMicrosoftUet",
      "createConsentManager",
      "createCookieStorage",
      "createLocalStorage",
      "createMemoryStorage",
      "createSessionStorage",
      "format",
      "getConsentModeDefaultScript",
      "getMatomoDefaultScript",
      "getMicrosoftUetDefaultScript",
      "getTranslations",
      "isConsentState",
      "isUrlAllowed",
      "loadScript",
      "localize",
      "parseConsentState",
      "pushIntegrationDefaults",
      "pushMatomoDefault",
      "pushMicrosoftUetDefault",
      "readConsentFromCookieHeader",
      "readGpcFromHeaders",
      "resetLoadedScripts",
      "resolveLanguage",
      "resolveMode",
      "serializeConsentState",
      "serviceFromTemplate",
      "serviceTemplates",
      "toGoogleConsent",
      "translations",
    ]);
  });

  it("@permitojs/core/ui", () => {
    expect(names(ui)).toEqual(["createConsentUI"]);
  });

  it("@permitojs/core/svelte", () => {
    expect(names(svelte)).toEqual([
      "categoryStore",
      "consentStore",
      "needsConsentStore",
      "serviceStore",
    ]);
  });

  it("@permitojs/core/vue", () => {
    expect(names(vue)).toEqual(["permito", "useConsent", "useHasConsent", "useHasServiceConsent"]);
  });
});
