---
title: Migrating to 1.0
description: What changed between 0.x releases and what to check before 1.0.
---

There are no breaking changes between 0.1.0 and 0.8.0. Every release added to the API, and the stored decision format (schema 1) has not changed, so visitors keep their choice when you upgrade. Three behavior details are worth knowing.

| Since | Detail | What to check |
|---|---|---|
| 0.2.0 | With the built-in cookie storage, a decision now syncs across open tabs (`syncTabs`, default on). | If you create managers dynamically, call `manager.destroy()` when you drop one. Set `syncTabs: false` to turn it off. |
| 0.3.0 | The stylesheet lives in `@permitojs/core/styles.css`. | `@permitojs/react/styles.css` still works. No change needed. |
| 0.5.0 | `es`, `nl`, `pl` and `pt` are built in. | A site that used these language codes with its own `translations` keeps its texts, because overrides win. Without overrides the built-in texts apply now instead of English. |

## Before 1.0

1.0.0 freezes the API listed as stable on the [API status](../reference/api-status.md) page. The runtime exports of every entry point are pinned by a test, so a change cannot slip in unnoticed. What you can do now:

- Read the "may still change" list on the API status page and decide which of those APIs you rely on.
- Pin `@permitojs/core` and `@permitojs/react` to the same version. They are released together.
- Run your own accessibility check against your theme and texts, see [Accessibility](../reference/accessibility.md).

## After 1.0

Breaking changes only come with a new major version, with a migration note here. A deprecated API stays for at least one minor release and is marked `@deprecated` in the types.

## Permito Pro

The Pro packages accept every Permito 0.x release as a peer. Before Permito 1.0.0, Pro widens the range to include 1.x. Upgrade Pro first, then Permito.
