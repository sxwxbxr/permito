# @permitojs/react

## 0.2.0

### Minor Changes

- e9b7b28: New: `maxAgeDays` lets decisions expire and shows the banner again, `globalPrivacyControl` honours the GPC browser signal (with `readGpcFromHeaders` for SSR), and decisions sync across open tabs (`syncTabs`, on by default with the built-in cookie storage, `manager.destroy()`). The snapshot gains `globalPrivacyControl` and `expiresAt`.

### Patch Changes

- 517208d: Documentation moved to packages.sweber.dev/permito/docs; README links and the package homepage point there.
- Updated dependencies [517208d]
- Updated dependencies [e9b7b28]
  - @permitojs/core@0.2.0

## 0.1.0

### Minor Changes

- 1d3dfe4: First release: consent engine with cookie/localStorage/memory storage, versioning, events, Google Consent Mode v2 and markup-based script blocking; React provider, hooks, banner, preference center, consent gate, script and iframe components; translations for DE, DE-CH, EN, FR and IT.

### Patch Changes

- 9dcb184: Banner, preference center and preferences button now render into `document.body` via a portal, so ancestors with `transform`, `filter` or `contain` can no longer clip them. Choose another target with `portalContainer` on the provider or `portal={element}`, or render in place with `portal={false}`.

  Theme variables are now inherited from `:root` or any ancestor, `data-pmt-theme` works on ancestors, and the provider accepts `theme="light" | "dark"`.

- Updated dependencies [1d3dfe4]
  - @permitojs/core@0.1.0
