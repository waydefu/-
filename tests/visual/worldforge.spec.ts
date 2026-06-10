import { expect, test } from "@playwright/test";
import { enterOperationalWorkbench, openHistoryDrawer, openLogoutConfirm, waitForLoginReady } from "./helpers";

test.describe("Great Sage visual baseline", () => {
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

  test("navbar exposes history and logout controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await expect(page.locator(".nav-actions #historyToggleBtn")).toHaveAttribute("aria-label", "開啟鑑定紀錄");
    await expect(page.locator(".nav-actions #logoutBtn")).toHaveAttribute("aria-label", "登出");
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

  test("secondary action motion does not resize the command row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);

    const measure = () => page.evaluate(() => {
      const row = document.querySelector(".actions-row");
      const analyze = document.getElementById("analyzeBtn");
      const clear = document.getElementById("clearBtn");
      const logout = document.getElementById("logoutBtn");
      const rect = (node: Element | null) => {
        const r = node?.getBoundingClientRect();
        return r ? { width: Math.round(r.width), height: Math.round(r.height) } : { width: 0, height: 0 };
      };
      return {
        row: rect(row),
        analyze: rect(analyze),
        clear: rect(clear),
        logout: rect(logout),
      };
    });

    const before = await measure();
    await page.locator("#clearBtn").hover();
    const afterClearHover = await measure();
    await page.locator("#logoutBtn").hover();
    const afterLogoutHover = await measure();

    expect(afterClearHover.row).toEqual(before.row);
    expect(afterLogoutHover.logout.width).toBe(44);
    expect(afterClearHover.clear.width).toBe(50);
    expect(afterClearHover.analyze.width).toBeGreaterThan(90);
  });

  test("model orbit selector opens without layout shift", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);

    const before = await page.locator(".actions-row").boundingBox();
    await page.evaluate(() => {
      const trigger = document.getElementById("modelDialOpen") as HTMLInputElement | null;
      const dial = document.getElementById("modelDial");
      if (trigger) trigger.checked = true;
      dial?.classList.add("is-open");
    });
    const after = await page.locator(".actions-row").boundingBox();
    const choices = await page.locator(".md-trigger:checked ~ .md-subs .md-sub label").count();

    expect(choices).toBe(3);
    expect(Math.round(after?.width || 0)).toBe(Math.round(before?.width || 0));
    expect(Math.round(after?.height || 0)).toBe(Math.round(before?.height || 0));
  });

  test("reduced motion keeps history panel visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForLoginReady(page);
    await enterOperationalWorkbench(page);
    await openHistoryDrawer(page);
    const state = await page.locator("#historyPanel").evaluate((node) => {
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
