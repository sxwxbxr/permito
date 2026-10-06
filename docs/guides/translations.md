---
title: Translations
description: Built-in languages and how to change texts.
---

Built in: `de`, `de-CH` (with "ss" instead of "ß"), `en`, `fr`, `it`, `es`, `nl`, `pl`, `pt`. Regional codes fall back to the base language (`fr-CH` → `fr`), unknown codes fall back to English.

```tsx
<PermitoProvider
  config={{ ...config, language: "de-CH" }}
  translations={{
    bannerTitle: "Cookies auf example.ch",
    categories: { marketing: { name: "Werbung" } },
  }}
/>
```

Category and service texts in the config accept a string or a map per language:

```ts
{ id: "statistics", name: { de: "Statistik", fr: "Statistiques" } }
```

The default texts are neutral wording, not legally reviewed. Have your final texts checked.

`es`, `nl`, `pl` and `pt` are new in 0.5.0 and have not been reviewed by native speakers yet. Check them before you ship, or override single texts with `translations`. Corrections are welcome as issues or pull requests.

## Service templates

`serviceFromTemplate` gives you a starting point for 15 common services (YouTube, Vimeo, Google Maps, Google Analytics 4, Google Tag Manager, Google Ads, reCAPTCHA, Meta Pixel, LinkedIn Insight Tag, Microsoft Clarity, Microsoft Advertising, Hotjar, HubSpot, Pinterest Tag, Spotify):

```ts
import { serviceFromTemplate } from "@permitojs/core";

const services = [
  serviceFromTemplate("google-analytics-4"),
  serviceFromTemplate("youtube", { category: "preferences" }),
];
```

A template has the name, provider, privacy policy URL and the category most sites choose. It lists no cookies and no durations, because those change and need a source. You decide the category and whether the service needs consent. `serviceTemplates` holds the raw list.
