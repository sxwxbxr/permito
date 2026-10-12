import type { ConsentManager } from "./manager";
import type { ConsentState } from "./types";

/** Value of `format` in every payload. The number changes only with a breaking change to the payload. */
export const CONSENT_WEBHOOK_FORMAT = "permito.consent/2";

export type ConsentWebhookEvent = "consent_updated" | "consent_reset";

/**
 * What `connectConsentWebhook` sends. It contains the decision, never personal data, unless the
 * operator passes a `subject`.
 */
export interface ConsentWebhookPayload {
  format: typeof CONSENT_WEBHOOK_FORMAT;
  /**
   * Idempotency key: identical for retries of the same decision. Receivers should store it
   * and ignore a payload with an id they already processed.
   */
  id: string;
  event: ConsentWebhookEvent;
  /** ISO 8601 time the payload was created. */
  sentAt: string;
  /** ISO 8601 time of the decision, or `null` after a reset. */
  decidedAt: string | null;
  consentVersion: string;
  policyVersion?: string;
  source?: string;
  region?: string;
  language?: string;
  /** Effective consent per purpose. After a reset these are the defaults (only required purposes in opt-in mode). */
  purposes: Record<string, boolean>;
  categories: Record<string, boolean>;
  /** Effective consent per configured service. */
  services: Record<string, boolean>;
  /** What this change withdrew. Systems that hold data for these purposes must stop processing. */
  revoked: { purposes: string[]; categories: string[]; services: string[] };
  /** Pseudonymous id of the visitor, only if the operator supplies one. */
  subject?: string;
}

