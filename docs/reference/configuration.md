---
title: Configuration
description: All options of ConsentConfig.
---

| Option | Type | Description |
|---|---|---|
| `consentVersion` | `string` | **Required.** Bump it to ask every visitor again, e.g. after adding a service. |
| `categories` | `ConsentCategoryDefinition[]` | **Required.** See below. |
| `services` | `ConsentService[]` | Services shown in the preference center and addressable by gates. |
| `policyVersion` | `string` | Optional. A changed value also asks again. |
| `storage` | `ConsentStorage` | Default: cookie in the browser, memory on the server. |
| `language` | `string` | `de`, `de-CH`, `en`, `fr`, `it`. |
| `mode` | `"opt-in" \| "opt-out"` | Default `"opt-in"`. |
| `region`, `regionRules` | `string`, `Record<string, { mode }>` | Choose the mode per region. You supply the region; Permito never geolocates. |
| `initialState` | `ConsentState \| null` | Decision read on the server. |
| `maxAgeDays` | `number` | Ask again once a decision is older than this. Works with every storage. See [Lifetime, GPC and tabs](/permito/docs/guides/lifetime-gpc-tabs). |
| `globalPrivacyControl` | `boolean \| { categories?, signal? }` | Honour the GPC browser signal. `true` declines `marketing` by default while the visitor has not decided. |
| `syncTabs` | `boolean` | Default `true`. Decisions apply in all open tabs of the site at once. |
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
  schema: 1;
  version: string;          // consentVersion at the time of the decision
  policyVersion?: string;
  timestamp: string;        // ISO 8601
  categories: Record<string, boolean>;
  services: Record<string, boolean>; // only individual overrides
  source: "banner" | "preferences" | "api" | "import" | "embed";
  region?: string;
  language?: string;
}
```
