---
title: Lifetime, GPC and tabs
description: Let decisions expire, honour Global Privacy Control and keep open tabs in sync.
---

Available since 0.2.0.

## Let decisions expire

```ts
createConsentManager({ consentVersion: "2026-10", categories, maxAgeDays: 365 });
```

Once a decision is older than `maxAgeDays`, Permito treats it as missing and shows the banner again. This works with every storage, including `localStorage`, which never expires on its own. Supervisory authorities commonly recommend asking again after 6 to 13 months; choosing the value is your decision.

`snapshot.expiresAt` holds the ISO timestamp of the expiry, or `null` without the option. The cookie lifetime (`createCookieStorage({ maxAgeSeconds })`, default 180 days) still applies on top.

## Global Privacy Control

[Global Privacy Control](https://globalprivacycontrol.org) is a browser signal (`Sec-GPC: 1`, `navigator.globalPrivacyControl`) with which visitors object to the sale and sharing of their data. Several US states require businesses to honour it.

```ts
createConsentManager({
  consentVersion: "2026-10",
  categories,
  mode: "opt-out",
  globalPrivacyControl: true, // or { categories: ["marketing", "statistics"] }
});
```

While the visitor has not decided, the listed categories (default `marketing`) start declined, also in opt-out mode. An explicit choice in the banner always wins. In opt-in mode nothing changes, because optional categories are declined anyway. `snapshot.globalPrivacyControl` tells you whether the signal is honoured, e.g. to show a note.

With server rendering, read the header so server and client agree:

```tsx title="app/layout.tsx"
import { readGpcFromHeaders } from "@permitojs/react/server";

const gpc = readGpcFromHeaders(await headers());
// <Providers gpc={gpc}> → config.globalPrivacyControl = { signal: gpc }
```

## Sync between tabs

A decision made in one tab applies immediately in every other open tab of the same site, including gated scripts, iframes and Google Consent Mode updates. Permito uses a `BroadcastChannel` and sends nothing over the network. Decisions for another `consentVersion` are ignored.

It is on by default with the built-in cookie storage. With your own `storage` (for example memory storage in a demo) turn it on with `syncTabs: true`; turn it off with `syncTabs: false`. Without React, call `manager.destroy()` when you throw a manager away.
