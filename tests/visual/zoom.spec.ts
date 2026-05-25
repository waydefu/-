import { expect, test } from "@playwright/test";
import { waitForLoginReady } from "./helpers";

test.describe("Resize text and reflow", () => {
  test("200% browser zoom keeps login title readable", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.waitForTimeout(100);

    const titleSize = await page.locator("#authTitle").evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(titleSize).toBeGreaterThan(48);
  });

  test("400% zoom has no horizontal page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForLoginReady(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "400%";
    });
    await page.waitForTimeout(100);

    const { clientWidth, scrollWidth } = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
