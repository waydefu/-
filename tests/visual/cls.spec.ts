import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForLoginReady } from "./helpers";

test.describe("Core Web Vitals probes", () => {
  test("production HTML exposes CLS / LCP / INP probes", () => {
    const html = readFileSync("public/index.html", "utf8");

    expect(html).toContain("window.__FLG_CLS__");
    expect(html).toContain("window.__FLG_LCP__");
    expect(html).toContain("window.__FLG_INP__");
    expect(html).toContain("layout-shift");
    expect(html).toContain("largest-contentful-paint");
  });

  test("static boot-complete layout keeps CLS below 0.1", async ({ page }) => {
    await waitForLoginReady(page);
    await page.evaluate(() => {
      const metricWindow = window as Window & { __FLG_CLS__?: number };
      metricWindow.__FLG_CLS__ = metricWindow.__FLG_CLS__ || 0;
    });

    const cls = await page.evaluate(() => {
      const metricWindow = window as Window & { __FLG_CLS__?: number };
      return metricWindow.__FLG_CLS__ || 0;
    });
    expect(cls).toBeLessThan(0.1);
  });
});
