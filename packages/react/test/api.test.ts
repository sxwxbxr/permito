import { describe, expect, it } from "vitest";
import * as react from "../src";
import * as server from "../src/server";

/*
 * API freeze candidate (0.8). These lists are the runtime exports of every entry point. A change
 * here is a change to the public API: adding is a minor release, removing or renaming is a major
 * release after 1.0. Update a list only on purpose, and mention it in the changeset.
 */
const names = (module: object) => Object.keys(module).sort();

describe("public API", () => {
  it("@permitojs/react", () => {
    expect(names(react)).toEqual([
      "ConsentBanner",
      "ConsentGate",
      "ConsentIframe",
      "ConsentScript",
      "PermitoProvider",
      "PreferenceCenter",
      "PreferencesButton",
      "createConsentManager",
      "createCookieStorage",
      "createLocalStorage",
      "createMemoryStorage",
      "createSessionStorage",
      "useConsent",
      "useHasConsent",
      "useHasServiceConsent",
      "useIsAllowed",
      "usePermitoContext",
      "usePermitoTranslations",
    ]);
  });

  it("@permitojs/react/server", () => {
    expect(names(server)).toEqual([
      "getConsentModeDefaultScript",
      "getMatomoDefaultScript",
      "getMicrosoftUetDefaultScript",
      "isConsentState",
      "parseConsentState",
      "readConsentFromCookieHeader",
      "readGpcFromHeaders",
    ]);
  });
});
