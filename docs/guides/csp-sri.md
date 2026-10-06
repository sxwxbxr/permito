---
title: Content Security Policy and SRI
description: Run Permito under a strict CSP and pin the script tag build with Subresource Integrity.
---

Permito makes no network requests of its own and evaluates no strings, so it works under a strict policy such as `default-src 'none'; script-src 'self'; style-src 'self'`. Three things need your attention.

## 1. The stylesheet

By default the script tag build and `createConsentUI` insert the default stylesheet as a `<style>` element. A `style-src` without `'unsafe-inline'` blocks that (Chromium logs "Refused to apply inline style"). Choose one of:

- Link the stylesheet yourself and turn the injection off:

  ```html
  <link rel="stylesheet" href="/permito/styles.css" />
  <script type="application/json" id="permito-config">
    { "config": { "consentVersion": "2026-10", "categories": [] }, "injectStyles": false }
  </script>
  ```

  `styles.css` is at `@permitojs/core/styles.css`. The React package imports the same file, so bundlers emit it as a normal stylesheet and nothing is inlined.

- Or keep the injection and give the element your nonce with `"styleNonce": "<nonce>"` in the config (or the `styleNonce` option of `createConsentUI`), and allow that nonce in `style-src`.

Permito sets `document.body.style.overflow` while a dialog is open. That goes through the CSSOM, which a CSP does not block.

## 2. Scripts that Permito activates

`ConsentScript`, `loadScript` and `activateBlockedElements` create `<script>` elements after consent. Under `script-src` with a nonce, pass the nonce:

```ts
loadScript({ src: "https://example.com/tag.js", nonce });
activateBlockedElements(manager, { nonce });
```

If you do not pass one, `activateBlockedElements` copies the `nonce` of the blocked `<script type="text/plain">` element, so putting your nonce in the markup is enough. Third-party hosts you load after consent must be allowed in `script-src` (or reached through `'strict-dynamic'`) and `connect-src`; Permito cannot know them.

The Consent Mode default snippet is an inline script. Render it with your nonce:

```tsx
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: getConsentModeDefaultScript() }} />
```

The configuration for the script tag build sits in `<script type="application/json">`. That is a data block, not executable, so it needs no nonce.

## 3. Subresource Integrity for the script tag build

When you load `permito.global.js` from a CDN, pin the version and add the hash of the file:

```bash
curl -s https://cdn.jsdelivr.net/npm/@permitojs/core@0.7.0/dist/permito.global.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

```html
<script
  src="https://cdn.jsdelivr.net/npm/@permitojs/core@0.7.0/dist/permito.global.js"
  integrity="sha384-<hash from above>"
  crossorigin="anonymous"
  data-config="#permito-config"
></script>
```

Never use an unpinned URL together with `integrity`, because the next release would no longer match. Hosting the file on your own origin avoids the CDN and lets `script-src 'self'` apply. Update the hash with every upgrade.
