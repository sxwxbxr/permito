---
"@permitojs/react": patch
---

Banner, preference center and preferences button now render into `document.body` via a portal, so ancestors with `transform`, `filter` or `contain` can no longer clip them. Choose another target with `portalContainer` on the provider or `portal={element}`, or render in place with `portal={false}`.

Theme variables are now inherited from `:root` or any ancestor, `data-pmt-theme` works on ancestors, and the provider accepts `theme="light" | "dark"`.
