// @ts-check

import { LIMITS } from '../config.js';
import { el } from '../dom.js';
import { AppState, historyData, selectedIds } from '../state.js';
import { formatDate } from '../utils.js';
import { setResult } from './result.js';
import { closeAll } from './dropdown.js';
import {
  saveSession,
  saveItemToFirestore,
  deleteItemFromFirestore,
  deleteItemsFromFirestore
} from './firestore.js';
import { updateCharCount } from './draft.js';

const updateBadge = () => {
  const n = historyData.length;
  if (!el.histBadge) return;
  el.histBadge.textContent = n;
  el.histBadge.setAttribute("aria-label", `共 ${n} 筆紀錄`);
  el.histBadge.classList.toggle("show", n > 0);
};

const updateSelectionUI = () => {
  const n = selectedIds.size;
  if (el.paDelBtn) {
    el.paDelBtn.textContent = n > 0 ? `刪除所選 (${n})` : "刪除所選";
    el.paDelBtn.setAttribute("aria-label", n > 0 ? `刪除已選取的 ${n} 筆紀錄` : "刪除已選取紀錄");
    el.paDelBtn.classList.toggle("show", n > 0);
  }
  document.querySelectorAll(".hi-check").forEach((cb) => {
    const input = /** @type {HTMLInputElement} */ (cb);
    const on = selectedIds.has(input.dataset.id);
    input.checked = on;
    input.closest(".hist-item")?.classList.toggle("selected", on);
  });
};

const showPanelActions = (visible) => {
  if (el.panelActions) el.panelActions.style.display = visible ? "" : "none";
};

/* ── History event delegation (initialized once in boot) ── */
const handleHistItemClick = (id) => {
  const found = historyData.find((h) => h.id === id);
  if (!found) return;
  AppState.set("activeId", found.id);
  if (el.draftInput) {
    el.draftInput.value = found.draft;
    updateCharCount(found.draft.length);
  }
  setResult(found.result, true);
  renderHistory();
  closeAll();
  el.result?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const handleHistItemDelete = async (id) => {
  const idx = historyData.findIndex((h) => h.id === id);
  if (idx > -1) historyData.splice(idx, 1);
  if (AppState.get("activeId") === id) AppState.set("activeId", null);
  selectedIds.delete(id);
  saveSession();
  renderHistory();
  updateSelectionUI();
  updateBadge();
  await deleteItemFromFirestore(id);
};

export const initHistoryDelegation = () => {
  if (!el.historyList) return;
  el.historyList.addEventListener("click", (e) => {
    const item = e.target.closest(".hist-item");
    if (!item) return;
    const id = item.dataset.histId;
    if (!id) return;
    if (e.target.closest(".hi-del")) {
      e.stopPropagation();
      handleHistItemDelete(id);
      return;
    }
    if (e.target.closest(".hi-check")) return; // handled by change
    handleHistItemClick(id);
  });
  el.historyList.addEventListener("change", (e) => {
    if (!e.target.classList.contains("hi-check")) return;
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    e.target.closest(".hist-item")?.classList.toggle("selected", e.target.checked);
    updateSelectionUI();
  });
  el.historyList.addEventListener("keydown", (e) => {
    const item = e.target.closest(".hist-item");
    if (!item) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const id = item.dataset.histId;
      if (id) handleHistItemClick(id);
    }
  });
};

