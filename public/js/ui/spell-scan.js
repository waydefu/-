// @ts-check

import { el } from '../core/dom.js';
import { escapeHtml } from '../utils/text.js';

let _spellWorker = null;
let _spellScanId = 0;
let _spellReady = false;
let _draftScanTimer = null;

export const clearDraftScanTimer = () => {
  if (_draftScanTimer) {
    clearTimeout(_draftScanTimer);
    _draftScanTimer = null;
  }
};

const buildSpellListHtml = (hits) => {
  if (!hits?.length) return "";
  const seen = new Set();
  let html = "";
  for (const h of hits) {
    if (seen.has(h.word)) continue;
    seen.add(h.word);
    const sug = h.suggestion ? ` → ${escapeHtml(h.suggestion)}` : "";
    html += `<span class="sl-item"><b>${escapeHtml(h.word)}</b>${sug}</span>`;
  }
  return html;
};

const updateSpellWarn = (count) => {
  if (!el.spellWarn) return;
  if (!count) {
    el.spellWarn.textContent = "";
    el.spellWarn.classList.remove("show");
    return;
  }
  el.spellWarn.textContent = `⚠ ${count} 處違禁詞`;
  el.spellWarn.classList.add("show");
};

const applySpellHits = (_text, hits) => {
  if (el.spellList) el.spellList.innerHTML = buildSpellListHtml(hits);
  updateSpellWarn(hits.length);
};

export const initSpellWorker = async () => {
  if (typeof Worker === "undefined") return;
  try {
    // forbidden-words.json / spellcheck.worker.js live at public/ root;
    // this module is at public/js/ui/ so resolve two levels up.
    const res = await fetch(new URL("../../forbidden-words.json?v=2", import.meta.url));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const words = await res.json();
    _spellWorker = new Worker(new URL("../../spellcheck.worker.js", import.meta.url));
    _spellWorker.onmessage = (e) => {
      const data = e.data || {};
      if (data.type === "ready") {
        _spellReady = true;
        runDraftSpellScan();
        return;
      }
      if (data.type === "result" && data.scanId === _spellScanId) {
        applySpellHits(el.draftInput?.value || "", data.hits || []);
      }
    };
    _spellWorker.postMessage({ type: "init", words });
  } catch (err) {
    console.warn("[FLG] spell worker init failed:", err?.message);
  }
};

export const runDraftSpellScan = () => {
  const text = el.draftInput?.value || "";
  if (!_spellWorker || !_spellReady) {
    if (el.spellList) el.spellList.innerHTML = "";
    updateSpellWarn(0);
    return;
  }
  const scanId = ++_spellScanId;
  _spellWorker.postMessage({ type: "scan", text, scanId });
};

export const scheduleDraftScan = () => {
  clearDraftScanTimer();
  _draftScanTimer = setTimeout(() => {
    _draftScanTimer = null;
    runDraftSpellScan();
  }, 300);
};

/** Terminate the spell worker (called on page unload). */
export const terminateSpellWorker = () => {
  if (_spellWorker) _spellWorker.terminate();
};
