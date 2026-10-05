---
title: Blocking scripts and embeds
description: Load third-party code only after consent.
---

## Components

| Component | Behaviour |
|---|---|
| `ConsentGate` | Renders `children` only with consent, otherwise `fallback`. |
| `ConsentScript` | Injects an external script once consent exists. Renders nothing. |
| `ConsentIframe` | Shows a placeholder with **Load once** and **Always allow** until consent exists. |

Each takes either `category` or `service`. A service follows its category unless the visitor changed that service individually.

```tsx
<ConsentScript category="statistics" src="https://example.com/analytics.js"
  allowlist={["https://example.com/"]} onError={(e) => console.warn(e)} />
```

**Load once** shows the embed without storing anything. **Always allow** stores consent for that single service, with source `embed`.

## Markup

For scripts that come from a CMS or a tag snippet, mark them as inert and enable `blockedElements` on the provider (or call `activateBlockedElements(manager)` from the core):

```html
<script type="text/plain" data-consent-category="statistics"
        data-consent-src="https://example.com/analytics.js"></script>

<script type="text/plain" data-consent-service="hotjar">
  /* inline code runs after consent */
</script>

<iframe data-consent-category="marketing"
        data-consent-src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
        title="Video"></iframe>
```

Activated scripts keep all other attributes. Use `data-consent-type="module"` for module scripts.

## URL allowlist

`allowlist` accepts URL prefixes or regular expressions. Scripts outside the list are not loaded, even with consent. This protects against injected markup.

## Revoking consent

Code that already ran cannot be unloaded by any consent tool. After `consent_revoked`, reload the page if a script must stop:

```ts
manager.on("consent_revoked", () => window.location.reload());
```
