import type { ConsentManager } from "./manager";

/*
 * Consent bridges for tools that have their own consent API besides Google Consent Mode:
 * Microsoft UET (Bing Ads), Microsoft Clarity and Matomo. Each bridge only forwards the
 * visitor's decision; which category a tool belongs to is the operator's decision.
 */

type QueueWindow = Window & Record<string, unknown>;

function win(): QueueWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as QueueWindow);
}

function allGranted(categories: Readonly<Record<string, boolean>>, required: readonly string[]) {
  return required.length > 0 && required.every((id) => categories[id] === true);
}

/** Sends the signal for the current decision and on every change, skipping repeats. */
function bridge<T>(
  manager: ConsentManager,
  compute: (categories: Readonly<Record<string, boolean>>) => T,
  send: (signal: T) => void,
): () => void {
  let last: string | undefined;
  const sync = () => {
    const snapshot = manager.getSnapshot();
    if (!snapshot.ready || !snapshot.decision) return;
    const signal = compute(snapshot.categories);
    const key = JSON.stringify(signal);
    if (key === last) return;
    last = key;
    send(signal);
  };
  sync();
  return manager.subscribe(sync);
}

function queue(name: string): unknown[] {
  const w = win() as QueueWindow;
  if (!Array.isArray(w[name]) && typeof w[name] !== "object") w[name] = [];
  return w[name] as unknown[];
}

// ---------------------------------------------------------------------------
// Microsoft UET (Microsoft Advertising)

export interface MicrosoftUetOptions {
  /** Categories that must all be granted for `ad_storage`. Default `["marketing"]`. */
  categories?: string[];
  /** Name of the UET queue. Default `"uetq"`. */
  queueName?: string;
}

/**
 * Inline script that sets the UET consent default to "denied". Render it in `<head>`
 * before the UET tag.
 */
export function getMicrosoftUetDefaultScript(options: Pick<MicrosoftUetOptions, "queueName"> = {}) {
  const name = JSON.stringify(options.queueName ?? "uetq");
  return `window[${name}]=window[${name}]||[];window[${name}].push("consent","default",{"ad_storage":"denied"});`;
}

/** Pushes the UET consent default ("denied") directly. Call before the UET tag loads. */
export function pushMicrosoftUetDefault(options: Pick<MicrosoftUetOptions, "queueName"> = {}) {
  if (!win()) return;
  (queue(options.queueName ?? "uetq") as { push: (...args: unknown[]) => void }).push(
    "consent",
    "default",
    { ad_storage: "denied" },
  );
}

/** Sends `uetq.push("consent", "update", { ad_storage })` whenever the decision changes. */
export function connectMicrosoftUet(
  manager: ConsentManager,
  options: MicrosoftUetOptions = {},
): () => void {
  if (!win()) return () => {};
  const required = options.categories ?? ["marketing"];
  const name = options.queueName ?? "uetq";
  return bridge(
    manager,
    (categories) => (allGranted(categories, required) ? "granted" : "denied"),
    // The live UET object replaces the array but keeps a compatible push().
    (value) =>
      (queue(name) as { push: (...args: unknown[]) => void }).push("consent", "update", {
        ad_storage: value,
      }),
  );
}

// ---------------------------------------------------------------------------
// Microsoft Clarity

