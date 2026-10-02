import type { ConsentManager } from "./manager";

/** Consent types defined by Google Consent Mode v2. */
export type GoogleConsentType =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

export type GoogleConsentValue = "granted" | "denied";

/**
 * Maps each Google consent type to the Permito categories that must ALL be granted.
 * Operators can override this; Permito does not decide which mapping is legally correct.
 */
export type ConsentModeMapping = Partial<Record<GoogleConsentType, string[]>>;

export const DEFAULT_CONSENT_MODE_MAPPING: Readonly<Required<ConsentModeMapping>> = {
  ad_storage: ["marketing"],
  ad_user_data: ["marketing"],
  ad_personalization: ["marketing"],
  analytics_storage: ["statistics"],
  functionality_storage: ["preferences"],
  personalization_storage: ["preferences"],
  security_storage: ["necessary"],
};

export function toGoogleConsent(
  categories: Readonly<Record<string, boolean>>,
  mapping: ConsentModeMapping = DEFAULT_CONSENT_MODE_MAPPING,
): Partial<Record<GoogleConsentType, GoogleConsentValue>> {
  const result: Partial<Record<GoogleConsentType, GoogleConsentValue>> = {};
  for (const [type, required] of Object.entries(mapping) as [GoogleConsentType, string[]][]) {
    const granted = required.length > 0 && required.every((id) => categories[id] === true);
    result[type] = granted ? "granted" : "denied";
  }
  return result;
}

export interface ConsentModeDefaultOptions {
  mapping?: ConsentModeMapping;
  /** Types that are granted by default, typically only `security_storage`. */
  grantedByDefault?: GoogleConsentType[];
  /** Milliseconds Google tags wait for the update. Defaults to 500. */
  waitForUpdate?: number;
  dataLayerName?: string;
}

/**
 * Returns the inline script that must run BEFORE any Google tag loads.
 * Render it in `<head>` (with your CSP nonce) so the default state is "denied".
 */
export function getConsentModeDefaultScript(options: ConsentModeDefaultOptions = {}): string {
  const mapping = options.mapping ?? DEFAULT_CONSENT_MODE_MAPPING;
  const granted = new Set(options.grantedByDefault ?? ["security_storage"]);
  const defaults: Record<string, GoogleConsentValue | number> = {};
  for (const type of Object.keys(mapping)) {
    defaults[type] = granted.has(type as GoogleConsentType) ? "granted" : "denied";
  }
  defaults.wait_for_update = options.waitForUpdate ?? 500;
  const layer = JSON.stringify(options.dataLayerName ?? "dataLayer");
  return (
    `window[${layer}]=window[${layer}]||[];` +
    `function gtag(){window[${layer}].push(arguments);}` +
    `gtag("consent","default",${JSON.stringify(defaults)});`
  );
}

export interface ConnectConsentModeOptions {
  mapping?: ConsentModeMapping;
  dataLayerName?: string;
}

type DataLayerWindow = Window & Record<string, unknown>;

/**
 * Sends `gtag("consent", "update", …)` whenever the visitor's decision changes.
 * Returns a cleanup function.
 */
export function connectGoogleConsentMode(
  manager: ConsentManager,
  options: ConnectConsentModeOptions = {},
): () => void {
  if (typeof window === "undefined") return () => {};
  const layerName = options.dataLayerName ?? "dataLayer";
  const win = window as unknown as DataLayerWindow;
  let last = "";

  // gtag.js only accepts real `arguments` objects, not arrays.
  function gtag(..._args: unknown[]) {
    if (!Array.isArray(win[layerName])) win[layerName] = [];
    const layer = win[layerName] as unknown[];
    // biome-ignore lint/complexity/noArguments: required by gtag.js
    layer.push(arguments);
  }

  const sync = () => {
    const snapshot = manager.getSnapshot();
    if (!snapshot.ready || !snapshot.decision) return;
    const consent = toGoogleConsent(snapshot.categories, options.mapping);
    const serialized = JSON.stringify(consent);
    if (serialized === last) return;
    last = serialized;
    gtag("consent", "update", consent);
  };

  sync();
  return manager.subscribe(sync);
}
