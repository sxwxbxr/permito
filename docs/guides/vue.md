---
title: Vue and Nuxt
description: Reactive consent state for Vue 3 with composables, on top of the core engine.
---

`@permitojs/core/vue` gives Vue 3 apps reactive consent state. `vue` (3.3 or newer) is an optional peer dependency, so it is only needed when you import this entry point. Permito does not ship a Vue banner yet. Use the [script tag UI](./script-tag.md) or build your own with the composables below.

```ts
// main.ts
import { createApp } from "vue";
import { createConsentManager } from "@permitojs/core";
import { permito } from "@permitojs/core/vue";
import App from "./App.vue";

const manager = createConsentManager({
  consentVersion: "2026-10",
  categories: [{ id: "necessary", required: true }, { id: "statistics" }, { id: "marketing" }],
});

createApp(App).use(permito(manager)).mount("#app");
```

```vue
<script setup lang="ts">
import { useConsent, useHasConsent } from "@permitojs/core/vue";

const { snapshot, acceptAll, rejectAll } = useConsent();
const statistics = useHasConsent("statistics");
</script>

<template>
  <div v-if="snapshot.ready && snapshot.needsConsent">
    <button @click="acceptAll">Accept all</button>
    <button @click="rejectAll">Reject all</button>
  </div>
  <Analytics v-if="statistics" />
</template>
```

| Export | Returns |
|---|---|
| `permito(manager)` | Plugin for `app.use()` |
| `useConsent(manager?)` | `snapshot` (a ref), `hasConsent`, `hasServiceConsent`, `acceptAll`, `rejectAll`, `update`, `setServiceConsent`, `reset` |
| `useHasConsent(category, manager?)` | Computed boolean |
| `useHasServiceConsent(serviceId, manager?)` | Computed boolean |

Without the plugin, pass the manager to the composable. Subscriptions end with the component or effect scope.

## Nuxt

Create the manager in a client-only plugin (`plugins/permito.client.ts`) and install it with `nuxtApp.vueApp.use(permito(manager))`. On the server, read the cookie with `readConsentFromCookieHeader(useRequestHeaders(["cookie"]).cookie)` and pass it as `initialState` to avoid a flash of the banner. See [server frameworks](./server-frameworks.md).
