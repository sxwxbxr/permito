---
title: Svelte and SvelteKit
description: Consent state as Svelte stores, without a Svelte dependency.
---

`@permitojs/core/svelte` turns the manager into Svelte stores. They follow the store contract, so `$store` works in Svelte 3, 4 and 5 and in SvelteKit. There is no dependency on Svelte. Permito does not ship a Svelte banner yet. Use the [script tag UI](./script-tag.md) or build your own.

```ts
// src/lib/consent.ts
import { createConsentManager } from "@permitojs/core";

export const manager = createConsentManager({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
});
```

```svelte
<script lang="ts">
  import { categoryStore, needsConsentStore } from "@permitojs/core/svelte";
  import { manager } from "$lib/consent";

  const needsConsent = needsConsentStore(manager);
  const statistics = categoryStore(manager, "statistics");
</script>

{#if $needsConsent}
  <button on:click={() => manager.acceptAll("banner")}>Accept all</button>
  <button on:click={() => manager.rejectAll("banner")}>Reject all</button>
{/if}
{#if $statistics}<Analytics />{/if}
```

| Export | Value |
|---|---|
| `consentStore(manager)` | The whole snapshot plus `hasConsent` and `hasServiceConsent` |
| `categoryStore(manager, id)` | `true` while the category is granted |
| `serviceStore(manager, id)` | `true` while the service is granted |
| `needsConsentStore(manager)` | `true` while the banner should be shown, only after the stored decision was read |

Create the manager in the browser only (for example behind `browser` from `$app/environment`) or pass `initialState` from the server, see [server frameworks](./server-frameworks.md).
