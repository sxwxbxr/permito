import {
  type ActivateOptions,
  activateBlockedElements,
  type ConnectConsentModeOptions,
  type ConsentConfig,
  type ConsentManager,
  type ConsentSnapshot,
  connectGoogleConsentMode,
  createConsentManager,
  createMemoryStorage,
  getTranslations,
  type TranslationOverrides,
  type Translations,
} from "@permito/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export interface PermitoContextValue {
  manager: ConsentManager;
  snapshot: ConsentSnapshot;
  config: ConsentConfig;
  language: string | undefined;
  t: Translations;
  privacyPolicyUrl: string | undefined;
  imprintUrl: string | undefined;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

const PermitoContext = createContext<PermitoContextValue | null>(null);

export interface PermitoProviderProps {
  config: ConsentConfig;
  /** Use an existing manager instead of creating one from `config`. */
  manager?: ConsentManager;
  translations?: TranslationOverrides;
  privacyPolicyUrl?: string;
  imprintUrl?: string;
  /** Send Google Consent Mode v2 updates. Render the default snippet in `<head>` yourself. */
  googleConsentMode?: boolean | ConnectConsentModeOptions;
  /** Activate `<script type="text/plain" data-consent-…>` markup after consent. */
  blockedElements?: boolean | ActivateOptions;
  children?: ReactNode;
}

/**
 * Provides consent state to the tree. The config is read once on mount;
 * remount the provider (e.g. with a `key`) to apply a different config.
 */
export function PermitoProvider({
  config,
  manager: externalManager,
  translations,
  privacyPolicyUrl,
  imprintUrl,
  googleConsentMode,
  blockedElements,
  children,
}: PermitoProviderProps) {
  const [manager] = useState(() => externalManager ?? createConsentManager(config));

  // What the server rendered: the request cookie (initialState) and never a banner.
  const [hydrationSnapshot] = useState<ConsentSnapshot>(() => {
    if (typeof window === "undefined") return manager.getSnapshot();
    const serverEquivalent = createConsentManager({
      ...manager.config,
      storage: createMemoryStorage(),
      initialState: manager.config.initialState ?? null,
    }).getSnapshot();
    return { ...serverEquivalent, ready: false, needsConsent: false };
  });

  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    () => hydrationSnapshot,
  );

  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  // Integration options are read once, like the config.
  const [consentModeOptions] = useState(() =>
    googleConsentMode === true ? {} : googleConsentMode || null,
  );
  useEffect(() => {
    if (!consentModeOptions) return;
    return connectGoogleConsentMode(manager, consentModeOptions);
  }, [manager, consentModeOptions]);

  const [blockedOptions] = useState(() =>
    blockedElements === true ? {} : blockedElements || null,
  );
  useEffect(() => {
    if (!blockedOptions) return;
    return activateBlockedElements(manager, blockedOptions);
  }, [manager, blockedOptions]);

  const language = manager.config.language;
  const t = useMemo(() => getTranslations(language, translations), [language, translations]);

  const value = useMemo<PermitoContextValue>(
    () => ({
      manager,
      snapshot,
      config: manager.config,
      language,
      t,
      privacyPolicyUrl,
      imprintUrl,
      preferencesOpen,
      openPreferences,
      closePreferences,
    }),
    [
      manager,
      snapshot,
      language,
      t,
      privacyPolicyUrl,
      imprintUrl,
      preferencesOpen,
      openPreferences,
      closePreferences,
    ],
  );

  return <PermitoContext.Provider value={value}>{children}</PermitoContext.Provider>;
}

export function usePermitoContext(): PermitoContextValue {
  const context = useContext(PermitoContext);
  if (!context) {
    throw new Error("Permito components and hooks must be used inside <PermitoProvider>.");
  }
  return context;
}
