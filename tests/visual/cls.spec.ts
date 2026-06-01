import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForLoginReady } from "./helpers";

test.describe("Core Web Vitals probes", () => {
  test("production bundle exposes CLS / LCP / INP probes", () => {
    // 主程式已外部化為 /js/main.js（S19 CSP 修復），探針程式碼隨之移出 index.html。
    const html = readFileSync("public/index.html", "utf8");
    const mainJs = readFileSync("public/js/main.js", "utf8");

    // index.html 必須以外部 module 載入主程式
    expect(html).toContain('src="/js/main.js"');

    // 探針本體現在位於 main.js
    expect(mainJs).toContain("window.__FLG_CLS__");
    expect(mainJs).toContain("window.__FLG_LCP__");
    expect(mainJs).toContain("window.__FLG_INP__");
    expect(mainJs).toContain("layout-shift");
    expect(mainJs).toContain("largest-contentful-paint");
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
