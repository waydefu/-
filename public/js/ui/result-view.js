// @ts-check

import { $, el } from '../core/dom.js';
import { escapeHtml } from '../utils/text.js';
import { announce, showToast } from './toast-center.js';
import { copyToClipboard } from './clipboard.js';
import { splitAnalysisSections } from './result-parser.js';

/** 重置分析結果面板為初始提示。登出/換帳號時呼叫，杜絕上一位的
 *  分析內容殘留畫面被下一位看到（privacy）。 */
export const resetResultPanel = () => {
  if (el.result) {
    el.result.innerHTML = `<span style="color:var(--text-4)">小說編修引擎待命中。貼上草稿後按下「開啟法典審閱」。</span>`;
  }
};

let _stepTimers = [];

/** Clear pending step-animation timers (called on page unload + checkText finally). */
export const clearStepTimers = () => {
  _stepTimers.forEach(clearTimeout);
  _stepTimers.length = 0;
};

const renderMarkdown = (md) => {
  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    return `<p>${escapeHtml(typeof md === "string" ? md : "（無回應）")}</p>`;
  }
  const raw = marked.parse(typeof md === "string" ? md : "（無回應）");
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "del",
      "h1", "h2", "h3", "h4", "ul", "ol", "li",
      "blockquote", "code", "pre", "hr", "a", "span"
    ],
    ALLOWED_ATTR: ["href", "target", "rel"]
  });
};

const bindCopyBtn = (id, rawText, label = "分析結果") => {
  const btn = $(id);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const ok = await copyToClipboard(rawText);
    if (ok) {
      btn.textContent = "已複製";
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "已複製到剪貼簿");
      announce(`${label}已複製到剪貼簿`);
      setTimeout(() => {
        btn.textContent = btn.dataset.label || "📋 複製";
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", `複製${label}`);
      }, 2000);
    } else {
      showToast("剪貼簿寫入失敗，請手動選取複製", "error", 3000);
      btn.textContent = "複製失敗";
      setTimeout(() => { btn.textContent = btn.dataset.label || "複製"; }, 2000);
    }
  });
};

const bindResultActions = (rawText, sections) => {
  bindCopyBtn("copyAllBtn", rawText, "完整分析結果");
  if (sections.rewrite) bindCopyBtn("copyRewriteBtn", sections.rewrite, "修改後全文");
  if (sections.summary) bindCopyBtn("copySummaryBtn", sections.summary, "審查摘要");

  $("backToDraftBtn")?.addEventListener("click", () => {
    el.draftInput?.scrollIntoView({ behavior: "smooth", block: "center" });
    el.draftInput?.focus();
  });
  $("reanalyzeBtn")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("flg:reanalyze"));
  });
};

export const setError = (msg) => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">法典回傳異常</span></div>
</div>
<p class="error-msg" role="alert">${escapeHtml(msg)}</p>`;
  announce(`分析失敗：${String(msg).slice(0, 80)}`);
};

/** Build the result area skeleton (status bar + empty body div). */
export const setResultShell = (label, showActions = false) => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">${label}</span></div>
${showActions ? `<div class="result-actions" aria-label="分析結果操作">
<button class="copy-btn" id="copyAllBtn" data-label="複製全文" aria-label="複製完整分析結果">複製全文</button>
<button class="copy-btn" id="backToDraftBtn" aria-label="回到草稿輸入區">回到手稿</button>
<button class="copy-btn" id="reanalyzeBtn" aria-label="重新分析目前草稿">重新審閱</button>
</div>` : ""}
</div>
<div class="result-body"></div>`;
};

const renderSection = ({ title, eyebrow, text, copyId }) => `
<section class="result-section">
<div class="result-section-head">
<div>
<span class="result-eyebrow">${eyebrow}</span>
<h3>${title}</h3>
</div>
<button class="copy-btn result-section-copy" id="${copyId}" data-label="複製" aria-label="複製${title}">複製</button>
</div>
<div class="result-section-body">${renderMarkdown(text)}</div>
</section>`;

/** Full result render: rebuilds shell, parses markdown, binds copy. */
export const setResult = (rawText, isHistory = false) => {
  if (!el.result) return;
  const label = isHistory ? "草稿記憶已載入" : "法典審閱完成";
  setResultShell(label, true);
  announce(isHistory ? "已載入歷史分析紀錄" : "守門人審閱完成，分析結果已顯示");
  const body = el.result.querySelector(".result-body");
  const sections = splitAnalysisSections(rawText);
  if (body) {
    body.innerHTML = sections.fallback
      ? `<section class="result-section"><div class="result-section-head"><div><span class="result-eyebrow">FULL RESPONSE</span><h3>分析結果</h3></div></div><div class="result-section-body">${renderMarkdown(sections.fallback)}</div></section>`
      : [
        renderSection({ title: "修改後全文", eyebrow: "REWRITE", text: sections.rewrite, copyId: "copyRewriteBtn" }),
        renderSection({ title: "審查摘要", eyebrow: "REVIEW", text: sections.summary, copyId: "copySummaryBtn" }),
      ].join("");
  }
  bindResultActions(rawText, sections);
};

export const setLoading = () => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">法典審閱中</span></div>
</div>
<div class="progress-bar-wrap" role="progressbar" aria-label="分析進度">
<div class="progress-bar"></div>
</div>
<div class="analysis-steps">
<div class="step active" id="step1"><span class="step-icon" aria-hidden="true"></span><span>建立安全分析連線…</span></div>
<div class="step" id="step2"><span class="step-icon" aria-hidden="true"></span><span>同步世界觀索引並審閱草稿…</span></div>
<div class="step" id="step3"><span class="step-icon" aria-hidden="true"></span><span>整理修改後全文與審查摘要…</span></div>
</div>
<p class="wait-note">小說編修引擎正在校準文風、角色行為與西幻語彙；長段落可能需要更久。</p>
<div class="skeleton-wrap" style="margin-top:18px" aria-hidden="true">
<div class="skeleton-line long"></div>
<div class="skeleton-line mid"></div>
<div class="skeleton-line long"></div>
<div class="skeleton-line short"></div>
<div class="skeleton-line long"></div>
<div class="skeleton-line mid"></div>
</div>`;
};

const markStepDone = (id) => {
  const stepEl = $(id);
  if (!stepEl) return;
  stepEl.className = "step done";
  const icon = stepEl.querySelector(".step-icon");
  if (icon) {
    icon.className = "step-icon";
    icon.textContent = "";
  }
};

const setStepActive = (id) => {
  const stepEl = $(id);
  if (!stepEl) return;
  stepEl.className = "step active";
  const icon = stepEl.querySelector(".step-icon");
  if (icon) {
    icon.className = "step-icon spinning";
    icon.textContent = "";
  }
};

export const animateSteps = () => {
  clearStepTimers();
  setStepActive("step1");
  _stepTimers.push(setTimeout(() => { markStepDone("step1"); setStepActive("step2"); }, 8000));
  _stepTimers.push(setTimeout(() => { markStepDone("step2"); setStepActive("step3"); }, 20000));
};
