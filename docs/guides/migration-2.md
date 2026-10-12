---
title: Migrating to 2.0
description: What changes in Permito 2.0, who is affected, and how to upgrade from 1.x without asking visitors again.
---

Permito 2.0 adds **purposes** and a **webhook** for withdrawal across systems, and changes the stored decision to make that possible. Most sites change nothing but the version number. Visitors keep their decision.

## What is new

- Purposes next to categories, see [Configuration](../reference/configuration.md#purposes).
- `connectConsentWebhook` and `parseConsentWebhookPayload`, see [Withdrawal across systems](revocation-across-systems.md).
- `hasPurposeConsent`, `setPurposeConsent`, and the hooks and stores `useHasPurposeConsent` (React, Vue) and `purposeStore` (Svelte).
- Node 22 or later is required for building and for server-side use (Node 20 is end of life).

## Breaking changes

| Change | Who is affected | What to do |
|---|---|---|
| The stored decision is **schema 2** and has a `purposes` field. | Code that reads or writes the decision itself: custom `ConsentStorage`, code that builds a `ConsentState` by hand, test fixtures. | A custom storage can keep `get()` returning what it stored: schema 1 and schema 2 are both accepted and a schema 1 decision is upgraded when loaded. `set()` now receives schema 2. Type old fixtures as `ConsentStateV1`. |
| `ConsentSnapshot` has a required `purposes` field. | Code that builds or mocks a snapshot. | Add `purposes`. |
| `ConsentManager` has two new members (`hasPurposeConsent`, `setPurposeConsent`). | Code that implements or mocks the manager. | Add them. |
| The events `consent_updated` and `consent_revoked` carry `origin`, `consent_revoked` also `purposes`. | Only code that builds events by hand. Listeners keep working. | None. |
| `readConsentFromCookieHeader`, `parseConsentState` and `isConsentState` can return or accept a schema 1 decision. | TypeScript code that assumed `ConsentState`. | Pass the result to `initialState` as before, or call `migrateConsentState`. |
| Node 22+ | Builds and servers on Node 20. | Upgrade Node. |

## What stays the same

- All category based APIs (`hasConsent`, `update`, the components, hooks, stores and the script tag) behave as in 1.x. The built-in banner and preference center still work per category.
- A decision stored by 1.x is read and upgraded in place: every purpose follows its category, so a visitor who allowed marketing has all marketing purposes allowed. Nobody is asked again, and `consentVersion` does not need to change.
- Without `purposes` in your config, each category is one purpose with the category's id.

## One thing to know about downgrading

A decision saved by 2.0 is schema 2, which 1.x does not read. If you roll back to 1.x, visitors who decided after the upgrade see the banner again. Visitors who decided before the upgrade keep their decision as long as nobody changed it.

## Upgrade

```bash
pnpm add @permitojs/core@^2 @permitojs/react@^2
```

Pin both to the same version, they are released together. Before the final release you can try the release candidates with `@next`.

## Permito Pro

Permito Pro 1.0.1 and later accept Permito 2.x as peer, so upgrade Pro first (it works with both). Pro packages do not read the stored decision directly. Pro 2.0 adds the webhook receiver and the connectors, see the Pro documentation.

## Support for 1.x

1.x gets bug and security fixes for 12 months from the release of 2.0.0, see [Versioning and support](../reference/versioning.md).
