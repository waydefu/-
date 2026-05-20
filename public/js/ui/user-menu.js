// @ts-nocheck

import { el } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { closeAll } from './dropdown-menu.js';

export const getUserDisplayName = (user) => {
  if (!user) return "使用者";
  if (user.displayName) return user.displayName;
  if (user.isAnonymous) return "訪客";
  if (user.email) return user.email.split("@")[0] || "使用者";
  return "使用者";
};

const buildAvFallback = (name) => {
  const div = document.createElement("div");
  div.className = "user-avatar-fb";
  div.textContent = name.charAt(0).toUpperCase();
  div.setAttribute("aria-hidden", "true");
  return div;
};

export const renderUserTrigger = () => {
  if (!el.userTrigger) return;
  while (el.userTrigger.firstChild) {
    el.userTrigger.removeChild(el.userTrigger.firstChild);
  }
  const chevron = document.createElement("span");
  chevron.className = "user-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  if (!AppState.get("firebaseReady") || !AppState.get("currentUser")) {
    const wrap = document.createElement("span");
    wrap.className = "login-compact";
    const dot = document.createElement("span");
    dot.className = "google-dot";
    dot.setAttribute("aria-hidden", "true");
    const txt = document.createElement("span");
    txt.className = "login-txt";
    txt.textContent = "登入";
    wrap.appendChild(dot);
    wrap.appendChild(txt);
    el.userTrigger.appendChild(wrap);
    el.userTrigger.setAttribute("aria-label", "登入帳號");
  } else {
    const user = AppState.get("currentUser");
    const name = getUserDisplayName(user);
    const photo = user.photoURL;
    let av;
    if (photo) {
      av = document.createElement("img");
      av.className = "user-avatar";
      av.alt = `${name}的頭像`;
      av.setAttribute("referrerpolicy", "no-referrer");
      av.setAttribute("src", photo);
      av.onerror = () => {
        const fallback = buildAvFallback(name);
        av.replaceWith(fallback);
      };
    } else {
      av = buildAvFallback(name);
    }
    const nm = document.createElement("span");
    nm.className = "user-name-short";
    nm.textContent = name;
    el.userTrigger.appendChild(av);
    el.userTrigger.appendChild(nm);
    el.userTrigger.setAttribute("aria-label", "帳號選單");
  }
  el.userTrigger.appendChild(chevron);
};

export const renderUserPanel = ({ onGoogleLogin } = {}) => {
  if (!el.userPanel) return;
  el.userPanel.innerHTML = "";
  if (!AppState.get("firebaseReady")) return;
  const panelUser = AppState.get("currentUser");
  if (panelUser) {
    const name = getUserDisplayName(panelUser);
    const info = document.createElement("div");
    info.className = "up-info";
    const n = document.createElement("div");
    n.className = "up-name";
    n.textContent = name;
    const e = document.createElement("div");
    e.className = "up-email";
    e.textContent = panelUser.email || (panelUser.isAnonymous ? "訪客模式" : "");
    info.appendChild(n);
    info.appendChild(e);
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "up-action";
    logoutBtn.textContent = "登出";
    logoutBtn.setAttribute("aria-label", "登出帳號");
    logoutBtn.addEventListener("click", () => {
      if (logoutBtn.dataset.confirming) {
        AppState.get("fbAuth")?.signOut();
        closeAll();
        return;
      }
      logoutBtn.dataset.confirming = "1";
      logoutBtn.textContent = "確定登出？";
      logoutBtn.style.color = "var(--red-soft)";
      setTimeout(() => {
        if (logoutBtn.isConnected) {
          delete logoutBtn.dataset.confirming;
          logoutBtn.textContent = "登出";
          logoutBtn.style.color = "";
        }
      }, 2500);
    });
    el.userPanel.appendChild(info);
    el.userPanel.appendChild(logoutBtn);
  } else {
    const loginInfo = document.createElement("div");
    loginInfo.className = "up-login-info";
    loginInfo.textContent = "登入後自動儲存歷史紀錄，跨裝置同步。";
    const loginBtn = document.createElement("button");
    loginBtn.className = "up-login-btn";
    loginBtn.setAttribute("aria-label", "以 Google 印章登入");
    const dot = document.createElement("div");
    dot.className = "google-dot";
    dot.setAttribute("aria-hidden", "true");
    const txt = document.createElement("span");
    txt.textContent = "以 Google 印章登入";
    loginBtn.appendChild(dot);
    loginBtn.appendChild(txt);
    loginBtn.addEventListener("click", () => {
      onGoogleLogin?.();
    });
    el.userPanel.appendChild(loginInfo);
    el.userPanel.appendChild(loginBtn);
  }
};
