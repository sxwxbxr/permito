import type { ConsentManager } from "../manager";
import type { ConsentSnapshot } from "../types";

/*
 * Svelte adapter without a Svelte dependency. Svelte stores are any object with
 * `subscribe(run)` that calls `run` with the current value and returns an unsubscribe function,
 * so `$consent` works in Svelte 3, 4 and 5 and in SvelteKit.
 */

export interface Readable<T> {
  subscribe(run: (value: T) => void): () => void;
}

export interface ConsentStoreValue extends ConsentSnapshot {
  hasConsent: (category: string) => boolean;
  hasServiceConsent: (serviceId: string) => boolean;
}

function readable<T>(manager: ConsentManager, read: () => T): Readable<T> {
  return {
    subscribe(run) {
      run(read());
      return manager.subscribe(() => run(read()));
    },
  };
}

/** The whole snapshot as a store, plus `hasConsent` and `hasServiceConsent`. */
export function consentStore(manager: ConsentManager): Readable<ConsentStoreValue> {
  return readable(manager, () => {
    const snapshot = manager.getSnapshot();
    return {
      ...snapshot,
      hasConsent: (category) => snapshot.categories[category] === true,
      hasServiceConsent: (serviceId) => snapshot.services[serviceId] === true,
    };
  });
}

/** `true` while consent is granted for the category. */
export function categoryStore(manager: ConsentManager, category: string): Readable<boolean> {
  return readable(manager, () => manager.getSnapshot().categories[category] === true);
}

/** `true` while consent is granted for the service. */
export function serviceStore(manager: ConsentManager, serviceId: string): Readable<boolean> {
  return readable(manager, () => manager.getSnapshot().services[serviceId] === true);
}

/** `true` while the banner should be shown. Waits for the stored decision to be read. */
export function needsConsentStore(manager: ConsentManager): Readable<boolean> {
  return readable(manager, () => {
    const snapshot = manager.getSnapshot();
    return snapshot.ready && snapshot.needsConsent;
  });
}
