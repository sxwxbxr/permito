---
"@permitojs/core": minor
"@permitojs/react": minor
---

New: `maxAgeDays` lets decisions expire and shows the banner again, `globalPrivacyControl` honours the GPC browser signal (with `readGpcFromHeaders` for SSR), and decisions sync across open tabs (`syncTabs`, default on, `manager.destroy()`). The snapshot gains `globalPrivacyControl` and `expiresAt`.
