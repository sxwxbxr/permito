import { afterEach, describe, expect, it } from "vitest";
import {
  type ConsentState,
  type ConsentStateV1,
  createCookieStorage,
  createLocalStorage,
  migrateConsentState,
  readConsentFromCookieHeader,
  serializeConsentState,
} from "../src";

const state: ConsentState = {
  schema: 2,
  version: "1",
  timestamp: "2026-10-02T00:00:00.000Z",
  categories: { necessary: true, statistics: false },
  purposes: { necessary: true, statistics: false },
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

describe("migration from 1.x", () => {
  it("reads a schema 1 cookie and upgrades it with purposes that follow the category", () => {
    const old: ConsentStateV1 = {
      schema: 1,
      version: "1",
      timestamp: "2026-10-02T00:00:00.000Z",
      categories: { necessary: true, statistics: true },
      services: {},
      source: "banner",
    };
    const read = readConsentFromCookieHeader(
      `permito_consent=${encodeURIComponent(serializeConsentState(old))}`,
    );
    expect(read?.schema).toBe(1);
    expect(
      migrateConsentState(read as ConsentStateV1, { newsletter: "statistics", ads: "marketing" }),
    ).toEqual({
      ...old,
      schema: 2,
      purposes: { necessary: true, statistics: true, newsletter: true, ads: false },
    });
  });

  it("rejects a schema 2 decision without purposes", () => {
    const broken = { ...state, purposes: undefined };
    expect(
      readConsentFromCookieHeader(`permito_consent=${encodeURIComponent(JSON.stringify(broken))}`),
    ).toBeNull();
  });
});
