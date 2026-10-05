import { createCookieStorage, createMemoryStorage, isConsentState } from "./storage";
import type {
  ConsentConfig,
  ConsentEvent,
  ConsentEventType,
  ConsentMode,
  ConsentSnapshot,
  ConsentSource,
  ConsentState,
  ConsentStorage,
  UpdateOptions,
} from "./types";

type EventListener<T extends ConsentEventType> = (
  event: Extract<ConsentEvent, { type: T }>,
) => void;

export interface ConsentManager {
  readonly config: Readonly<ConsentConfig>;
  /** Resolves once the stored decision has been read. */
  readonly ready: Promise<void>;
  getSnapshot(): ConsentSnapshot;
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  on<T extends ConsentEventType>(type: T, listener: EventListener<T>): () => void;
  hasConsent(category: string): boolean;
  hasServiceConsent(serviceId: string): boolean;
  acceptAll(source?: ConsentSource): Promise<void>;
  rejectAll(source?: ConsentSource): Promise<void>;
  /** Change individual categories. Unspecified categories keep their current value. */
  update(categories: Record<string, boolean>, options?: UpdateOptions): Promise<void>;
  /** Grant or deny a single service, e.g. from an embed placeholder. */
  setServiceConsent(serviceId: string, granted: boolean, source?: ConsentSource): Promise<void>;
  /** Withdraw the decision entirely. The banner is shown again. */
  reset(): Promise<void>;
  /** Export the stored decision, e.g. for a consent log. */
  exportState(): ConsentState | null;
  /** Import a decision (validated and normalised against the current config). */
  importState(state: unknown): Promise<boolean>;
  /** Stops listening to other tabs. Call when the manager is no longer used. */
  destroy(): void;
}

export class ConsentConfigError extends Error {
  override name = "ConsentConfigError";
}

