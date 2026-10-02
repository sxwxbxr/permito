import { expect, type Page, test } from "@playwright/test";

const THIRD_PARTY = /plausible\.io|youtube|google/;

/** Records third-party requests (and fulfils them locally) plus console errors. */
async function watch(page: Page) {
  const thirdParty: string[] = [];
  const errors: string[] = [];
  await page.route(THIRD_PARTY, (route) => {
    thirdParty.push(route.request().url());
    return route.fulfill({ status: 200, body: "" });
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { thirdParty, errors };
}

test("first visit: banner, nothing third-party loaded, no hydration errors", async ({ page }) => {
  const { thirdParty, errors } = await watch(page);
  await page.goto("/");
  const banner = page.getByRole("dialog", { name: "Ihre Privatsphäre" });
  await expect(banner).toBeVisible();
  await expect(banner).toBeFocused();
  await expect(page.getByTestId("stats")).toHaveText("Statistik deaktiviert");
  await expect(page.getByText("YouTube ist blockiert")).toBeVisible();
  expect(thirdParty).toEqual([]);
  expect(errors).toEqual([]);
});

test("reject all persists across reloads", async ({ page }) => {
  const { thirdParty } = await watch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Alle ablehnen" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Datenschutz-Einstellungen öffnen" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(thirdParty).toEqual([]);
  const consentMode = await page.evaluate(() =>
    (window as unknown as { dataLayer: IArguments[] }).dataLayer.map((args) => Array.from(args)),
  );
  expect(consentMode[0]?.[1]).toBe("default");
  expect(consentMode.at(-1)?.[2]).toMatchObject({ analytics_storage: "denied" });
});

test("accept all loads services and server-renders allowed content", async ({ page }) => {
  const { thirdParty, errors } = await watch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Alle akzeptieren" }).click();
  await expect(page.getByTestId("stats")).toHaveText("Statistik aktiv");
  await expect(page.getByTitle("Beispielvideo")).toBeVisible();
  await expect.poll(() => thirdParty.some((url) => url.includes("plausible.io"))).toBe(true);

  // The server reads the cookie, so the allowed state is in the HTML itself.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain("Statistik aktiv");
  expect(errors).toEqual([]);
});

test("preference center: keyboard, escape and granular choice", async ({ page }) => {
  await watch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dialog = page.getByRole("dialog", { name: "Datenschutz-Einstellungen" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Ihre Privatsphäre" })).toBeVisible();

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await dialog.getByRole("switch", { name: "Statistik" }).check();
  await dialog.getByRole("button", { name: "Auswahl speichern" }).click();
  await expect(page.getByTestId("stats")).toHaveText("Statistik aktiv");
  await expect(page.getByText("YouTube ist blockiert")).toBeVisible();
});

test("embed can be loaded once without storing consent", async ({ page }) => {
  await watch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Einmal laden" }).click();
  await expect(page.getByTitle("Beispielvideo")).toBeVisible();
  await page.reload();
  await expect(page.getByText("YouTube ist blockiert")).toBeVisible();
});

test("mobile: banner fits the viewport and buttons are reachable", async ({ page }) => {
  await watch(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  const banner = page.getByRole("dialog", { name: "Ihre Privatsphäre" });
  const box = await banner.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
  await expect(page.getByRole("button", { name: "Alle ablehnen" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Alle akzeptieren" })).toBeInViewport();
});
