// @ts-check

import { $, el } from '../dom.js';
import { escapeHtml } from '../utils.js';
import { announce, showToast } from './toast.js';
import { copyToClipboard } from './clipboard.js';

/** 重置分析結果面板為初始提示。登出/換帳號時呼叫，杜絕上一位的
 *  分析內容殘留畫面被下一位看到（privacy）。 */
export const resetResultPanel = () => {
  if (el.result) {
    el.result.innerHTML = `<span style="color:var(--text-4)">✦ 輸入草稿後按下「檢查」即可開始分析…</span>`;
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

const bindCopyBtn = (rawText) => {
  const btn = $("copyBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const ok = await copyToClipboard(rawText);
    if (ok) {
      btn.textContent = "✅ 已複製";
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "已複製到剪貼簿");
      announce("分析結果已複製到剪貼簿");
      setTimeout(() => {
        btn.textContent = "📋 複製";
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", "複製分析結果");
      }, 2000);
    } else {
      showToast("剪貼簿寫入失敗，請手動選取複製", "error", 3000);
      btn.textContent = "❌ 失敗";
      setTimeout(() => { btn.textContent = "📋 複製"; }, 2000);
    }
  });
};

export const setError = (msg) => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">⚠ 發生錯誤</span></div>
</div>
<p class="error-msg" role="alert">${escapeHtml(msg)}</p>`;
  announce(`分析失敗：${String(msg).slice(0, 80)}`);
};

/** Build the result area skeleton (status bar + empty body div). */
export const setResultShell = (label) => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">${label}</span></div>
<button class="copy-btn" id="copyBtn" aria-label="複製分析結果">📋 複製</button>
</div>
<div class="result-body"></div>`;
};

/** Full result render: rebuilds shell, parses markdown, binds copy. */
export const setResult = (rawText, isHistory = false) => {
  if (!el.result) return;
  const label = isHistory ? "✅ 分析完成（歷史紀錄）" : "✅ 分析完成";
  setResultShell(label);
  announce(isHistory ? "已載入歷史分析紀錄" : "守門人審閱完成，分析結果已顯示");
  const body = el.result.querySelector(".result-body");
  if (body) body.innerHTML = renderMarkdown(rawText);
  bindCopyBtn(rawText);
};

export const setLoading = () => {
  if (!el.result) return;
  el.result.innerHTML = `
<div class="status-bar">
<div class="status-left"><span class="status-text">🔮 守門人審閱中</span></div>
</div>
<div class="progress-bar-wrap" role="progressbar" aria-label="分析進度">
<div class="progress-bar"></div>
</div>
<div class="analysis-steps">
<div class="step active" id="step1"><span class="step-icon" aria-hidden="true">⏳</span><span>載入世界資料庫…</span></div>
<div class="step" id="step2"><span class="step-icon" aria-hidden="true">⏳</span><span>Groq 分析草稿…</span></div>
<div class="step" id="step3"><span class="step-icon" aria-hidden="true">⏳</span><span>產生五版修改…</span></div>
</div>
<p class="wait-note">⏱ AI 引擎啟動中，預計 <span>3–5 秒</span> 後開始輸出</p>
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
    icon.textContent = "✅";
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
