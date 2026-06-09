import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const staticHtml = readFileSync("public/index.html", "utf8")
  .replace(/<script\b[\s\S]*?<\/script>/gi, "");

async function routeStaticDocument(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && (url.pathname === "/" || url.pathname === "/index.html")) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: staticHtml,
      });
      return;
    }
    if (url.hostname !== "127.0.0.1") {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

export async function waitForLoginReady(page: Page) {
  await routeStaticDocument(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 10_000 });
  await page.locator("#authScreen").waitFor({ state: "attached", timeout: 10_000 });
  await page.evaluate(() => {
    document.body.classList.remove("is-authed");
    const bootLoader = document.getElementById("bootLoader");
    if (bootLoader) {
      bootLoader.style.display = "none";
      bootLoader.setAttribute("aria-hidden", "true");
    }
    const authStatus = document.getElementById("authStatus");
    if (authStatus) authStatus.textContent = "";
  });
  await stabilizeVisuals(page);
}

export async function stabilizeVisuals(page: Page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }

      #bootLoader,
      #sageCanvas,
      #linkStart,
      .bg-aura,
      .bg-grid {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `,
  });
}

export async function enterOperationalWorkbench(page: Page) {
  await page.evaluate(() => {
    document.body.classList.add("is-authed");

    const bootLoader = document.getElementById("bootLoader");
    if (bootLoader) {
      bootLoader.style.display = "none";
      bootLoader.setAttribute("aria-hidden", "true");
    }

    const draftField = document.getElementById("draftField") as HTMLTextAreaElement | null;
    if (draftField) {
      draftField.value = "遠征隊抵達禁忌書庫，月色照在古堡斷裂的尖塔上。";
    }

    const charCount = document.getElementById("charCount");
    if (charCount) charCount.textContent = "29 / 5,000";
    const draftSync = document.getElementById("draftSync");
    if (draftSync) draftSync.textContent = "草稿記憶已同步";
    const sysStatus = document.getElementById("sysStatusText");
    if (sysStatus) sysStatus.textContent = "鑑定核心已連線";
    const resultStatus = document.getElementById("resultStatusText");
    if (resultStatus) resultStatus.textContent = "魔導鑑定卷宗已完成";

    const historyPanel = document.getElementById("historyPanel");
    historyPanel?.classList.remove("is-open", "is-closing");
    const historyToggleBtn = document.getElementById("historyToggleBtn");
    historyToggleBtn?.setAttribute("aria-expanded", "false");

    const scrim = document.getElementById("scrim");
    scrim?.classList.remove("is-open");
    scrim?.removeAttribute("data-owner");

    const logoutModal = document.getElementById("logoutModal");
    if (logoutModal) {
      logoutModal.setAttribute("hidden", "");
      logoutModal.classList.remove("is-open", "is-closing");
    }

    const analysisResult = document.getElementById("analysisResult");
    if (analysisResult) {
      analysisResult.innerHTML = `
        <section class="result-section" data-section="rewrite">
          <div class="result-section-head">
            <div>
              <span class="result-section-eyebrow">REWRITTEN MANUSCRIPT</span>
              <h3 class="result-section-title">修改後全文</h3>
            </div>
            <button type="button" class="copy-cube" data-copy-section="rewrite" aria-label="複製本段">
              <span class="cc-icon" aria-hidden="true"></span>
              <span class="cc-cube"><span class="cc-side cc-front btn-label">複製本段</span><span class="cc-side cc-top">複製本段</span></span>
            </button>
          </div>
          <div class="result-section-body">月色照在古堡斷裂的尖塔上，守門人低聲宣告遠征隊已抵達禁忌書庫。</div>
        </section>
        <section class="result-section" data-section="summary">
          <div class="result-section-head">
            <div>
              <span class="result-section-eyebrow">EDITORIAL REVIEW</span>
              <h3 class="result-section-title">審查摘要</h3>
            </div>
            <button type="button" class="copy-cube" data-copy-section="summary" aria-label="複製本段">
              <span class="cc-icon" aria-hidden="true"></span>
              <span class="cc-cube"><span class="cc-side cc-front btn-label">複製本段</span><span class="cc-side cc-top">複製本段</span></span>
            </button>
          </div>
          <div class="result-section-body">語氣已調整為沉穩西幻敘事，現代口吻與突兀節奏已收斂。</div>
        </section>
      `;
    }
  });
}

export async function openHistoryDrawer(page: Page) {
  await page.evaluate(() => {
    document.body.classList.add("is-authed");
    const toggle = document.getElementById("historyToggleBtn");
    toggle?.setAttribute("aria-expanded", "true");

    const panel = document.getElementById("historyPanel");
    if (panel) {
      panel.classList.remove("is-closing");
      panel.classList.add("is-open");
      panel.style.animation = "none";
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      panel.style.transform = "translate(-50%, -50%) scaleX(1) scaleY(1)";
    }

    const scrim = document.getElementById("scrim");
    if (scrim) {
      scrim.classList.add("is-open");
      scrim.dataset.owner = "history";
    }

    const list = document.getElementById("historyList");
    if (list) {
      list.innerHTML = `
        <div class="history-entry" role="listitem">
          <button class="history-item is-active" type="button" aria-current="true">
            <span class="history-time">2026/05/25 23:40</span>
            <span class="history-preview">遠征隊抵達禁忌書庫，月色照在古堡斷裂的尖塔上...</span>
          </button>
          <button class="btn btn-ghost btn-danger btn-icon history-delete" type="button" aria-label="刪除此筆鑑定紀錄">×</button>
        </div>
      `;
    }
  });
}

export async function openLogoutConfirm(page: Page) {
  await page.evaluate(() => {
    document.body.classList.add("is-authed");

    const scrim = document.getElementById("scrim");
    if (scrim) {
      scrim.classList.add("is-open");
      scrim.dataset.owner = "modal";
    }

    const dialog = document.getElementById("logoutModal");
    if (dialog) {
      dialog.removeAttribute("hidden");
      dialog.classList.remove("is-closing");
      dialog.classList.add("is-open");
      dialog.style.animation = "none";
      dialog.style.opacity = "1";
      dialog.style.pointerEvents = "auto";
      dialog.style.transform = "translate(-50%, -50%) scaleX(1) scaleY(1)";
    }
  });
}
