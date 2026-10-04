# @permitojs/core

[![npm](https://img.shields.io/npm/v/@permitojs/core.svg)](https://www.npmjs.com/package/@permitojs/core)
[![license](https://img.shields.io/npm/l/@permitojs/core.svg)](https://github.com/sxwxbxr/permito/blob/main/LICENSE)

Framework-agnostic consent engine: state, storage, events, script activation, Google Consent Mode v2 and translations for DE, DE-CH, EN, FR and IT. No network calls, no tracking, no dependencies.

Part of [Permito](https://permito.sweber.dev), a privacy-first consent toolkit. For React and Next.js use [`@permitojs/react`](https://www.npmjs.com/package/@permitojs/react), which builds on this package.

> **Permito is not legal advice.** It is technical consent infrastructure. It does not guarantee compliance with the GDPR, the Swiss revDSG or any other law, and it never decides on its own whether a service needs consent. You, the operator, are responsible for that assessment.

## Installation

```bash
npm install @permitojs/core
```

## Usage

```ts
import { activateBlockedElements, createConsentManager } from "@permitojs/core";

const manager = createConsentManager({
  consentVersion: "2026-10",
  language: "de-CH",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
  services: [
    { id: "plausible", name: "Plausible Analytics", category: "statistics" },
  ],
});

// Activate <script type="text/plain" data-consent-category="..."> markup once consent exists.
activateBlockedElements(manager);

manager.on("consent_updated", (event) => console.log(event.state));

await manager.ready; // the stored decision has been read

if (manager.getSnapshot().needsConsent) {
  // Render your banner, then record the decision:
  await manager.update({ statistics: true });
}

manager.hasConsent("statistics"); // true
manager.hasServiceConsent("plausible"); // true
```

`getSnapshot()` returns `{ ready, decision, categories, services, needsConsent, mode }`; `subscribe()` notifies you whenever it changes.

## What it does

- **Opt-in by default.** Optional categories are never pre-selected. Opt-out only if you configure it explicitly.
- **Versioned decisions.** Bump `consentVersion` or `policyVersion` to ask every visitor again.
- **Pluggable storage.** `createCookieStorage()` (default), `createLocalStorage()`, `createSessionStorage()`, `createMemoryStorage()`, or your own `{ get, set, clear }`.
- **No personal data.** The stored decision holds categories, services, versions and a timestamp. No IP, no user agent, no IDs.
- **Google Consent Mode v2.** Emits `default` and `update` calls in step with the consent state.

The default cookie `permito_consent` uses `SameSite=Lax`, `Secure` on https, `Path=/` and a lifetime of 180 days.

## Documentation

Full configuration reference, recipes and a live demo: **[permito.sweber.dev](https://permito.sweber.dev)**

## License

MIT © [Seya Weber](https://github.com/sxwxbxr)
