---
title: Without React
description: Use the core engine with any stack, or build your own UI.
---

`@permitojs/core` contains the whole consent logic without any UI.

```ts
import { activateBlockedElements, createConsentManager } from "@permitojs/core";

const manager = createConsentManager({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
});

// Activate <script type="text/plain" data-consent-…> and <iframe data-consent-src> markup.
activateBlockedElements(manager);

if (manager.getSnapshot().needsConsent) {
  showMyBanner({
    onAccept: () => manager.acceptAll("banner"),
    onReject: () => manager.rejectAll("banner"),
  });
}

manager.on("consent_updated", ({ state }) => console.log("New decision", state));
```

`manager.subscribe(listener)` and `manager.getSnapshot()` follow the external store contract, so the manager also plugs into Vue, Svelte or Solid stores.