export interface ClarityOptions {
  /** Categories that must all be granted for `analytics_Storage`. Default `["statistics"]`. */
  analytics?: string[];
  /** Categories that must all be granted for `ad_Storage`. Default `["marketing"]`. */
  ads?: string[];
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

/** Same stub as Clarity's own snippet: queues calls until the tag has loaded. */
function clarity(): ClarityFn {
  const w = win() as QueueWindow;
  if (typeof w.clarity !== "function") {
    const stub: ClarityFn = function (this: unknown) {
      if (!stub.q) stub.q = [];
      // biome-ignore lint/complexity/noArguments: Clarity's queue stores the arguments object
      stub.q.push(arguments);
    };
    w.clarity = stub;
  }
  return w.clarity as ClarityFn;
}

/**
 * Sends Clarity's consent signal (`clarity("consentv2", …)`) whenever the decision changes.
 * Without a granted signal Clarity runs without cookies.
 */
export function connectMicrosoftClarity(
  manager: ConsentManager,
  options: ClarityOptions = {},
): () => void {
  if (!win()) return () => {};
  const analytics = options.analytics ?? ["statistics"];
  const ads = options.ads ?? ["marketing"];
  return bridge(
    manager,
    (categories) => ({
      ad_Storage: allGranted(categories, ads) ? "granted" : "denied",
      analytics_Storage: allGranted(categories, analytics) ? "granted" : "denied",
    }),
    (signal) => clarity()("consentv2", signal),
  );
}

// ---------------------------------------------------------------------------
// Matomo

export interface MatomoOptions {
  /** Categories that must all be granted. Default `["statistics"]`. */
  categories?: string[];
  /**
   * `"tracking"`: no tracking at all without consent (`requireConsent`).
   * `"cookies"`: cookieless tracking without consent (`requireCookieConsent`). Default `"tracking"`.
   */
  mode?: "tracking" | "cookies";
}

/**
 * Inline script that makes Matomo wait for consent. Render it before the Matomo snippet,
 * or push the same command yourself before `trackPageView`.
 */
export function getMatomoDefaultScript(options: Pick<MatomoOptions, "mode"> = {}) {
  const command = options.mode === "cookies" ? "requireCookieConsent" : "requireConsent";
  return `window._paq=window._paq||[];window._paq.push([${JSON.stringify(command)}]);`;
}

/** Pushes `requireConsent` (or `requireCookieConsent`) directly. Call before the Matomo snippet. */
export function pushMatomoDefault(options: Pick<MatomoOptions, "mode"> = {}) {
  if (!win()) return;
  queue("_paq").push([options.mode === "cookies" ? "requireCookieConsent" : "requireConsent"]);
}

/**
 * Gives or withdraws Matomo consent whenever the decision changes. Permito stores the
 * decision, so Matomo gets the non-persistent commands (`setConsentGiven`) on every page view.
 */
export function connectMatomo(manager: ConsentManager, options: MatomoOptions = {}): () => void {
  if (!win()) return () => {};
  const required = options.categories ?? ["statistics"];
  const cookies = options.mode === "cookies";
  return bridge(
    manager,
    (categories) => allGranted(categories, required),
    (granted) => {
      const command = granted
        ? cookies
          ? "setCookieConsentGiven"
          : "setConsentGiven"
        : cookies
          ? "forgetCookieConsentGiven"
          : "forgetConsentGiven";
      queue("_paq").push([command]);
    },
  );
}

// ---------------------------------------------------------------------------

export interface IntegrationOptions {
  microsoftUet?: boolean | MicrosoftUetOptions;
  clarity?: boolean | ClarityOptions;
  matomo?: boolean | MatomoOptions;
}

const opts = <T>(value: boolean | T | undefined): T | null =>
  value === true ? ({} as T) : value || null;

/** Connects every enabled bridge. Returns one cleanup function. */
export function connectIntegrations(
  manager: ConsentManager,
  options: IntegrationOptions,
): () => void {
  const cleanups: Array<() => void> = [];
  const uet = opts(options.microsoftUet);
  const clarityOptions = opts(options.clarity);
  const matomo = opts(options.matomo);
  if (uet) cleanups.push(connectMicrosoftUet(manager, uet));
  if (clarityOptions) cleanups.push(connectMicrosoftClarity(manager, clarityOptions));
  if (matomo) cleanups.push(connectMatomo(manager, matomo));
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/** Pushes the "wait for consent" defaults of the enabled bridges. Clarity needs none. */
export function pushIntegrationDefaults(options: IntegrationOptions) {
  const uet = opts(options.microsoftUet);
  const matomo = opts(options.matomo);
  if (uet) pushMicrosoftUetDefault(uet);
  if (matomo) pushMatomoDefault(matomo);
}
