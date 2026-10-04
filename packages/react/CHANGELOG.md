# @permitojs/react

## 0.1.0

### Minor Changes

- 1d3dfe4: First release: consent engine with cookie/localStorage/memory storage, versioning, events, Google Consent Mode v2 and markup-based script blocking; React provider, hooks, banner, preference center, consent gate, script and iframe components; translations for DE, DE-CH, EN, FR and IT.

### Patch Changes

- 9dcb184: Banner, preference center and preferences button now render into `document.body` via a portal, so ancestors with `transform`, `filter` or `contain` can no longer clip them. Choose another target with `portalContainer` on the provider or `portal={element}`, or render in place with `portal={false}`.

  Theme variables are now inherited from `:root` or any ancestor, `data-pmt-theme` works on ancestors, and the provider accepts `theme="light" | "dark"`.

- Updated dependencies [1d3dfe4]
  - @permitojs/core@0.1.0
