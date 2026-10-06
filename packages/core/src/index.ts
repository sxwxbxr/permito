export {
  type ClarityOptions,
  connectIntegrations,
  connectMatomo,
  connectMicrosoftClarity,
  connectMicrosoftUet,
  getMatomoDefaultScript,
  getMicrosoftUetDefaultScript,
  type IntegrationOptions,
  type MatomoOptions,
  type MicrosoftUetOptions,
  pushIntegrationDefaults,
  pushMatomoDefault,
  pushMicrosoftUetDefault,
} from "./bridges";
export {
  type ConnectConsentModeOptions,
  type ConsentModeDefaultOptions,
  type ConsentModeMapping,
  connectGoogleConsentMode,
  DEFAULT_CONSENT_MODE_MAPPING,
  type GoogleConsentType,
  type GoogleConsentValue,
  getConsentModeDefaultScript,
  toGoogleConsent,
} from "./consent-mode";
export {
  type CategoryTexts,
  DEFAULT_LANGUAGE,
  format,
  getTranslations,
  localize,
  resolveLanguage,
  type TranslationOverrides,
  type Translations,
  translations,
} from "./i18n";
export {
  ConsentConfigError,
  type ConsentManager,
  createConsentManager,
  resolveMode,
} from "./manager";
export {
  type ActivateOptions,
  activateBlockedElements,
  BlockedUrlError,
  isUrlAllowed,
  type LoadScriptOptions,
  loadScript,
  resetLoadedScripts,
  type UrlAllowlist,
} from "./scripts";
export {
  type CookieStorageOptions,
  createCookieStorage,
  createLocalStorage,
  createMemoryStorage,
  createSessionStorage,
  DEFAULT_MAX_AGE_SECONDS,
  DEFAULT_STORAGE_KEY,
  isConsentState,
  parseConsentState,
  readConsentFromCookieHeader,
  readGpcFromHeaders,
  serializeConsentState,
} from "./storage";
export * from "./types";