export interface ConnectConsentWebhookOptions {
  /** Endpoint that receives the payload as a POST with a JSON body. */
  url: string;
  /**
   * Extra request headers. Setting any forces `fetch`, since `sendBeacon` cannot send headers.
   * Never put a secret here: it would be readable in the browser.
   */
  headers?: Record<string, string>;
  /**
   * Identifier of the visitor in your own systems (a pseudonymous customer id, for example),
   * so the receiver knows whose consent changed. Adding it is your decision as the operator.
   */
  subject?: string | (() => string | undefined);
  /** Retries after a network error or a 5xx response, with growing delay. Default 2. */
  retries?: number;
  /** First retry delay in milliseconds, doubled for each further retry. Default 1000. */
  retryDelayMs?: number;
  /** Called when a payload could not be delivered after all retries. */
  onError?: (error: unknown, payload: ConsentWebhookPayload) => void;
  /** Called after a payload was accepted by the endpoint (or queued by `sendBeacon`). */
  onSent?: (payload: ConsentWebhookPayload) => void;
  /** Injectable transport for tests and non-browser use. Default: global `fetch`. */
  fetch?: typeof fetch;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function revokedIds(before: Record<string, boolean>, after: Record<string, boolean>): string[] {
  return Object.keys(before).filter((id) => before[id] === true && after[id] !== true);
}

/**
 * Tells your own backend whenever the visitor's consent changes, with the same purpose ids the
 * browser uses, so CRM, e-mail tool and analytics backend can follow a withdrawal.
 *
 * Only the tab where the visitor decided sends, other tabs of the site stay quiet. Returns a function
 * that stops sending.
 */
export function connectConsentWebhook(
  manager: ConsentManager,
  options: ConnectConsentWebhookOptions,
): () => void {
  const retries = options.retries ?? 2;
  const retryDelay = options.retryDelayMs ?? 1000;
  const doFetch = options.fetch ?? (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  const subject = () =>
    typeof options.subject === "function" ? options.subject() : options.subject;

  let last = manager.getSnapshot();

  const deliver = async (payload: ConsentWebhookPayload) => {
    const body = JSON.stringify(payload);
    // Without headers, sendBeacon survives page unloads. text/plain avoids a CORS preflight.
    if (
      !options.headers &&
      !options.fetch &&
      typeof navigator !== "undefined" &&
      navigator.sendBeacon
    ) {
      try {
        if (navigator.sendBeacon(options.url, new Blob([body], { type: "text/plain" }))) {
          options.onSent?.(payload);
          return;
        }
      } catch {
        // fall through to fetch
      }
    }
    if (!doFetch) {
      options.onError?.(new Error("No fetch available."), payload);
      return;
    }
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await wait(retryDelay * 2 ** (attempt - 1));
      try {
        const response = await doFetch(options.url, {
          method: "POST",
          headers: { "content-type": "application/json", ...options.headers },
          body,
          keepalive: true,
          credentials: "omit",
        });
        if (response.ok) {
          options.onSent?.(payload);
          return;
        }
        lastError = new Error(`Webhook answered ${response.status}.`);
        // A 4xx will not get better by repeating it.
        if (response.status < 500) break;
      } catch (error) {
        lastError = error;
      }
    }
    options.onError?.(lastError, payload);
  };

  const build = (
    event: ConsentWebhookEvent,
    state: ConsentState | null,
    revoked: ConsentWebhookPayload["revoked"],
  ): ConsentWebhookPayload => {
    const snapshot = manager.getSnapshot();
    const config = manager.config;
    const payload: ConsentWebhookPayload = {
      format: CONSENT_WEBHOOK_FORMAT,
      id: `${config.consentVersion}:${state?.timestamp ?? new Date().toISOString()}:${event}`,
      event,
      sentAt: new Date().toISOString(),
      decidedAt: state?.timestamp ?? null,
      consentVersion: config.consentVersion,
      purposes: { ...snapshot.purposes },
      categories: { ...snapshot.categories },
      services: { ...snapshot.services },
      revoked,
    };
    if (config.policyVersion) payload.policyVersion = config.policyVersion;
    if (state?.source) payload.source = state.source;
    if (state?.region) payload.region = state.region;
    if (state?.language) payload.language = state.language;
    const who = subject();
    if (who) payload.subject = who;
    return payload;
  };

  const stopLoaded = manager.on("consent_loaded", () => {
    last = manager.getSnapshot();
  });

  const stopUpdated = manager.on("consent_updated", (event) => {
    const before = last;
    last = manager.getSnapshot();
    if (event.origin !== "local") return;
    void deliver(
      build("consent_updated", event.state, {
        purposes: revokedIds(before.purposes, last.purposes),
        categories: revokedIds(before.categories, last.categories),
        services: revokedIds(before.services, last.services),
      }),
    );
  });

  const stopRevoked = manager.on("consent_revoked", (event) => {
    const snapshot = manager.getSnapshot();
    // consent_revoked after a change is covered by consent_updated. Only a reset stands alone.
    if (snapshot.decision !== null) return;
    const before = last;
    last = snapshot;
    if (event.origin !== "local") return;
    void deliver(
      build("consent_reset", null, {
        purposes: revokedIds(before.purposes, snapshot.purposes),
        categories: revokedIds(before.categories, snapshot.categories),
        services: revokedIds(before.services, snapshot.services),
      }),
    );
  });

  return () => {
    stopLoaded();
    stopUpdated();
    stopRevoked();
  };
}

const isBooleanMap = (value: unknown): value is Record<string, boolean> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((v) => typeof v === "boolean");

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

/**
 * Server helper: validates a webhook body (already parsed from JSON or `text/plain`) and returns it
 * typed, or `null` if it is not a Permito consent payload of this format.
 */
export function parseConsentWebhookPayload(body: unknown): ConsentWebhookPayload | null {
  let value = body;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const revoked = v.revoked as Record<string, unknown> | undefined;
  const ok =
    v.format === CONSENT_WEBHOOK_FORMAT &&
    typeof v.id === "string" &&
    (v.event === "consent_updated" || v.event === "consent_reset") &&
    typeof v.sentAt === "string" &&
    (v.decidedAt === null || typeof v.decidedAt === "string") &&
    typeof v.consentVersion === "string" &&
    isBooleanMap(v.purposes) &&
    isBooleanMap(v.categories) &&
    isBooleanMap(v.services) &&
    typeof revoked === "object" &&
    revoked !== null &&
    isStringList(revoked.purposes) &&
    isStringList(revoked.categories) &&
    isStringList(revoked.services) &&
    (v.subject === undefined || typeof v.subject === "string");
  return ok ? (v as unknown as ConsentWebhookPayload) : null;
}
