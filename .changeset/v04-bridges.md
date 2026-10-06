---
"@permitojs/core": minor
"@permitojs/react": minor
---

Consent bridges for Microsoft UET (`ad_storage`), Microsoft Clarity (`consentv2`) and Matomo (`setConsentGiven` / `forgetConsentGiven`, with cookie-only mode). Enable them with `microsoftUet`, `clarity` and `matomo` on `PermitoProvider`, `createConsentUI` or the script-tag config; the defaults for UET and Matomo come from `getMicrosoftUetDefaultScript()` and `getMatomoDefaultScript()`, or are pushed by the script-tag build.
