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
  await page.locator("#ritualStack").waitFor({ state: "attached", timeout: 10_000 });
  await page.evaluate(() => {
    document.body.classList.remove("is-booting", "operational", "auth-handoff-collapsing");
    document.body.classList.add("boot-complete");

    const bootVeil = document.getElementById("bootVeil");
    if (bootVeil) {
      bootVeil.style.opacity = "0";
      bootVeil.style.display = "none";
    }

    const ritualStack = document.getElementById("ritualStack");
    if (ritualStack) {
      ritualStack.addEventListener("cancel", (event) => {
        event.preventDefault();
        const status = document.getElementById("ritualStatus");
        if (status) status.textContent = "請先完成 Google 登入";
      });
      if ("showModal" in ritualStack && !ritualStack.open) {
        ritualStack.showModal();
      } else if (!ritualStack.open) {
        ritualStack.setAttribute("open", "");
      }
      ritualStack.style.opacity = "1";
      ritualStack.style.visibility = "visible";
      ritualStack.style.display = "grid";
    }

  });
  await hydrateStaticSaoButtons(page);
  await stabilizeVisuals(page);
}

export async function hydrateStaticSaoButtons(page: Page) {
  await page.evaluate(() => {
    function resolveLabel(button: HTMLElement) {
      const explicit = button.dataset.saoLabel || "";
      if (explicit.trim()) return explicit.trim();
      const labelNode = button.querySelector(".sao-btn-label, .btn-label, .nav-label, .history-time");
      const label = labelNode?.textContent?.trim();
      if (label) return label;
      return (button.getAttribute("aria-label") || button.title || button.textContent || "").trim();
    }

    function resolveTag(button: HTMLElement) {
      if (button.dataset.saoTag) return button.dataset.saoTag;
      if (button.id) {
        const tag = button.id
          .replace(/Button|Btn|Toggle|Clear|Close/gi, "")
          .replace(/[a-z][A-Z]/g, (part) => `${part[0]}_${part[1]}`)
          .split(/[^A-Za-z0-9]+|_/)
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 4)
          .toUpperCase();
        if (tag) return tag;
      }
      if (button.dataset.op) return String(button.dataset.op).slice(0, 4).toUpperCase();
      return "SYS";
    }

    document.querySelectorAll<HTMLElement>(".sao-btn").forEach((button) => {
      const label = resolveLabel(button) || "SYSTEM";
      button.dataset.saoTag = resolveTag(button);
      button.dataset.saoCompact = String(button.classList.contains("history-delete")
        || (!button.querySelector(".sao-btn-label, .btn-label, .nav-label") && (button.textContent || "").trim().length <= 2));

      if (!button.querySelector(".sao-btn-scan")) {
        const scan = document.createElement("span");
        scan.className = "sao-btn-scan";
        scan.setAttribute("aria-hidden", "true");
        button.appendChild(scan);
      }

      if (!button.querySelector(".sao-btn-tag")) {
        const tag = document.createElement("span");
        tag.className = "sao-btn-tag";
        tag.setAttribute("aria-hidden", "true");
        tag.textContent = button.dataset.saoTag || "SYS";
        button.appendChild(tag);
      }
    });
  });
}

