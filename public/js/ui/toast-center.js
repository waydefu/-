// @ts-check

import { el } from '../core/dom.js';

/** Announce a message to screen readers via the live region. */
export const announce = (msg) => {
  if (!el.srAnnouncer || !msg) return;
  el.srAnnouncer.textContent = "";
  requestAnimationFrame(() => {
    el.srAnnouncer.textContent = msg;
  });
};

/** Transient toast notification. */
export const showToast = (msg, type = "error", duration = 5000) => {
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.setAttribute("role", "alert");
  div.setAttribute("aria-live", "assertive");
  const icon = type === "error" ? "⚠ " : type === "success" ? "✅ " : "ℹ ";
  div.textContent = icon + msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), duration);
};
