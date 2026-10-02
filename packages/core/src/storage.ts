import type { ConsentState, ConsentStorage } from "./types";

export const DEFAULT_STORAGE_KEY = "permito_consent";
/** 180 days. Operators should align this with their own retention decision. */
export const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === "boolean");
}

/** Runtime validation for data read from untrusted storage. */
export function isConsentState(value: unknown): value is ConsentState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema === 1 &&
    typeof v.version === "string" &&
    typeof v.timestamp === "string" &&
    isBooleanRecord(v.categories) &&
    isBooleanRecord(v.services) &&
    typeof v.source === "string" &&
    (v.policyVersion === undefined || typeof v.policyVersion === "string") &&
    (v.region === undefined || typeof v.region === "string") &&
    (v.language === undefined || typeof v.language === "string")
  );
}

export function serializeConsentState(state: ConsentState): string {
  return JSON.stringify(state);
}

export function parseConsentState(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface CookieStorageOptions {
  name?: string;
  /** Cookie domain, e.g. ".example.com" to share consent across subdomains. */
  domain?: string;
  path?: string;
  maxAgeSeconds?: number;
  sameSite?: "Lax" | "Strict" | "None";
  /** Defaults to `true` on https pages. */
  secure?: boolean;
}

function readCookie(cookieString: string, name: string): string | null {
  for (const part of cookieString.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Reads a stored decision from a `Cookie` request header. Use this on the server
 * (Next.js, React Router, plain Node) to pass `initialState` and avoid hydration mismatches.
 */
export function readConsentFromCookieHeader(
  cookieHeader: string | null | undefined,
  name: string = DEFAULT_STORAGE_KEY,
): ConsentState | null {
  if (!cookieHeader) return null;
  return parseConsentState(readCookie(cookieHeader, name));
}

export function createCookieStorage(options: CookieStorageOptions = {}): ConsentStorage {
  const name = options.name ?? DEFAULT_STORAGE_KEY;
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  const attributes = (expire: boolean) => {
    const parts = [`Path=${path}`, `SameSite=${sameSite}`, `Max-Age=${expire ? 0 : maxAge}`];
    if (options.domain) parts.push(`Domain=${options.domain}`);
    const secure = options.secure ?? (sameSite === "None" || window.location.protocol === "https:");
    if (secure) parts.push("Secure");
    return parts.join("; ");
  };

  return {
    get() {
      if (!isBrowser()) return null;
      return parseConsentState(readCookie(document.cookie, name));
    },
    set(state) {
      if (!isBrowser()) return;
      const value = encodeURIComponent(serializeConsentState(state));
      // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not available in all supported browsers.
      document.cookie = `${name}=${value}; ${attributes(false)}`;
    },
    clear() {
      if (!isBrowser()) return;
      // biome-ignore lint/suspicious/noDocumentCookie: see above.
      document.cookie = `${name}=; ${attributes(true)}`;
    },
  };
}

function createWebStorage(getStore: () => Storage | undefined, key: string): ConsentStorage {
  const store = () => {
    try {
      return isBrowser() ? getStore() : undefined;
    } catch {
      // Access can throw in sandboxed iframes or with storage disabled.
      return undefined;
    }
  };
  return {
    get() {
      return parseConsentState(store()?.getItem(key));
    },
    set(state) {
      try {
        store()?.setItem(key, serializeConsentState(state));
      } catch {
        // Quota exceeded or storage disabled: consent stays valid for this page view only.
      }
    },
    clear() {
      store()?.removeItem(key);
    },
  };
}

export function createLocalStorage(key: string = DEFAULT_STORAGE_KEY): ConsentStorage {
  return createWebStorage(() => window.localStorage, key);
}

export function createSessionStorage(key: string = DEFAULT_STORAGE_KEY): ConsentStorage {
  return createWebStorage(() => window.sessionStorage, key);
}

export function createMemoryStorage(initial: ConsentState | null = null): ConsentStorage {
  let current = initial;
  return {
    get: () => current,
    set: (state) => {
      current = state;
    },
    clear: () => {
      current = null;
    },
  };
}
