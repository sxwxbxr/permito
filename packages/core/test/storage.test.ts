import { afterEach, describe, expect, it } from "vitest";
import {
  type ConsentState,
  createCookieStorage,
  createLocalStorage,
  readConsentFromCookieHeader,
  serializeConsentState,
} from "../src";

const state: ConsentState = {
  schema: 1,
  version: "1",
  timestamp: "2026-10-02T00:00:00.000Z",
  categories: { necessary: true, statistics: false },
  services: {},
  source: "banner",
};

afterEach(() => {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    // biome-ignore lint/suspicious/noDocumentCookie: test cleanup
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  localStorage.clear();
});

describe("cookie storage", () => {
  it("writes and reads a decision", () => {
    const storage = createCookieStorage();
    storage.set(state);
    expect(document.cookie).toContain("permito_consent=");
    expect(storage.get()).toEqual(state);
  });

  it("clears the cookie", () => {
    const storage = createCookieStorage({ name: "custom" });
    storage.set(state);
    storage.clear();
    expect(storage.get()).toBeNull();
  });

  it("returns null for malformed cookies", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "permito_consent=%7Bnot-json; Path=/";
    expect(createCookieStorage().get()).toBeNull();
  });
});

describe("readConsentFromCookieHeader", () => {
  it("parses the cookie header on the server", () => {
    const header = `a=1; permito_consent=${encodeURIComponent(serializeConsentState(state))}; b=2`;
    expect(readConsentFromCookieHeader(header)).toEqual(state);
  });

  it("returns null when missing or invalid", () => {
    expect(readConsentFromCookieHeader(undefined)).toBeNull();
    expect(readConsentFromCookieHeader("permito_consent=%E0%A4%A")).toBeNull();
    expect(readConsentFromCookieHeader("permito_consent=%7B%7D")).toBeNull();
  });
});

describe("localStorage", () => {
  it("writes and reads a decision", () => {
    const storage = createLocalStorage();
    storage.set(state);
    expect(storage.get()).toEqual(state);
    storage.clear();
    expect(storage.get()).toBeNull();
  });
});
