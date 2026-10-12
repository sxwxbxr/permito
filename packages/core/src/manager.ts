import {
  createCookieStorage,
  createMemoryStorage,
  isConsentState,
  migrateConsentState,
} from "./storage";
import type {
  ConsentConfig,
  ConsentEvent,
  ConsentEventOrigin,
  ConsentEventType,
  ConsentMode,
  ConsentPurposeDefinition,
  ConsentSnapshot,
  ConsentSource,
  ConsentState,
  ConsentStateV1,
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
  /** Whether a purpose is granted: its category is granted and the purpose was not declined. */
  hasPurposeConsent(purposeId: string): boolean;
  acceptAll(source?: ConsentSource): Promise<void>;
  rejectAll(source?: ConsentSource): Promise<void>;
  /** Change individual categories. Unspecified categories keep their current value. */
  update(categories: Record<string, boolean>, options?: UpdateOptions): Promise<void>;
  /** Decline or grant a single purpose inside a granted category. */
  setPurposeConsent(purposeId: string, granted: boolean, source?: ConsentSource): Promise<void>;
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
  const purposeIds = new Set<string>();
  for (const purpose of config.purposes ?? []) {
    if (purposeIds.has(purpose.id)) {
      throw new ConsentConfigError(`Duplicate purpose id "${purpose.id}".`);
    }
    if (!categoryIds.has(purpose.category)) {
      throw new ConsentConfigError(
        `Purpose "${purpose.id}" references unknown category "${purpose.category}".`,
      );
    }
    purposeIds.add(purpose.id);
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
    for (const purposeId of service.purposes ?? []) {
      if (!purposeIds.has(purposeId) && !categoryIds.has(purposeId)) {
        throw new ConsentConfigError(
          `Service "${service.id}" references unknown purpose "${purposeId}".`,
        );
      }
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

/**
 * The purposes of a config: the explicit ones plus one implicit purpose (same id) for every
 * category that has none and whose id is not taken.
 */
export function resolvePurposes(
  config: Pick<ConsentConfig, "categories" | "purposes">,
): ConsentPurposeDefinition[] {
  const explicit = config.purposes ?? [];
  const used = new Set(explicit.map((p) => p.id));
  const covered = new Set(explicit.map((p) => p.category));
  const implicit: ConsentPurposeDefinition[] = config.categories
    .filter((c) => !covered.has(c.id) && !used.has(c.id))
    .map((c) => ({ id: c.id, category: c.id }));
  return [...explicit, ...implicit];
}

export function createConsentManager(config: ConsentConfig): ConsentManager {
  validateConfig(config);

  const storage = config.storage ?? defaultStorage();
  const mode: ConsentMode = resolveMode(config);
  const now = config.now ?? (() => new Date());
  const services = config.services ?? [];
  const purposeDefs = resolvePurposes(config);
  const purposeCategory: Record<string, string> = {};
  for (const purpose of purposeDefs) purposeCategory[purpose.id] = purpose.category;
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

  const purposesFor = (
    categories: Record<string, boolean>,
    declined: Record<string, boolean> = {},
  ): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    for (const purpose of purposeDefs) {
      const category = purpose.category;
      result[purpose.id] =
        requiredIds.has(category) ||
        (categories[category] === true && declined[purpose.id] !== false);
    }
    return result;
  };

  const expiresAt = (state: ConsentState): number | null => {
    if (config.maxAgeDays === undefined) return null;
    const decided = Date.parse(state.timestamp);
    return Number.isNaN(decided) ? 0 : decided + config.maxAgeDays * DAY_MS;
  };

  /** Drops unknown keys, forces required categories and rejects outdated or expired decisions. */
  const normalize = (input: ConsentState | ConsentStateV1 | null): ConsentState | null => {
    if (!input || !isConsentState(input)) return null;
    // One-time mapping of a 1.x decision: purposes follow their category.
    const state = migrateConsentState(input, purposeCategory);
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
    return {
      ...state,
      categories,
      purposes: purposesFor(categories, state.purposes),
      services: serviceOverrides,
    };
  };

  const computeSnapshot = (): ConsentSnapshot => {
    const categories = decision ? decision.categories : defaultCategories();
    const purposes = decision ? decision.purposes : purposesFor(categories);
    const effectiveServices: Record<string, boolean> = {};
    for (const service of services) {
      effectiveServices[service.id] =
        service.requiresConsent === false ||
        (decision?.services[service.id] ??
          (categories[service.category] === true &&
            (service.purposes ?? []).every((id) => (purposes[id] ?? categories[id]) === true)));
    }
    return {
      ready,
      decision,
      categories,
      purposes,
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
    purposes: Record<string, boolean> = {},
  ): ConsentState => {
    const state: ConsentState = {
      schema: 2,
      version: config.consentVersion,
      timestamp: now().toISOString(),
      categories,
      purposes,
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

  const applyState = (state: ConsentState, origin: ConsentEventOrigin = "local") => {
    const previous = commit(state);
    const revoked = Object.keys(state.categories).filter(
      (id) => previous.categories[id] === true && state.categories[id] === false,
    );
    const revokedPurposes = Object.keys(state.purposes).filter(
      (id) => previous.purposes[id] === true && state.purposes[id] === false,
    );
    emit({ type: "consent_updated", state, origin });
    if (revoked.length > 0 || revokedPurposes.length > 0) {
      emit({ type: "consent_revoked", categories: revoked, purposes: revokedPurposes, origin });
    }
  };

  const applyReset = (origin: ConsentEventOrigin = "local") => {
    const revoked = Object.keys(snapshot.categories).filter(
      (id) => snapshot.categories[id] === true && !requiredIds.has(id),
    );
    const revokedPurposes = Object.keys(snapshot.purposes).filter(
      (id) => snapshot.purposes[id] === true && !requiredIds.has(purposeCategory[id] ?? ""),
    );
    commit(null);
    emit({ type: "consent_revoked", categories: revoked, purposes: revokedPurposes, origin });
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
        if (decision !== null) applyReset("tab");
        return;
      }
      const next = normalize(isConsentState(data.state) ? data.state : null);
      if (next && next.timestamp !== decision?.timestamp) applyState(next, "tab");
    };
  }

  const finishLoading = (stored: ConsentState | ConsentStateV1 | null) => {
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
    let stored: ReturnType<ConsentStorage["get"]>;
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
    hasPurposeConsent: (purposeId) => snapshot.purposes[purposeId] === true,
    acceptAll(source = "api") {
      const categories: Record<string, boolean> = {};
      for (const category of config.categories) categories[category.id] = true;
      return persist(buildState(categories, {}, source, purposesFor(categories)));
    },
    rejectAll(source = "api") {
      const categories: Record<string, boolean> = {};
      for (const category of config.categories) categories[category.id] = false;
      return persist(buildState(categories, {}, source, purposesFor(categories)));
    },
    update(changes, options = {}) {
      const current = snapshot.categories;
      const categories = { ...current };
      const overrides = { ...(decision?.services ?? {}) };
      const purposes = { ...snapshot.purposes };
      for (const [id, value] of Object.entries(changes)) {
        if (!(id in categories)) continue;
        if (categories[id] !== value) {
          // A category toggle sets every purpose inside it to the same value.
          for (const purpose of purposeDefs) {
            if (purpose.category === id) purposes[purpose.id] = value;
          }
          // A category toggle resets per-service overrides inside that category.
          for (const service of services) {
            if (service.category === id) delete overrides[service.id];
          }
        }
        categories[id] = value;
      }
      Object.assign(overrides, options.services);
      for (const [id, value] of Object.entries(options.purposes ?? {})) {
        if (id in purposes) purposes[id] = value;
      }
      return persist(
        buildState(
          categories,
          overrides,
          options.source ?? "api",
          purposesFor(categories, purposes),
        ),
      );
    },
    setServiceConsent(serviceId, granted, source = "api") {
      if (!services.some((s) => s.id === serviceId)) {
        return Promise.reject(new ConsentConfigError(`Unknown service "${serviceId}".`));
      }
      const overrides = { ...(decision?.services ?? {}), [serviceId]: granted };
      return persist(
        buildState({ ...snapshot.categories }, overrides, source, { ...snapshot.purposes }),
      );
    },
    setPurposeConsent(purposeId, granted, source = "api") {
      if (!(purposeId in purposeCategory)) {
        return Promise.reject(new ConsentConfigError(`Unknown purpose "${purposeId}".`));
      }
      const purposes = { ...snapshot.purposes, [purposeId]: granted };
      return persist(
        buildState(
          { ...snapshot.categories },
          { ...(decision?.services ?? {}) },
          source,
          purposesFor({ ...snapshot.categories }, purposes),
        ),
      );
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
