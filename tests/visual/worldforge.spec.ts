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
    await openAccountMenu(page);
    await expect(page).toHaveScreenshot("account-menu-1366.png", { animations: "disabled", caret: "hide" });
  });

  test("登出確認彈窗 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await openLogoutConfirm(page);
    await expect(page).toHaveScreenshot("logout-confirm-1366.png", { animations: "disabled", caret: "hide" });
  });
});
