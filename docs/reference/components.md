---
title: Components
description: Props of all React components.
---

## PermitoProvider

| Prop | Description |
|---|---|
| `config` | `ConsentConfig`. Read once on mount; change the `key` to apply a new config. |
| `manager` | Use an existing core manager instead. |
| `translations` | Text overrides, see [Translations](../guides/translations.md). |
| `privacyPolicyUrl`, `imprintUrl` | Links shown in the banner and preference center. |
| `googleConsentMode` | `true` or `{ mapping, dataLayerName }`. |
| `blockedElements` | `true` or `{ root, allowlist, nonce }`. Activates blocked markup. |
| `theme` | `"light"` or `"dark"`. Default: follow the page. |
| `portalContainer` | Element that overlays are portaled into. Default `document.body`. |

## ConsentBanner

| Prop | Default | Description |
|---|---|---|
| `position` | `"bottom"` | `bottom`, `top`, `bottom-left`, `bottom-right`, `center` |
| `autoFocus` | `true` | Move focus to the banner when it appears. |
| `hideCustomize` | `false` | Hide the settings button. Only do this if the preference center is reachable elsewhere. |
| `privacyPolicyUrl` | provider value | |
| `className`, `unstyled` | | |
| `children` | | Extra content above the buttons. |
| `portal` | `true` | `true`, an element, or `false` to render in place. |

The banner renders only on the client and only while no valid decision exists.

## PreferenceCenter

Modal dialog (`aria-modal`), focus trapped, closes with Escape, restores focus. Props: `className`, `unstyled`, `serviceToggles` (default `true`), `portal`.

## PreferencesButton

Floating button to reopen the preference center after a decision. Props: `position` (`bottom-left`, `bottom-right`), `className`, `unstyled`, `portal`. You can also call `openPreferences()` from a footer link.

## ConsentGate

`category` or `service`, `children`, `fallback`.

## ConsentScript

`category` or `service`, `src`, plus `id`, `async`, `defer`, `nonce`, `attributes`, `allowlist`, `onLoad`, `onError`.

## ConsentIframe

`category` or `service`, `src`, `title` (required), `placeholder`, `placeholderClassName`, `unstyled`, and any iframe attribute.
