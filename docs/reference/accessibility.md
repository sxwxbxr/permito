---
title: Accessibility
description: What is tested automatically, what is built in, and what still needs a manual check.
---

## Built in

- The banner and the preference center are `role="dialog"` with an accessible name. The preference center is modal: focus stays inside, Escape closes it, page scroll is locked, and focus returns to the element that opened it.
- Category switches are real `switch` controls with labels. "Reject all" and "Accept all" have the same size and weight.
- The banner moves focus to itself when it appears, so keyboard and screen reader users notice it. Turn that off with `autoFocus: false` if you handle it yourself.
- The blocked-embed placeholder has a visible text and real buttons.

## Tested automatically

Every pull request runs end-to-end tests in Chromium, Firefox and WebKit. They include an axe-core scan against WCAG 2.0 to 2.2 level A and AA for the banner, the preference center and the blocked-embed placeholder, and a keyboard test for focus trapping and focus return.

An axe scan finds only part of all accessibility problems. It cannot judge whether a text makes sense or whether the reading order helps. Test with a keyboard and a screen reader on your own site, in your own theme: custom colors and your own texts can break contrast and wording.

## Version 0.7.0 fix

The audit found that after closing the preference center, focus did not return to the floating settings button, because that button is removed while the dialog is open. Both the React components and the script tag UI now restore focus to it.
