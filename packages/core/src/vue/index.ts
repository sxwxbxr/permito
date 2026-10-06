import {
  type App,
  type ComputedRef,
  computed,
  getCurrentScope,
  type InjectionKey,
  inject,
  onScopeDispose,
  type ShallowRef,
  shallowRef,
} from "vue";
import type { ConsentManager } from "../manager";
import type { ConsentSnapshot, ConsentSource, UpdateOptions } from "../types";

/** Vue 3 adapter. `vue` is an optional peer dependency, only needed when you import this file. */

const KEY: InjectionKey<ConsentManager> = Symbol("permito");

/** `app.use(permito(manager))` makes the manager available to `useConsent()` in every component. */
export function permito(manager: ConsentManager) {
  return {
    install(app: App) {
      app.provide(KEY, manager);
    },
  };
}

export interface UseConsentResult {
  /** Reactive snapshot of the manager. */
  snapshot: Readonly<ShallowRef<ConsentSnapshot>>;
  hasConsent: (category: string) => boolean;
  hasServiceConsent: (serviceId: string) => boolean;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  update: (categories: Record<string, boolean>, options?: UpdateOptions) => Promise<void>;
  setServiceConsent: (serviceId: string, granted: boolean, source?: ConsentSource) => Promise<void>;
  reset: () => Promise<void>;
}

function resolve(manager?: ConsentManager): ConsentManager {
  const found = manager ?? inject(KEY, null);
  if (!found) {
    throw new Error(
      "Permito: no consent manager. Pass one to the composable or install it with app.use(permito(manager)).",
    );
  }
  return found;
}

/** Subscribes for the lifetime of the current effect scope (component or `effectScope`). */
function track(manager: ConsentManager): Readonly<ShallowRef<ConsentSnapshot>> {
  const snapshot = shallowRef(manager.getSnapshot());
  const stop = manager.subscribe(() => {
    snapshot.value = manager.getSnapshot();
  });
  if (getCurrentScope()) onScopeDispose(stop);
  return snapshot;
}

/** Reactive consent state and actions. Without an argument the injected manager is used. */
export function useConsent(manager?: ConsentManager): UseConsentResult {
  const m = resolve(manager);
  const snapshot = track(m);
  return {
    snapshot,
    // Reading `snapshot.value` inside the function keeps templates and computed values reactive.
    hasConsent: (category) => snapshot.value.categories[category] === true,
    hasServiceConsent: (serviceId) => snapshot.value.services[serviceId] === true,
    acceptAll: () => m.acceptAll("api"),
    rejectAll: () => m.rejectAll("api"),
    update: (categories, options) => m.update(categories, options),
    setServiceConsent: (serviceId, granted, source) =>
      m.setServiceConsent(serviceId, granted, source),
    reset: () => m.reset(),
  };
}

/** `true` while consent is granted for the category. */
export function useHasConsent(category: string, manager?: ConsentManager): ComputedRef<boolean> {
  const snapshot = track(resolve(manager));
  return computed(() => snapshot.value.categories[category] === true);
}

/** `true` while consent is granted for the service. */
export function useHasServiceConsent(
  serviceId: string,
  manager?: ConsentManager,
): ComputedRef<boolean> {
  const snapshot = track(resolve(manager));
  return computed(() => snapshot.value.services[serviceId] === true);
}
