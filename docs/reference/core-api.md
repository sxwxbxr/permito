---
title: Core API
description: Functions exported by @permitojs/core.
---

## createConsentManager(config)

| Member | Description |
|---|---|
| `getSnapshot()`, `subscribe(fn)` | External store contract. Snapshot reference stays stable between changes. The snapshot also has `globalPrivacyControl` and `expiresAt`. |
| `ready` | Promise, resolves once async storage has been read. |
| `hasConsent(id)`, `hasServiceConsent(id)`, `hasPurposeConsent(id)` | |
| `acceptAll(source?)`, `rejectAll(source?)` | |
| `update(categories, { services, source })` | Unknown ids are ignored, required categories stay granted. |
| `setServiceConsent(id, granted, source?)` | |
| `setPurposeConsent(id, granted, source?)` | Decline or grant one purpose inside a granted category. `update(categories, { purposes })` does the same for several. |
| `reset()` | Clears storage and emits `consent_revoked`. |
| `exportState()`, `importState(state)` | Import is validated against the current config. |
| `destroy()` | Stops listening to other tabs. Call it if you create managers dynamically. |
| `on(type, fn)` | Events: `consent_loaded`, `consent_updated`, `consent_revoked`, `service_allowed`, `service_blocked`. `consent_updated` and `consent_revoked` carry `origin` (`"local"`, or `"tab"` when another tab decided), `consent_revoked` also the revoked `purposes`. |

## Helpers

| Function | Description |
|---|---|
| `readConsentFromCookieHeader(header, name?)` | Parse the decision from a `Cookie` header on the server. |
| `readGpcFromHeaders(headers)` | `true` if the request carries `Sec-GPC: 1`. Accepts `Headers` or a plain header object. |
| `parseConsentState(raw)`, `serializeConsentState(state)`, `isConsentState(value)` | Validate untrusted data. |
| `connectConsentWebhook(manager, options)` | Send every change, with purpose ids, to your own backend. See [Withdrawal across systems](../guides/revocation-across-systems.md). |
| `parseConsentWebhookPayload(body)` | Server side: validate a webhook body. |
| `migrateConsentState(state, purposeCategories?)` | Upgrade a 1.x decision (schema 1) to schema 2. Done for you when a manager loads it. |
| `resolvePurposes(config)` | The purposes of a config, including the implicit ones. |
| `getConsentModeDefaultScript(options)` | Inline Consent Mode default snippet. |
| `connectGoogleConsentMode(manager, options)` | Push Consent Mode updates. |
| `toGoogleConsent(categories, mapping)` | Map categories to Consent Mode values. |
| `loadScript(options)` | Load an external script once. |
| `activateBlockedElements(manager, options)` | Activate blocked markup. |
| `isUrlAllowed(src, allowlist)` | |
| `getTranslations(language, overrides)`, `localize(text, language)` | |
