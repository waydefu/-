import { expect, type Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { enterOperationalWorkbench, openHistoryDrawer, waitForLoginReady } from "./helpers";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoBlockingA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  const impactCounts = results.violations.reduce<Record<string, number>>((acc, violation) => {
    const impact = violation.impact || "unknown";
    acc[impact] = (acc[impact] || 0) + 1;
    return acc;
  }, {});
  console.log(`axe impact counts: ${JSON.stringify(impactCounts)}`);
  if (results.violations.length) {
    console.log(`axe violations: ${JSON.stringify(results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    })))}`);
  }
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, JSON.stringify(blocking.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target),
  })), null, 2)).toHaveLength(0);
}

test.describe("WCAG 2.1 AA axe scan", () => {
  test("登入頁無 critical / serious 違規", async ({ page }) => {
    await waitForLoginReady(page);
    await expectNoBlockingA11yViolations(page);
  });

  test("工作區無 critical / serious 違規", async ({ page }) => {
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expectNoBlockingA11yViolations(page);
  });

  test("歷史抽屜開啟無 critical / serious 違規", async ({ page }) => {
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await openHistoryDrawer(page);
    await expectNoBlockingA11yViolations(page);
  });
});
