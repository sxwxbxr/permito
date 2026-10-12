---
title: Configuration
description: All options of ConsentConfig.
---

| Option | Type | Description |
|---|---|---|
| `consentVersion` | `string` | **Required.** Bump it to ask every visitor again, e.g. after adding a service. |
| `categories` | `ConsentCategoryDefinition[]` | **Required.** See below. |
| `purposes` | `ConsentPurposeDefinition[]` | Processing purposes behind the categories. Default: one purpose per category. See [Purposes](#purposes). |
| `services` | `ConsentService[]` | Services shown in the preference center and addressable by gates. |
| `policyVersion` | `string` | Optional. A changed value also asks again. |
| `storage` | `ConsentStorage` | Default: cookie in the browser, memory on the server. |
| `language` | `string` | `de`, `de-CH`, `en`, `fr`, `it`, `es`, `nl`, `pl`, `pt`. |
| `mode` | `"opt-in" \| "opt-out"` | Default `"opt-in"`. |
| `region`, `regionRules` | `string`, `Record<string, { mode }>` | Choose the mode per region. You supply the region; Permito never geolocates. |
| `initialState` | `ConsentState \| null` | Decision read on the server. |
| `maxAgeDays` | `number` | Ask again once a decision is older than this. Works with every storage. See [Lifetime, GPC and tabs](/permito/docs/guides/lifetime-gpc-tabs). |
| `globalPrivacyControl` | `boolean \| { categories?, signal? }` | Honour the GPC browser signal. `true` declines `marketing` by default while the visitor has not decided. |
| `syncTabs` | `boolean` | Decisions apply in all open tabs of the site at once. Default `true` with the built-in cookie storage, `false` with your own `storage`. |
| `now` | `() => Date` | Clock override for tests. |

## Categories

```ts
interface ConsentCategoryDefinition {
  id: string;            // necessary, preferences, statistics, marketing, security or your own
  name?: LocalizedText;  // built-in text for the known ids
  description?: LocalizedText;
  required?: boolean;    // always granted, cannot be declined
  legalBasis?: string;   // free text for your own documentation, never interpreted
}
```

## Purposes

A purpose is the unit that systems outside the browser act on: the newsletter, ad personalisation, a CRM sync. Each one belongs to a category and has an id that is the same in the browser, in the stored decision and in the [webhook](../guides/revocation-across-systems.md).

```ts
interface ConsentPurposeDefinition {
  id: string;            // stable, used by your backend
  category: string;      // granting or declining the category sets the purpose
  name?: LocalizedText;
  description?: LocalizedText;
}
```

Without `purposes`, every category is one purpose with the category's id. A visitor decides per category in the banner. Your code can narrow a granted category to fewer purposes with `manager.setPurposeConsent(id, false)`: a purpose is granted while its category is granted and the purpose was not declined. Declining a category declines all its purposes, granting it again grants them all again. The built-in banner shows categories, not purposes.

A service can list the purposes it serves (`purposes: ["newsletter"]`). It runs only while its category and all of these purposes are granted.

## Services

```ts
interface ConsentService {
  id: string;
  name: string;
  category: string;
  provider?: string;
  purpose?: LocalizedText;
  description?: LocalizedText;
  cookies?: { name: string; duration?: LocalizedText; description?: LocalizedText }[];
  dataRecipients?: string[];
  privacyPolicyUrl?: string;
  requiresConsent?: boolean; // default true; you decide, Permito never does
}
```

## Storage

| Factory | Notes |
|---|---|
| `createCookieStorage(options)` | Default. Cookie `permito_consent`, `SameSite=Lax`, `Secure` on https, `Path=/`, 180 days. Options: `name`, `domain`, `path`, `maxAgeSeconds`, `sameSite`, `secure`. |
| `createLocalStorage(key)` | Not readable on the server. |
| `createSessionStorage(key)` | Decision lasts for the browser session. |
| `createMemoryStorage(initial)` | Tests and demos. |
| Your own | `{ get, set, clear }`, sync or async. |

## Stored decision

```ts
interface ConsentState {
  schema: 2;
  version: string;          // consentVersion at the time of the decision
  policyVersion?: string;
  timestamp: string;        // ISO 8601
  categories: Record<string, boolean>;
  purposes: Record<string, boolean>; // effective consent per purpose
  services: Record<string, boolean>; // only individual overrides
  source: "banner" | "preferences" | "api" | "import" | "embed";
  region?: string;
  language?: string;
}
```
