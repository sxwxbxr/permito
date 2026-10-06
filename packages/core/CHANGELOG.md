# @permitojs/core

## 0.5.0

### Minor Changes

- 6110259: Add Spanish, Dutch, Polish and Portuguese translations (not yet reviewed by native speakers), `serviceFromTemplate` and `serviceTemplates` for 15 common services (name, provider, privacy policy URL, usual category; no cookie claims), and a gzip size check in CI.

## 0.4.0

### Minor Changes

- 0644b5c: Consent bridges for Microsoft UET (`ad_storage`), Microsoft Clarity (`consentv2`) and Matomo (`setConsentGiven` / `forgetConsentGiven`, with cookie-only mode). Enable them with `microsoftUet`, `clarity` and `matomo` on `PermitoProvider`, `createConsentUI` or the script-tag config; the defaults for UET and Matomo come from `getMicrosoftUetDefaultScript()` and `getMatomoDefaultScript()`, or are pushed by the script-tag build.

## 0.3.0

### Minor Changes

- 0ce2e39: Framework-free consent UI: `createConsentUI` from `@permitojs/core/ui` and a drop-in script-tag build (`dist/permito.global.js`, `window.Permito`) with banner, preference dialog, floating button, `data-permito-open` links and Consent Mode v2 defaults. The shared stylesheet now lives in `@permitojs/core/styles.css` (`@permitojs/react/styles.css` still works).

## 0.2.0

### Minor Changes

- e9b7b28: New: `maxAgeDays` lets decisions expire and shows the banner again, `globalPrivacyControl` honours the GPC browser signal (with `readGpcFromHeaders` for SSR), and decisions sync across open tabs (`syncTabs`, on by default with the built-in cookie storage, `manager.destroy()`). The snapshot gains `globalPrivacyControl` and `expiresAt`.

### Patch Changes

- 517208d: Documentation moved to packages.sweber.dev/permito/docs; README links and the package homepage point there.

## 0.1.0

### Minor Changes

- 1d3dfe4: First release: consent engine with cookie/localStorage/memory storage, versioning, events, Google Consent Mode v2 and markup-based script blocking; React provider, hooks, banner, preference center, consent gate, script and iframe components; translations for DE, DE-CH, EN, FR and IT.
