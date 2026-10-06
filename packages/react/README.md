# @permitojs/react

[![npm](https://img.shields.io/npm/v/@permitojs/react.svg)](https://www.npmjs.com/package/@permitojs/react)
[![license](https://img.shields.io/npm/l/@permitojs/react.svg)](https://github.com/sxwxbxr/permito/blob/main/LICENSE)

Accessible, privacy-first consent banner, preference center and consent gates for React and Next.js. Google Consent Mode v2, translations for DE, DE-CH, EN, FR, IT, ES, NL, PL and PT. No network calls, no tracking, no dark patterns.

Part of [Permito](https://packages.sweber.dev/permito/docs). Built on [`@permitojs/core`](https://www.npmjs.com/package/@permitojs/core), which is installed with it.

> **Permito is not legal advice.** It is technical consent infrastructure. It does not guarantee compliance with the GDPR, the Swiss revDSG or any other law, and it never decides on its own whether a service needs consent. You, the operator, are responsible for that assessment.

## Installation

```bash
npm install @permitojs/react
```

Requires React 18.2 or newer.

## Quick start

```tsx
"use client";

import {
  ConsentBanner,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
} from "@permitojs/react";
import "@permitojs/react/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PermitoProvider
      config={{
        consentVersion: "2026-10",
        language: "de-CH",
        categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
        services: [
          { id: "youtube", name: "YouTube", provider: "Google Ireland Ltd.", category: "marketing" },
        ],
      }}
      privacyPolicyUrl="/datenschutz"
      googleConsentMode
    >
      {children}
      <ConsentBanner />
      <PreferenceCenter />
      <PreferencesButton />
    </PermitoProvider>
  );
}
```

Banner and preference center render into `document.body` through a portal, so ancestors with `transform`, `filter` or `contain` cannot clip them.

## Gating scripts and embeds

```tsx
import { ConsentGate, ConsentIframe, ConsentScript } from "@permitojs/react";

<ConsentGate category="statistics" fallback={<p>Statistics are disabled.</p>}>
  <Dashboard />
</ConsentGate>

<ConsentScript service="plausible" src="https://plausible.io/js/script.js" defer
  attributes={{ "data-domain": "example.com" }} />

<ConsentIframe service="youtube" title="Product video"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID" width={560} height={315} />
```

Nothing is rendered on the server or injected on the client until consent exists. `ConsentIframe` shows a placeholder with "Load once" and "Always allow".

## Hooks

```ts
const { categories, needsConsent, acceptAll, rejectAll, updateConsent, openPreferences, resetConsent } = useConsent();
const statisticsAllowed = useHasConsent("statistics");
const youtubeAllowed = useHasServiceConsent("youtube");
```

## Next.js App Router

`@permitojs/react/server` has no `"use client"` and is safe in server components, route handlers and plain Node:

```tsx
import "@permitojs/react/styles.css";
import { getConsentModeDefaultScript, readConsentFromCookieHeader } from "@permitojs/react/server";
import { headers } from "next/headers";

const initialState = readConsentFromCookieHeader((await headers()).get("cookie"));
```

Pass `initialState` into the provider config to render already-allowed content without a flash.

## Theming

Override CSS variables on `:root` or any ancestor (`--pmt-accent`, `--pmt-bg`, `--pmt-fg`, `--pmt-radius`, `--pmt-font`, …). Dark mode follows `prefers-color-scheme`, or force it with `data-pmt-theme="dark"` on an ancestor or `theme="dark"` on the provider. Every component accepts `className` and `unstyled`.

## Documentation

Full configuration reference and recipes: **[packages.sweber.dev/permito/docs](https://packages.sweber.dev/permito/docs)**. Live demo: [packages.sweber.dev/permito/demo](https://packages.sweber.dev/permito/demo)

## License

MIT © [Seya Weber](https://github.com/sxwxbxr)
