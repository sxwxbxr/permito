# Permito

Privacy-first consent toolkit for React and Next.js. Accessible banner and preference center, consent gates for scripts and embeds, Google Consent Mode v2. No network calls, no tracking, no dark patterns.

> **Permito is not legal advice.** It is technical consent infrastructure. It does not guarantee compliance with the GDPR, the Swiss revDSG or any other law, and it never decides on its own whether a service needs consent. You, the operator, are responsible for that assessment.

| Package | Description |
|---|---|
| [`@permito/core`](packages/core) | Framework-agnostic consent engine: state, storage, events, script activation, Google Consent Mode v2, translations (DE, DE-CH, EN, FR, IT) |
| [`@permito/react`](packages/react) | React components and hooks, Next.js App Router ready |

## Principles

- **Opt-in by default.** Optional categories are never pre-selected. Opt-out only if you configure it explicitly.
- **Reject is as easy as accept.** "Accept all" and "Reject all" are always on the first layer with identical styling.
- **Nothing loads before consent.** Gated scripts, iframes and components are not rendered on the server and not injected on the client until consent exists.
- **No personal data.** The stored decision contains categories, services, versions and a timestamp. No IP, no user agent, no IDs.
- **No external communication** in the open-source packages.
- **Accessible.** Keyboard operable, focus management, screen reader labels, reduced motion, tested with axe-core.

## Quick start (Next.js App Router)

```bash
pnpm add @permito/react
```

```tsx
// app/providers.tsx
"use client";

import {
  ConsentBanner,
  type ConsentState,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
} from "@permito/react";

export function Providers({ initialState, children }: { initialState: ConsentState | null; children: React.ReactNode }) {
  return (
    <PermitoProvider
      config={{
        consentVersion: "2026-10",
        language: "de-CH",
        initialState,
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

```tsx
// app/layout.tsx (server component)
import "@permito/react/styles.css";
import { getConsentModeDefaultScript, readConsentFromCookieHeader } from "@permito/react/server";
import { headers } from "next/headers";
import { Providers } from "./providers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = readConsentFromCookieHeader((await headers()).get("cookie"));
  return (
    <html lang="de-CH">
      <head>
        <script dangerouslySetInnerHTML={{ __html: getConsentModeDefaultScript() }} />
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
```

Reading the cookie on the server is optional. It renders already-allowed content without a flash.

## Gating content

```tsx
import { ConsentGate, ConsentIframe, ConsentScript } from "@permito/react";

<ConsentGate category="statistics" fallback={<p>Statistics are disabled.</p>}>
  <Dashboard />
</ConsentGate>

<ConsentScript service="plausible" src="https://plausible.io/js/script.js" defer
  attributes={{ "data-domain": "example.com" }} />

<ConsentIframe service="youtube" title="Product video"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID" width={560} height={315} />
```

`ConsentIframe` shows a placeholder with "Load once" and "Always allow" until consent exists.

Markup-based blocking also works (enable with `<PermitoProvider blockedElements>`):

```html
<script type="text/plain" data-consent-category="statistics"
        data-consent-src="https://example.com/analytics.js"></script>
```

## Hooks

```ts
const { categories, needsConsent, acceptAll, rejectAll, updateConsent, openPreferences, resetConsent } = useConsent();
const statisticsAllowed = useHasConsent("statistics");
const youtubeAllowed = useHasServiceConsent("youtube");
```

## Without React

```ts
import { activateBlockedElements, createConsentManager } from "@permito/core";

const manager = createConsentManager({ consentVersion: "1", categories, services });
activateBlockedElements(manager);
manager.on("consent_updated", (event) => console.log(event.state));
await manager.update({ statistics: true });
```

## Configuration reference

| Option | Description |
|---|---|
| `consentVersion` | Bump to ask every visitor again (e.g. after adding a service). |
| `policyVersion` | Optional. A changed value also asks again. |
| `categories` | `{ id, name?, description?, required? }`. Built-in texts exist for `necessary`, `preferences`, `statistics`, `marketing`, `security`. |
| `services` | `{ id, name, category, provider?, purpose?, cookies?, privacyPolicyUrl?, requiresConsent? }` |
| `storage` | `createCookieStorage()` (default), `createLocalStorage()`, `createSessionStorage()`, `createMemoryStorage()` or your own `{ get, set, clear }`. |
| `language` | `de`, `de-CH`, `en`, `fr`, `it`. Override any text via `translations` on the provider. |
| `mode` / `region` / `regionRules` | `"opt-in"` (default) or `"opt-out"`. Region is supplied by you; Permito never geolocates. |
| `initialState` | Decision read on the server, see above. |

The default cookie `permito_consent` uses `SameSite=Lax`, `Secure` on https, `Path=/` and a lifetime of 180 days.

## Theming

Import `@permito/react/styles.css` and override CSS variables on `:root` or any ancestor (`--pmt-accent`, `--pmt-bg`, `--pmt-fg`, `--pmt-radius`, `--pmt-font`, …). Dark mode follows `prefers-color-scheme`, or force it with `data-pmt-theme="dark"` on `<html>` or `theme="dark"` on the provider. Every component accepts `className` and `unstyled` for fully custom styling.

## Documentation

The docs site lives in [`apps/docs`](apps/docs) (Astro Starlight, with a live demo). Run it with `pnpm --filter docs dev`.

Examples: [`examples/nextjs`](examples/nextjs) (App Router, Playwright tests) and [`examples/vite`](examples/vite) (client-only React).

## Development

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm e2e   # Playwright tests against examples/nextjs
```

## License

MIT
