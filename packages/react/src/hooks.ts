import type { ConsentSnapshot, ConsentSource, Translations, UpdateOptions } from "@permito/core";
import { useMemo } from "react";
import { usePermitoContext } from "./context";

export interface UseConsentResult extends ConsentSnapshot {
  hasConsent: (category: string) => boolean;
  hasServiceConsent: (serviceId: string) => boolean;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  updateConsent: (categories: Record<string, boolean>, options?: UpdateOptions) => Promise<void>;
  setServiceConsent: (serviceId: string, granted: boolean, source?: ConsentSource) => Promise<void>;
  resetConsent: () => Promise<void>;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

export function useConsent(): UseConsentResult {
  const { manager, snapshot, preferencesOpen, openPreferences, closePreferences } =
    usePermitoContext();
  return useMemo(
    () => ({
      ...snapshot,
      hasConsent: (category) => snapshot.categories[category] === true,
      hasServiceConsent: (serviceId) => snapshot.services[serviceId] === true,
      acceptAll: () => manager.acceptAll("api"),
      rejectAll: () => manager.rejectAll("api"),
      updateConsent: (categories, options) => manager.update(categories, options),
      setServiceConsent: (serviceId, granted, source) =>
        manager.setServiceConsent(serviceId, granted, source),
      resetConsent: () => manager.reset(),
      preferencesOpen,
      openPreferences,
      closePreferences,
    }),
    [manager, snapshot, preferencesOpen, openPreferences, closePreferences],
  );
}

export function useHasConsent(category: string): boolean {
  return usePermitoContext().snapshot.categories[category] === true;
}

export function useHasServiceConsent(serviceId: string): boolean {
  return usePermitoContext().snapshot.services[serviceId] === true;
}

export function usePermitoTranslations(): Translations {
  return usePermitoContext().t;
}

/** `true` if consent is granted for the given service, or else the given category. */
export function useIsAllowed(target: { category?: string; service?: string }): boolean {
  const { snapshot } = usePermitoContext();
  if (target.service) return snapshot.services[target.service] === true;
  if (target.category) return snapshot.categories[target.category] === true;
  return false;
}
