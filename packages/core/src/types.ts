/**
 * Text that is either a plain string or a map of locale → string.
 * Lookup falls back from `de-CH` to `de` to the first available entry.
 */
export type LocalizedText = string | Readonly<Record<string, string>>;

/** Well-known category ids. Any other string id is allowed as a custom category. */
export type KnownCategoryId = "necessary" | "preferences" | "statistics" | "marketing" | "security";
export type CategoryId = KnownCategoryId | (string & {});

export interface CookieDefinition {
  name: string;
  /** Human readable lifetime, e.g. "2 Jahre" or { de: "2 Jahre", en: "2 years" }. */
  duration?: LocalizedText;
  description?: LocalizedText;
}

export interface ConsentCategoryDefinition {
  id: CategoryId;
  /** Falls back to the built-in translation for known ids. */
  name?: LocalizedText;
  description?: LocalizedText;
  /**
   * Required categories cannot be declined and are always granted.
   * Only mark a category as required if it is strictly necessary for the site to work.
   */
  required?: boolean;
  /** Free-text note for operators, e.g. the legal basis they determined. Never interpreted. */
  legalBasis?: string;
}

export interface ConsentService {
  id: string;
  name: string;
  /** Category this service belongs to. */
  category: CategoryId;
  provider?: string;
  purpose?: LocalizedText;
  description?: LocalizedText;
  cookies?: CookieDefinition[];
  dataRecipients?: string[];
  privacyPolicyUrl?: string;
  /**
   * Whether the operator has decided this service needs consent. Defaults to `true`.
   * Permito never decides this on its own.
   */
  requiresConsent?: boolean;
}

export type ConsentMode = "opt-in" | "opt-out";

export interface RegionRule {
  mode: ConsentMode;
}

export type ConsentSource = "banner" | "preferences" | "api" | "import" | "embed";

/** A stored consent decision. Contains no personal data. */
export interface ConsentState {
  /** Storage schema version, used for migrations. */
  schema: 1;
  /** The operator's consent configuration version. A mismatch triggers a new prompt. */
  version: string;
  policyVersion?: string;
  /** ISO 8601 timestamp of the decision. */
  timestamp: string;
  categories: Record<string, boolean>;
  /** Explicit per-service overrides. Services without an entry follow their category. */
  services: Record<string, boolean>;
  source: ConsentSource;
  region?: string;
  language?: string;
}

export interface ConsentStorage {
  get(): ConsentState | null | Promise<ConsentState | null>;
  set(state: ConsentState): void | Promise<void>;
  clear(): void | Promise<void>;
}

export interface ConsentConfig {
  categories: ConsentCategoryDefinition[];
  services?: ConsentService[];
  /** Bump this whenever categories or services change in a way that needs fresh consent. */
  consentVersion: string;
  policyVersion?: string;
  /** Defaults to cookie storage in the browser and memory storage on the server. */
  storage?: ConsentStorage;
  /** Region identifier supplied by the operator (Permito never geolocates). */
  region?: string;
  /** Explicit mode. Takes precedence over `regionRules`. Defaults to `"opt-in"`. */
  mode?: ConsentMode;
  regionRules?: Record<string, RegionRule>;
  language?: string;
  /** Previously stored state, e.g. parsed from the request cookie during SSR. */
  initialState?: ConsentState | null;
  /**
   * Ask again once a decision is older than this many days, regardless of where it is stored.
   * Supervisory authorities commonly recommend 6 to 13 months. Default: no expiry beyond the storage lifetime.
   */
  maxAgeDays?: number;
  /**
   * Honour the Global Privacy Control signal (`Sec-GPC` header / `navigator.globalPrivacyControl`).
   * While the visitor has not decided, the listed categories default to declined, also in opt-out mode.
   * `true` applies to `marketing`. Default: off.
   */
  globalPrivacyControl?: boolean | GlobalPrivacyControlOptions;
  /**
   * Apply decisions made in another tab of the same site immediately (BroadcastChannel).
   * Default `true` with the built-in cookie storage, `false` when you pass your own `storage`.
   */
  syncTabs?: boolean;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface GlobalPrivacyControlOptions {
  /** Categories that default to declined while the signal is present. Default `["marketing"]`. */
  categories?: string[];
  /**
   * The signal itself. Pass the result of `readGpcFromHeaders()` during SSR.
   * Default: `navigator.globalPrivacyControl` in the browser.
   */
  signal?: boolean;
}

export type ConsentEvent =
  | { type: "consent_loaded"; state: ConsentState | null }
  | { type: "consent_updated"; state: ConsentState }
  | { type: "consent_revoked"; categories: string[] }
  | { type: "service_allowed"; serviceId: string }
  | { type: "service_blocked"; serviceId: string };

export type ConsentEventType = ConsentEvent["type"];

/** Immutable snapshot of the manager, suitable for `useSyncExternalStore`. */
export interface ConsentSnapshot {
  /** `false` until the stored decision has been read. */
  ready: boolean;
  /** The stored, valid decision, or `null` if the visitor has not decided yet. */
  decision: ConsentState | null;
  /** Effective category consent (includes defaults when no decision exists). */
  categories: Readonly<Record<string, boolean>>;
  /** Effective consent per configured service. */
  services: Readonly<Record<string, boolean>>;
  /** `true` when the banner should be shown. */
  needsConsent: boolean;
  mode: ConsentMode;
  /** `true` when a Global Privacy Control signal is present and honoured. */
  globalPrivacyControl: boolean;
  /** ISO 8601 timestamp after which the stored decision expires (`maxAgeDays`), or `null`. */
  expiresAt: string | null;
}

export interface UpdateOptions {
  services?: Record<string, boolean>;
  source?: ConsentSource;
}
