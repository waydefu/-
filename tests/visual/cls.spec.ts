import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForLoginReady } from "./helpers";

test.describe("Shell layout guardrails", () => {
  test("production shell exposes the current external runtime and landmarks", () => {
    const html = readFileSync("public/index.html", "utf8");
    const mainJs = readFileSync("public/js/main.js", "utf8");

    expect(html).toContain('src="/js/main.js"');
    expect(html).toContain('id="authScreen"');
    expect(html).toContain('id="appMain"');
    expect(html).toContain('id="sageCanvas"');

    expect(mainJs).toContain("function runAnalysis");
    expect(mainJs).toContain("worldforge:auth-changed");
    expect(mainJs).toContain("historyToggleBtn");
  });

  test("static login layout has no horizontal overflow", async ({ page }) => {
    await waitForLoginReady(page);
    const { clientWidth, scrollWidth } = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
