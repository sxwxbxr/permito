---
title: Server frameworks
description: Read the stored decision and the GPC signal on the server in SvelteKit, Remix, Astro and Nuxt.
---

The decision lives in a cookie, so any server can read it with two helpers from `@permitojs/core`:

- `readConsentFromCookieHeader(cookieHeader)` returns the stored decision or `null`.
- `readGpcFromHeaders(headers)` returns `true` for `Sec-GPC: 1`.

Pass the decision as `initialState`, and the signal as `globalPrivacyControl: { signal }`, so the first render already knows what the visitor chose and gated content does not flash.

## SvelteKit

```ts
// src/hooks.server.ts
import { readConsentFromCookieHeader, readGpcFromHeaders } from "@permitojs/core";

export const handle = async ({ event, resolve }) => {
  event.locals.consent = readConsentFromCookieHeader(event.request.headers.get("cookie"));
  event.locals.gpc = readGpcFromHeaders(event.request.headers);
  return resolve(event);
};
```

## Remix and React Router

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  return {
    consent: readConsentFromCookieHeader(request.headers.get("cookie")),
    gpc: readGpcFromHeaders(request.headers),
  };
}
```

## Astro

```astro
---
import { readConsentFromCookieHeader } from "@permitojs/core";
const consent = readConsentFromCookieHeader(Astro.request.headers.get("cookie"));
const allowStatistics = consent?.categories.statistics === true;
---
{allowStatistics && <script src="/analytics.js" />}
```

Astro pages are often static. For those, gate scripts in the browser with `data-consent-category` markup and the [script tag UI](./script-tag.md) instead of reading the cookie on the server.

## Nuxt

```ts
const cookie = useRequestHeaders(["cookie"]).cookie;
const consent = readConsentFromCookieHeader(cookie);
```

Expired or outdated decisions (`maxAgeDays`, a new `consentVersion`) are checked by the manager when you pass the state as `initialState`; reading the raw cookie alone does not check them.