export async function applyStaticSystemMenu(page: Page) {
  await page.evaluate(() => {
    const navActions = document.querySelector<HTMLElement>(".workbench-nav-actions");
    if (!navActions) return;
    const historyToggle = document.getElementById("historyToggle");
    const accountToggle = document.getElementById("accountToggle");
    const reanalyzeButton = document.getElementById("reanalyzeButton");
    const clearDraftButton = document.getElementById("clearDraftButton");
    const logoutButton = document.getElementById("logoutButton");

    let toggle = document.getElementById("systemMenuToggle") as HTMLButtonElement | null;
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "system-menu-toggle sao-btn";
      toggle.id = "systemMenuToggle";
      toggle.type = "button";
      toggle.title = "工作區選單";
      toggle.setAttribute("aria-label", "工作區選單");
      toggle.setAttribute("aria-haspopup", "menu");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", "systemMenuPanel");
      toggle.innerHTML = `<span class="sao-btn-symbol" aria-hidden="true">SYS</span><span class="sao-btn-label">工作區選單</span>`;
    }
    navActions.replaceChildren(toggle);

    let panel = document.getElementById("systemMenuPanel") as HTMLDivElement | null;
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "sao-system-menu";
      panel.id = "systemMenuPanel";
      panel.setAttribute("role", "menu");
      panel.setAttribute("aria-label", "SAO system menu");
      panel.hidden = true;
      navActions.after(panel);
    }
    [historyToggle, accountToggle, clearDraftButton, reanalyzeButton, logoutButton]
      .filter((button): button is HTMLElement => button instanceof HTMLElement)
      .forEach((button) => {
        button.classList.add("system-menu-item");
        button.setAttribute("role", "menuitem");
        panel?.appendChild(button);
      });
  });
  await hydrateStaticSaoButtons(page);
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

      #webgl-container canvas,
      .leyline-rain,
      .atmosphere,
      .core-pulse,
      .shockwave,
      .arcane-lens {
        visibility: hidden !important;
      }
    `,
  });
}

export async function enterOperationalWorkbench(page: Page) {
  await page.evaluate(() => {
    document.body.classList.remove("is-booting", "login-modal-entering", "auth-handoff-collapsing");
    document.body.classList.add("boot-complete", "operational");

    const ritualDialog = document.getElementById("ritualStack");
    if (ritualDialog?.open && typeof ritualDialog.close === "function") {
      ritualDialog.close();
    }

    const bootVeil = document.getElementById("bootVeil");
    if (bootVeil) {
      bootVeil.style.opacity = "0";
      bootVeil.style.display = "none";
    }

    document.querySelectorAll<HTMLElement>("#ritualStack, #overrideWindow, #connectionWindow").forEach((node) => {
      node.style.opacity = "0";
      node.style.visibility = "hidden";
      node.style.display = "none";
      node.setAttribute("aria-hidden", "true");
    });

    const deck = document.getElementById("operationalDeck");
    if (deck) {
      deck.removeAttribute("inert");
      deck.setAttribute("aria-hidden", "false");
      deck.style.opacity = "1";
      deck.style.visibility = "visible";
      deck.style.transform = "none";
      deck.style.filter = "none";
    }

    const analysisResult = document.getElementById("analysisResult");
    if (analysisResult) {
      analysisResult.innerHTML = `
        <section class="result-section">
          <div class="result-section-head">
            <span>修改後全文</span>
            <button type="button" class="dossier-copy sao-btn"><span class="sao-btn-symbol" aria-hidden="true">⧉</span><span class="sao-btn-label">複製本段</span></button>
          </div>
          <div class="result-section-body">月色照在古堡斷裂的尖塔上，守門人低聲宣告遠征隊已抵達禁忌書庫。</div>
        </section>
        <section class="result-section">
          <div class="result-section-head">
            <span>審查摘要</span>
            <button type="button" class="dossier-copy sao-btn"><span class="sao-btn-symbol" aria-hidden="true">⧉</span><span class="sao-btn-label">複製本段</span></button>
          </div>
          <div class="result-section-body">語氣已調整為沉穩西幻敘事，現代口吻與突兀節奏已收斂。</div>
        </section>
      `;
    }
  });
  await applyStaticSystemMenu(page);
  await hydrateStaticSaoButtons(page);
}

export async function openHistoryDrawer(page: Page) {
  await page.evaluate(() => {
    const toggle = document.getElementById("historyToggle");
    toggle?.setAttribute("aria-expanded", "true");
    const drawer = document.getElementById("historyDrawer");
    drawer?.removeAttribute("hidden");
    const list = document.getElementById("historyList");
    if (list) {
      list.innerHTML = `
        <div class="history-entry">
          <button class="history-item sao-btn is-active" type="button" aria-current="true">
            <span class="sao-btn-symbol history-entry-sigil" aria-hidden="true">卷</span>
            <span class="history-time">2026/05/25 23:40</span>
            <span class="history-preview">遠征隊抵達禁忌書庫，月色照在古堡斷裂的尖塔上...</span>
          </button>
          <button class="history-delete sao-btn is-danger" type="button" aria-label="刪除此卷宗"><span class="sao-btn-symbol" aria-hidden="true">×</span><span class="sao-btn-label">刪</span></button>
        </div>
      `;
    }
  });
  await hydrateStaticSaoButtons(page);
}

export async function openAccountMenu(page: Page) {
  await page.evaluate(() => {
    const panel = document.getElementById("systemMenuPanel");
    const toggle = document.getElementById("accountToggle");
    if (!(panel instanceof HTMLElement) || !(toggle instanceof HTMLElement) || !panel.contains(toggle)) {
      throw new Error("account center is not reachable from the system menu");
    }
    document.getElementById("systemMenuToggle")?.setAttribute("aria-expanded", "false");
    panel.hidden = true;
    toggle?.setAttribute("aria-expanded", "true");
    const menu = document.getElementById("accountMenu");
    menu?.removeAttribute("hidden");
  });
}

export async function openLogoutConfirm(page: Page) {
  await page.evaluate(() => {
    const accountMenu = document.getElementById("accountMenu");
    accountMenu?.setAttribute("hidden", "");
    document.getElementById("accountToggle")?.setAttribute("aria-expanded", "false");

    const dialog = document.getElementById("logoutConfirmWindow");
    if (dialog) {
      dialog.removeAttribute("hidden");
      dialog.removeAttribute("data-closing");
      dialog.setAttribute("aria-hidden", "false");
      dialog.style.display = "block";
      dialog.style.opacity = "1";
      dialog.style.transform = "translate(-50%, -50%) scaleX(1) scaleY(1)";
      dialog.style.filter = "none";
    }
    document.documentElement.classList.add("sao-modal-open");
    document.body.classList.add("sao-modal-open");
  });
}
