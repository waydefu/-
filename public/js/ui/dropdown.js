// @ts-check

import { el } from '../dom.js';
import { AppState } from '../state.js';

export const closeAll = (clearActive = true) => {
  el.histTrigger?.classList.remove("active");
  el.histTrigger?.setAttribute("aria-expanded", "false");
  el.histPanel?.classList.remove("open");
  el.userTrigger?.classList.remove("active");
  el.userTrigger?.setAttribute("aria-expanded", "false");
  el.userPanel?.classList.remove("open");
  el.navOverlay?.classList.remove("show");
  if (clearActive) AppState.set("activeDropdown", null);
};

export const openDropdown = (name) => {
  if (AppState.get("activeDropdown") === name) {
    closeAll();
    return;
  }
  closeAll(false);
  AppState.set("activeDropdown", name);
  if (name === "hist") {
    el.histTrigger?.classList.add("active");
    el.histTrigger?.setAttribute("aria-expanded", "true");
    el.histPanel?.classList.add("open");
  } else if (name === "user") {
    el.userTrigger?.classList.add("active");
    el.userTrigger?.setAttribute("aria-expanded", "true");
    el.userPanel?.classList.add("open");
  }
  el.navOverlay?.classList.add("show");
};
