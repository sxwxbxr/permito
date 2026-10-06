---
title: Without a framework (script tag)
description: Banner, preference center and gating for WordPress, Webflow, Astro or plain HTML with one script tag.
---

Available since 0.3.0. The script-tag build renders the same banner and preference center as `@permitojs/react`, with the same texts, translations and styles, and needs no bundler.

## 1. Host the file

Download `permito.global.js` from the `@permitojs/core` package (folder `dist/`) and upload it to your own server, e.g. `/assets/permito.global.js`. Self-hosting keeps the promise that Permito makes no third-party requests.

If you prefer a CDN, pin the version:

```html
<script src="https://cdn.jsdelivr.net/npm/@permitojs/core@0.3.0/dist/permito.global.js" data-config="#permito-config"></script>
```

A CDN sees the visitor's IP address when the file loads. Whether that is acceptable is your assessment.

## 2. Add the config and the script

Put both into `<head>`, the config first:

```html
<script type="application/json" id="permito-config">
{
  "config": {
    "consentVersion": "2026-10",
    "language": "de-CH",
    "maxAgeDays": 365,
    "categories": [
      { "id": "necessary", "required": true },
      { "id": "statistics" },
      { "id": "marketing" }
    ],
    "services": [
      { "id": "youtube", "name": "YouTube", "provider": "Google Ireland Ltd.", "category": "marketing" }
    ]
  },
  "privacyPolicyUrl": "/datenschutz",
  "imprintUrl": "/impressum",
  "googleConsentMode": true,
  "consentModeDefault": true
}
</script>
<script src="/assets/permito.global.js" data-config="#permito-config"></script>
```

The `config` object takes every option of the [configuration](/permito/docs/reference/configuration) that can be written as JSON. The banner appears until the visitor decides; afterwards a small button in the corner reopens the settings.

## 3. Gate scripts and embeds

Markup-based blocking is on by default. Change `type` to `text/plain` and name the category or service:

```html
<script type="text/plain" data-consent-category="statistics"
        data-consent-src="https://plausible.io/js/script.js" data-domain="example.com"></script>
```

See [Blocking scripts and embeds](/permito/docs/guides/blocking) for iframes and inline scripts.

## 4. Link to the settings

Any element with `data-permito-open` opens the preference center, for example in the footer:

```html
<a href="#" data-permito-open>Cookie-Einstellungen</a>
```

## Options

Besides `config`, the JSON accepts:

| Option | Default | Description |
|---|---|---|
| `privacyPolicyUrl`, `imprintUrl` | none | Links in the banner and dialog. |
| `position` | `"bottom"` | `bottom`, `top`, `bottom-left`, `bottom-right`, `center`. |
| `theme` | follows the system | `"light"` or `"dark"`. |
| `preferencesButton` | `"bottom-left"` | `"bottom-right"` or `false` to hide it. |
| `hideCustomize` | `false` | Hide the "Settings" button in the banner. |
| `serviceToggles` | `true` | Switches per service in the dialog. |
| `googleConsentMode` | `false` | Send Consent Mode v2 updates. |
| `consentModeDefault` | `false` | Push the Consent Mode default (`denied`) immediately. Load the script without `defer` in `<head>`, before the Google tag. |
| `blockedElements` | `true` | Activate blocked markup after consent. |
| `injectStyles` | `true` | Insert the default stylesheet. Set `false` and load `dist/styles.css` yourself, e.g. for a strict CSP. |
| `styleNonce` | none | CSP nonce for the injected `<style>`. |
| `translations` | none | Override texts, see [Translations](/permito/docs/guides/translations). |

Colours and radii follow the same CSS variables as the React components, see [Theming](/permito/docs/guides/theming).

## JavaScript API

`window.Permito` is available after the script has loaded:

```js
Permito.open();                       // open the preference center
Permito.manager.hasConsent("statistics");
Permito.manager.on("consent_updated", (event) => console.log(event.state));
```

Without a JSON config you can start it yourself with `Permito.init({ config, … })`.

## With a bundler but without React

```ts
import { createConsentUI } from "@permitojs/core/ui";

const ui = createConsentUI({ config, privacyPolicyUrl: "/datenschutz", googleConsentMode: true });
ui.openPreferences();
```

`createConsentUI` takes the same options as the JSON and returns `{ manager, openPreferences, closePreferences, destroy }`.
