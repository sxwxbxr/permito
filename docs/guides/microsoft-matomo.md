---
title: Microsoft UET, Clarity and Matomo
description: Forward the visitor's decision to Microsoft Advertising, Microsoft Clarity and Matomo.
---

Available since 0.4.0. Besides Google Consent Mode, three common tools have their own consent API. Permito forwards the decision to each of them, on load when a decision is stored and on every change. Which category a tool belongs to stays your decision; the defaults below are only a starting point.

| Tool | Option | Default categories | Signal |
|---|---|---|---|
| Microsoft UET (Microsoft Advertising) | `microsoftUet` | `marketing` | `uetq.push("consent", "update", { ad_storage })` |
| Microsoft Clarity | `clarity` | `statistics` (analytics), `marketing` (ads) | `clarity("consentv2", { analytics_Storage, ad_Storage })` |
| Matomo | `matomo` | `statistics` | `_paq.push(["setConsentGiven"])` or `["forgetConsentGiven"]` |

## React and Next.js

```tsx
<PermitoProvider config={config} microsoftUet clarity matomo>
```

UET and Matomo also need a default before their tags run, so they wait for consent. Render it in `<head>`:

```tsx
import { getMatomoDefaultScript, getMicrosoftUetDefaultScript } from "@permitojs/react/server";

<script dangerouslySetInnerHTML={{ __html: getMicrosoftUetDefaultScript() + getMatomoDefaultScript() }} />
```

Clarity needs no default: without a granted signal it runs without cookies (check your Clarity project settings).

## Script tag

```json
{
  "config": { "consentVersion": "2026-10", "categories": [ … ] },
  "microsoftUet": true,
  "clarity": true,
  "matomo": true
}
```

The script-tag build pushes the UET and Matomo defaults itself as soon as it runs. Load `permito.global.js` in `<head>` without `defer`, before the UET and Matomo snippets.

## Core API

```ts
import { connectIntegrations, pushIntegrationDefaults } from "@permitojs/core";

pushIntegrationDefaults({ microsoftUet: true, matomo: true }); // before the tags
const stop = connectIntegrations(manager, { microsoftUet: true, clarity: true, matomo: true });
```

Each bridge also exists on its own: `connectMicrosoftUet`, `connectMicrosoftClarity`, `connectMatomo`.

## Options

```ts
microsoftUet: { categories: ["marketing"], queueName: "uetq" }
clarity: { analytics: ["statistics"], ads: ["marketing"] }
matomo: { categories: ["statistics"], mode: "tracking" } // or "cookies"
```

With Matomo `mode: "cookies"`, Matomo tracks without cookies until consent (`requireCookieConsent`, `setCookieConsentGiven`). Whether cookieless tracking without consent is allowed for your site is your assessment. Permito keeps the decision itself, so Matomo receives the non-persistent commands on every page view and stores no consent cookie of its own.

These APIs belong to Microsoft and Matomo and can change. Check their current documentation before go-live.
