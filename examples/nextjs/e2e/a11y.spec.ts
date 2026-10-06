import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Scans the whole page; the rules are the WCAG 2.2 AA set of axe-core. */
async function violations(page: Page) {
  // The dialogs fade in over 180 ms. axe reads the computed colors, so scanning mid-fade
  // reports contrast problems that are not there once the animation has finished.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.beforeEach(async ({ page }) => {
  await page.route(/plausible\.io|youtube|google/, (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
});

test("banner has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Ihre Privatsphäre" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("preference center has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByRole("dialog", { name: "Datenschutz-Einstellungen" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("blocked embed placeholder has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Alle ablehnen" }).click();
  await expect(page.getByText("YouTube ist blockiert")).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("the preference center traps focus and returns it on close", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Alle ablehnen" }).click();
  const opener = page.getByRole("button", { name: "Datenschutz-Einstellungen öffnen" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
