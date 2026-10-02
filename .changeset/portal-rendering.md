---
"@permito/react": patch
---

Banner, preference center and preferences button now render into `document.body` via a portal, so ancestors with `transform`, `filter` or `contain` can no longer clip them. Opt out with `portal={false}`.
