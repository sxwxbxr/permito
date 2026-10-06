---
title: API status
description: Which parts of the API are stable, what is not part of the promise, and what is deprecated.
---

Permito follows semantic versioning. Since 1.0.0 everything listed under "Stable" is frozen: the runtime exports of every entry point are pinned by a test, and a change to them needs a new major version. See [Migrating to 1.0](../guides/migration.md) and [Versioning and support](versioning.md).

## Stable (frozen since 1.0)

- `createConsentManager` and its members: `getSnapshot`, `subscribe`, `on`, `hasConsent`, `hasServiceConsent`, `acceptAll`, `rejectAll`, `update`, `setServiceConsent`, `reset`, `exportState`, `importState`, `destroy`, and the `ConsentConfig` and `ConsentSnapshot` shapes.
- The stored decision (`ConsentState`, schema 1). Changing it would invalidate stored decisions, so it only changes with a schema bump and a migration.
- Consent Mode v2 (`getConsentModeDefaultScript`, `connectGoogleConsentMode`, `toGoogleConsent`).
- Script and iframe gating (`loadScript`, `activateBlockedElements`, the `data-consent-*` attributes).
- React: `PermitoProvider`, `ConsentBanner`, `PreferenceCenter`, `ConsentScript`, `ConsentIframe`, `ConsentGate`, `useConsent`, `useHasConsent`, `useHasServiceConsent`.
- Server helpers: `readConsentFromCookieHeader`, `readGpcFromHeaders`.
- `createConsentUI` and the script tag config (since 0.3.0), including `data-config` and `window.Permito`.
- The bridges for Microsoft UET, Clarity and Matomo (since 0.4.0): option names and category defaults.
- `serviceTemplates` and `serviceFromTemplate` (since 0.5.0): the function signatures. The list of templates can grow in minor releases; a template's default category changes only in a major release.
- The Vue and Svelte adapters (`@permitojs/core/vue`, `@permitojs/core/svelte`, since 0.6.0).

Two exports are for special cases: `resetLoadedScripts` is a test helper, and `usePermitoContext` gives access to internals of the provider. Both are exported but not part of the stable surface.

## Not part of the stable surface

- Texts of the built-in translations. They are wording, not API, and can be corrected in any release. The Spanish, Dutch, Polish and Portuguese texts have not been reviewed by native speakers.
- CSS class names (`pmt-*`) and the default stylesheet. Style through the documented CSS variables.

## Deprecated

Nothing is deprecated right now. A deprecated API stays for at least one minor release, is marked in the types with `@deprecated`, and is named in the release notes.
