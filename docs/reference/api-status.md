---
title: API status
description: Which parts of the API are stable, which may still change before 1.0, and what is deprecated.
---

Permito follows semantic versioning. Version 0.8 is the API freeze candidate: the runtime exports of every entry point are pinned by a test, and until 1.0.0 only the items under "May still change" can change, with a migration hint in the release notes. See [Migrating to 1.0](../guides/migration.md).

## Stable (frozen at 1.0)

- `createConsentManager` and its members: `getSnapshot`, `subscribe`, `on`, `hasConsent`, `hasServiceConsent`, `acceptAll`, `rejectAll`, `update`, `setServiceConsent`, `reset`, `exportState`, `importState`, `destroy`, and the `ConsentConfig` and `ConsentSnapshot` shapes.
- The stored decision (`ConsentState`, schema 1). Changing it would invalidate stored decisions, so it only changes with a schema bump and a migration.
- Consent Mode v2 (`getConsentModeDefaultScript`, `connectGoogleConsentMode`, `toGoogleConsent`).
- Script and iframe gating (`loadScript`, `activateBlockedElements`, the `data-consent-*` attributes).
- React: `PermitoProvider`, `ConsentBanner`, `PreferenceCenter`, `ConsentScript`, `ConsentIframe`, `ConsentGate`, `useConsent`, `useHasConsent`, `useHasServiceConsent`.
- Server helpers: `readConsentFromCookieHeader`, `readGpcFromHeaders`.

Two exports are for special cases: `resetLoadedScripts` is a test helper, and `usePermitoContext` gives access to internals of the provider. Both are exported but not part of the stable surface.

## May still change before 1.0

- `createConsentUI` options and the script tag config, which are new in 0.3.0.
- The bridges for Microsoft UET, Clarity and Matomo (0.4.0): category defaults and option names.
- `serviceTemplates` and `serviceFromTemplate` (0.5.0): the list of services and their default categories.
- The Vue and Svelte adapters (0.6.0).
- Texts of the built-in translations. They are wording, not API, and the Spanish, Dutch, Polish and Portuguese texts have not been reviewed by native speakers.
- CSS class names (`pmt-*`) and the default stylesheet. Style through the documented CSS variables.

## Deprecated

Nothing is deprecated right now. A deprecated API stays for at least one minor release, is marked in the types with `@deprecated`, and is named in the release notes.
