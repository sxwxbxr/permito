---
title: Next.js (App Router)
description: Set up Permito in a Next.js App Router project with server-side cookie reading.
---

## 1. Client provider

The provider and all components are client components. Put them in their own file:

```tsx title="app/providers.tsx"
"use client";

import {
  ConsentBanner,
  type ConsentState,
  PermitoProvider,
  PreferenceCenter,
  PreferencesButton,
} from "@permitojs/react";
import type { ReactNode } from "react";

export function Providers({
  initialState,
  children,
}: {
  initialState: ConsentState | null;
  children: ReactNode;
}) {
  return (
    <PermitoProvider
      config={{
        consentVersion: "2026-10",
        language: "de-CH",
        initialState,
        categories: [
          { id: "necessary", required: true },
          { id: "statistics" },
          { id: "marketing" },
        ],
        services: [
          { id: "plausible", name: "Plausible", category: "statistics" },
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

## 2. Root layout

Read the consent cookie on the server and pass it down. Import server helpers from `@permitojs/react/server`, which has no `"use client"` directive.

```tsx title="app/layout.tsx"
import "@permitojs/react/styles.css";
import { getConsentModeDefaultScript, readConsentFromCookieHeader } from "@permitojs/react/server";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export default async function RootLayout({ children }: { children: ReactNode }) {
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

Reading the cookie makes the route dynamic. If you prefer static pages, leave out `initialState`: gated content then appears right after hydration instead.

## 3. Gate content

```tsx title="app/page.tsx"
import { ConsentGate, ConsentIframe, ConsentScript } from "@permitojs/react";

export default function Page() {
  return (
    <>
      <ConsentScript service="plausible" src="https://plausible.io/js/script.js" defer
        attributes={{ "data-domain": "example.com" }} />
      <ConsentGate category="statistics" fallback={<p>Statistics are off.</p>}>
        <p>Statistics are on.</p>
      </ConsentGate>
      <ConsentIframe service="youtube" title="Product video"
        src="https://www.youtube-nocookie.com/embed/VIDEO_ID" width={560} height={315} />
    </>
  );
}
```

Components from `@permitojs/react` can be used directly in server components; they are client components under the hood.

## Content Security Policy

If you use a nonce-based CSP, pass the nonce to the inline Consent Mode script and to `ConsentScript` (`nonce` prop) or to `blockedElements={{ nonce }}`.

A complete, tested example lives in [`examples/nextjs`](https://github.com/sxwxbxr/permito/tree/main/examples/nextjs).