function validateConfig(config: ConsentConfig): void {
  if (!config.consentVersion) throw new ConsentConfigError("consentVersion is required.");
  const categoryIds = new Set<string>();
  for (const category of config.categories) {
    if (categoryIds.has(category.id)) {
      throw new ConsentConfigError(`Duplicate category id "${category.id}".`);
    }
    categoryIds.add(category.id);
  }
  const serviceIds = new Set<string>();
  for (const service of config.services ?? []) {
    if (serviceIds.has(service.id)) {
      throw new ConsentConfigError(`Duplicate service id "${service.id}".`);
    }
    if (!categoryIds.has(service.category)) {
      throw new ConsentConfigError(
        `Service "${service.id}" references unknown category "${service.category}".`,
      );
    }
    serviceIds.add(service.id);
  }
  if (config.maxAgeDays !== undefined && !(config.maxAgeDays > 0)) {
    throw new ConsentConfigError("maxAgeDays must be a positive number.");
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_CHANNEL = "permito_consent";

function detectGpc(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

function resolveGpcCategories(config: ConsentConfig): Set<string> {
  const option = config.globalPrivacyControl;
  if (!option) return new Set();
  const settings = option === true ? {} : option;
  const signal = settings.signal ?? detectGpc();
  if (!signal) return new Set();
  return new Set(settings.categories ?? ["marketing"]);
}

export function resolveMode(config: Pick<ConsentConfig, "mode" | "region" | "regionRules">) {
  if (config.mode) return config.mode;
  if (config.region && config.regionRules?.[config.region]) {
    return config.regionRules[config.region]?.mode ?? "opt-in";
  }
  return "opt-in";
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as Promise<T> | undefined)?.then === "function";
}

function defaultStorage(): ConsentStorage {
  return typeof window === "undefined" ? createMemoryStorage() : createCookieStorage();
}

export function createConsentManager(config: ConsentConfig): ConsentManager {
  validateConfig(config);

  const storage = config.storage ?? defaultStorage();
  const mode: ConsentMode = resolveMode(config);
  const now = config.now ?? (() => new Date());
  const services = config.services ?? [];
  const requiredIds = new Set(config.categories.filter((c) => c.required).map((c) => c.id));
  const gpcCategories = resolveGpcCategories(config);
  const listeners = new Set<() => void>();
  const eventListeners = new Map<ConsentEventType, Set<(event: ConsentEvent) => void>>();

  let ready = false;
  let decision: ConsentState | null = null;

  const defaultCategories = (): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    for (const category of config.categories) {
      // Opt-in: only required categories. Opt-out applies only when the operator configured it.
      result[category.id] =
        requiredIds.has(category.id) || (mode === "opt-out" && !gpcCategories.has(category.id));
    }
    return result;
  };

  const expiresAt = (state: ConsentState): number | null => {
    if (config.maxAgeDays === undefined) return null;
    const decided = Date.parse(state.timestamp);
    return Number.isNaN(decided) ? 0 : decided + config.maxAgeDays * DAY_MS;
  };

  /** Drops unknown keys, forces required categories and rejects outdated or expired decisions. */
  const normalize = (state: ConsentState | null): ConsentState | null => {
    if (!state || !isConsentState(state)) return null;
    if (state.version !== config.consentVersion) return null;
    if (config.policyVersion && state.policyVersion !== config.policyVersion) return null;
    const expiry = expiresAt(state);
    if (expiry !== null && expiry <= now().getTime()) return null;
    const categories: Record<string, boolean> = {};
    for (const category of config.categories) {
      categories[category.id] =
        requiredIds.has(category.id) || state.categories[category.id] === true;
    }
    const serviceOverrides: Record<string, boolean> = {};
    for (const service of services) {
      const value = state.services[service.id];
      if (typeof value === "boolean") serviceOverrides[service.id] = value;
    }
    return { ...state, categories, services: serviceOverrides };
  };

  const computeSnapshot = (): ConsentSnapshot => {
    const categories = decision ? decision.categories : defaultCategories();
    const effectiveServices: Record<string, boolean> = {};
    for (const service of services) {
      effectiveServices[service.id] =
        service.requiresConsent === false ||
        (decision?.services[service.id] ?? categories[service.category] === true);
    }
    return {
      ready,
      decision,
      categories,
      services: effectiveServices,
      needsConsent: ready && decision === null,
      mode,
      globalPrivacyControl: gpcCategories.size > 0,
      expiresAt:
        decision && expiresAt(decision) !== null
          ? new Date(expiresAt(decision) as number).toISOString()
          : null,
    };
  };

  let snapshot = computeSnapshot();

  const emit = (event: ConsentEvent) => {
    for (const listener of eventListeners.get(event.type) ?? []) listener(event);
  };

  const commit = (next: ConsentState | null, nextReady = true) => {
    const previous = snapshot;
    decision = next;
    ready = nextReady;
    snapshot = computeSnapshot();
    for (const service of services) {
      const before = previous.services[service.id];
      const after = snapshot.services[service.id];
      if (previous.ready && before !== after) {
        emit(
          after
            ? { type: "service_allowed", serviceId: service.id }
            : { type: "service_blocked", serviceId: service.id },
        );
      }
    }
    for (const listener of listeners) listener();
    return previous;
  };

  const buildState = (
    categories: Record<string, boolean>,
    serviceOverrides: Record<string, boolean>,
    source: ConsentSource,
  ): ConsentState => {
    const state: ConsentState = {
      schema: 1,
      version: config.consentVersion,
      timestamp: now().toISOString(),
      categories,
      services: serviceOverrides,
      source,
    };
    if (config.policyVersion) state.policyVersion = config.policyVersion;
    if (config.region) state.region = config.region;
    if (config.language) state.language = config.language;
    return normalize(state) as ConsentState;
  };

  // Other tabs of the same site: apply their decisions without writing storage again.
  // With a custom storage (memory, demos, server-backed) syncing is opt-in, since
  // managers on one page would otherwise share decisions they do not share in storage.
  const channel =
    (config.syncTabs ?? !config.storage) &&
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(SYNC_CHANNEL)
      : null;
  const broadcast = (state: ConsentState | null) => {
    try {
      channel?.postMessage({ version: config.consentVersion, state });
    } catch {
      // A closed channel or an uncloneable custom state must never break the decision itself.
    }
  };

  const applyState = (state: ConsentState) => {
    const previous = commit(state);
    const revoked = Object.keys(state.categories).filter(
      (id) => previous.categories[id] === true && state.categories[id] === false,
    );
    emit({ type: "consent_updated", state });
    if (revoked.length > 0) emit({ type: "consent_revoked", categories: revoked });
  };

  const applyReset = () => {
    const revoked = Object.keys(snapshot.categories).filter(
      (id) => snapshot.categories[id] === true && !requiredIds.has(id),
    );
    commit(null);
    emit({ type: "consent_revoked", categories: revoked });
  };

  const persist = async (state: ConsentState) => {
    applyState(state);
    await storage.set(state);
    broadcast(state);
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { version?: unknown; state?: unknown } | null;
      if (!data || data.version !== config.consentVersion) return;
      if (data.state === null) {
        if (decision !== null) applyReset();
        return;
      }
      const next = normalize(isConsentState(data.state) ? data.state : null);
      if (next && next.timestamp !== decision?.timestamp) applyState(next);
    };
  }

  const finishLoading = (stored: ConsentState | null) => {
    commit(normalize(stored));
    emit({ type: "consent_loaded", state: decision });
  };

  let readyPromise: Promise<void>;
  if (config.initialState !== undefined) {
    decision = normalize(config.initialState);
    // On the server we stay "not ready" so no banner is rendered before hydration.
    ready = typeof window !== "undefined";
    snapshot = computeSnapshot();
    readyPromise = Promise.resolve();
  } else if (typeof window === "undefined" && !config.storage) {
    readyPromise = Promise.resolve();
  } else {
    let stored: ConsentState | null | Promise<ConsentState | null>;
    try {
      stored = storage.get();
    } catch {
      stored = null;
    }
    if (isPromise(stored)) {
      readyPromise = stored.then(finishLoading, () => finishLoading(null));
    } else {
      decision = normalize(stored);
      ready = true;
      snapshot = computeSnapshot();
      readyPromise = Promise.resolve();
    }
  }

  const manager: ConsentManager = {
    config,
    ready: readyPromise,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on(type, listener) {
      let set = eventListeners.get(type);
      if (!set) {
        set = new Set();
        eventListeners.set(type, set);
      }
      const wrapped = listener as (event: ConsentEvent) => void;
      set.add(wrapped);
      return () => set.delete(wrapped);
    },
    hasConsent: (category) => snapshot.categories[category] === true,
    hasServiceConsent: (serviceId) => snapshot.services[serviceId] === true,
    acceptAll(source = "api") {
      const categories: Record<string, boolean> = {};
      for (const category of config.categories) categories[category.id] = true;
      return persist(buildState(categories, {}, source));
    },
    rejectAll(source = "api") {
      const categories: Record<string, boolean> = {};
      for (const category of config.categories) categories[category.id] = false;
      return persist(buildState(categories, {}, source));
    },
    update(changes, options = {}) {
      const current = snapshot.categories;
      const categories = { ...current };
      const overrides = { ...(decision?.services ?? {}) };
      for (const [id, value] of Object.entries(changes)) {
        if (!(id in categories)) continue;
        if (categories[id] !== value) {
          // A category toggle resets per-service overrides inside that category.
          for (const service of services) {
            if (service.category === id) delete overrides[service.id];
          }
        }
        categories[id] = value;
      }
      Object.assign(overrides, options.services);
      return persist(buildState(categories, overrides, options.source ?? "api"));
    },
    setServiceConsent(serviceId, granted, source = "api") {
      if (!services.some((s) => s.id === serviceId)) {
        return Promise.reject(new ConsentConfigError(`Unknown service "${serviceId}".`));
      }
      const overrides = { ...(decision?.services ?? {}), [serviceId]: granted };
      return persist(buildState({ ...snapshot.categories }, overrides, source));
    },
    async reset() {
      applyReset();
      await storage.clear();
      broadcast(null);
    },
    exportState: () => (decision ? structuredClone(decision) : null),
    async importState(state) {
      if (!isConsentState(state)) return false;
      const normalized = normalize({ ...state, source: "import" });
      if (!normalized) return false;
      await persist(normalized);
      return true;
    },
    destroy() {
      channel?.close();
    },
  };

  return manager;
}
