import { expect, test } from "@playwright/test";
import { waitForLoginReady } from "./helpers";

test.describe("Login gate behavior", () => {
  test("login screen is labelled and Google-only", async ({ page }) => {
    await waitForLoginReady(page);

    const screen = page.locator("#authScreen");
    await expect(screen).toBeVisible();
    await expect(screen).toHaveAttribute("aria-labelledby", "authTitle");
    await expect(page.locator("#googleLoginBtn")).toHaveAccessibleName(/使用 Google 登入/);
    await expect(page.locator("#authStatus")).toHaveAttribute("role", "status");
  });

  test("Escape keeps the required login screen visible", async ({ page }) => {
    await waitForLoginReady(page);

    await page.keyboard.press("Escape");

    await expect(page.locator("#authScreen")).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/is-authed/);
  });

  test("background click does not enter the app workspace", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);

    await page.mouse.click(8, 8);

    await expect(page.locator("#authScreen")).toBeVisible();
    await expect(page.locator(".app-header")).toBeHidden();
  });
});
