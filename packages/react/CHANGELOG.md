# @permitojs/react

## 0.8.0

### Minor Changes

- 1442975: API freeze candidate: tests pin the runtime exports of every entry point, new migration guide, API status page updated. `@permitojs/react` now also re-exports `createSessionStorage`.

### Patch Changes

- Updated dependencies [1442975]
  - @permitojs/core@0.8.0

## 0.7.0

### Minor Changes

- f8f816a: Return focus to the floating settings button after the preference center closes (it was lost because the button is removed while the dialog is open). Add automated WCAG 2.2 AA checks (axe-core) and end-to-end tests in Chromium, Firefox and WebKit to CI. New docs: Content Security Policy and SRI, accessibility, API status.

### Patch Changes

- Updated dependencies [f8f816a]
  - @permitojs/core@0.7.0

## 0.6.0

### Minor Changes

- 9df33f3: Add Vue 3 composables and plugin (`@permitojs/core/vue`, optional peer `vue`) and Svelte stores (`@permitojs/core/svelte`, no dependency). New guides for Vue/Nuxt, Svelte/SvelteKit and server frameworks (SvelteKit, Remix, Astro, Nuxt).

### Patch Changes

- Updated dependencies [9df33f3]
  - @permitojs/core@0.6.0

## 0.5.0

### Minor Changes

- 6110259: Add Spanish, Dutch, Polish and Portuguese translations (not yet reviewed by native speakers), `serviceFromTemplate` and `serviceTemplates` for 15 common services (name, provider, privacy policy URL, usual category; no cookie claims), and a gzip size check in CI.

### Patch Changes

- Updated dependencies [6110259]
  - @permitojs/core@0.5.0

## 0.4.0

### Minor Changes

- 0644b5c: Consent bridges for Microsoft UET (`ad_storage`), Microsoft Clarity (`consentv2`) and Matomo (`setConsentGiven` / `forgetConsentGiven`, with cookie-only mode). Enable them with `microsoftUet`, `clarity` and `matomo` on `PermitoProvider`, `createConsentUI` or the script-tag config; the defaults for UET and Matomo come from `getMicrosoftUetDefaultScript()` and `getMatomoDefaultScript()`, or are pushed by the script-tag build.

### Patch Changes

- Updated dependencies [0644b5c]
  - @permitojs/core@0.4.0

## 0.3.0

### Minor Changes

- 0ce2e39: Framework-free consent UI: `createConsentUI` from `@permitojs/core/ui` and a drop-in script-tag build (`dist/permito.global.js`, `window.Permito`) with banner, preference dialog, floating button, `data-permito-open` links and Consent Mode v2 defaults. The shared stylesheet now lives in `@permitojs/core/styles.css` (`@permitojs/react/styles.css` still works).

### Patch Changes

- Updated dependencies [0ce2e39]
  - @permitojs/core@0.3.0

## 0.2.0

### Minor Changes

- e9b7b28: New: `maxAgeDays` lets decisions expire and shows the banner again, `globalPrivacyControl` honours the GPC browser signal (with `readGpcFromHeaders` for SSR), and decisions sync across open tabs (`syncTabs`, on by default with the built-in cookie storage, `manager.destroy()`). The snapshot gains `globalPrivacyControl` and `expiresAt`.

### Patch Changes

- 517208d: Documentation moved to packages.sweber.dev/permito/docs; README links and the package homepage point there.
- Updated dependencies [517208d]
- Updated dependencies [e9b7b28]
  - @permitojs/core@0.2.0

## 0.1.0

### Minor Changes

- 1d3dfe4: First release: consent engine with cookie/localStorage/memory storage, versioning, events, Google Consent Mode v2 and markup-based script blocking; React provider, hooks, banner, preference center, consent gate, script and iframe components; translations for DE, DE-CH, EN, FR and IT.

### Patch Changes

- 9dcb184: Banner, preference center and preferences button now render into `document.body` via a portal, so ancestors with `transform`, `filter` or `contain` can no longer clip them. Choose another target with `portalContainer` on the provider or `portal={element}`, or render in place with `portal={false}`.

  Theme variables are now inherited from `:root` or any ancestor, `data-pmt-theme` works on ancestors, and the provider accepts `theme="light" | "dark"`.

- Updated dependencies [1d3dfe4]
  - @permitojs/core@0.1.0
