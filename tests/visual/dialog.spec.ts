import { expect, test } from "@playwright/test";
import { waitForLoginReady } from "./helpers";

test.describe("Login dialog behavior", () => {
  test("login dialog is native and labelled", async ({ page }) => {
    await waitForLoginReady(page);

    const dialog = page.locator("#ritualStack");
    await expect(dialog).toHaveJSProperty("open", true);
    await expect(dialog).toHaveAttribute("aria-labelledby", "authTitle");
    await expect(dialog).toHaveAttribute("aria-describedby", "authPrompt ritualStatus");
  });

  test("Escape keeps Google-only login dialog open", async ({ page }) => {
    await waitForLoginReady(page);

    await page.keyboard.press("Escape");

    const dialog = page.locator("#ritualStack");
    await expect(dialog).toHaveJSProperty("open", true);
    await expect(page.locator("#ritualStatus")).toContainText("請先完成 Google 登入");
  });

  test("backdrop click does not dismiss the required login dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);

    await page.mouse.click(8, 8);

    await expect(page.locator("#ritualStack")).toHaveJSProperty("open", true);
  });
});