export const renderHistory = () => {
  if (!el.historyList) return;
  Array.from(el.historyList.children).forEach((child) => {
    if (child !== el.historyEmpty) child.remove();
  });
  updateBadge();
  if (!historyData.length) {
    if (el.historyEmpty) el.historyEmpty.style.display = "";
    updateSelectionUI();
    return;
  }
  if (el.historyEmpty) el.historyEmpty.style.display = "none";
  const frag = document.createDocumentFragment();
  historyData.forEach((item) => {
    const itemEl = document.createElement("div");
    const curActiveId = AppState.get("activeId");
    const analyzing = AppState.get("isAnalyzing");
    itemEl.className = `hist-item${item.id === curActiveId ? " active" : ""}${selectedIds.has(item.id) ? " selected" : ""}${analyzing ? " disabled" : ""}`;
    itemEl.setAttribute("role", "listitem");
    itemEl.setAttribute("tabindex", analyzing ? "-1" : "0");
    itemEl.setAttribute("aria-label", `${formatDate(item.ts)}: ${(item.preview || "").substring(0, 30)}`);
    itemEl.dataset.histId = item.id;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "hi-check";
    cb.dataset.id = item.id;
    cb.checked = selectedIds.has(item.id);
    cb.setAttribute("aria-label", `選取：${(item.preview || "").substring(0, 20)}`);
    const dot = document.createElement("span");
    dot.className = "hi-dot";
    dot.setAttribute("aria-hidden", "true");
    const body = document.createElement("div");
    body.className = "hi-body";
    const timeEl = document.createElement("div");
    timeEl.className = "hi-time";
    timeEl.textContent = formatDate(item.ts);
    const previewEl = document.createElement("div");
    previewEl.className = "hi-preview";
    previewEl.textContent = item.preview || "";
    body.appendChild(timeEl);
    body.appendChild(previewEl);
    const delBtn = document.createElement("button");
    delBtn.className = "hi-del";
    delBtn.setAttribute("aria-label", `刪除：${(item.preview || "").substring(0, 20)}`);
    delBtn.textContent = "✕";
    itemEl.appendChild(cb);
    itemEl.appendChild(dot);
    itemEl.appendChild(body);
    itemEl.appendChild(delBtn);
    frag.appendChild(itemEl);
  });
  el.historyList.appendChild(frag);
  updateSelectionUI();
};

export const addHistory = async (draft, result) => {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item = {
    id,
    ts: Date.now(),
    draft,
    result,
    preview: draft.slice(0, 60).replace(/\n/g, " ")
  };
  historyData.unshift(item);
  if (historyData.length > LIMITS.MAX_HISTORY) {
    historyData.length = LIMITS.MAX_HISTORY;
  }
  AppState.set("activeId", id);
  saveSession();
  renderHistory();
  updateBadge();
  try {
    await saveItemToFirestore(item);
  } catch (e) {
    console.warn("[FLG] bg save failed:", e);
  }
};

export const initHistoryActions = () => {
  el.paClearBtn?.addEventListener("click", () => {
    if (!historyData.length) return;
    showPanelActions(false);
    el.confirmClearAll?.classList.add("show");
  });
  el.confirmClearNo?.addEventListener("click", () => {
    el.confirmClearAll?.classList.remove("show");
    showPanelActions(true);
  });
  el.confirmClearYes?.addEventListener("click", async () => {
    el.confirmClearAll?.classList.remove("show");
    showPanelActions(true);
    const ids = historyData.map((h) => h.id);
    historyData.length = 0;
    AppState.set("activeId", null);
    selectedIds.clear();
    saveSession();
    renderHistory();
    updateBadge();
    await deleteItemsFromFirestore(ids);
  });
  el.paDelBtn?.addEventListener("click", () => {
    if (!selectedIds.size) return;
    if (el.confirmDelLabel) el.confirmDelLabel.textContent = `確定刪除 ${selectedIds.size} 筆？`;
    showPanelActions(false);
    el.confirmDelSel?.classList.add("show");
    setTimeout(() => el.confirmDelYes?.focus(), 50);
  });
  el.confirmDelNo?.addEventListener("click", () => {
    el.confirmDelSel?.classList.remove("show");
    showPanelActions(true);
    el.paDelBtn?.focus();
  });
  el.confirmDelYes?.addEventListener("click", async () => {
    el.confirmDelSel?.classList.remove("show");
    showPanelActions(true);
    const ids = [...selectedIds];
    for (let i = historyData.length - 1; i >= 0; i--) {
      if (selectedIds.has(historyData[i].id)) historyData.splice(i, 1);
    }
    if (ids.includes(AppState.get("activeId"))) AppState.set("activeId", null);
    selectedIds.clear();
    saveSession();
    renderHistory();
    updateSelectionUI();
    updateBadge();
    await deleteItemsFromFirestore(ids);
  });
};
