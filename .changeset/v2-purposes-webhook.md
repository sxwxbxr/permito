---
"@permitojs/core": major
"@permitojs/react": major
---

Permito 2.0: consent across systems.

- Purposes next to categories: `purposes` in the config, `hasPurposeConsent`, `setPurposeConsent`, services can list the purposes they serve, hooks and stores `useHasPurposeConsent` and `purposeStore`.
- `connectConsentWebhook` sends every change with purpose ids to your own backend (`sendBeacon`, `fetch` fallback with retries, only the deciding tab sends). `parseConsentWebhookPayload` validates it on the server.
- The stored decision is schema 2 and has `purposes`. Decisions saved by 1.x (schema 1) are read and upgraded, visitors are not asked again.
- `consent_updated` and `consent_revoked` carry `origin`, `consent_revoked` also `purposes`. `ConsentSnapshot` has `purposes`. `ConsentManager` has two new members.
- Node 22 or later (`engines`).
- New guides: Withdrawal across systems, Migrating to 2.0. 1.x gets fixes for 12 months from this release.
