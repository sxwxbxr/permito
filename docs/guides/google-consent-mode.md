---
title: Google Consent Mode v2
description: Send consent signals to Google tags.
---

Consent Mode needs two parts.

**1. A default before any Google tag.** Everything is denied except `security_storage`:

```tsx
import { getConsentModeDefaultScript } from "@permitojs/react/server";

<script dangerouslySetInnerHTML={{ __html: getConsentModeDefaultScript() }} />
```

**2. Updates after a decision.** Enable `googleConsentMode` on the provider, or call `connectGoogleConsentMode(manager)` from the core. Permito then pushes `gtag("consent", "update", …)` whenever the decision changes.

## Default mapping

| Google consent type | Permito categories (all must be granted) |
|---|---|
| `ad_storage`, `ad_user_data`, `ad_personalization` | `marketing` |
| `analytics_storage` | `statistics` |
| `functionality_storage`, `personalization_storage` | `preferences` |
| `security_storage` | `necessary` |

Override it with `googleConsentMode={{ mapping: { analytics_storage: ["statistics"] } }}`. The same mapping must be passed to `getConsentModeDefaultScript({ mapping })`.

Permito is not a Google-certified CMP and does not implement IAB TCF. Publishers serving Google ads (AdSense, Ad Manager) in the EEA, UK or Switzerland may need a certified CMP. Check Google's current requirements.
