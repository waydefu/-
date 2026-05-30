import { expect, test } from "@playwright/test";
import { enterOperationalWorkbench, openAccountMenu, openHistoryDrawer, openLogoutConfirm, waitForLoginReady } from "./helpers";

test.describe("Worldforge visual baseline", () => {
  test("登入頁 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await expect(page).toHaveScreenshot("login-1366.png", { animations: "disabled", caret: "hide" });
  });

  test("登入頁手機 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await expect(page).toHaveScreenshot("login-390.png", { animations: "disabled", caret: "hide", fullPage: true });
  });

  test("工作區 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expect(page).toHaveScreenshot("workbench-1366.png", { animations: "disabled", caret: "hide" });
  });

  test("工作區手機 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expect(page).toHaveScreenshot("workbench-390.png", { animations: "disabled", caret: "hide", fullPage: true });
  });

  test("歷史抽屜 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await openHistoryDrawer(page);
    await expect(page).toHaveScreenshot("history-drawer-1366.png", { animations: "disabled", caret: "hide" });
  });

  test("帳號選單 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expect(page.locator("#systemMenuPanel #accountToggle")).toHaveCount(1);
    await openAccountMenu(page);
    await expect(page.locator("#accountMenu")).toBeVisible();
    await expect(page).toHaveScreenshot("account-menu-1366.png", { animations: "disabled", caret: "hide" });
  });

  test("SYSTEM menu exposes account center", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expect(page.locator("#systemMenuToggle")).toHaveAttribute("aria-label", "工作區選單");
    await expect(page.locator("#systemMenuPanel #accountToggle")).toHaveCount(1);
  });

  test("visible buttons keep 44px target size", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    const failures = await page.evaluate(() => Array.from(document.querySelectorAll("button"))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        const visible = !button.hidden
          && style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width > 0
          && rect.height > 0;
        if (!visible || (rect.width >= 44 && rect.height >= 44)) return null;
        return {
          id: button.id || button.getAttribute("data-op") || button.className,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
      .filter(Boolean));
    expect(failures).toEqual([]);
  });

  test("reduced motion keeps connection window visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await page.evaluate(() => {
      const connectionWindow = document.getElementById("connectionWindow");
      if (!connectionWindow) return;
      connectionWindow.style.display = "grid";
      connectionWindow.setAttribute("aria-hidden", "false");
    });
    const state = await page.locator("#connectionWindow").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        opacity: style.opacity,
        transform: style.transform,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    expect(state.opacity).toBe("1");
    expect(state.transform).not.toContain("matrix(0");
    expect(state.width).toBeGreaterThan(0);
    expect(state.height).toBeGreaterThan(0);
  });

  test("登出確認彈窗 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await openLogoutConfirm(page);
    await expect(page).toHaveScreenshot("logout-confirm-1366.png", { animations: "disabled", caret: "hide" });
  });
});
