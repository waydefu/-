// @ts-nocheck
    import * as THREE from "three";
    import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
    import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
    import { SAOPass } from "three/addons/postprocessing/SAOPass.js";
    import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
    import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
    import {
      APP_CHECK_CONFIG,
      API_CONFIG,
      FIREBASE_CONFIG,
      LIMITS,
      MSG,
      UI_CONFIG
    } from "./core/config.js";
    import { AppState } from "./core/state.js";
    import { analyzeDraft, getAppCheckToken, isApiError } from "./services/analyze-api.js";
    import { buildHudState, emptyHudState } from "./utils/hud-state.js";
    import { renderMarkdownLite, splitAnalysisSections } from "./utils/result-sections.js";
    import { ArcaneSingularityCore } from "./webgl/arcane-core.js";
    import { ArcaneOpticalBackground } from "./webgl/optical-background.js";
    import { RaphaelComputationRing } from "./webgl/raphael-computation-ring.js";
    import { MagiculeParticleField } from "./webgl/magicule-particles.js";
    import { ReferenceGlyphRing } from "./webgl/reference-glyph-ring.js";
    import { GoldBokehField } from "./webgl/gold-bokeh-field.js";
    import { SteppedAnimationController } from "./webgl/stepped-animation.js";
    import { disposeObjectTree } from "./webgl/dispose-utils.js";

    const systemPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readQueryParam = (name) => {
      try {
        return new URLSearchParams(window.location.search).get(name) || "";
      } catch (_) {
        return "";
      }
    };
    const readMotionPreference = () => {
      try {
        const requested = readQueryParam("flgMotion");
        if (requested === "full" || requested === "reduce") {
          localStorage.setItem("flgMotionPreference", requested);
        } else if (requested === "system") {
          localStorage.removeItem("flgMotionPreference");
        }
        return localStorage.getItem("flgMotionPreference") || "";
      } catch (_) {
        return "";
      }
    };
    const motionPreference = readMotionPreference();
    // 全站預設全動效：只有使用者明確選 reduce（?flgMotion=reduce）才降動效；
    // 系統的 prefers-reduced-motion 不再自動關閉（依使用者要求，手機/電腦都要看到所有動效）。
    const prefersReducedMotion = motionPreference === "reduce";
    const authPopupTimingEnabled = readQueryParam("flgAuthPopupTiming") === "1";
    window.__FLG_MOTION_STATE__ = {
      systemReduced: systemPrefersReducedMotion,
      preference: motionPreference || "system",
      reduced: prefersReducedMotion
    };
    const mobileQuery = window.matchMedia("(max-width: 820px)");
    const isCompactStage = () => window.innerHeight < 740 || window.innerWidth < 1180;
    const loginIdleIntensity = () => isCompactStage() ? 0.46 : 0.64;
    const loginHoverEnergy = () => isCompactStage() ? 0.34 : 0.74;
    const bloomBaseForStage = () => isCompactStage() ? 0.48 : 0.68;
    const BLOOM_SCENE = 1;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const clamp01 = (value) => clamp(value, 0, 1);
    const lerp = (from, to, t) => from + (to - from) * t;
    const ease = {
      inPow2: (t) => t * t,
      outPow2: (t) => 1 - (1 - t) * (1 - t),
      inExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
      inOutSine: (t) => 0.5 - Math.cos(Math.PI * t) / 2
    };
    function runPhaseClock(durationMs, onUpdate, onComplete, sharedStartAt = 0) {
      if (durationMs <= 0) {
        onUpdate(1, durationMs);
        onComplete?.();
        return { kill() {} };
      }
      let startedAt = Number.isFinite(sharedStartAt) && sharedStartAt > 0 ? sharedStartAt : 0;
      let frame = 0;
      let killed = false;
      const tick = (now) => {
        if (killed) return;
        if (!startedAt) startedAt = now;
        const elapsed = now - startedAt;
        const progress = clamp01(elapsed / durationMs);
        onUpdate(progress, elapsed);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          onComplete?.();
        }
      };
      frame = requestAnimationFrame(tick);
      return {
        kill() {
          killed = true;
          if (frame) cancelAnimationFrame(frame);
        }
      };
    }
    const phaseProgress = (elapsedMs, startMs, durationMs) => clamp01((elapsedMs - startMs) / durationMs);
    const isLowPowerDevice = () => (
      prefersReducedMotion ||
      Number(navigator.deviceMemory || 8) <= 4 ||
      Number(navigator.hardwareConcurrency || 8) <= 4
    );
    const createRaphaelWebglProfile = () => ({
      reduced: prefersReducedMotion,
      mobile: mobileQuery.matches,
      lowPower: isLowPowerDevice()
    });
    const uiMotion = {
      manifestX: 0.9,
      manifestY: 1.12,
      collapse: 2.2,
      fieldReveal: 0.82,
      retreat: 1,
      deckX: 0.92,
      deckY: 1.08,
      loginBackdrop: 1.16,
      loginPanel: 5.2,
      authHandoff: 5.8,
      workbenchReveal: 1.2,
      mobileEnterClass: 5520
    };
    document.documentElement.classList.toggle("motion-reduced", prefersReducedMotion);
    document.documentElement.dataset.motionPreference = window.__FLG_MOTION_STATE__.preference;
    if (prefersReducedMotion) {
      Object.assign(uiMotion, {
        manifestX: 0.01,
        manifestY: 0.01,
        collapse: 0.01,
        fieldReveal: 0.01,
        retreat: 0.01,
        deckX: 0.01,
        deckY: 0.01,
        loginBackdrop: 0.01,
        loginPanel: 0.01,
        authHandoff: 0.01,
        workbenchReveal: 0.01,
        mobileEnterClass: 20
      });
    }
    const shouldAutoFocusAuth = () => !mobileQuery.matches && window.innerWidth >= 980 && window.innerHeight >= 780;
    const deferToIdle = (callback, { timeout = 1200 } = {}) => {
      if (typeof callback !== "function") return 0;
      if (prefersReducedMotion) return window.setTimeout(callback, 0);
      if ("requestIdleCallback" in window) {
        return window.requestIdleCallback(callback, { timeout });
      }
      return window.setTimeout(callback, timeout);
    };

    const SaoAudio = (() => {
      let ctx = null;
      let unlocked = false;

      function unlock() {
        if (unlocked || !(window.AudioContext || window.webkitAudioContext)) return;
        try {
          const Ctor = window.AudioContext || window.webkitAudioContext;
          ctx = new Ctor();
          unlocked = true;
          if (document.getElementById("ritualStack")?.open) {
            window.setTimeout(playOpenChime, 0);
          }
        } catch (error) {
          console.warn("[FLG] AudioContext init failed:", error?.message);
        }
      }

      function playOpenChime() {
        if (prefersReducedMotion || !ctx || ctx.state !== "running") return;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.18);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.34);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(2200, now);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(0.03, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.1);

        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = "sine";
        osc3.frequency.setValueAtTime(1320, now + 0.1);
        gain3.gain.setValueAtTime(0.001, now + 0.1);
        gain3.gain.linearRampToValueAtTime(0.025, now + 0.13);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc3.connect(gain3).connect(ctx.destination);
        osc3.start(now + 0.1);
        osc3.stop(now + 0.62);
      }

      function bindUnlock() {
        const handler = () => {
          unlock();
          document.removeEventListener("pointerdown", handler);
          document.removeEventListener("keydown", handler);
        };
        document.addEventListener("pointerdown", handler, { once: true, passive: true });
        document.addEventListener("keydown", handler, { once: true, passive: true });
      }

      bindUnlock();
      return { playOpenChime };
    })();

    window.__FLG_SAO_AUDIO__ = SaoAudio;

    document.addEventListener("click", (event) => {
      if (prefersReducedMotion) return;
      const target = event.target instanceof Element ? event.target.closest(".sao-btn:not(:disabled)") : null;
      if (!(target instanceof HTMLElement)) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "sao-ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 900);
    });

    function bindVisualViewportInset() {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const updateInset = () => {
        const hiddenHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        document.documentElement.style.setProperty("--keyboard-inset", `${Math.round(hiddenHeight)}px`);
        document.body.classList.toggle("keyboard-raised", hiddenHeight > 80);
      };
      viewport.addEventListener("resize", updateInset, { passive: true });
      viewport.addEventListener("scroll", updateInset, { passive: true });
      updateInset();
    }

    const waitForGlobal = (name, timeout = 6500) => new Promise((resolve) => {
      const started = performance.now();
      const tick = () => {
        if (window[name]) {
          resolve(window[name]);
          return;
        }
        if (performance.now() - started > timeout) {
          resolve(null);
          return;
        }
        window.setTimeout(tick, 40);
      };
      tick();
    });

    const firebaseRuntime = {
      ready: false,
      auth: null,
      db: null,
      redirectError: null,
      guest: localStorage.getItem("worldforgeGuest") === "1"
    };

    function initializeAppCheckCompat(firebase) {
      const siteKey = APP_CHECK_CONFIG.RECAPTCHA_ENTERPRISE_SITE_KEY.trim();
      const host = window.location.hostname;
      const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
      if (isLocalHost) {
        AppState.set("appCheck", null);
        AppState.set("appCheckReady", false);
        AppState.set("appCheckStatus", "local-disabled");
        AppState.set("appCheckError", "");
        return;
      }
      if (!siteKey || typeof firebase?.appCheck !== "function") {
        AppState.set("appCheckStatus", siteKey ? "sdk-missing" : "disabled");
        return;
      }
      try {
        if (typeof firebase.appCheck.ReCaptchaEnterpriseProvider !== "function") {
          throw new Error("ReCaptchaEnterpriseProvider is unavailable");
        }
        const appCheck = firebase.appCheck();
        appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey), true);
        AppState.set("appCheck", appCheck);
        AppState.set("appCheckReady", false);
        AppState.set("appCheckStatus", "activated");
        AppState.set("appCheckError", "");
        appCheck.getToken(false)
          .then((tokenResult) => {
            const ok = !!tokenResult?.token;
            AppState.set("appCheckReady", ok);
            AppState.set("appCheckStatus", ok ? "token-ready" : "token-empty");
          })
          .catch((error) => {
            AppState.set("appCheckReady", false);
            AppState.set("appCheckStatus", "token-error");
            AppState.set("appCheckError", error?.message || "App Check token unavailable");
            console.warn("Worldforge App Check warmup failed:", error?.message || error);
          });
      } catch (error) {
        AppState.set("appCheck", null);
        AppState.set("appCheckReady", false);
        AppState.set("appCheckStatus", "init-error");
        AppState.set("appCheckError", error?.message || "App Check init failed");
        console.warn("Worldforge App Check skipped:", error?.message || error);
      }
    }

    async function initializeFirebaseRuntime() {
      const firebase = await waitForGlobal("firebase");
      if (!firebase?.initializeApp) {
        console.warn("Worldforge Firebase SDK unavailable; guest mode remains available.");
        return firebaseRuntime;
      }
      try {
        if (!firebase.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
        firebaseRuntime.auth = firebase.auth();
        firebaseRuntime.db = firebase.firestore ? firebase.firestore() : null;
        firebaseRuntime.ready = true;
        AppState.set("fbAuth", firebaseRuntime.auth);
        AppState.set("db", firebaseRuntime.db);
        AppState.set("firebaseReady", true);
        AppState.set("firestoreReady", !!firebaseRuntime.db);
        initializeAppCheckCompat(firebase);
        if (typeof firebaseRuntime.auth.getRedirectResult === "function") {
          firebaseRuntime.auth.getRedirectResult().catch((error) => {
            firebaseRuntime.redirectError = error;
            window.dispatchEvent(new CustomEvent("worldforge:redirect-error", {
              detail: {
                code: error?.code || "",
                message: error?.message || "未知錯誤"
              }
            }));
            console.warn("Worldforge redirect sign-in failed:", error?.code || error?.message || error);
          });
        }
        firebaseRuntime.auth.onAuthStateChanged((user) => {
          AppState.set("currentUser", user || null);
          window.dispatchEvent(new CustomEvent("worldforge:auth-changed", { detail: { user: user || null } }));
          if (user) handoffSignedInUser();
        });
      } catch (error) {
        console.warn("Worldforge Firebase init failed:", error?.message || error);
      }
      return firebaseRuntime;
    }

    const firebaseReadyPromise = initializeFirebaseRuntime();

    window.__FLG_HUD_STATE__ = emptyHudState;

    async function fetchQuota() {
      const user = AppState.get("currentUser");
      if (!user) return { limit: 0, used: 0, remaining: 0, resetAt: "", status: "signed-out" };
      try {
        const idToken = await user.getIdToken();
        const appCheckToken = await getAppCheckToken();
        const headers = { Authorization: `Bearer ${idToken}` };
        if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;
        const res = await fetch(API_CONFIG.QUOTA_URL, { headers, cache: "no-store" });
        if (!res.ok) throw new Error(`quota ${res.status}`);
        return { ...(await res.json()), status: "ok" };
      } catch (error) {
        console.warn("[FLG] quota peek failed:", error?.message || error);
        return { limit: 0, used: 0, remaining: 0, resetAt: "", status: "error" };
      }
    }

    function setLiveStatus(element, text, { error = false } = {}) {
      if (!(element instanceof HTMLElement)) return;
      element.textContent = text;
      element.classList.toggle("error", Boolean(error));
      element.classList.remove("is-updated");
      void element.offsetWidth;
      element.classList.add("is-updated");
      window.clearTimeout(element.__flgStatusTimer);
      element.__flgStatusTimer = window.setTimeout(() => {
        element.classList.remove("is-updated");
      }, 780);
    }

    function createButtonGlyph(symbol) {
      const node = document.createElement("span");
      node.className = "sao-btn-symbol";
      node.setAttribute("aria-hidden", "true");
      node.textContent = symbol;
      return node;
    }

    function createButtonLabel(label) {
      const node = document.createElement("span");
      node.className = "sao-btn-label";
      node.textContent = label;
      return node;
    }

    function resolveSaoButtonLabel(button) {
      if (!(button instanceof HTMLElement)) return "";
      const explicit = button.dataset.saoLabel || "";
      if (explicit.trim()) return explicit.trim();
      const labelNode = button.querySelector(".sao-btn-label, .btn-label, .nav-label, .history-time");
      const label = labelNode?.textContent?.trim();
      if (label) return label;
      return (button.getAttribute("aria-label") || button.title || button.textContent || "").trim();
    }

    function resolveSaoButtonTag(button) {
      if (!(button instanceof HTMLElement)) return "SYS";
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

    function isCompactSaoButton(button) {
      if (!(button instanceof HTMLElement)) return false;
      return button.classList.contains("history-delete")
        || button.classList.contains("history-close")
        || (!button.querySelector(".sao-btn-label, .btn-label, .nav-label") && (button.textContent || "").trim().length <= 2);
    }

    function hydrateSaoButton(button) {
      if (!(button instanceof HTMLElement) || !button.classList.contains("sao-btn")) return;
      const label = resolveSaoButtonLabel(button) || "SYSTEM";
      button.dataset.saoTag = resolveSaoButtonTag(button);
      button.dataset.saoCompact = String(isCompactSaoButton(button));

      let scan = Array.from(button.children).find((child) => child.classList?.contains("sao-btn-scan"));
      if (!scan) {
        scan = document.createElement("span");
        scan.className = "sao-btn-scan";
        scan.setAttribute("aria-hidden", "true");
        button.appendChild(scan);
      }

      let tag = Array.from(button.children).find((child) => child.classList?.contains("sao-btn-tag"));
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "sao-btn-tag";
        tag.setAttribute("aria-hidden", "true");
        button.appendChild(tag);
      }
      tag.textContent = button.dataset.saoTag;
    }

    function hydrateAllSaoButtons(root = document) {
      root.querySelectorAll?.(".sao-btn").forEach((button) => hydrateSaoButton(button));
    }

    function setButtonGlyph(button, symbol, label) {
      if (!(button instanceof HTMLElement)) return;
      button.replaceChildren(createButtonGlyph(symbol), createButtonLabel(label));
      hydrateSaoButton(button);
    }

    function setButtonLabel(button, label) {
      if (!(button instanceof HTMLElement)) return;
      const labelNode = button.querySelector(".sao-btn-label");
      if (labelNode) {
        labelNode.textContent = label;
      } else {
        button.textContent = label;
      }
      hydrateSaoButton(button);
    }

    function flashButtonFeedback(button, type = "success", duration = 900) {
      if (!(button instanceof HTMLElement)) return;
      const className = type === "error" ? "is-error" : "is-success";
      button.classList.remove("is-success", "is-error");
      void button.offsetWidth;
      button.classList.add(className);
      window.setTimeout(() => button.classList.remove(className), duration);
    }

    function getButtonLabel(button, fallback = "") {
      if (!(button instanceof HTMLElement)) return fallback;
      return button.querySelector(".sao-btn-label")?.textContent || button.textContent || fallback;
    }

    function createResultSection(kind, title, eyebrow, content) {
      const section = document.createElement("section");
      section.className = "result-section";
      section.dataset.section = kind;
      const head = document.createElement("div");
      head.className = "result-section-head";
      const titleWrap = document.createElement("div");
      const eyebrowNode = document.createElement("span");
      eyebrowNode.className = "result-section-eyebrow";
      eyebrowNode.textContent = eyebrow;
      const heading = document.createElement("h3");
      heading.textContent = title;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "result-section-copy sao-btn";
      copy.dataset.copySection = kind;
      setButtonGlyph(copy, "⧉", "複製本段");
      const body = document.createElement("div");
      body.className = "result-section-body";
      body.innerHTML = renderMarkdownLite(content || "此段暫無回傳內容。");
      titleWrap.append(eyebrowNode, heading);
      head.append(titleWrap, copy);
      section.append(head, body);
      return section;
    }

    function renderAnalysisResult(resultBox, raw) {
      if (!resultBox) return splitAnalysisSections(raw);
      const parsed = splitAnalysisSections(raw);
      resultBox.replaceChildren();
      if (parsed.fallback) {
        const node = createResultSection("all", "完整鑑定卷宗", "ARCANE DOSSIER", parsed.fallback);
        resultBox.append(node);
        return parsed;
      }
      if (parsed.rewrite) {
        resultBox.append(createResultSection("rewrite", "修改後全文", "REWRITTEN MANUSCRIPT", parsed.rewrite));
      }
      if (parsed.summary) {
        resultBox.append(createResultSection("summary", "審查摘要", "EDITORIAL REVIEW", parsed.summary));
      }
      if (!resultBox.childElementCount) {
        const empty = document.createElement("p");
        empty.className = "analysis-empty";
        empty.textContent = "分析完成，但核心尚未回傳文字。";
        resultBox.append(empty);
      }
      return parsed;
    }

    class SaoWindowController {
      constructor({ lockDocument = false } = {}) {
        this.lockDocument = lockDocument;
        this.lastFocus = null;
        this.timeline = null;
        this.token = 0;
        this.state = "closed";
      }

      setLock(locked) {
        if (!this.lockDocument) return;
        document.documentElement.classList.toggle("sao-modal-open", locked);
        document.body.classList.toggle("sao-modal-open", locked);
      }

      open(target) {
        if (!target) return null;
        this.token += 1;
        const token = this.token;
        if (this.timeline) {
          this.timeline.kill();
          this.timeline = null;
        }
        this.state = "opening";
        this.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.setLock(true);
        target.getAnimations().forEach((animation) => animation.cancel());
        target.hidden = false;
        target.removeAttribute("data-closing");
        target.style.removeProperty("display");
        target.style.removeProperty("opacity");
        target.style.removeProperty("transform");
        target.style.removeProperty("scale");
        target.style.removeProperty("filter");
        target.setAttribute("aria-hidden", "false");
        showDialogSurface(target);
        const focusFirst = () => {
          const first = target.querySelector("button, [href], input, textarea, [tabindex]:not([tabindex='-1'])");
          if (first instanceof HTMLElement) first.focus();
        };
        const focusDelay = target.classList.contains("sao-confirm-window")
          ? 820
          : target.classList.contains("override-window") ? 4500 : 2400;
        window.setTimeout(() => {
          if (token !== this.token) return;
          this.state = "open";
          focusFirst();
        }, prefersReducedMotion ? 0 : focusDelay);
        return null;
      }

      close(target, duration = uiMotion.collapse) {
        if (!target) return null;
        this.token += 1;
        const token = this.token;
        if (this.timeline) {
          this.timeline.kill();
          this.timeline = null;
        }
        this.state = "closing";
        target.setAttribute("data-closing", "true");
        const finish = () => {
          if (token !== this.token) return;
          target.setAttribute("aria-hidden", "true");
          target.hidden = true;
          target.removeAttribute("data-closing");
          target.style.removeProperty("display");
          target.style.removeProperty("opacity");
          target.style.removeProperty("transform");
          target.style.removeProperty("scale");
          target.style.removeProperty("filter");
          this.setLock(false);
          this.state = "closed";
          this.timeline = null;
          if (this.lastFocus instanceof HTMLElement) this.lastFocus.focus();
          hideDialogSurface({ restoreLogin: true });
        };
        const fallbackMs = Math.max(0, Math.round(duration * 1000));
        const cssMs = target.classList.contains("override-window") ? 2200 : 1400;
        window.setTimeout(finish, prefersReducedMotion ? 0 : Math.max(cssMs, fallbackMs));
        return null;
      }
    }

    class AnalysisProgressController {
      constructor(resultBox) {
        this.resultBox = resultBox;
        this.value = 8;
        this.timer = null;
        this.bar = null;
        this.barShell = null;
        this.valueNode = null;
        this.noteNode = null;
        this.reduced = prefersReducedMotion;
      }

      mount() {
        if (!this.resultBox) return;
        this.resultBox.innerHTML = `
          <div class="analysis-progress" role="status" aria-live="polite">
            <div class="analysis-progress-meter">
              <b>並列演算進度</b>
              <span class="analysis-progress-value" data-analysis-progress-value>8%</span>
              <div class="analysis-progress-bar" style="--progress-scale: 0.08"><i data-analysis-progress-bar></i></div>
            </div>
            <div class="analysis-progress-row">
              <b>手稿脈絡讀取</b>
              <span>穩定解析中</span>
              <div class="analysis-progress-bar" style="--progress-scale: 0.36"><i></i></div>
            </div>
            <div class="analysis-progress-row">
              <b>世界觀一致性</b>
              <span>等待回傳</span>
              <div class="analysis-progress-bar" style="--progress-scale: 0.24"><i></i></div>
            </div>
            <div class="analysis-progress-note" data-analysis-progress-note>大賢者核心正在讀取手稿，進度會穩定推進直到鑑定卷宗完成。</div>
          </div>
        `;
        this.bar = this.resultBox.querySelector("[data-analysis-progress-bar]");
        this.barShell = this.bar?.closest(".analysis-progress-bar") || null;
        this.valueNode = this.resultBox.querySelector("[data-analysis-progress-value]");
        this.noteNode = this.resultBox.querySelector("[data-analysis-progress-note]");
        this.set(8, "解析通道已建立。");
        if (!this.reduced) {
          this.timer = window.setInterval(() => {
            const next = this.value + (this.value < 48 ? 1.6 : 0.72);
            this.set(Math.min(85, next));
            if (this.value >= 85) this.stopTimer();
          }, 900);
        }
      }

      stopTimer() {
        if (this.timer) {
          window.clearInterval(this.timer);
          this.timer = null;
        }
      }

      set(next, note) {
        const value = clamp(Math.max(this.value, next), 0, 100);
        this.value = value;
        const scale = (value / 100).toFixed(3);
        if (this.barShell) this.barShell.style.setProperty("--progress-scale", scale);
        if (this.bar) this.bar.style.setProperty("--progress-scale", scale);
        if (this.valueNode) this.valueNode.textContent = `${Math.round(value)}%`;
        if (note && this.noteNode) this.noteNode.textContent = note;
      }

      partial(partialText = "") {
        const received = partialText.length;
        const next = Math.min(92, 85 + Math.min(7, received / 2400));
        this.set(next, `已收到 ${received.toLocaleString("zh-TW")} 字鑑定片段，正在穩定整理卷宗。`);
      }

      complete() {
        this.stopTimer();
        this.set(100, "鑑定卷宗完成，正在展開結果。");
      }

      dispose() {
        this.stopTimer();
      }
    }

    const palette = {
      black: new THREE.Color(0x040b16),
      bronze: new THREE.Color(0x4a2a0c),
      gold: new THREE.Color(0xffd76a),
      hotGold: new THREE.Color(0xfff2ad),
      ember: new THREE.Color(0xff9b3d),
      teal: new THREE.Color(0x0ccfbd),
      red: new THREE.Color(0x241006)
    };

    const coreVertexShader = `
      uniform float uTime;
      uniform float uWake;
      uniform float uHover;
      uniform float uShock;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorld;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
      }

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        float pulse = sin(uTime * 1.4) * 0.5 + 0.5;
        float n1 = snoise(position * 2.4 + vec3(uTime * 0.32));
        float n2 = snoise(position * 5.8 - vec3(uTime * 0.18, 0.0, uTime * 0.24));
        float distortion = (0.08 + uWake * 0.13 + uHover * 0.06 + uShock * 0.42) * (0.65 + pulse * 0.35);
        vec3 newPosition = position + normal * ((n1 * 0.72 + n2 * 0.28) * distortion);
        vWorld = (modelMatrix * vec4(newPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    const coreFragmentShader = `
      uniform float uTime;
      uniform float uWake;
      uniform float uHover;
      uniform float uShock;
      uniform float uIntensity;
      uniform float uOperational;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorld;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0), 2.6);
        float latitude = sin((vUv.y + uTime * 0.04) * 54.0);
        float longitude = sin((vUv.x - uTime * 0.05) * 88.0);
        float lattice = smoothstep(0.86, 1.0, abs(latitude * longitude));
        float equator = smoothstep(0.075, 0.0, abs(vUv.y - 0.5 + sin(uTime * 0.36 + vUv.x * 6.2831) * 0.018));
        float scan = smoothstep(0.92, 1.0, sin((vUv.x + uTime * 0.055) * 6.2831 * 6.0));
        float verdict = smoothstep(0.018, 0.0, abs(fract(vUv.x * 12.0 - uTime * 0.18) - 0.5)) * equator;
        float emberPulse = 0.5 + 0.5 * sin(uTime * 2.6 + vUv.x * 18.0);
        float glyphNoise = hash(floor(vUv * vec2(42.0, 16.0)) + floor(uTime * 4.0));
        float glyphSpark = step(0.92, glyphNoise) * smoothstep(0.2, 0.8, uWake);
        vec2 starUv = vUv - 0.5;
        float starH = smoothstep(0.48, 0.025, abs(starUv.x)) * smoothstep(0.014, 0.0, abs(starUv.y));
        float starV = smoothstep(0.28, 0.018, abs(starUv.y)) * smoothstep(0.010, 0.0, abs(starUv.x));
        float starCore = smoothstep(0.065, 0.0, length(starUv));
        float crossStar = (starH * 0.34 + starV * 0.25 + starCore * 0.42) * (0.86 + 0.14 * sin(uTime * 1.2));
        vec3 obsidian = vec3(0.004, 0.015, 0.026);
        vec3 bronze = vec3(0.20, 0.10, 0.03);
        vec3 gold = vec3(1.0, 0.78, 0.32);
        vec3 hot = vec3(1.0, 0.95, 0.72);
        vec3 ember = vec3(1.0, 0.48, 0.10);
        vec3 teal = vec3(0.03, 0.42, 0.48);
        vec3 base = mix(obsidian, bronze, fresnel * (0.45 + uWake * 0.35));
        base += gold * lattice * (0.12 + uWake * 0.28) * uIntensity;
        base += teal * lattice * (0.018 + uWake * 0.045) * uIntensity;
        base += gold * equator * scan * (0.16 + uWake * 0.32) * uIntensity;
        base += hot * verdict * (0.12 + uShock * 0.32) * uIntensity;
        base += ember * emberPulse * (0.10 + uWake * 0.10) * uIntensity;
        base = mix(base, hot, glyphSpark * 0.18 + uShock * 0.18 + uOperational * 0.07);
        base += hot * fresnel * (0.12 + uWake * 0.28 + uHover * 0.14 + uShock * 0.34) * uIntensity;
        base += teal * fresnel * equator * (0.045 + uOperational * 0.07 + uHover * 0.05);
        base += hot * crossStar * (0.12 + uWake * 0.10 + uHover * 0.04 + uShock * 0.10);
        base += gold * (starH + starV) * 0.035;
        float alpha = 0.78 + fresnel * 0.22 + crossStar * 0.035;
        gl_FragColor = vec4(base, alpha);
      }
    `;

    const runeVertexShader = `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const runeFragmentShader = `
      uniform float uTime;
      uniform float uDensity;
      uniform float uSeed;
      uniform float uWake;
      uniform float uShock;
      uniform float uOperational;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vWorld;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float runeCell(vec2 uv, float density) {
        vec2 grid = vec2(density, 6.0);
        vec2 id = floor(uv * grid);
        vec2 gv = fract(uv * grid);
        float h = hash(id + uSeed);
        float vertical = smoothstep(0.08, 0.02, abs(gv.x - (0.2 + 0.6 * hash(id + 2.0))));
        float horizontal = smoothstep(0.08, 0.02, abs(gv.y - (0.2 + 0.6 * hash(id + 4.0))));
        float diagonal = smoothstep(0.045, 0.01, abs((gv.x + gv.y) - (0.65 + 0.35 * hash(id + 7.0))));
        float notch = smoothstep(0.03, 0.0, abs(gv.x - gv.y));
        float gate = step(0.24, h) * step(hash(id + floor(uTime * 0.72)), 0.92);
        return clamp((vertical * 0.8 + horizontal * 0.65 + diagonal * 0.6 + notch * 0.45) * gate, 0.0, 1.0);
      }

      void main() {
        float ringMask = smoothstep(0.02, 0.18, vUv.y) * smoothstep(0.98, 0.82, vUv.y);
        float tickId = floor(vUv.x * uDensity);
        float tick = step(0.88, fract(vUv.x * uDensity * (1.0 + hash(vec2(uSeed, tickId)) * 0.4)));
        float rune = runeCell(vec2(fract(vUv.x + uTime * 0.006 * (hash(vec2(uSeed)) - 0.5)), vUv.y), uDensity * 0.42);
        float pulse = 0.42 + 0.58 * sin(uTime * (1.2 + hash(vec2(uSeed, 2.0)) * 2.8) + tickId * 0.31);
        float alpha = (rune * 0.72 + tick * 0.18) * ringMask * (0.16 + uWake * 0.44) * (0.42 + pulse * 0.48);
        alpha += uShock * smoothstep(0.5, 0.0, abs(vUv.y - 0.5)) * 0.26;
        vec3 color = mix(uColor * 0.55, vec3(1.0, 0.78, 0.36), uOperational * 0.38 + uShock * 0.45 + rune * 0.16);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const particleVertexShader = `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uWake;
      uniform float uShock;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float flicker = 0.72 + 0.28 * sin(uTime * (2.0 + aSeed * 4.0) + aSeed * 20.0);
        gl_PointSize = aSize * (90.0 / -mvPosition.z) * flicker * (0.68 + uWake * 0.4 + uShock * 0.8);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const particleFragmentShader = `
      uniform float uOperational;
      varying float vSeed;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float alpha = smoothstep(0.5, 0.02, d);
        vec3 ember = vec3(1.0, 0.46, 0.09);
        vec3 gold = vec3(1.0, 0.78, 0.32);
        vec3 ash = vec3(1.0, 0.96, 0.82);
        vec3 color = mix(ember, gold, smoothstep(0.38, 0.94, fract(vSeed * 7.7)));
        color = mix(color, ash, step(0.82, fract(vSeed * 3.1)) * 0.42);
        color = mix(color, vec3(1.0, 0.78, 0.36), uOperational * 0.42);
        gl_FragColor = vec4(color, alpha * (0.32 + 0.48 * fract(vSeed * 5.2)));
      }
    `;

    const fogVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fogFragmentShader = `
      uniform float uTime;
      uniform float uWake;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec2 uv = vUv - 0.5;
        float n = noise(vUv * 4.0 + vec2(uTime * 0.02, -uTime * 0.035));
        n += noise(vUv * 9.0 + vec2(-uTime * 0.04, uTime * 0.02)) * 0.5;
        float center = smoothstep(0.64, 0.08, length(uv * vec2(1.2, 0.8)));
        vec3 color = mix(vec3(0.004, 0.015, 0.026), vec3(0.19, 0.10, 0.035), center * n);
        color += vec3(1.0, 0.72, 0.22) * center * n * 0.15;
        color += vec3(0.0, 0.46, 0.52) * center * n * 0.025;
        float alpha = center * n * (0.06 + uWake * 0.08);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const cinematicShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uShock: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uShock;
        uniform vec2 uResolution;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vUv;
          vec2 c = uv - 0.5;
          float dist = length(c);
          float shockRing = smoothstep(0.18 + uShock * 0.42, 0.16 + uShock * 0.42, dist) * smoothstep(0.12 + uShock * 0.42, 0.14 + uShock * 0.42, dist);
          vec2 warped = uv + normalize(c + 0.0001) * (dist * dist * 0.018 + shockRing * 0.03);
        float aberration = 0.0011 + uShock * 0.0042;
          vec3 color;
          color.r = texture2D(tDiffuse, warped + vec2(aberration, 0.0)).r;
          color.g = texture2D(tDiffuse, warped).g;
          color.b = texture2D(tDiffuse, warped - vec2(aberration, 0.0)).b;
          float vignette = smoothstep(0.92, 0.18, dist);
          float grain = hash(uv * uResolution.xy + uTime * 60.0) - 0.5;
          color *= vignette;
        color += grain * 0.018;
          color += (vec3(0.0, 0.52, 0.58) * 0.035 + vec3(1.0, 0.72, 0.24) * 0.18) * shockRing;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    const selectiveBloomCompositeShader = {
      uniforms: {
        tDiffuse: { value: null },
        bloomTexture: { value: null },
        uMixStrength: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D bloomTexture;
        uniform float uMixStrength;
        varying vec2 vUv;
        void main() {
          vec4 baseColor = texture2D(tDiffuse, vUv);
          vec4 bloomColor = texture2D(bloomTexture, vUv);
          gl_FragColor = baseColor + bloomColor * uMixStrength;
        }
      `
    };

    const chromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: null },
        uAmount: { value: 0 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAmount;
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.17, 289.33))) * 143758.5453); }
        void main() {
          vec2 uv = vUv;
          vec2 center = uv - 0.5;
          float dist = dot(center, center);
          float slice = floor(uv.y * 88.0);
          float gate = step(0.92, hash(vec2(slice, floor(uTime * 18.0))));
          float tear = gate * (hash(vec2(slice + 17.0, floor(uTime * 9.0))) - 0.5) * uAmount * 1.8;
          vec2 direction = normalize(center + vec2(0.0001));
          vec2 radial = direction * (dist * uAmount);
          vec2 lateral = vec2(uAmount * 0.42 + tear, 0.0);
          float r = texture2D(tDiffuse, uv + radial + lateral).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - radial - lateral).b;
          vec3 color = vec3(r, g, b);
          float scan = sin(uv.y * uResolution.y * 1.35 + uTime * 20.0) * 0.5 + 0.5;
          color += vec3(1.0, 0.72, 0.25) * scan * uAmount * 0.18;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    class SceneManager {
      constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x040b16);
        this.scene.fog = new THREE.FogExp2(0x040b16, 0.024);
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 220);
        this.camera.position.set(0, 0.25, mobileQuery.matches || isCompactStage() ? 13.5 : 11.2);
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1.55 : 2.15));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = isCompactStage() ? 0.72 : 0.86;
        container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);
        this.systemRoot = new THREE.Group();
        this.scene.add(this.systemRoot);
        this.contextLost = false;
        this.disposed = false;

        this.scene.add(new THREE.AmbientLight(0x2c1607, 0.56));
        const key = new THREE.PointLight(0xfff2ad, 1.65, 36, 2);
        key.position.set(0, 0, 5);
        this.scene.add(key);
        const ember = new THREE.PointLight(0xff9b3d, 1.35, 32, 2);
        ember.position.set(-5, -3, 4);
        this.scene.add(ember);
        const edge = new THREE.PointLight(0x0ccfbd, 0.76, 38, 2);
        edge.position.set(6, 3, -4);
        this.scene.add(edge);

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onContextLost = this.onContextLost.bind(this);
        this.onContextRestored = this.onContextRestored.bind(this);
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
        window.addEventListener("resize", this.onResize);
        this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost, false);
        this.renderer.domElement.addEventListener("webglcontextrestored", this.onContextRestored, false);
      }

      onPointerMove(event) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        this.targetMouse.set(x, y);
      }

      onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.camera.position.z = mobileQuery.matches || isCompactStage() ? 13.5 : 11.2;
        this.renderer.toneMappingExposure = isCompactStage() ? 0.72 : 0.86;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1.55 : 2.15));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }

      updateMouse() {
        this.mouse.lerp(this.targetMouse, 0.07);
      }

      setFallbackState(reason = "") {
        if (reason) {
          document.documentElement.dataset.webglFallback = reason;
          if (this.container) this.container.dataset.webglState = reason;
        } else {
          delete document.documentElement.dataset.webglFallback;
          if (this.container) this.container.dataset.webglState = this.disposed ? "disposed" : "active";
        }
      }

      onContextLost(event) {
        event.preventDefault();
        if (this.disposed) return;
        this.contextLost = true;
        this.setFallbackState("context-lost");
        window.dispatchEvent(new CustomEvent("flg:webgl-context-lost"));
      }

      onContextRestored() {
        if (this.disposed) return;
        this.contextLost = false;
        this.setFallbackState("");
        this.onResize();
        window.dispatchEvent(new CustomEvent("flg:webgl-context-restored"));
      }

      dispose() {
        if (this.disposed) return;
        this.disposed = true;
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("resize", this.onResize);
        this.renderer?.domElement?.removeEventListener("webglcontextlost", this.onContextLost, false);
        this.renderer?.domElement?.removeEventListener("webglcontextrestored", this.onContextRestored, false);
        disposeObjectTree(this.scene);
        this.renderer?.dispose?.();
        this.renderer?.forceContextLoss?.();
        this.renderer?.domElement?.remove();
        this.setFallbackState("");
      }
    }

    class CameraController {
      constructor(manager) {
        this.manager = manager;
        this.baseZ = mobileQuery.matches || isCompactStage() ? 13.5 : 11.2;
      }

      update(delta, operational) {
        const { camera, mouse, systemRoot } = this.manager;
        const damp = clamp(delta * 3.5, 0.02, 0.12);
        const targetX = mouse.x * (mobileQuery.matches ? 0.7 : 1.2);
        const targetY = -mouse.y * (mobileQuery.matches ? 0.5 : 0.82);
        camera.position.x += (targetX - camera.position.x) * damp;
        camera.position.y += (targetY + 0.15 - camera.position.y) * damp;
        camera.position.z += ((operational ? this.baseZ - 0.9 : this.baseZ) - camera.position.z) * damp;
        camera.lookAt(0, 0, 0);
        systemRoot.rotation.x += ((mouse.y * 0.12) - systemRoot.rotation.x) * 0.04;
        systemRoot.rotation.y += ((mouse.x * 0.18) - systemRoot.rotation.y) * 0.04;
      }
    }

    class PostProcessingPipeline {
      constructor(manager) {
        this.manager = manager;
        const { renderer, scene, camera } = manager;
        this.scene = scene;
        this.ready = false;
        this.enabled = !prefersReducedMotion;
        this.lowPower = mobileQuery.matches || isLowPowerDevice();
        this.useSelectiveBloom = this.enabled && !this.lowPower;
        this.fallbackReason = this.enabled ? "" : "reduced-motion";
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(BLOOM_SCENE);
        this.originalMaterials = new Map();
        this.darkMaterials = {
          mesh: new THREE.MeshBasicMaterial({ color: 0x000000 }),
          line: new THREE.LineBasicMaterial({ color: 0x000000 }),
          points: new THREE.PointsMaterial({ color: 0x000000, size: 0.01, sizeAttenuation: false })
        };

        this.baseBloom = bloomBaseForStage();
        this.hoverEnergy = 0;
        this.targetHoverEnergy = 0;
        this.shockEnergy = 0;
        this.caPulse = 0;
        this.caPulseDecay = 0;
        this.bloomPass = null;
        this.saoPass = null;
        this.cinematicPass = null;
        this.bloomMixPass = null;
        this.chromaticAberrationPass = null;
        this.bloomComposer = null;
        this.composer = null;

        if (!this.enabled) return;

        try {
          if (this.useSelectiveBloom) {
            this.bloomComposer = new EffectComposer(renderer);
            this.bloomComposer.renderToScreen = false;
            this.bloomComposer.addPass(new RenderPass(scene, camera));
            this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.baseBloom, 0.42, 0.94);
            this.bloomPass.threshold = 0.72;
            this.bloomPass.strength = this.baseBloom;
            this.bloomPass.radius = 0.28;
            this.bloomComposer.addPass(this.bloomPass);
          }

          this.composer = new EffectComposer(renderer);
          this.composer.addPass(new RenderPass(scene, camera));

          if (this.useSelectiveBloom) {
            this.saoPass = new SAOPass(scene, camera, false, true);
            this.saoPass.params.saoBias = 0.42;
            this.saoPass.params.saoIntensity = 0.018;
            this.saoPass.params.saoScale = 42;
            this.saoPass.params.saoKernelRadius = 36;
            this.saoPass.params.saoMinResolution = 0;
            this.composer.addPass(this.saoPass);
          }

          this.cinematicPass = new ShaderPass(cinematicShader);
          this.cinematicPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
          this.composer.addPass(this.cinematicPass);
          if (this.useSelectiveBloom) {
            this.bloomMixPass = new ShaderPass(selectiveBloomCompositeShader);
            this.bloomMixPass.uniforms.bloomTexture.value = this.bloomComposer.renderTarget2.texture;
            this.composer.addPass(this.bloomMixPass);
          }
          this.chromaticAberrationPass = new ShaderPass(chromaticAberrationShader);
          this.chromaticAberrationPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
          this.composer.addPass(this.chromaticAberrationPass);
          this.composer.addPass(new OutputPass());
          this.ready = true;
        } catch (error) {
          console.warn("[FLG] Post pipeline fallback:", error?.message || error);
          this.dispose();
          this.fallbackReason = error?.message || "post-init-failed";
        }
      }

      resize() {
        this.baseBloom = bloomBaseForStage();
        if (!this.ready) return;
        this.bloomComposer?.setSize(window.innerWidth, window.innerHeight);
        this.composer?.setSize(window.innerWidth, window.innerHeight);
        this.bloomPass?.resolution?.set(window.innerWidth, window.innerHeight);
        this.cinematicPass?.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        this.chromaticAberrationPass?.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }

      setShock(value) {
        this.shockEnergy = value;
        if (this.cinematicPass) this.cinematicPass.uniforms.uShock.value = value;
      }

      setHoverEnergy(value) {
        this.targetHoverEnergy = value;
      }

      triggerChromaticAberration(amount = 0.006, duration = 0.62) {
        if (prefersReducedMotion) return;
        const capped = clamp(amount, 0, 0.018);
        this.caPulse = Math.max(this.caPulse, capped);
        this.caPulseDecay = capped / Math.max(duration, 0.16);
      }

      getDarkMaterial(object) {
        if (object.isPoints) return this.darkMaterials.points;
        if (object.isLine || object.isLineSegments) return this.darkMaterials.line;
        return this.darkMaterials.mesh;
      }

      darkenNonBloomed(object) {
        if (!object.material || !object.layers || this.bloomLayer.test(object.layers)) return;
        if (!(object.isMesh || object.isLine || object.isLineSegments || object.isPoints)) return;
        this.originalMaterials.set(object.uuid, object.material);
        object.material = this.getDarkMaterial(object);
      }

      restoreMaterial(object) {
        const material = this.originalMaterials.get(object.uuid);
        if (!material) return;
        object.material = material;
        this.originalMaterials.delete(object.uuid);
      }

      renderSelectiveBloom(delta) {
        if (this.manager.contextLost || this.manager.disposed) return;
        if (!this.ready || !this.composer) {
          this.manager.renderer.render(this.scene, this.manager.camera);
          return;
        }
        if (!this.useSelectiveBloom || !this.bloomComposer) {
          this.composer.render(delta);
          return;
        }
        this.scene.traverse((object) => this.darkenNonBloomed(object));
        this.bloomComposer.render(delta);
        this.scene.traverse((object) => this.restoreMaterial(object));
        this.composer.render(delta);
      }

      update(time, delta) {
        if (this.manager.contextLost || this.manager.disposed) return;
        if (!this.ready) {
          this.manager.renderer.render(this.scene, this.manager.camera);
          return;
        }
        if (this.cinematicPass) this.cinematicPass.uniforms.uTime.value = time;
        if (this.chromaticAberrationPass) this.chromaticAberrationPass.uniforms.uTime.value = time;
        this.hoverEnergy += (this.targetHoverEnergy - this.hoverEnergy) * clamp(delta * 7, 0, 1);
        this.caPulse = Math.max(0, this.caPulse - delta * this.caPulseDecay);
        const touchBloom = this.baseBloom + this.hoverEnergy * (isCompactStage() ? 0.12 : 0.24);
        if (this.bloomPass) {
          this.bloomPass.strength = touchBloom + this.shockEnergy * (3.1 - touchBloom);
          this.bloomPass.radius = 0.28 + this.shockEnergy * 0.22;
        }
        if (this.bloomMixPass) this.bloomMixPass.uniforms.uMixStrength.value = 0.92;
        const idleAberration = prefersReducedMotion ? 0 : 0.00055;
        if (this.chromaticAberrationPass) {
          const shockScale = this.lowPower ? 0.0032 : 0.0062;
          const caCap = this.lowPower ? 0.0075 : 0.018;
          this.chromaticAberrationPass.uniforms.uAmount.value = Math.min(caCap, idleAberration + this.caPulse + this.shockEnergy * shockScale);
        }
        this.renderSelectiveBloom(delta);
      }

      dispose() {
        [
          this.bloomPass,
          this.saoPass,
          this.cinematicPass,
          this.bloomMixPass,
          this.chromaticAberrationPass
        ].forEach((pass) => pass?.dispose?.());
        Object.values(this.darkMaterials || {}).forEach((material) => material?.dispose?.());
        this.bloomComposer?.dispose?.();
        this.composer?.dispose?.();
        this.originalMaterials?.clear?.();
        this.bloomPass = null;
        this.saoPass = null;
        this.cinematicPass = null;
        this.bloomMixPass = null;
        this.chromaticAberrationPass = null;
        this.bloomComposer = null;
        this.composer = null;
        this.ready = false;
      }
    }

    function enableBloomLayer(object) {
      let count = 0;
      object?.traverse?.((child) => {
        if (!child.layers) return;
        if (!(child.isMesh || child.isLine || child.isLineSegments || child.isPoints)) return;
        child.layers.enable(BLOOM_SCENE);
        count += 1;
      });
      return count;
    }

    function showDialogSurface(target) {
      if (!target) return;
      document.documentElement.dataset.saoDialogSurface = target.id || "active";
    }

    function hideDialogSurface({ restoreLogin = false } = {}) {
      const ritualStack = document.getElementById("ritualStack");
      if (restoreLogin && ritualStack?.open && !document.body.classList.contains("operational")) {
        showDialogSurface(ritualStack);
        return;
      }
      delete document.documentElement.dataset.saoDialogSurface;
    }

    class LinkStartFX {
      constructor(canvas) {
        this.canvas = canvas;
        this.active = false;
        this.frame = 0;
        this.startedAt = 0;
        this.duration = 2600;
        this.gl = null;
        this.program = null;
        this.uniforms = {};
        this.attribs = {};
        this.buffer = null;
        this.contextLost = false;
        this.disposed = false;
        this.paused = false;
        this.elapsedBeforePause = 0;
        this.resize = this.resize.bind(this);
        this.draw = this.draw.bind(this);
        this.onContextLost = this.onContextLost.bind(this);
        this.onContextRestored = this.onContextRestored.bind(this);
        if (!canvas || prefersReducedMotion) return;
        canvas.addEventListener("webglcontextlost", this.onContextLost, false);
        canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
        window.addEventListener("resize", this.resize);
        this.initializeContext();
      }

      initializeContext() {
        if (!this.canvas || prefersReducedMotion || this.disposed) return false;
        try {
          this.gl = this.canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            powerPreference: "high-performance"
          });
          if (!this.gl) return false;
          this.initProgram();
          this.resize();
          this.contextLost = false;
          delete document.documentElement.dataset.linkStartFallback;
          this.canvas.dataset.webglState = "active";
          return true;
        } catch (error) {
          console.warn("[FLG] Link Start FX init failed:", error?.message || error);
          this.releaseProgram();
          this.gl = null;
          return false;
        }
      }

      compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error(message || "Shader compile failed");
        }
        return shader;
      }

      initProgram() {
        const gl = this.gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, `
          attribute vec2 aPosition;
          varying vec2 vUv;
          void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
          }
        `);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          uniform float uTime;
          uniform float uProgress;
          uniform vec2 uResolution;
          varying vec2 vUv;
          const float PI = 3.14159265359;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
            float r = length(p);
            float angle = atan(p.y, p.x);
            float angular = (angle + PI) / (2.0 * PI);
            float presence = 0.52 + 0.48 * smoothstep(0.0, 0.08, uProgress);
            float vanish = 1.0 - smoothstep(0.92, 1.0, uProgress);
            float tunnelPhase = (0.24 + 0.76 * smoothstep(0.0, 0.48, uProgress)) * vanish;
            float focusPhase = smoothstep(0.48, 0.82, uProgress);
            float speed = mix(8.2, 1.85, focusPhase);
            float depth = 1.0 / max(r, 0.045) + uTime * speed;
            float ringBands = pow(0.5 + 0.5 * sin(depth * 6.7 - uProgress * 18.0), 5.6);
            float runeSpokes = pow(abs(sin(angle * 14.0 + depth * 1.35)), 7.2);
            float runeCells = step(0.58, hash(vec2(floor(angular * 96.0), floor(depth * 3.0))));
            float goldGlyphs = (ringBands * 0.72 + runeSpokes * 0.52) * (0.42 + runeCells * 0.58);
            float cyanData = pow(abs(sin(angle * 24.0 - depth * 0.72)), 11.0) * smoothstep(0.42, 1.22, r);
            float outerCircuit = pow(abs(sin(r * 18.0 - uTime * 3.4)), 6.4) * smoothstep(0.5, 1.14, r);
            float vignette = 1.0 - smoothstep(0.3, 1.76, r);
            float centerCore = smoothstep(0.2, 0.0, r) * smoothstep(0.18, 0.72, uProgress);
            float ignitionCore = smoothstep(0.24, 0.0, r) * (0.28 + 0.72 * smoothstep(0.0, 0.2, uProgress)) * vanish;
            float tunnelLens = smoothstep(1.54, 0.05, r);
            float whiteout = smoothstep(0.94, 1.0, uProgress);
            vec3 gold = vec3(0.94, 0.62, 0.16);
            vec3 brightGold = vec3(1.0, 0.88, 0.58);
            vec3 cyan = vec3(0.0, 0.78, 0.92);
            vec3 deep = vec3(0.015, 0.006, 0.0);
            vec3 color = deep;
            color += gold * goldGlyphs * (0.94 + tunnelPhase * 1.9);
            color += cyan * (cyanData * 0.64 + outerCircuit * 0.42) * tunnelPhase;
            color += brightGold * centerCore * (1.18 + focusPhase * 1.62);
            color += brightGold * ignitionCore * (0.42 + focusPhase * 0.32);
            color = mix(color, vec3(1.0, 0.88, 0.58), whiteout * 0.42);
            float alpha = clamp((0.34 + tunnelLens * 0.16 + goldGlyphs * 0.68 + cyanData * 0.24 + centerCore * 0.5 + ignitionCore * 0.34) * vignette * presence, 0.0, 0.96);
            alpha = max(alpha * vanish, whiteout * 0.38);
            gl_FragColor = vec4(color, alpha);
          }
        `);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          const message = gl.getProgramInfoLog(this.program);
          throw new Error(message || "Program link failed");
        }
        this.attribs.position = gl.getAttribLocation(this.program, "aPosition");
        this.uniforms.time = gl.getUniformLocation(this.program, "uTime");
        this.uniforms.progress = gl.getUniformLocation(this.program, "uProgress");
        this.uniforms.resolution = gl.getUniformLocation(this.program, "uResolution");
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);
      }

      releaseProgram() {
        const gl = this.gl;
        try {
          if (gl && this.buffer) gl.deleteBuffer(this.buffer);
          if (gl && this.program) gl.deleteProgram(this.program);
        } catch (_) {}
        this.buffer = null;
        this.program = null;
        this.uniforms = {};
        this.attribs = {};
      }

      onContextLost(event) {
        event.preventDefault();
        if (this.disposed) return;
        this.contextLost = true;
        this.stop(true);
        this.releaseProgram();
        this.gl = null;
        if (this.canvas) this.canvas.dataset.webglState = "context-lost";
        document.documentElement.dataset.linkStartFallback = "context-lost";
        window.dispatchEvent(new CustomEvent("flg:linkstart-context-lost"));
      }

      onContextRestored() {
        if (this.disposed) return;
        this.contextLost = false;
        this.initializeContext();
        window.dispatchEvent(new CustomEvent("flg:linkstart-context-restored"));
        updateFxMetrics?.();
      }

      resize() {
        if (!this.canvas || !this.gl) return;
        const dpr = Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1.3 : 1.75);
        const width = Math.max(1, Math.floor(window.innerWidth * dpr));
        const height = Math.max(1, Math.floor(window.innerHeight * dpr));
        if (this.canvas.width !== width || this.canvas.height !== height) {
          this.canvas.width = width;
          this.canvas.height = height;
        }
        this.canvas.style.width = "100vw";
        this.canvas.style.height = "100vh";
      }

      draw(now) {
        const gl = this.gl;
        if (!gl || !this.program || !this.active || this.paused || this.contextLost) return;
        if (!this.startedAt) this.startedAt = now - this.elapsedBeforePause;
        const elapsed = now - this.startedAt;
        const progress = clamp(elapsed / this.duration, 0, 1);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(this.uniforms.time, now * 0.001);
        gl.uniform1f(this.uniforms.progress, progress);
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (progress < 1) {
          this.frame = requestAnimationFrame(this.draw);
        } else {
          this.stop();
        }
      }

      start(duration = 2600, sharedStartAt = 0) {
        if ((!this.gl && !this.initializeContext()) || !this.canvas || prefersReducedMotion || this.contextLost) return 0;
        this.stop(true);
        this.duration = Math.max(900, duration);
        this.startedAt = Number.isFinite(sharedStartAt) && sharedStartAt > 0 ? sharedStartAt : 0;
        this.elapsedBeforePause = 0;
        this.paused = false;
        this.active = true;
        this.canvas.style.display = "block";
        this.canvas.classList.add("is-active");
        this.frame = requestAnimationFrame(this.draw);
        return this.duration;
      }

      pause() {
        if (!this.active || this.paused) return;
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.elapsedBeforePause = this.startedAt ? Math.max(0, performance.now() - this.startedAt) : this.elapsedBeforePause;
        this.paused = true;
      }

      resume() {
        if (!this.active || !this.paused || this.contextLost || !this.gl || !this.program) return;
        this.paused = false;
        this.startedAt = 0;
        this.frame = requestAnimationFrame(this.draw);
      }

      stop(immediate = false) {
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.active = false;
        this.paused = false;
        this.elapsedBeforePause = 0;
        if (!this.canvas) return;
        this.canvas.classList.remove("is-active");
        const hide = () => {
          if (!this.active) this.canvas.style.display = "none";
        };
        if (immediate) {
          hide();
        } else {
          window.setTimeout(hide, 260);
        }
      }

      dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stop(true);
        window.removeEventListener("resize", this.resize);
        this.canvas?.removeEventListener("webglcontextlost", this.onContextLost, false);
        this.canvas?.removeEventListener("webglcontextrestored", this.onContextRestored, false);
        this.releaseProgram();
        this.gl = null;
        if (this.canvas) {
          this.canvas.dataset.webglState = "disposed";
          this.canvas.width = 1;
          this.canvas.height = 1;
        }
      }
    }

    class CoreEngine {
      constructor(root) {
        this.group = new THREE.Group();
        root.add(this.group);
        this.wake = 0;
        this.hover = 0;
        this.shock = 0;
        this.operational = 0;
        this.fragmentData = [];
        this.pageData = [];
        this.scanBands = [];
        this.createFog();
        this.createCore();
        this.createGeometrySystems();
        this.createScanBands();
        this.createFragments();
        this.createManuscriptOrbitals();
      }

      createFog() {
        this.fogMaterial = new THREE.ShaderMaterial({
          vertexShader: fogVertexShader,
          fragmentShader: fogFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uWake: { value: 0 }
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const fog = new THREE.Mesh(new THREE.PlaneGeometry(52, 34, 1, 1), this.fogMaterial);
        fog.position.z = -17;
        this.group.add(fog);
      }

      createCore() {
        this.coreMaterial = new THREE.ShaderMaterial({
          vertexShader: coreVertexShader,
          fragmentShader: coreFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uWake: { value: 0 },
            uHover: { value: 0 },
            uShock: { value: 0 },
            uIntensity: { value: 0.05 },
            uOperational: { value: 0 }
          },
          transparent: true,
          depthWrite: false
        });
        this.coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, mobileQuery.matches ? 4 : 5), this.coreMaterial);
        this.coreMesh.scale.set(1.0, 1.06, 1.0);
        this.group.add(this.coreMesh);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xfff2ad,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending
        });
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.24, 2), 16), edgeMaterial);
        this.edgeShell = edge;
        this.group.add(edge);
      }

      createGeometrySystems() {
        this.geometryGroup = new THREE.Group();
        this.group.add(this.geometryGroup);
        const knotMaterial = new THREE.MeshBasicMaterial({
          color: 0xff9b3d,
          transparent: true,
          opacity: 0.16,
          wireframe: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const knotCount = mobileQuery.matches ? 3 : 5;
        for (let i = 0; i < knotCount; i++) {
          const geo = new THREE.TorusKnotGeometry(1.58 + i * 0.18, 0.012 + i * 0.002, 160, 8, 2 + (i % 3), 3 + ((i + 1) % 4));
          const mesh = new THREE.Mesh(geo, knotMaterial.clone());
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          mesh.userData.speed = (0.0014 + i * 0.0005) * (i % 2 ? -1 : 1);
          mesh.userData.axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          this.geometryGroup.add(mesh);
        }

        const vertices = [];
        const rings = 7;
        for (let r = 0; r < rings; r++) {
          const radius = 1.84 + r * 0.32;
          const nodes = 18 + r * 4;
          for (let i = 0; i < nodes; i++) {
            const a = (i / nodes) * Math.PI * 2;
            const b = (((i * 7) % nodes) / nodes) * Math.PI * 2;
            vertices.push(Math.cos(a) * radius, Math.sin(a) * radius * 0.62, Math.sin(a + r) * 0.22);
            vertices.push(Math.cos(b) * (radius + 0.08), Math.sin(b) * (radius + 0.08) * 0.62, Math.cos(b + r) * 0.22);
          }
        }
        const latticeGeo = new THREE.BufferGeometry();
        latticeGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        const latticeMat = new THREE.LineBasicMaterial({
          color: 0xffd76a,
          transparent: true,
          opacity: 0.10,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.lattice = new THREE.LineSegments(latticeGeo, latticeMat);
        this.geometryGroup.add(this.lattice);
      }

      createScanBands() {
        this.scanGroup = new THREE.Group();
        this.group.add(this.scanGroup);
        const bandConfigs = [
          { radius: 1.42, tube: 0.007, color: 0xffd76a, opacity: 0.18, tilt: [0.08, 0.0, 0.0], speed: 0.11 },
          { radius: 1.92, tube: 0.005, color: 0xffb84d, opacity: 0.15, tilt: [0.0, 0.34, 0.12], speed: -0.08 },
          { radius: 2.34, tube: 0.004, color: 0xfff2ad, opacity: 0.13, tilt: [0.42, 0.0, 0.24], speed: 0.07 },
          { radius: 2.86, tube: 0.0035, color: 0x0ccfbd, opacity: 0.11, tilt: [0.12, 0.52, 0.0], speed: -0.05 }
        ];
        bandConfigs.forEach((config, index) => {
          const material = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: config.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const band = new THREE.Mesh(new THREE.TorusGeometry(config.radius, config.tube, 4, 224), material);
          band.rotation.set(config.tilt[0], config.tilt[1], config.tilt[2]);
          band.userData = {
            baseOpacity: config.opacity,
            speed: config.speed,
            phase: index * 0.72
          };
          this.scanBands.push(band);
          this.scanGroup.add(band);
        });
      }

      createFragments() {
        this.fragmentGroup = new THREE.Group();
        this.group.add(this.fragmentGroup);
        const count = mobileQuery.matches ? 34 : 72;
        const materials = [
          new THREE.MeshBasicMaterial({
            color: 0xb97822,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          }),
          new THREE.MeshBasicMaterial({
            color: 0xffd76a,
            transparent: true,
            opacity: 0.14,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        ];
        const geometries = [
          new THREE.TetrahedronGeometry(0.08, 0),
          new THREE.OctahedronGeometry(0.07, 0),
          new THREE.BoxGeometry(0.12, 0.018, 0.05)
        ];
        for (let i = 0; i < count; i++) {
          const mesh = new THREE.Mesh(geometries[i % geometries.length], materials[i % materials.length]);
          const angle = Math.random() * Math.PI * 2;
          const radius = 2.1 + Math.random() * 3.8;
          const y = (Math.random() - 0.5) * 3.2;
          mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.42);
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          const s = 0.7 + Math.random() * 1.6;
          mesh.scale.setScalar(s);
          mesh.userData = {
            angle,
            radius,
            y,
            speed: (0.08 + Math.random() * 0.18) * (Math.random() > 0.5 ? 1 : -1),
            lift: Math.random() * Math.PI * 2
          };
          this.fragmentData.push(mesh);
          this.fragmentGroup.add(mesh);
        }
      }

      createManuscriptOrbitals() {
        this.pageGroup = new THREE.Group();
        this.group.add(this.pageGroup);
        const pageTexture = this.createPageTexture();
        const material = new THREE.MeshBasicMaterial({
          map: pageTexture,
          transparent: true,
          opacity: 0.34,
          color: 0xffd76a,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const count = mobileQuery.matches ? 8 : 14;
        for (let i = 0; i < count; i++) {
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), material.clone());
          const angle = (i / count) * Math.PI * 2;
          const radius = 3.05 + Math.sin(i * 2.1) * 0.28;
          mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * 0.9, Math.sin(angle) * 0.7);
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, angle + Math.PI / 2);
          mesh.userData = { angle, radius, speed: 0.11 + Math.random() * 0.08, yPhase: Math.random() * 10 };
          this.pageData.push(mesh);
          this.pageGroup.add(mesh);
        }
      }

      createPageTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 192;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(120,72,26,0.22)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(255,226,160,0.42)";
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 112, 176);
        ctx.strokeStyle = "rgba(255,226,160,0.22)";
        for (let y = 24; y < 164; y += 12) {
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.lineTo(110 - Math.random() * 26, y + Math.sin(y) * 1.8);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(214,166,77,0.36)";
        for (let i = 0; i < 8; i++) {
          const x = 22 + Math.random() * 82;
          const y = 28 + Math.random() * 120;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 8, y + 10);
          ctx.lineTo(x - 6, y + 16);
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }

      setWake(value) {
        this.wake = value;
        this.coreMaterial.uniforms.uWake.value = value;
        this.fogMaterial.uniforms.uWake.value = value;
      }

      setHover(value) {
        this.hover = value;
      }

      setShock(value) {
        this.shock = value;
      }

      setIntensity(value) {
        this.coreMaterial.uniforms.uIntensity.value = value;
      }

      setOperational(value) {
        this.operational = value;
      }

      update(time, delta) {
        const d = Math.min(delta, 0.05);
        this.hover += ((this.hoverTarget || 0) - this.hover) * 0.08;
        this.coreMaterial.uniforms.uTime.value = time;
        this.coreMaterial.uniforms.uHover.value = this.hover;
        this.coreMaterial.uniforms.uShock.value = this.shock;
        this.coreMaterial.uniforms.uOperational.value = this.operational;
        this.fogMaterial.uniforms.uTime.value = time;

        this.coreMesh.rotation.x += d * (0.11 + this.shock * 1.4);
        this.coreMesh.rotation.y += d * (0.16 + this.hover * 0.25 + this.shock * 1.8);
        this.edgeShell.rotation.y -= d * (0.08 + this.shock * 1.2);
        this.edgeShell.rotation.z += d * 0.06;
        this.edgeShell.material.opacity = 0.18 + this.wake * 0.18 + this.shock * 0.28;

        this.geometryGroup.children.forEach((mesh, index) => {
          if (mesh.isMesh) {
            mesh.rotateOnAxis(mesh.userData.axis, mesh.userData.speed * (1 + this.shock * 12));
            mesh.material.opacity = 0.12 + this.wake * 0.18 + this.operational * 0.04;
          }
          if (mesh.isLineSegments) {
            mesh.rotation.z += d * 0.045;
            mesh.material.opacity = 0.08 + this.wake * 0.08 + this.shock * 0.14;
          }
        });

        for (const band of this.scanBands) {
          band.rotation.z += d * band.userData.speed * (1 + this.shock * 9 + this.operational * 0.8);
          band.rotation.x += d * band.userData.speed * 0.24;
          const sweep = 0.5 + 0.5 * Math.sin(time * 1.6 + band.userData.phase);
          band.material.opacity = band.userData.baseOpacity * (0.42 + this.wake * 0.78 + sweep * 0.34 + this.shock * 1.1);
          band.scale.setScalar(1 + this.shock * 0.18 + this.hover * 0.025);
        }

        for (const mesh of this.fragmentData) {
          const data = mesh.userData;
          data.angle += data.speed * d * (0.7 + this.shock * 5.0);
          const radius = data.radius * (1 - this.shock * 0.16);
          mesh.position.x = Math.cos(data.angle) * radius;
          mesh.position.z = Math.sin(data.angle) * radius * 0.46;
          mesh.position.y = data.y + Math.sin(time * 0.8 + data.lift) * 0.12;
          mesh.rotation.x += d * 0.48;
          mesh.rotation.y += d * 0.38;
        }

        for (const mesh of this.pageData) {
          const data = mesh.userData;
          data.angle += data.speed * d * (0.72 + this.shock * 4.2);
          const radius = data.radius * (1 - this.shock * 0.2);
          mesh.position.x = Math.cos(data.angle) * radius;
          mesh.position.z = Math.sin(data.angle) * 0.74;
          mesh.position.y = Math.sin(data.angle * 1.4 + data.yPhase) * 0.9;
          mesh.rotation.z = data.angle + Math.PI / 2;
          mesh.rotation.y += d * 0.25;
          mesh.material.opacity = 0.16 + this.wake * 0.22 + this.operational * 0.12;
        }
      }
    }

    class RuneSystem {
      constructor(root) {
        this.group = new THREE.Group();
        root.add(this.group);
        this.rings = [];
        this.wake = 0;
        this.shock = 0;
        this.operational = 0;
        this.speedScale = 1;
        this.operationalSpeedScale = 1;
        this.createRuneLayers();
      }

      createRuneLayers() {
        // 七個分析語義區疊成 20+ 程序符文環；區域不減，視覺層數加密。
        const isMobile = mobileQuery.matches;
        const compactRuneBudget = isMobile || prefersReducedMotion;
        const ZONES = [
          { label: "LORE CHECK",       count: compactRuneBudget ? 3 : 5, tilt:   0, tiltSpread:  7, baseRadius: 1.62, color: palette.gold,   density: 72 },
          { label: "CHARACTER APPRAISAL", count: compactRuneBudget ? 3 : 5, tilt:  18, tiltSpread: 11, baseRadius: 2.04, color: palette.gold,   density: 112 },
          { label: "SPECIES INDEX",       count: compactRuneBudget ? 3 : 5, tilt:  34, tiltSpread: 12, baseRadius: 2.42, color: palette.bronze, density: 84 },
          { label: "STYLE MATRIX",     count: compactRuneBudget ? 3 : 5, tilt:  52, tiltSpread: 14, baseRadius: 2.78, color: palette.gold,   density: 132 },
          { label: "PLOT LOGIC",       count: compactRuneBudget ? 3 : 5, tilt:  68, tiltSpread: 12, baseRadius: 3.12, color: palette.ember,  density: 94 },
          { label: "WORLD RULES",      count: compactRuneBudget ? 3 : 5, tilt:  82, tiltSpread:  9, baseRadius: 3.46, color: palette.bronze, density: 148 },
          { label: "DEEP SYSTEM LAYER / APPRAISAL", count: compactRuneBudget ? 3 : 5, tilt:  92, tiltSpread:  7, baseRadius: 3.82, color: palette.ember,  density: 68 }
        ];
        const D2R = Math.PI / 180;
        ZONES.forEach((zone, zoneIndex) => {
          for (let i = 0; i < zone.count; i++) {
            const radiusOffset = (i - (zone.count - 1) / 2) * 0.11;
            const radius = zone.baseRadius + radiusOffset;
            const tube = 0.0038 + (i % 3) * 0.0013;
            const spread = (i / Math.max(zone.count - 1, 1) - 0.5) * 2;
            const tiltDeg = zone.tilt + spread * zone.tiltSpread;
            const yawDeg = ((i * 137.508) + zoneIndex * 22) % 360;
            const material = new THREE.ShaderMaterial({
              vertexShader: runeVertexShader,
              fragmentShader: runeFragmentShader,
              uniforms: {
                uTime: { value: 0 },
                uDensity: { value: zone.density + (i * 13) % 32 },
                uSeed: { value: (zoneIndex * 17.3 + i * 7.1) % 1000 },
                uWake: { value: 0 },
                uShock: { value: 0 },
                uOperational: { value: 0 },
                uColor: { value: zone.color.clone() }
              },
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 4, isMobile ? 160 : 256), material);
            ring.rotation.set(tiltDeg * D2R, yawDeg * D2R, 0);
            const axisJitter = 0.18;
            const axis = new THREE.Vector3(
              (Math.random() - 0.5) * axisJitter,
              1,
              (Math.random() - 0.5) * axisJitter
            ).normalize();
            const direction = zoneIndex % 2 ? -1 : 1;
            const speedBase = 0.0014 + zoneIndex * 0.0004;
            ring.userData = {
              axis,
              speed: (speedBase + (i % 3) * 0.0006) * direction,
              phase: zoneIndex * 0.6 + i * 0.27,
              radius,
              zone: zone.label,
              zoneIndex
            };
            this.rings.push(ring);
            this.group.add(ring);
          }
        });
        this.metrics = {
          runeLayers: this.rings.length,
          semanticZones: ZONES.length,
          reducedMotion: prefersReducedMotion,
          mobile: isMobile
        };
      }

      setWake(value) {
        this.wake = value;
      }

      setShock(value) {
        this.shock = value;
      }

      setOperational(value) {
        this.operational = clamp(value, 0, 1);
        this.operationalSpeedScale = 1 - this.operational * 0.58;
      }

      setSpeedScale(value) {
        this.speedScale = value;
      }

      update(time, delta) {
        for (const ring of this.rings) {
          const material = ring.material;
          const zoneWake = clamp((this.wake - ring.userData.zoneIndex * 0.105) / 0.28, 0, 1);
          material.uniforms.uTime.value = time;
          material.uniforms.uWake.value = zoneWake;
          material.uniforms.uShock.value = this.shock;
          material.uniforms.uOperational.value = this.operational;
          const speed = ring.userData.speed * this.speedScale * this.operationalSpeedScale * (1 + this.shock * 29);
          ring.rotateOnAxis(ring.userData.axis, speed * delta * 60);
          const breathe = 1 + Math.sin(time * 0.42 + ring.userData.phase) * 0.008 + this.shock * 0.1;
          ring.scale.setScalar(breathe * (0.96 + zoneWake * 0.04));
        }
      }
    }

    class ParticleSystem {
      constructor(root, manager) {
        this.group = new THREE.Group();
        root.add(this.group);
        this.manager = manager;
        this.wake = 0;
        this.shock = 0;
        this.operational = 0;
        this.spiral = 0;
        this.streamData = [];
        this.createParticles();
        this.createIngestionStreams();
        this.metrics = {
          particles: this.count,
          ingestionStreams: this.streamCount,
          reducedMotion: prefersReducedMotion,
          mobile: mobileQuery.matches
        };
      }

      createParticles() {
        this.count = mobileQuery.matches ? 300 : 800;
        const positions = new Float32Array(this.count * 3);
        const seeds = new Float32Array(this.count);
        const sizes = new Float32Array(this.count);
        this.data = [];
        for (let i = 0; i < this.count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 2.4 + Math.random() * 11.4;
          const y = (Math.random() - 0.5) * 8.4;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7;
          seeds[i] = Math.random();
          sizes[i] = 0.06 + Math.random() * (mobileQuery.matches ? 0.09 : 0.13);
          this.data.push({
            angle,
            baseRadius: radius,
            radius,
            y,
            speed: 0.06 + Math.random() * 0.18,
            drift: Math.random() * Math.PI * 2,
            wobble: Math.random() * 0.7
          });
        }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
        this.geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        this.material = new THREE.ShaderMaterial({
          vertexShader: particleVertexShader,
          fragmentShader: particleFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uWake: { value: 0 },
            uShock: { value: 0 },
            uOperational: { value: 0 }
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        this.points = new THREE.Points(this.geometry, this.material);
        this.group.add(this.points);
      }

      createIngestionStreams() {
        this.streamCount = mobileQuery.matches ? 72 : 180;
        const positions = new Float32Array(this.streamCount * 2 * 3);
        this.streamGeometry = new THREE.BufferGeometry();
        this.streamGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.streamMaterial = new THREE.LineBasicMaterial({
          color: 0xfff2ad,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.streamLines = new THREE.LineSegments(this.streamGeometry, this.streamMaterial);
        this.group.add(this.streamLines);

        for (let i = 0; i < this.streamCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 4.2 + Math.random() * 7.4;
          this.streamData.push({
            angle,
            radius,
            y: (Math.random() - 0.5) * 5.2,
            speed: 0.12 + Math.random() * 0.28,
            phase: Math.random() * Math.PI * 2,
            length: 0.22 + Math.random() * 0.42
          });
        }
      }

      setWake(value) {
        this.wake = value;
        this.material.uniforms.uWake.value = value;
      }

      setShock(value) {
        this.shock = value;
        this.material.uniforms.uShock.value = value;
      }

      setOperational(value) {
        this.operational = value;
        this.material.uniforms.uOperational.value = value;
      }

      setSpiral(value) {
        this.spiral = value;
      }

      update(time, delta) {
        const positions = this.geometry.attributes.position.array;
        const mx = this.manager.mouse.x;
        const my = this.manager.mouse.y;
        for (let i = 0; i < this.count; i++) {
          const p = this.data[i];
          const speedBoost = 1 + this.shock * 8 + this.spiral * 5;
          p.angle += p.speed * delta * speedBoost;
          const targetRadius = p.baseRadius * (1 - this.spiral * 0.68 - this.shock * 0.16);
          p.radius += (targetRadius - p.radius) * (0.02 + this.spiral * 0.05);
          const y = p.y + Math.sin(time * (0.32 + p.wobble) + p.drift) * 0.32;
          const cursorPull = (1.0 - Math.min(p.baseRadius / 14, 1)) * (0.28 + this.shock * 0.4);
          positions[i * 3] = Math.cos(p.angle) * p.radius + mx * cursorPull;
          positions[i * 3 + 1] = y - my * cursorPull;
          positions[i * 3 + 2] = Math.sin(p.angle) * p.radius * 0.72;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.material.uniforms.uTime.value = time;

        const streamPositions = this.streamGeometry.attributes.position.array;
        const streamOpacity = prefersReducedMotion ? 0.018 : (0.05 + this.spiral * 0.3 + this.shock * 0.28 + this.operational * 0.08);
        this.streamMaterial.opacity = Math.min(streamOpacity, mobileQuery.matches ? 0.22 : 0.42);
        for (let i = 0; i < this.streamCount; i++) {
          const s = this.streamData[i];
          s.angle += s.speed * delta * (0.6 + this.spiral * 2.4 + this.shock * 4.8);
          const ingest = this.spiral * 0.72 + this.shock * 0.46 + this.operational * 0.18;
          const wave = (Math.sin(time * 1.8 + s.phase) + 1) * 0.5;
          const outer = s.radius * (1 - ingest * 0.52) + wave * 0.2;
          const inner = Math.max(1.14, outer - s.length - ingest * 1.2);
          const yOuter = s.y * (1 - ingest * 0.48) + Math.sin(time + s.phase) * 0.18;
          const yInner = yOuter * (0.62 - ingest * 0.16);
          const idx = i * 6;
          streamPositions[idx] = Math.cos(s.angle) * outer;
          streamPositions[idx + 1] = yOuter;
          streamPositions[idx + 2] = Math.sin(s.angle) * outer * 0.64;
          streamPositions[idx + 3] = Math.cos(s.angle + 0.05) * inner;
          streamPositions[idx + 4] = yInner;
          streamPositions[idx + 5] = Math.sin(s.angle + 0.05) * inner * 0.64;
        }
        this.streamGeometry.attributes.position.needsUpdate = true;
      }
    }

    class HUDSystem {
      constructor() {
        this.notice = document.getElementById("notice");
        this.announcer = document.getElementById("announcer");
        this.noticeMessages = ["小說編修核心待命"];
        this.operationalMessages = ["可開始鑑定小說手稿"];
        this.noticeIndex = 0;
        this.lastHudTick = 0;
        this.noticeFadeTimer = 0;
      }

      showNotice(text) {
        this.notice.textContent = text;
        this.announcer.textContent = text;
        window.clearTimeout(this.noticeFadeTimer);
        this.notice.classList.remove("is-entering", "is-leaving");
        void this.notice.offsetWidth;
        this.notice.classList.add("is-entering");
        this.noticeFadeTimer = window.setTimeout(() => {
          this.notice.classList.remove("is-entering");
          this.notice.classList.add("is-leaving");
        }, prefersReducedMotion ? 3000 : 2800);
      }

      cycleOperational() {
        this.noticeMessages = this.operationalMessages;
        this.noticeIndex = 0;
      }

      update(time, syncProgress) {
        if (time - this.lastHudTick < 0.45) return;
        this.lastHudTick = time;
        void syncProgress;
      }

      startNoticeLoop() {
        // 真實事件直接呼叫 showNotice；不要用裝飾性輪播覆蓋使用者狀態。
      }
    }

    class LoginController {
      constructor(core, runes, particles, post, hud) {
        this.core = core;
        this.runes = runes;
        this.particles = particles;
        this.post = post;
        this.hud = hud;
        this.syncProgress = 0;
        this.operational = false;
        this.mode = "email";
        this.oauthPopupTiming = null;
        this.ritualStack = document.getElementById("ritualStack");
        this.authPanel = document.getElementById("authPanel");
        this.form = document.getElementById("authForm");
        this.googlePopupClosedCount = 0;
        this.authHeaderLabel = document.getElementById("authHeaderLabel");
        this.authHeaderState = document.getElementById("authHeaderState");
        this.authTitle = document.getElementById("authTitle");
        this.authPrompt = document.getElementById("authPrompt");
        this.openButton = document.getElementById("openRitualBtn");
        this.status = document.getElementById("ritualStatus");
        this.operationalDeck = document.getElementById("operationalDeck");
        this.operationalStatus = document.getElementById("operationalStatus");
        this.shockwave = document.getElementById("shockwave");
        this.bootVeil = document.getElementById("bootVeil");
        this.leylineRain = document.getElementById("leylineRain");
        this.connectionWindow = document.getElementById("connectionWindow");
        this.connectionLabel = document.getElementById("connectionLabel");
        this.connectionState = document.getElementById("connectionState");
        this.connectionTitle = document.getElementById("connectionTitle");
        this.connectionCopy = document.getElementById("connectionCopy");
        this.overrideWindow = document.getElementById("overrideWindow");
        this.connectionWindowController = new SaoWindowController();
        this.overrideWindowController = new SaoWindowController({ lockDocument: true });
        this.decryptTarget = document.getElementById("decryptText");
        this.configureGoogleOnlyAuth();
        this.setOperationalDeckAvailability(false);
        this.bindEvents();
      }

      configureGoogleOnlyAuth() {
        this.mode = "email";
        this.authPanel?.classList.add("is-google-only");
        this.setAuthCopy({
          header: "AUTH_REQUIRED",
          state: "AUTH STANDBY",
          title: "西方奇幻手稿編修核心",
          prompt: "完成 Google 授權後，可貼上手稿並同步取得全文重寫、語感審查與歷史卷宗。",
          button: "使用 Google 登入"
        });
        this.setStatus("Google 登入待命中");
      }

      setOperationalDeckAvailability(isAvailable) {
        if (!this.operationalDeck) return;
        this.operationalDeck.toggleAttribute("inert", !isAvailable);
        this.operationalDeck.setAttribute("aria-hidden", String(!isAvailable));
      }

      bindEvents() {
        this.form.addEventListener("submit", (event) => {
          event.preventDefault();
          this.startPopupTiming("auth-form-submit");
          this.beginOAuthSeal();
        });

        window.addEventListener("worldforge:redirect-error", (event) => {
          this.handleRedirectError(event.detail || {});
        });
        if (firebaseRuntime.redirectError) this.handleRedirectError(firebaseRuntime.redirectError);

        document.getElementById("abortOverrideBtn").addEventListener("click", () => this.abortOverride());
        document.getElementById("forceSyncBtn").addEventListener("click", () => this.beginAuthentication("正在接管鑑定核心"));
        this.overrideWindow?.addEventListener("click", (event) => {
          if (event.target === this.overrideWindow) this.abortOverride();
        });
        this.ritualStack?.addEventListener("cancel", (event) => {
          event.preventDefault();
          this.setStatus("請先完成 Google 登入", true);
        });

        document.querySelectorAll("[data-op]").forEach((button) => {
          button.addEventListener("click", () => {
            if (button.dataset.op === "analyze") {
              this.runBusinessAnalysis();
              return;
            }
            const map = {
              sync: "世界觀資料庫同步中",
              style: "西方奇幻語彙校準中"
            };
            const message = map[button.dataset.op] || "小說編修核心待命";
            this.setOperationalStatus(message);
            this.triggerSmallPulse();
          });
        });

        this.ritualStack.addEventListener("pointerenter", () => {
          const energy = loginHoverEnergy() * 0.72;
          this.core.hoverTarget = energy;
          this.post.setHoverEnergy(energy);
        });
        this.ritualStack.addEventListener("pointerleave", () => {
          this.core.hoverTarget = 0;
          this.post.setHoverEnergy(0);
        });
      }

      startPopupTiming(source) {
        if (!authPopupTimingEnabled) return;
        this.oauthPopupTiming = {
          source,
          startedAt: performance.now(),
          marks: []
        };
        window.__FLG_AUTH_POPUP_TIMING__ = this.oauthPopupTiming;
        this.markPopupTiming("submit");
      }

      markPopupTiming(name, extra = {}) {
        if (!authPopupTimingEnabled || !this.oauthPopupTiming) return;
        const now = performance.now();
        const mark = {
          name,
          elapsed: Number((now - this.oauthPopupTiming.startedAt).toFixed(2)),
          ...extra
        };
        this.oauthPopupTiming.marks.push(mark);
        this.oauthPopupTiming.last = mark;
        document.documentElement.dataset.authPopupTiming = `${name}:${mark.elapsed}`;
        try {
          window.name = `FLG_AUTH_POPUP_TIMING:${JSON.stringify(this.oauthPopupTiming)}`;
        } catch (_) {}
        console.debug("[FLG auth popup timing]", JSON.stringify(this.oauthPopupTiming));
      }

      setStatus(text, isError = false) {
        setLiveStatus(this.status, text, { error: isError });
      }

      setOperationalStatus(text, isError = false) {
        setLiveStatus(this.operationalStatus, text, { error: isError });
      }

      pulseError() {
        if (prefersReducedMotion || !this.ritualStack?.animate) return;
        this.ritualStack.getAnimations()
          .filter((animation) => animation.id === "sao-error-shake")
          .forEach((animation) => animation.cancel());
        const animation = this.ritualStack.animate([
          { transform: "translateX(-7px)" },
          { transform: "translateX(7px)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-3px)" },
          { transform: "translateX(0)" }
        ], {
          duration: 270,
          easing: "linear"
        });
        animation.id = "sao-error-shake";
      }

      setAuthCopy({ header, state, title, prompt, button }) {
        this.authHeaderLabel.textContent = header;
        this.authHeaderState.textContent = state;
        this.authTitle.textContent = title;
        this.authPrompt.textContent = prompt;
        const buttonLabel = this.openButton.querySelector(".sao-btn-label") || this.openButton.querySelector("span:not(.google-mark)");
        if (buttonLabel) {
          buttonLabel.textContent = button;
        } else {
          this.openButton.textContent = button;
        }
      }

      setConnectionText({ label = "SYSTEM HANDSHAKE", state = "連線確認", title = "連線確認", copy = "正在啟動大賢者手稿鑑定核心" } = {}) {
        this.connectionLabel.textContent = label;
        this.connectionState.textContent = state;
        this.connectionTitle.textContent = title;
        this.connectionCopy.textContent = copy;
      }

      manifestWindow(target = this.connectionWindow) {
        const controller = target === this.overrideWindow ? this.overrideWindowController : this.connectionWindowController;
        return controller.open(target);
      }

      collapseWindow(target = this.connectionWindow, duration = uiMotion.collapse) {
        const controller = target === this.overrideWindow ? this.overrideWindowController : this.connectionWindowController;
        return controller.close(target, duration);
      }

      abortOverride() {
        this.setStatus("編修儀式已中斷");
        this.hud.showNotice("封印覆寫已中斷");
        this.collapseWindow(this.overrideWindow, uiMotion.collapse);
        if (this.ritualStack?.animate && !prefersReducedMotion) {
          this.ritualStack.animate([
            { opacity: 0.82, transform: "scale(0.985)", filter: "blur(4px)" },
            { opacity: 1, transform: "scale(1)", filter: "blur(0px)" }
          ], {
            duration: Math.round(uiMotion.retreat * 1000),
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "none"
          });
        }
        this.ritualStack.style.opacity = "1";
        this.ritualStack.style.scale = "1";
        this.ritualStack.style.filter = "blur(0px)";
      }

      restoreLoginControls() {
        this.mode = "email";
        this.ritualStack.classList.remove("is-oauth");
        this.openButton.disabled = false;
        this.core.setIntensity(loginIdleIntensity());
        this.runes.setSpeedScale(1);
      }

      handleRedirectError(detail = {}) {
        const message = detail?.message || "未知錯誤";
        this.setStatus(`Google 重新導向登入失敗：${message}`, true);
        this.hud.showNotice("Google 重新導向登入失敗");
      }

      getGoogleAuthRuntime() {
        const auth = firebaseRuntime.auth || AppState.get("fbAuth");
        const Provider = window.firebase?.auth?.GoogleAuthProvider;
        return auth && Provider ? { auth, Provider } : null;
      }

      handleGoogleAuthUnavailable() {
        this.markPopupTiming("perform-google-missing-auth");
        this.setStatus("Google 授權尚未載入，請稍後再試", true);
        this.hud.showNotice("Google 授權通道載入失敗");
        this.mode = "email";
        this.openButton.disabled = false;
        this.runes.setSpeedScale(1);
      }

      beginOAuthSeal() {
        if (this.operational || this.mode !== "email") return;
        const googleRuntime = this.getGoogleAuthRuntime();
        if (!googleRuntime) {
          this.handleGoogleAuthUnavailable();
          return;
        }
        this.markPopupTiming("begin-oauth-start");
        this.mode = "oauth";
        this.openButton.disabled = true;
        this.performGoogleSignIn(googleRuntime);
        this.markPopupTiming("sign-in-dispatched-before-visuals");
        this.setStatus("Google 授權通道開啟中");
        this.hud.showNotice("OAuth 封印通道開啟中");
        this.ritualStack.classList.add("is-oauth");
        this.markPopupTiming("ui-state-updated");
        this.core.setIntensity(0.36);
        this.runes.setSpeedScale(0.24);
        this.post.setHoverEnergy(0);
        this.markPopupTiming("webgl-energy-updated");
        this.setConnectionText({
          label: "OAUTH_GATE",
          state: "DIMENSIONAL LINK",
          title: "Google 授權確認中",
          copy: "授權通道已開啟，鑑定核心正等待回傳"
        });
        this.markPopupTiming("connection-copy-updated");
        this.manifestWindow(this.connectionWindow);
        this.markPopupTiming("connection-window-opened");
      }

      async performGoogleSignIn(googleRuntime = this.getGoogleAuthRuntime()) {
        this.markPopupTiming("perform-google-start");
        if (!googleRuntime) {
          this.handleGoogleAuthUnavailable();
          return;
        }
        try {
          const provider = new googleRuntime.Provider();
          this.markPopupTiming("google-provider-created");
          this.markPopupTiming("sign-in-popup-before");
          const pending = googleRuntime.auth.signInWithPopup(provider);
          this.markPopupTiming("sign-in-popup-after");
          await pending;
          this.markPopupTiming("sign-in-popup-resolved");
          this.googlePopupClosedCount = 0;
          this.collapseWindow(this.connectionWindow, uiMotion.collapse);
          this.beginAuthentication("Google 授權完成", { skipAuth: true });
        } catch (error) {
          this.collapseWindow(this.connectionWindow, uiMotion.collapse);
          const code = error?.code || "";
          this.markPopupTiming("sign-in-popup-error", { code });
          this.googlePopupClosedCount = code === "auth/popup-closed-by-user" ? this.googlePopupClosedCount + 1 : 0;
          this.restoreLoginControls();
          if (code === "auth/popup-closed-by-user") {
            this.setStatus("Google 授權視窗已關閉");
            this.hud.showNotice("Google 授權已取消");
          } else {
            this.setStatus(`Google 授權失敗：${error?.message || "未知錯誤"}`, true);
            this.hud.showNotice("Google 授權失敗");
          }
        }
      }

      async authenticateBeforeCore(options = {}) {
        if (options.skipAuth) return true;
        this.setStatus("請先完成 Google 登入", true);
        this.hud.showNotice("Google 登入尚未完成");
        return false;
      }

      triggerLinkStartHandoff() {
        hideDialogSurface();
        if (prefersReducedMotion) {
          this._authHandoffStartAt = 0;
          return 0;
        }
        const duration = Math.round(uiMotion.authHandoff * 1000);
        const startedAt = performance.now();
        const started = window.__FLG_LINK_START__?.start?.(duration, startedAt) || 0;
        this._authHandoffStartAt = started ? startedAt : 0;
        this.post.triggerChromaticAberration(0.014, uiMotion.authHandoff);
        return started;
      }

      async beginAuthentication(initialMessage, options = {}) {
        if (this.operational) return;
        this.setStatus("正在確認作者授權印記");
        this.hud.showNotice("Firebase Auth 認證中");
        const authenticated = await this.authenticateBeforeCore(options);
        if (!authenticated) {
          this.openButton.disabled = false;
          if (this.overrideWindow.getAttribute("aria-hidden") === "false") {
            this.abortOverride();
          }
          return;
        }
        const linkStartDuration = this.triggerLinkStartHandoff();
        this.operational = true;
        this.setStatus(initialMessage);
        this.ritualStack.classList.remove("is-oauth");
        this.post.setHoverEnergy(0);
        this.runes.setSpeedScale(1);
        this.openButton.disabled = true;
        this.hud.showNotice(initialMessage);
        this.overrideWindowController.setLock(false);

        const ritualMessages = [
          "世界觀索引啟動中",
          "鑑定書庫開門中",
          "角色索引校準中",
          "草稿記憶同步中"
        ];

        let index = 0;
        const messageTimer = window.setInterval(() => {
          this.setStatus(ritualMessages[index % ritualMessages.length]);
          this.hud.showNotice(ritualMessages[index % ritualMessages.length]);
          index += 1;
        }, 900);

        if (prefersReducedMotion) {
          window.clearInterval(messageTimer);
          hideDialogSurface();
          document.body.classList.remove("login-modal-entering");
          document.body.classList.add("auth-handoff-collapsing");
          this.ritualStack.style.opacity = "0";
          this.ritualStack.style.display = "none";
          this.applyAuthenticationEnergy({ shock: 0.16, spiral: 0, op: 0.72, intensity: 0.9 });
          if (this.bootVeil) {
            this.bootVeil.style.display = "block";
            this.bootVeil.style.backgroundColor = "#ddccaa";
            this.bootVeil.style.opacity = "0.42";
          }
          window.setTimeout(() => {
            if (this.bootVeil) {
              this.bootVeil.style.opacity = "0";
              this.bootVeil.style.display = "none";
            }
            this.enterOperationalMode();
          }, 640);
          return;
        }

        const driver = { shock: 0, spiral: 0, op: 0, intensity: 1 };
        const collapseNodes = [
          { node: this.ritualStack, transformPrefix: "" },
          { node: this.overrideWindow, transformPrefix: "translate(-50%, -50%) " },
          { node: this.connectionWindow, transformPrefix: "translate(-50%, -50%) " }
        ].filter(({ node }) => node instanceof HTMLElement);
        const collapseMs = Math.round(uiMotion.collapse * 1000);
        let surfacesHidden = false;
        let veilShown = false;

        document.body.classList.remove("login-modal-entering");
        document.body.classList.add("auth-handoff-collapsing");
        if (linkStartDuration && this.ritualStack?.open && typeof this.ritualStack.close === "function") {
          this.ritualStack.close();
          this.ritualStack.style.display = "none";
        } else if (!linkStartDuration) {
          this.disintegrateAuthPanel(this.ritualStack);
        }
        this._authHandoffClock?.kill?.();
        this._authHandoffClock = runPhaseClock(Math.round(uiMotion.authHandoff * 1000), (progress, elapsed) => {
          const collapseT = ease.inPow2(phaseProgress(elapsed, 0, collapseMs));
          collapseNodes.forEach(({ node, transformPrefix }) => {
            node.style.opacity = String(lerp(1, 0, collapseT));
            node.style.transform = `${transformPrefix}scaleY(${lerp(1, 0.02, collapseT)})`;
            node.style.filter = `blur(${lerp(0, 12, collapseT)}px) brightness(${lerp(1, 2, collapseT)})`;
          });
          if (!surfacesHidden && elapsed >= collapseMs + 200) {
            surfacesHidden = true;
            collapseNodes.forEach(({ node }) => {
              node.style.display = "none";
              node.style.removeProperty("filter");
            });
          }

          const energyUp = phaseProgress(elapsed, 0, 2200);
          const energyDown = phaseProgress(elapsed, 2200, 2400);
          if (elapsed < 2200) {
            const charged = ease.inExpo(energyUp);
            driver.shock = charged;
            driver.spiral = charged;
            driver.op = 0;
            driver.intensity = lerp(1, 3.5, charged);
          } else {
            const settled = ease.outPow2(energyDown);
            driver.shock = lerp(1, 0, settled);
            driver.spiral = 1;
            driver.op = settled;
            driver.intensity = lerp(3.5, 0.82, settled);
          }
          this.applyAuthenticationEnergy(driver);

          if (this.shockwave) {
            const shockwaveT = phaseProgress(elapsed, 2200, 1800);
            this.shockwave.style.opacity = String(lerp(0.72, 0, ease.outPow2(shockwaveT)));
            this.shockwave.style.transform = `translate(-50%, -50%) scale(${lerp(0.18, 10, ease.outPow2(shockwaveT))})`;
          }
          if (this.bootVeil && elapsed >= 2200) {
            if (!veilShown) {
              veilShown = true;
              this.bootVeil.style.display = "block";
              this.bootVeil.style.backgroundColor = "#ddccaa";
              this.bootVeil.style.opacity = "0.62";
            }
            const veilT = phaseProgress(elapsed, 2260, 2340);
            this.bootVeil.style.backgroundColor = veilT > 0 ? "#020101" : "#ddccaa";
            this.bootVeil.style.opacity = String(lerp(0.62, 0, ease.outPow2(veilT)));
          }
        }, () => {
          this._authHandoffClock = null;
          window.clearInterval(messageTimer);
          this.enterOperationalMode();
        }, linkStartDuration ? this._authHandoffStartAt : 0);
      }

      disintegrateAuthPanel(panel) {
        if (!panel || prefersReducedMotion) return;
        const rect = panel.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(rect.width * dpr);
        canvas.height = Math.ceil(rect.height * dpr);
        canvas.style.cssText = [
          "position: fixed",
          `left: ${rect.left}px`,
          `top: ${rect.top}px`,
          `width: ${rect.width}px`,
          `height: ${rect.height}px`,
          "z-index: var(--z-modal-overlay)",
          "pointer-events: none",
          "mix-blend-mode: screen"
        ].join(";");
        document.body.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const compact = window.innerWidth <= 560;
        const cols = compact ? 20 : 28;
        const rows = compact ? 16 : 22;
        const cellW = rect.width / cols;
        const cellH = rect.height / rows;
        const colors = [
          "rgba(255,226,160,1)",
          "rgba(214,166,77,0.95)",
          "rgba(185,75,25,0.86)",
          "rgba(120,80,30,0.78)",
          "rgba(218,205,176,0.72)"
        ];
        const particles = [];

        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const edgeBias = Math.abs(x / (cols - 1) - 0.5) + Math.abs(y / (rows - 1) - 0.5);
            particles.push({
              x: x * cellW + cellW / 2,
              y: y * cellH + cellH / 2,
              vx: (Math.random() - 0.5) * (compact ? 5.8 : 8.8),
              vy: (Math.random() - 0.78) * (compact ? 4.8 : 7.2) - edgeBias * 1.6,
              alpha: 0.78 + Math.random() * 0.22,
              w: cellW * (0.66 + Math.random() * 0.34),
              h: cellH * (0.56 + Math.random() * 0.34),
              rot: (Math.random() - 0.5) * 0.8,
              vRot: (Math.random() - 0.5) * 0.18,
              color: colors[Math.floor(Math.random() * colors.length)]
            });
          }
        }

        panel.style.opacity = "0";
        let frame = 0;
        const animate = () => {
          ctx.clearRect(0, 0, rect.width, rect.height);
          let alive = false;
          for (const particle of particles) {
            if (particle.alpha <= 0) continue;
            alive = true;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += compact ? 0.14 : 0.18;
            particle.vx *= 0.985;
            particle.alpha -= compact ? 0.032 : 0.022;
            particle.w *= 0.985;
            particle.h *= 0.985;
            particle.rot += particle.vRot;

            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rot);
            ctx.globalAlpha = Math.max(0, particle.alpha);
            ctx.shadowColor = "rgba(255,226,160,0.6)";
            ctx.shadowBlur = compact ? 4 : 6;
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
            ctx.restore();
          }

          frame += 1;
          if (alive && frame < (compact ? 82 : 110)) {
            requestAnimationFrame(animate);
          } else {
            canvas.remove();
          }
        };
        requestAnimationFrame(animate);
      }

      applyAuthenticationEnergy(driver) {
        this.core.setShock(driver.shock);
        this.core.setIntensity(driver.intensity ?? 1);
        this.runes.setShock(driver.shock);
        this.particles.setShock(driver.shock);
        this.particles.setSpiral(driver.spiral);
        this.post.setShock(driver.shock);
        this.core.setOperational(driver.op);
        this.runes.setOperational(driver.op);
        this.particles.setOperational(driver.op);
      }

      decryptText(finalString) {
        const chars = "!<>-_\\/[]{}=+*^?#";
        const duration = 1100;
        const startedAt = performance.now();
        const reveal = (now) => {
          const progress = clamp((now - startedAt) / duration, 0, 1);
          const revealIndex = Math.floor(progress * (finalString.length + 1));
          let output = "";
          for (let i = 0; i < finalString.length; i++) {
            output += i < revealIndex ? finalString[i] : chars[Math.floor(Math.random() * chars.length)];
          }
          this.decryptTarget.textContent = output;
          if (progress < 1) {
            requestAnimationFrame(reveal);
          } else {
            this.decryptTarget.textContent = finalString;
          }
        };
        requestAnimationFrame(reveal);
      }

      enterOperationalMode() {
        this.operational = true;
        this._handoffArmed = true;
        hideDialogSurface();
        if (this.ritualStack?.open && typeof this.ritualStack.close === "function") {
          this.ritualStack.close();
        }
        document.body.classList.remove("login-modal-entering", "auth-handoff-collapsing");
        const logoutConfirmWindow = document.getElementById("logoutConfirmWindow");
        this.ritualStack.style.display = "none";
        this.overrideWindow.style.display = "none";
        this.connectionWindow.style.display = "none";
        if (logoutConfirmWindow) logoutConfirmWindow.style.display = "none";
        this.ritualStack.setAttribute("aria-hidden", "true");
        this.overrideWindow.setAttribute("aria-hidden", "true");
        this.connectionWindow.setAttribute("aria-hidden", "true");
        logoutConfirmWindow?.setAttribute("aria-hidden", "true");
        logoutConfirmWindow?.setAttribute("hidden", "");
        this.setOperationalDeckAvailability(true);
        document.body.classList.add("operational");
        document.body.classList.toggle("workbench-materializing", !prefersReducedMotion);
        this.operationalDeck.style.filter = "none";
        this.operationalDeck.style.setProperty("backdrop-filter", "var(--glass-filter-none)");
        this.operationalDeck.style.setProperty("-webkit-backdrop-filter", "var(--glass-filter-none)");
        this.core.setShock(0);
        this.core.setIntensity(0.82);
        this.runes.setShock(0);
        this.runes.setSpeedScale(1);
        this.particles.setShock(0);
        this.particles.setSpiral(0);
        this.post.setShock(0);
        this.core.setOperational(1);
        this.runes.setOperational(1);
        this.particles.setOperational(1);
        this.hud.cycleOperational();
        this.hud.showNotice("並列演算核心已待命");
        this.decryptText("APPRAISAL MODE ONLINE");
        const ensureWorkbenchVisible = () => {
          this.operationalDeck.style.removeProperty("opacity");
          this.operationalDeck.style.removeProperty("transform");
          this.operationalDeck.style.removeProperty("scale");
          this.operationalDeck.style.removeProperty("filter");
          this.operationalDeck.style.removeProperty("clip-path");
          document.body.classList.remove("workbench-materializing");
        };
        window.clearTimeout(this._workbenchRevealTimer);
        this._workbenchRevealTimer = window.setTimeout(ensureWorkbenchVisible, prefersReducedMotion ? 60 : Math.round(uiMotion.workbenchReveal * 1000));
        const sysStateHud = document.getElementById("sysStateHud");
        if (sysStateHud) {
          sysStateHud.innerHTML = "MULTILAYER BARRIER LIFTED<br />APPRAISAL ENGINE ONLINE<br />SYSTEM ID: SAGE-09";
        }

        this.leylineRain.style.opacity = "0.42";
        this.core.group.position.z = -1.5;
        this.core.group.scale.setScalar(0.82);
        this.runes.group.scale.setScalar(0.86);
        this.particles.group.scale.setScalar(0.9);
        if (!prefersReducedMotion) {
          window.setTimeout(() => {
            document.querySelectorAll(".tool-module").forEach((node) => node.classList.add("deploy-sweep"));
          }, 1220);
        }
      }

      renderAnalysisProgress(resultBox) {
        const progress = new AnalysisProgressController(resultBox);
        progress.mount();
        return progress;
      }

      scrollWorkbenchToDossier(delay = 0) {
        const target = document.getElementById("analysisDossier");
        const scroller = document.querySelector(".interface");
        if (!target || !scroller) return;
        window.setTimeout(() => {
          const scrollerRect = scroller.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const offset = mobileQuery.matches ? 20 : 72;
          const top = scroller.scrollTop + targetRect.top - scrollerRect.top - offset;
          scroller.scrollTo({
            top: Math.max(0, top),
            behavior: prefersReducedMotion ? "auto" : "smooth"
          });
        }, delay);
      }

      async runBusinessAnalysis() {
        if (this.analyzing) return;
        const draftField = document.getElementById("draftField");
        const resultBox = document.getElementById("analysisResult");
        const analyzeButton = document.querySelector('[data-op="analyze"]');
        const draft = draftField.value.trim();
        if (!draft) {
          this.setOperationalStatus("請先貼上需要校準的小說手稿", true);
          this.hud.showNotice("手稿尚未注入鑑定核心");
          this.triggerSmallPulse();
          draftField.focus();
          return;
        }
        if (draft.length > LIMITS.MAX_INPUT_CHARS) {
          this.setOperationalStatus(`手稿超過 ${LIMITS.MAX_INPUT_CHARS.toLocaleString("zh-TW")} 字，請縮短段落`, true);
          this.hud.showNotice("手稿超出核心承載上限");
          this.triggerSmallPulse();
          return;
        }

        this.analyzing = true;
        window.__FLG_HUD_STATE__ = buildHudState({
          draftText: draft,
          forbiddenHits: document.getElementById("spellList")?.childElementCount || 0,
          appCheckStatus: AppState.get("appCheckStatus") || "",
          quota: AppState.get("quotaInfo") || null,
          analyzing: true
        });
        analyzeButton?.classList.remove("is-success", "is-error");
        analyzeButton?.classList.add("is-loading");
        analyzeButton?.querySelector(".btn-loading")?.removeAttribute("hidden");
        analyzeButton?.setAttribute("disabled", "true");
        const reqId = AppState.get("currentReqId") + 1;
        AppState.set("currentReqId", reqId);
        const ctrl = new AbortController();
        const startedAt = Date.now();
        this.setOperationalStatus("正在解析手稿並建立鑑定卷宗");
        const progress = this.renderAnalysisProgress(resultBox);
        this.scrollWorkbenchToDossier(40);
        this.hud.showNotice("正在解析手稿");
        this.core.setIntensity(1.08);
        this.runes.setShock(0.16);
        this.particles.setSpiral(0.2);
        this.post.setHoverEnergy(0.36);
        this.post.triggerChromaticAberration(0.0052, 0.72);

        const timeout = window.setTimeout(() => ctrl.abort(), 180000);
        try {
          let lastRender = 0;
          const { result, fromCache } = await analyzeDraft(draft, ctrl.signal, reqId, (partial) => {
            if (reqId !== AppState.get("currentReqId")) return;
            const now = Date.now();
            if (now - lastRender < 520) return;
            lastRender = now;
            progress?.partial(partial || "");
            const note = null;
            if (note) {
              const received = (partial || "").length.toLocaleString("zh-TW");
              note.textContent = `奧術賢者核心正在接收重寫卷宗，已刻寫 ${received} 字。`;
            }
          });
          renderAnalysisResult(resultBox, result || "分析完成，但核心尚未回傳文字。");
          document.getElementById("reanalyzeButton")?.removeAttribute("hidden");
          progress?.complete();
          this.scrollWorkbenchToDossier(80);
          this.setOperationalStatus(fromCache ? "已讀取封存鑑定卷宗" : "魔導鑑定卷宗已完成");
          this.hud.showNotice(fromCache ? MSG.CACHE_HIT : "魔導鑑定卷宗已完成");
          flashButtonFeedback(analyzeButton, "success", 980);
          this.post.triggerChromaticAberration(0.006, 0.82);
          this.persistHistory({ draft, result, ts: startedAt });
          window.dispatchEvent(new CustomEvent("worldforge:analysis-complete", { detail: { fromCache } }));
        } catch (error) {
          const message = error?.name === "AbortError"
            ? MSG.TIMEOUT
            : (isApiError(error) ? (error?.userMessage || MSG.FETCH_FAIL) : MSG.FETCH_FAIL);
          if (!isApiError(error) && error?.message) {
            console.warn("[FLG] analysis request failed:", error.message);
          }
          renderAnalysisResult(resultBox, message);
          this.scrollWorkbenchToDossier(80);
          this.setOperationalStatus("鑑定中斷，請重試", true);
          this.hud.showNotice("鑑定中斷，請重試");
          flashButtonFeedback(analyzeButton, "error", 760);
          this.post.triggerChromaticAberration(0.009, 0.68);
        } finally {
          progress?.dispose();
          window.clearTimeout(timeout);
          this.analyzing = false;
          analyzeButton?.classList.remove("is-loading");
          analyzeButton?.querySelector(".btn-loading")?.setAttribute("hidden", "");
          analyzeButton?.removeAttribute("disabled");
          this.core.setIntensity(0.82);
          this.runes.setShock(0);
          this.particles.setSpiral(0);
          this.post.setHoverEnergy(0);
          window.__FLG_HUD_STATE__ = buildHudState({
            draftText: draft,
            forbiddenHits: document.getElementById("spellList")?.childElementCount || 0,
            appCheckStatus: AppState.get("appCheckStatus") || "",
            quota: AppState.get("quotaInfo") || null,
            analyzing: false
          });
        }
      }

      async persistHistory(item) {
        const user = AppState.get("currentUser");
        const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        const safeItem = {
          id,
          ts: item.ts,
          draft: item.draft.slice(0, 8192),
          result: item.result.slice(0, 81920),
          preview: item.draft.replace(/\s+/g, " ").slice(0, 86)
        };
        try {
          const key = `${UI_CONFIG.STORAGE_KEY}_${user?.uid || "guest"}`;
          const saved = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify([safeItem, ...saved].slice(0, 30)));
        } catch (error) {
          console.warn("Worldforge local history skipped:", error);
        }
        if (firebaseRuntime.db && user) {
          try {
            await firebaseRuntime.db.collection("users").doc(user.uid).collection("history").doc(id).set(safeItem);
          } catch (error) {
            console.warn("Worldforge Firestore history skipped:", error);
          }
        }
        window.dispatchEvent(new CustomEvent("worldforge:history-updated", { detail: { item: safeItem } }));
      }

      triggerSmallPulse() {
        this.post.triggerChromaticAberration(0.0062, 0.54);
        this._smallPulseClock?.kill?.();
        const applyShock = (shock) => {
          this.core.setShock(shock);
          this.runes.setShock(shock);
          this.particles.setShock(shock);
          this.post.setShock(shock);
        };
        this._smallPulseClock = runPhaseClock(prefersReducedMotion ? 0 : 1120, (progress, elapsed) => {
          const rise = phaseProgress(elapsed, 0, 220);
          const fall = phaseProgress(elapsed, 220, 900);
          const shock = elapsed < 220
            ? lerp(0, 0.32, ease.outPow2(rise))
            : lerp(0.32, 0, ease.outPow2(fall));
          applyShock(shock);
        }, () => {
          applyShock(0);
          this._smallPulseClock = null;
        });
      }
    }

    class AnimationTimeline {
      constructor(core, runes, particles, hud) {
        this.core = core;
        this.runes = runes;
        this.particles = particles;
        this.hud = hud;
        this.timeline = null;
        this.forceTimer = 0;
        this.modalEnterTimer = 0;
        this.modalStabilizeTimer = 0;
      }

      markLoginModalEntering() {
        if (prefersReducedMotion) return;
        document.body.classList.remove("auth-handoff-collapsing");
        document.body.classList.remove("login-modal-entering");
        const authPanel = document.getElementById("authPanel");
        if (authPanel instanceof HTMLElement) {
          authPanel.style.animation = "";
          authPanel.style.opacity = "1";
          authPanel.style.transform = "none";
          authPanel.style.filter = "none";
        }
        void document.body.offsetWidth;
        document.body.classList.add("login-modal-entering");
        this.playAuthPanelMaterialize(authPanel);
        window.clearTimeout(this.modalEnterTimer);
        window.clearTimeout(this.modalStabilizeTimer);
        this.modalEnterTimer = window.setTimeout(() => {
          document.body.classList.remove("login-modal-entering");
        }, uiMotion.mobileEnterClass);
        this.modalStabilizeTimer = window.setTimeout(() => this.stabilizeAuthPanel(), uiMotion.mobileEnterClass + 120);
      }

      playAuthPanelMaterialize(authPanel) {
        if (!(authPanel instanceof HTMLElement) || prefersReducedMotion) return;
        authPanel.getAnimations().forEach((animation) => animation.cancel());
        authPanel.animate([
          {
            opacity: 0.18,
            clipPath: "polygon(48% 47%, 52% 47%, 52% 53%, 48% 53%)",
            transform: "perspective(900px) scaleX(0.08) scaleY(0.035) rotateX(10deg)",
            filter: "blur(16px) brightness(2.75) saturate(0.62)"
          },
          {
            opacity: 1,
            clipPath: "polygon(18% 45%, 82% 45%, 82% 55%, 18% 55%)",
            transform: "perspective(900px) scaleX(0.58) scaleY(0.06) rotateX(8deg)",
            filter: "blur(8px) brightness(2.36) saturate(0.78)",
            offset: 0.08
          },
          {
            opacity: 1,
            clipPath: "polygon(0 41%, 100% 41%, 100% 59%, 0 59%)",
            transform: "perspective(900px) scaleX(1.02) scaleY(0.1) rotateX(5deg)",
            filter: "blur(4px) brightness(1.9) saturate(0.92)",
            offset: 0.2
          },
          {
            opacity: 1,
            clipPath: "polygon(0 18%, 100% 18%, 100% 82%, 0 82%)",
            transform: "perspective(900px) scaleX(1) scaleY(0.46) rotateX(3deg)",
            filter: "blur(2px) brightness(1.48) saturate(1)",
            offset: 0.42
          },
          {
            opacity: 1,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            transform: "perspective(900px) scaleX(1) scaleY(1.08) rotateX(-1deg)",
            filter: "blur(1px) brightness(1.2) saturate(1.05)",
            offset: 0.72
          },
          {
            opacity: 1,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            transform: "perspective(900px) scaleX(1) scaleY(0.98) rotateX(0deg)",
            filter: "blur(0) brightness(1.05) saturate(1.02)",
            offset: 0.88
          },
          {
            opacity: 1,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            transform: "perspective(900px) rotateX(0deg) scaleX(1) scaleY(1)",
            filter: "blur(0) brightness(1)"
          }
        ], {
          duration: Math.round(uiMotion.loginPanel * 1000),
          easing: "cubic-bezier(0.18, 0.92, 0.2, 1)",
          fill: "none"
        });

        const contentNodes = [
          authPanel.querySelector(".auth-header"),
          authPanel.querySelector(".seal-strip"),
          authPanel.querySelector("#authTitle"),
          authPanel.querySelector("#authPrompt"),
          authPanel.querySelector(".auth-actions")
        ];
        contentNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          node.animate([
            { opacity: 0, transform: "translateY(10px)", filter: "blur(4px)" },
            { opacity: 1, transform: "translateY(0)", filter: "blur(0)" }
          ], {
            duration: 360,
            delay: 160,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards"
          });
        });
      }

      stabilizeAuthPanel() {
        const ritualStack = document.getElementById("ritualStack");
        const authPanel = document.getElementById("authPanel");
        if (!ritualStack?.open || !(authPanel instanceof HTMLElement)) return;
        authPanel.style.animation = "none";
        authPanel.style.opacity = "1";
        authPanel.style.transform = "none";
        authPanel.style.filter = "none";
        window.setTimeout(() => {
          authPanel.style.removeProperty("animation");
        }, 120);
      }

      start() {
        const reveal = { wake: 0.05, intensity: 0.05 };
        this.applyWake(reveal.wake);
        this.core.setIntensity(reveal.intensity);
        if (prefersReducedMotion) {
          this.forceBootComplete();
          return;
        }
        this.forceTimer = window.setTimeout(() => this.forceBootComplete(), 4200);
        document.querySelectorAll(".top-hud").forEach((node) => {
          node.style.opacity = "0";
          node.style.transform = "translateY(0)";
        });
        document.querySelectorAll("#connectionWindow, #overrideWindow, #logoutConfirmWindow").forEach((node) => {
          node.style.display = "none";
          node.style.opacity = "0";
          node.style.transform = "translate(-50%, -50%) scaleX(0) scaleY(0.02)";
          node.style.transformOrigin = "center center";
        });
        const ritualStack = document.getElementById("ritualStack");
        if (ritualStack) {
          ritualStack.style.opacity = "0";
          ritualStack.style.transform = "";
        }
        const bootSequence = document.querySelector(".boot-sequence");
        if (bootSequence) {
          bootSequence.style.opacity = "0";
          bootSequence.style.transform = "translateY(10px) scale(0.94)";
        }
        const bootVeil = document.getElementById("bootVeil");
        if (bootVeil) {
          bootVeil.style.opacity = "1";
          bootVeil.style.display = "grid";
        }
        let dialogShown = false;
        this.timeline = runPhaseClock(2020, (progress, elapsed) => {
          const bootIn = ease.outPow2(phaseProgress(elapsed, 0, 400));
          const bootOut = phaseProgress(elapsed, 1180, 360);
          const wake = ease.inOutSine(phaseProgress(elapsed, 200, 1650));
          reveal.wake = lerp(0.05, 1, wake);
          reveal.intensity = lerp(0.05, loginIdleIntensity(), wake);
          this.applyWake(reveal.wake);
          this.core.setIntensity(reveal.intensity);
          if (bootSequence) {
            const bootOpacity = elapsed < 1180 ? bootIn : lerp(1, 0, ease.outPow2(bootOut));
            const bootScale = elapsed < 1180 ? lerp(0.94, 1, bootIn) : lerp(1, 0.96, ease.outPow2(bootOut));
            const bootY = elapsed < 1180 ? lerp(10, 0, bootIn) : lerp(0, -8, ease.outPow2(bootOut));
            bootSequence.style.opacity = String(bootOpacity);
            bootSequence.style.transform = `translateY(${bootY}px) scale(${bootScale})`;
          }
          if (bootVeil) {
            const veilOut = phaseProgress(elapsed, 1340, 620);
            bootVeil.style.opacity = String(lerp(1, 0, ease.outPow2(veilOut)));
          }
          const hudIn = ease.outPow2(phaseProgress(elapsed, 1340, 520));
          document.querySelectorAll(".top-hud").forEach((node) => {
            node.style.opacity = String(hudIn);
            node.style.transform = `translateY(${lerp(8, 0, hudIn)}px)`;
          });
          if (!dialogShown && elapsed >= 1640) {
            dialogShown = true;
            const dlg = document.getElementById("ritualStack");
            if (dlg) {
              dlg.style.display = "";
            }
            if (dlg?.showModal && !dlg.open) {
              dlg.showModal();
            } else if (dlg && !dlg.open) {
              dlg.setAttribute("open", "");
            }
            if (dlg) {
              dlg.style.opacity = "1";
              dlg.style.transform = "";
              showDialogSurface(dlg);
              window.__FLG_SAO_AUDIO__?.playOpenChime();
            }
            this.markLoginModalEntering();
          }
        }, () => {
          this.timeline = null;
          window.clearTimeout(this.forceTimer);
          document.body.classList.remove("is-booting");
          document.body.classList.add("boot-complete");
          this.hud.startNoticeLoop();
          const completedBootVeil = document.getElementById("bootVeil");
          if (completedBootVeil) completedBootVeil.style.display = "none";
        });
      }

      forceBootComplete() {
        window.clearTimeout(this.forceTimer);
        if (this.timeline) {
          this.timeline.kill();
          this.timeline = null;
        }
        if (!document.body.classList.contains("is-booting")) return;
        this.core.setWake(1);
        this.core.setIntensity(loginIdleIntensity());
        this.runes.setWake(1);
        this.particles.setWake(1);
        const bootVeil = document.getElementById("bootVeil");
        const ritualStack = document.getElementById("ritualStack");
        if (bootVeil) {
          bootVeil.style.opacity = "0";
          bootVeil.style.display = "none";
        }
        document.querySelectorAll(".top-hud").forEach((node) => {
          node.style.opacity = "1";
        });
        if (ritualStack) {
          ritualStack.style.display = "";
          if (ritualStack.showModal && !ritualStack.open) {
            ritualStack.showModal();
          } else if (!ritualStack.open) {
            ritualStack.setAttribute("open", "");
          }
          ritualStack.style.opacity = "1";
          ritualStack.style.scale = "";
          ritualStack.style.transform = "";
          showDialogSurface(ritualStack);
          window.__FLG_SAO_AUDIO__?.playOpenChime();
        }
        document.body.classList.remove("is-booting");
        document.body.classList.add("boot-complete");
        this.markLoginModalEntering();
        this.hud.startNoticeLoop();
      }

      applyWake(value) {
        this.core.setWake(value);
        this.runes.setWake(value);
        this.particles.setWake(value);
      }
    }

    class OperationalModeController {
      constructor(loginController, hud) {
        this.loginController = loginController;
        this.hud = hud;
        this.draftField = document.getElementById("draftField");
        this.resultBox = document.getElementById("analysisResult");
        this.status = document.getElementById("operationalStatus");
        this.sessionBadge = document.getElementById("sessionBadge");
        this.sessionSyncState = document.getElementById("sessionSyncState");
        this.accountToggle = document.getElementById("accountToggle");
        this.accountMenu = document.getElementById("accountMenu");
        this.accountAvatar = document.getElementById("accountAvatar");
        this.accountAvatarText = document.getElementById("accountAvatarText");
        this.accountAvatarImg = document.getElementById("accountAvatarImg");
        this.historyToggle = document.getElementById("historyToggle");
        this.historyClose = document.getElementById("historyClose");
        this.historyClear = document.getElementById("historyClear");
        this.historyDrawer = document.getElementById("historyDrawer");
        this.historyList = document.getElementById("historyList");
        this.logoutButton = document.getElementById("logoutButton");
        this.logoutConfirmWindow = document.getElementById("logoutConfirmWindow");
        this.cancelLogoutButton = document.getElementById("cancelLogoutBtn");
        this.confirmLogoutButton = document.getElementById("confirmLogoutBtn");
        this.logoutConfirmController = new SaoWindowController({ lockDocument: true });
        this.copyButton = document.getElementById("copyAllButton");
        this.reanalyzeButton = document.getElementById("reanalyzeButton");
        this.clearDraftButton = document.getElementById("clearDraftButton");
        this.navActions = document.querySelector(".workbench-nav-actions");
        this.ensureSystemMenu();
        this.systemMenuToggle = document.getElementById("systemMenuToggle");
        this.systemMenuPanel = document.getElementById("systemMenuPanel");
        this.charCount = document.getElementById("charCount");
        this.spellWarn = document.getElementById("spellWarn");
        this.spellList = document.getElementById("spellList");
        this.historyItems = [];
        this.activeHistoryId = "";
        this.draftSaveTimer = 0;
        this.spellScanTimer = 0;
        this.historyClearTimer = 0;
        this.pendingHistoryDeleteId = "";
        this.quotaRefreshTimer = 0;
        this.forbiddenWords = [];
        this.bindDraftMemory();
        this.bindControls();
        this.restoreDraft();
        this.updateDraftDiagnostics();
        this.loadForbiddenWords();
        this.refreshSessionBadge();
        this.refreshHistory(false);
        this.syncHudState();

        window.addEventListener("worldforge:auth-changed", () => {
          this.refreshSessionBadge();
          this.restoreDraft();
          this.refreshHistory(false);
          this.refreshQuota();
        });
        window.addEventListener("worldforge:history-updated", () => this.refreshHistory(false));
        window.addEventListener("worldforge:analysis-complete", () => this.refreshQuota());
      }

      sessionId() {
        const user = AppState.get("currentUser");
        return user?.uid || "guest";
      }

      draftKey() {
        return `${UI_CONFIG.DRAFT_KEY}_${this.sessionId()}`;
      }

      historyKey() {
        return `${UI_CONFIG.STORAGE_KEY}_${this.sessionId()}`;
      }

      setStatus(text, isError = false) {
        setLiveStatus(this.status, text, { error: isError });
      }

      formatTime(ts) {
        try {
          return new Intl.DateTimeFormat("zh-TW", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(ts || Date.now()));
        } catch (error) {
          return "封存時間未知";
        }
      }

      ensureSystemMenu() {
        if (!(this.navActions instanceof HTMLElement)) return;
        let toggle = document.getElementById("systemMenuToggle");
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
          const symbol = document.createElement("span");
          symbol.className = "sao-btn-symbol";
          symbol.setAttribute("aria-hidden", "true");
          symbol.textContent = "SYS";
          const label = document.createElement("span");
          label.className = "sao-btn-label";
          label.textContent = "工作區選單";
          toggle.append(symbol, label);
        }
        this.navActions.replaceChildren(toggle);

        let panel = document.getElementById("systemMenuPanel");
        if (!panel) {
          panel = document.createElement("div");
          panel.className = "sao-system-menu";
          panel.id = "systemMenuPanel";
          panel.setAttribute("role", "menu");
          panel.setAttribute("aria-label", "SAO system menu");
          panel.hidden = true;
          this.navActions.after(panel);
        }
        [this.historyToggle, this.accountToggle, this.clearDraftButton, this.reanalyzeButton, this.logoutButton]
          .filter((button) => button instanceof HTMLElement)
          .forEach((button) => {
            button.classList.add("system-menu-item");
            button.setAttribute("role", "menuitem");
            panel.appendChild(button);
          });
        hydrateSaoButton(toggle);
        hydrateAllSaoButtons(panel);
      }

      cancelPanelClose(panel) {
        if (!(panel instanceof HTMLElement)) return;
        window.clearTimeout(panel.__saoCloseTimer);
        panel.__saoCloseToken = (panel.__saoCloseToken || 0) + 1;
        panel.classList.remove("is-closing");
      }

      closePanel(panel, duration = 2200) {
        if (!(panel instanceof HTMLElement) || panel.hidden) return;
        this.cancelPanelClose(panel);
        panel.getAnimations().forEach((animation) => animation.cancel());
        const closeToken = (panel.__saoCloseToken || 0) + 1;
        panel.__saoCloseToken = closeToken;
        const finishClose = () => {
          if (panel.__saoCloseToken !== closeToken) return;
          window.clearTimeout(panel.__saoCloseTimer);
          panel.hidden = true;
          panel.classList.remove("is-closing");
        };
        if (prefersReducedMotion) {
          finishClose();
          return;
        }
        panel.classList.add("is-closing");
        requestAnimationFrame(() => {
          if (panel.__saoCloseToken !== closeToken) return;
          const animations = panel.getAnimations().filter((animation) => animation.playState !== "finished");
          if (animations.length) {
            Promise.allSettled(animations.map((animation) => animation.finished)).then(finishClose);
          } else {
            finishClose();
          }
        });
        panel.__saoCloseTimer = window.setTimeout(finishClose, duration + 160);
      }

      bindControls() {
        this.systemMenuToggle?.addEventListener("click", () => this.toggleSystemMenu());
        this.historyToggle?.addEventListener("click", () => {
          this.toggleHistory();
          this.toggleAccount(false);
          this.toggleSystemMenu(false);
        });
        this.accountToggle?.addEventListener("click", () => {
          this.toggleAccount();
          this.toggleHistory(false);
          this.toggleSystemMenu(false);
        });
        this.historyClose?.addEventListener("click", () => this.toggleHistory(false));
        this.historyClear?.addEventListener("click", () => this.clearHistory());
        this.logoutButton?.addEventListener("click", () => this.openLogoutConfirm());
        this.cancelLogoutButton?.addEventListener("click", () => this.closeLogoutConfirm());
        this.confirmLogoutButton?.addEventListener("click", () => this.logout());
        this.copyButton?.addEventListener("click", () => this.copyDossier());
        this.reanalyzeButton?.addEventListener("click", () => {
          this.toggleSystemMenu(false);
          this.loginController.runBusinessAnalysis();
        });
        this.clearDraftButton?.addEventListener("click", () => {
          this.toggleSystemMenu(false);
          this.clearDraft();
        });
        this.resultBox?.addEventListener("click", (event) => {
          const button = event.target instanceof Element ? event.target.closest("[data-copy-section]") : null;
          if (button instanceof HTMLElement) this.copyResultSection(button.dataset.copySection || "all", button);
        });
        document.addEventListener("pointerdown", (event) => this.handleOutsidePointer(event));
      }

      handleOutsidePointer(event) {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (this.systemMenuPanel && !this.systemMenuPanel.hidden) {
          const insideSystem = this.systemMenuPanel.contains(target) || this.systemMenuToggle?.contains(target);
          if (!insideSystem) this.toggleSystemMenu(false);
        }
        if (this.historyDrawer && !this.historyDrawer.hidden) {
          const insideHistory = this.historyDrawer.contains(target) || this.historyToggle?.contains(target);
          if (!insideHistory) this.toggleHistory(false);
        }
        if (this.accountMenu && !this.accountMenu.hidden) {
          const insideAccount = this.accountMenu.contains(target) || this.accountToggle?.contains(target);
          if (!insideAccount) this.toggleAccount(false);
        }
      }

      toggleSystemMenu(force) {
        if (!this.systemMenuPanel) return;
        const shouldOpen = typeof force === "boolean" ? force : this.systemMenuPanel.hidden;
        this.systemMenuToggle?.setAttribute("aria-expanded", String(shouldOpen));
        if (shouldOpen) {
          this.cancelPanelClose(this.systemMenuPanel);
          this.systemMenuPanel.hidden = false;
          this.playPanelOpen(this.systemMenuPanel, "system");
        } else {
          this.closePanel(this.systemMenuPanel, 2200);
        }
      }

      toggleAccount(force) {
        if (!this.accountMenu) return;
        const shouldOpen = typeof force === "boolean" ? force : this.accountMenu.hidden;
        this.accountToggle?.setAttribute("aria-expanded", String(shouldOpen));
        this.accountToggle?.setAttribute("aria-label", shouldOpen ? "關閉帳號中樞" : "開啟帳號中樞");
        if (shouldOpen) {
          this.cancelPanelClose(this.accountMenu);
          this.accountMenu.hidden = false;
          this.playPanelOpen(this.accountMenu, "menu");
        } else {
          this.closePanel(this.accountMenu, 2200);
        }
      }

      playPanelOpen(panel, type = "menu") {
        if (!(panel instanceof HTMLElement) || prefersReducedMotion) return;
        panel.getAnimations().forEach((animation) => animation.cancel());
        const isDrawer = type === "drawer";
        const isSystem = type === "system";
        const isMobilePanel = mobileQuery.matches;
        const fixedCenter = !mobileQuery.matches && (panel.classList.contains("account-menu") || panel.classList.contains("history-drawer"));
        const baseTransform = fixedCenter ? "translate(-50%, -50%) " : "";
        panel.animate([
          {
            opacity: 0,
            clipPath: "polygon(50% 49%, 50% 49%, 50% 51%, 50% 51%)",
            transform: `${baseTransform}scaleX(0.02) scaleY(0.02) translateY(-10px)`,
            filter: "blur(8px) brightness(1.72)"
          },
          {
            opacity: 1,
            clipPath: "polygon(18% 46%, 82% 46%, 82% 54%, 18% 54%)",
            transform: `${baseTransform}scaleX(0.72) scaleY(0.06) translateY(-3px)`,
            filter: "blur(5px) brightness(1.56)",
            offset: 0.18
          },
          {
            opacity: 1,
            clipPath: "polygon(0 38%, 100% 38%, 100% 62%, 0 62%)",
            transform: `${baseTransform}scaleX(1) scaleY(0.18) translateY(-1px)`,
            filter: "blur(3px) brightness(1.3)",
            offset: 0.34
          },
          {
            opacity: 1,
            clipPath: "polygon(0 0, 100% 0, 100% 84%, 0 84%)",
            transform: `${baseTransform}scaleX(1) scaleY(${isMobilePanel ? "1" : "1.045"}) translateY(${isMobilePanel ? "0" : "2px"})`,
            filter: "blur(1px) brightness(1.1)",
            offset: 0.64
          },
          {
            opacity: 1,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            transform: `${baseTransform}scaleX(1) scaleY(1) translateY(0)`,
            filter: "blur(0) brightness(1)"
          }
        ], {
          duration: isSystem ? 760 : isDrawer ? 720 : 680,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "none"
        });
      }

      openLogoutConfirm() {
        if (!this.logoutConfirmWindow) return;
        this.toggleSystemMenu(false);
        this.toggleAccount(false);
        this.setStatus("請確認是否封存草稿並結束本次工作階段");
        this.hud.showNotice("登出確認視窗已開啟");
        this.logoutConfirmController.open(this.logoutConfirmWindow);
      }

      closeLogoutConfirm() {
        if (!this.logoutConfirmWindow) return;
        this.logoutConfirmController.close(this.logoutConfirmWindow);
        this.setStatus("已取消登出，工作階段維持啟用");
        this.hud.showNotice("已返回鑑定核心");
      }

      setSyncState(text) {
        setLiveStatus(this.sessionSyncState, text);
      }

      syncHudState({ analyzing = false } = {}) {
        const quota = AppState.get("quotaInfo") || null;
        window.__FLG_HUD_STATE__ = buildHudState({
          draftText: this.draftField?.value || "",
          forbiddenHits: this.spellList?.childElementCount || 0,
          appCheckStatus: AppState.get("appCheckStatus") || "",
          quota,
          analyzing
        });
      }

      async refreshQuota() {
        window.clearTimeout(this.quotaRefreshTimer);
        const quota = await fetchQuota();
        AppState.set("quotaInfo", quota);
        this.syncHudState({ analyzing: this.loginController?.analyzing || false });
      }

      async copyPlainText(text) {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        const node = document.createElement("textarea");
        node.value = text;
        node.setAttribute("readonly", "");
        node.style.position = "fixed";
        node.style.left = "-9999px";
        document.body.appendChild(node);
        node.select();
        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (error) {
          ok = false;
        }
        node.remove();
        return ok;
      }

      async copyDossier() {
        const text = this.resultBox?.innerText?.trim() || this.resultBox?.textContent?.trim() || "";
        if (!text || text.includes("鑑定卷宗尚未展開")) {
          this.hud.showNotice("尚無可複製的鑑定卷宗");
          return;
        }
        try {
          const ok = await this.copyPlainText(text);
          if (!ok) throw new Error("clipboard-failed");
          const original = getButtonLabel(this.copyButton, "複製鑑定卷宗");
          setButtonLabel(this.copyButton, "已複製");
          flashButtonFeedback(this.copyButton, "success", 980);
          this.setStatus("鑑定卷宗已寫入剪貼簿");
          this.hud.showNotice("鑑定卷宗已複製");
          window.setTimeout(() => {
            setButtonLabel(this.copyButton, original);
          }, 1600);
        } catch (error) {
          flashButtonFeedback(this.copyButton, "error", 760);
          this.setStatus("剪貼簿寫入失敗，請手動選取卷宗", true);
          this.hud.showNotice("剪貼簿寫入失敗");
        }
      }

      async loadForbiddenWords() {
        if (!this.spellWarn || !this.spellList) return;
        try {
          const res = await fetch("/forbidden-words.json?v=3", { cache: "force-cache" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const words = await res.json();
          this.forbiddenWords = Array.isArray(words)
            ? words.filter((item) => item?.term).map((item) => ({
              term: String(item.term),
              replace: item.replace ? String(item.replace) : ""
            }))
            : [];
          this.runSpellScan();
        } catch (error) {
          this.spellWarn.textContent = "語彙守門離線";
        }
      }

      updateDraftDiagnostics() {
        const text = this.draftField?.value || "";
        const len = text.length;
        if (this.charCount) {
          this.charCount.textContent = `${len.toLocaleString("zh-TW")} / ${LIMITS.MAX_INPUT_CHARS.toLocaleString("zh-TW")}`;
          this.charCount.classList.toggle("warn", len > LIMITS.MAX_INPUT_CHARS * 0.85 && len <= LIMITS.MAX_INPUT_CHARS);
          this.charCount.classList.toggle("over", len > LIMITS.MAX_INPUT_CHARS);
        }
        this.scheduleSpellScan();
        this.syncHudState();
      }

      scheduleSpellScan() {
        window.clearTimeout(this.spellScanTimer);
        this.spellScanTimer = window.setTimeout(() => this.runSpellScan(), 180);
      }

      runSpellScan() {
        if (!this.spellWarn || !this.spellList) return;
        const text = this.draftField?.value || "";
        this.spellList.replaceChildren();
        this.spellWarn.classList.remove("is-hot");
        if (!text.trim()) {
          this.spellWarn.textContent = "語彙守門待命中";
          this.syncHudState();
          return;
        }
        if (!this.forbiddenWords.length) {
          this.spellWarn.textContent = "語彙守門載入中";
          this.syncHudState();
          return;
        }
        const hits = [];
        for (const item of this.forbiddenWords) {
          if (text.includes(item.term)) hits.push(item);
          if (hits.length >= 8) break;
        }
        if (!hits.length) {
          this.spellWarn.textContent = "西幻語彙未見警示";
          this.syncHudState();
          return;
        }
        this.spellWarn.textContent = `${hits.length} 處語彙警示`;
        this.spellWarn.classList.add("is-hot");
        const fragment = document.createDocumentFragment();
        hits.forEach((item) => {
          const chip = document.createElement("span");
          chip.textContent = item.replace ? `${item.term} → ${item.replace}` : item.term;
          fragment.appendChild(chip);
        });
        this.spellList.appendChild(fragment);
        this.syncHudState();
      }

      refreshSessionBadge() {
        const user = AppState.get("currentUser");
        const label = user?.displayName || user?.email || (firebaseRuntime.guest ? "訪客抄寫員" : "編修核心");
        if (this.sessionBadge) this.sessionBadge.textContent = label;
        if (this.accountAvatarText) this.accountAvatarText.textContent = label.trim().slice(0, 1).toUpperCase() || "編";
        if (this.accountAvatarImg && this.accountAvatar) {
          if (user?.photoURL) {
            this.accountAvatarImg.src = user.photoURL;
            this.accountAvatar.classList.add("has-photo");
          } else {
            this.accountAvatarImg.removeAttribute("src");
            this.accountAvatar.classList.remove("has-photo");
          }
        }
        const syncLabel = firebaseRuntime.guest ? "訪客本機同步" : (user ? "雲端草稿同步" : "草稿記憶待命中");
        this.setSyncState(syncLabel);
      }

      bindDraftMemory() {
        this.draftField.addEventListener("input", () => {
          this.setStatus("草稿已更新，等待同步");
          this.setSyncState("草稿記憶同步中");
          this.loginController.syncProgress = clamp(this.draftField.value.length / 500, 0, 1);
          this.updateDraftDiagnostics();
          window.clearTimeout(this.draftSaveTimer);
          this.draftSaveTimer = window.setTimeout(() => this.saveDraft(), UI_CONFIG.DRAFT_DEBOUNCE_MS);
        });
      }

      saveDraft() {
        try {
          localStorage.setItem(this.draftKey(), this.draftField.value || "");
          this.setSyncState(firebaseRuntime.guest ? "訪客本機已同步" : "草稿記憶已同步");
          this.syncHudState();
        } catch (error) {
          console.warn("Worldforge draft memory skipped:", error);
          this.setSyncState("草稿記憶同步受阻");
        }
      }

      restoreDraft() {
        try {
          const saved = localStorage.getItem(this.draftKey());
          if (saved && !this.draftField.value) {
            this.draftField.value = saved;
            this.loginController.syncProgress = clamp(saved.length / 500, 0, 1);
          }
          this.setSyncState(saved ? "草稿記憶已同步" : "草稿記憶待命中");
          this.updateDraftDiagnostics();
          this.syncHudState();
        } catch (error) {
          console.warn("Worldforge draft restore skipped:", error);
          this.setSyncState("草稿記憶同步受阻");
        }
      }

      toggleHistory(force) {
        if (!this.historyDrawer) return;
        const shouldOpen = typeof force === "boolean" ? force : this.historyDrawer.hidden;
        this.historyToggle?.setAttribute("aria-expanded", String(shouldOpen));
        this.historyToggle?.setAttribute("aria-label", shouldOpen ? "關閉鑑定紀錄" : "開啟鑑定紀錄");
        if (shouldOpen) {
          this.cancelPanelClose(this.historyDrawer);
          this.historyDrawer.hidden = false;
          this.playPanelOpen(this.historyDrawer, "drawer");
          this.refreshHistory(true);
          this.hud.showNotice("鑑定紀錄面板已展開");
        } else {
          this.closePanel(this.historyDrawer, 2200);
          this.pendingHistoryDeleteId = "";
          this.renderHistory();
        }
      }

      async refreshHistory(showStatus = true) {
        if (!this.historyList) return;
        let items = [];
        try {
          items = JSON.parse(localStorage.getItem(this.historyKey()) || "[]");
        } catch (error) {
          items = [];
        }
        this.historyItems = Array.isArray(items) ? items.slice(0, LIMITS.MAX_HISTORY) : [];
        this.renderHistory();

        const user = AppState.get("currentUser");
        if (firebaseRuntime.db && user) {
          try {
            const snap = await firebaseRuntime.db
              .collection("users")
              .doc(user.uid)
              .collection("history")
              .orderBy("ts", "desc")
              .limit(LIMITS.MAX_HISTORY)
              .get();
            this.historyItems = snap.docs.map((doc) => doc.data());
            localStorage.setItem(this.historyKey(), JSON.stringify(this.historyItems));
            this.renderHistory();
          } catch (error) {
            if (showStatus) this.hud.showNotice("鑑定紀錄同步受阻，已顯示本機封存");
          }
        }
      }

      renderHistory() {
        if (!this.historyList) return;
        this.historyList.replaceChildren();
        if (!this.historyItems.length) {
          this.activeHistoryId = "";
          const empty = document.createElement("p");
          empty.className = "history-empty";
          empty.textContent = "尚無鑑定紀錄。完成一次分析後，系統會自動封存於此。";
          this.historyList.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        if (this.activeHistoryId && !this.historyItems.some((entry) => entry.id === this.activeHistoryId)) {
          this.activeHistoryId = "";
        }
        this.historyItems.forEach((item) => {
          const row = document.createElement("div");
          row.className = "history-entry";

          const button = document.createElement("button");
          button.type = "button";
          button.className = "history-item sao-btn";
          button.dataset.id = item.id;
          button.dataset.saoLabel = "鑑定紀錄";
          button.dataset.saoTag = "ARC";
          if (item.id === this.activeHistoryId) {
            button.classList.add("is-active");
            button.setAttribute("aria-current", "true");
          }

          const time = document.createElement("span");
          time.className = "history-time";
          time.textContent = this.formatTime(item.ts);

          const preview = document.createElement("span");
          preview.className = "history-preview";
          preview.textContent = item.preview || item.draft?.replace(/\s+/g, " ").slice(0, 86) || "未命名手稿";

          const sigil = createButtonGlyph("卷");
          sigil.classList.add("history-entry-sigil");

          button.append(sigil, time, preview);
          button.addEventListener("click", () => this.loadHistoryItem(item.id));

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "history-delete sao-btn is-danger";
          deleteButton.classList.toggle("is-confirming", this.pendingHistoryDeleteId === item.id);
          setButtonGlyph(deleteButton, this.pendingHistoryDeleteId === item.id ? "!" : "×", this.pendingHistoryDeleteId === item.id ? "確定" : "刪");
          deleteButton.setAttribute("aria-label", this.pendingHistoryDeleteId === item.id ? "再次確認刪除此筆鑑定紀錄" : "刪除此筆鑑定紀錄");
          deleteButton.addEventListener("click", () => this.deleteHistoryItem(item.id));

          row.append(button, deleteButton);
          fragment.appendChild(row);
        });
        this.historyList.appendChild(fragment);
        hydrateAllSaoButtons(this.historyList);
      }

      loadHistoryItem(id) {
        const item = this.historyItems.find((entry) => entry.id === id);
        if (!item) return;
        this.activeHistoryId = id;
        this.renderHistory();
        this.draftField.value = item.draft || "";
        renderAnalysisResult(this.resultBox, item.result || "此卷宗沒有保存鑑定結果。");
        this.saveDraft();
        this.updateDraftDiagnostics();
        this.setStatus("鑑定紀錄已載入");
        this.hud.showNotice("鑑定紀錄已載入");
        this.loginController.syncProgress = clamp(this.draftField.value.length / 500, 0, 1);
        this.toggleHistory(false);
        this.draftField.focus();
      }

      async deleteHistoryRefs(ids) {
        const user = AppState.get("currentUser");
        if (!firebaseRuntime.db || !user || !ids.length) return;
        try {
          const batch = firebaseRuntime.db.batch();
          const collection = firebaseRuntime.db.collection("users").doc(user.uid).collection("history");
          ids.forEach((id) => batch.delete(collection.doc(id)));
          await batch.commit();
        } catch (error) {
          this.hud.showNotice("雲端卷宗刪除受阻，本機已更新");
        }
      }

      async deleteHistoryItem(id) {
        if (this.pendingHistoryDeleteId !== id) {
          this.pendingHistoryDeleteId = id;
          this.renderHistory();
          this.hud.showNotice("再次點擊以刪除此卷宗");
          return;
        }
        this.pendingHistoryDeleteId = "";
        this.historyItems = this.historyItems.filter((item) => item.id !== id);
        if (this.activeHistoryId === id) {
          this.activeHistoryId = "";
        }
        try {
          localStorage.setItem(this.historyKey(), JSON.stringify(this.historyItems));
        } catch (error) {
          console.warn("Worldforge local history delete skipped:", error);
        }
        this.renderHistory();
        this.hud.showNotice("鑑定紀錄已刪除");
        await this.deleteHistoryRefs([id]);
      }

      async clearHistory() {
        if (!this.historyItems.length) {
          this.hud.showNotice("目前沒有可清空的鑑定紀錄");
          return;
        }
        if (this.historyClear?.dataset.confirm !== "1") {
          if (this.historyClear) {
            this.historyClear.dataset.confirm = "1";
            setButtonGlyph(this.historyClear, "!", "確認清空");
            this.historyClear.classList.add("is-confirming");
          }
          this.hud.showNotice("再次點擊以清空全部鑑定紀錄");
          window.clearTimeout(this.historyClearTimer);
          this.historyClearTimer = window.setTimeout(() => {
            if (this.historyClear) {
              delete this.historyClear.dataset.confirm;
              setButtonGlyph(this.historyClear, "×", "清空紀錄");
              this.historyClear.classList.remove("is-confirming");
            }
          }, 2600);
          return;
        }
        const ids = this.historyItems.map((item) => item.id).filter(Boolean);
        this.historyItems = [];
        this.pendingHistoryDeleteId = "";
        this.activeHistoryId = "";
        try {
          localStorage.setItem(this.historyKey(), "[]");
        } catch (error) {
          console.warn("Worldforge local history clear skipped:", error);
        }
        if (this.historyClear) {
          delete this.historyClear.dataset.confirm;
          setButtonGlyph(this.historyClear, "×", "清空紀錄");
          this.historyClear.classList.remove("is-confirming");
        }
        this.renderHistory();
        this.hud.showNotice("鑑定紀錄已清空");
        await this.deleteHistoryRefs(ids);
      }

      async copyResultSection(kind, button = null) {
        const section = this.resultBox?.querySelector(`[data-section="${CSS.escape(kind)}"]`);
        const text = section?.querySelector(".result-section-body")?.innerText?.trim() || "";
        if (!text) {
          this.hud.showNotice("此段尚無可複製內容");
          return;
        }
        try {
          const ok = await this.copyPlainText(text);
          if (!ok) throw new Error("clipboard-failed");
          flashButtonFeedback(button, "success", 980);
          this.setStatus("分區內容已寫入剪貼簿");
          this.hud.showNotice(kind === "summary" ? "審查摘要已複製" : "修改後全文已複製");
        } catch (error) {
          flashButtonFeedback(button, "error", 760);
          this.setStatus("剪貼簿寫入失敗，請手動選取內容", true);
          this.hud.showNotice("剪貼簿寫入失敗");
        }
      }

      clearDraft() {
        if (!this.draftField) return;
        this.draftField.value = "";
        this.resultBox.replaceChildren();
        const empty = document.createElement("p");
        empty.className = "analysis-empty";
        empty.textContent = "鑑定卷宗尚未展開。完成一次分析後，這裡會顯示「修改後全文」與「審查摘要」。";
        this.resultBox.append(empty);
        this.updateDraftDiagnostics();
        this.saveDraft();
        this.setSyncState("草稿記憶已清除");
        this.setStatus("手稿內容已清除");
        this.hud.showNotice("手稿內容已清除");
        flashButtonFeedback(this.clearDraftButton, "success", 980);
        this.reanalyzeButton.hidden = true;
        this.syncHudState();
        this.draftField.focus();
      }

      async logout() {
        const localDraftKey = this.draftKey();
        const localHistoryKey = this.historyKey();
        if (this.confirmLogoutButton) {
          this.confirmLogoutButton.disabled = true;
          setButtonGlyph(this.confirmLogoutButton, "⇥", "封存中");
        }
        this.saveDraft();
        this.setStatus("正在封存草稿並結束工作階段");
        this.hud.showNotice("正在結束鑑定核心工作階段");
        try {
          firebaseRuntime.guest = false;
          localStorage.removeItem(localDraftKey);
          localStorage.removeItem(localHistoryKey);
          localStorage.removeItem("worldforgeGuest");
          AppState.set("guestId", null);
          if (window.__FLG_LOGIN_CONTROLLER__) {
            window.__FLG_LOGIN_CONTROLLER__._handoffArmed = false;
          }
          if (firebaseRuntime.auth?.currentUser) {
            await firebaseRuntime.auth.signOut();
          }
        } catch (error) {
          this.hud.showNotice("登出流程異常，將重新開啟授權入口");
        } finally {
          window.setTimeout(() => window.location.reload(), 420);
        }
      }
    }

    bindVisualViewportInset();
    hydrateAllSaoButtons();

    let signedInHandoffRetryCount = 0;
    function handoffSignedInUser() {
      const login = window.__FLG_LOGIN_CONTROLLER__;
      if (!login) {
        if (signedInHandoffRetryCount >= 30) return;
        signedInHandoffRetryCount += 1;
        window.setTimeout(handoffSignedInUser, 100);
        return;
      }
      signedInHandoffRetryCount = 0;
      if (login.operational || document.body.classList.contains("operational")) return;
      if (login.mode === "oauth") return;
      if (login._handoffArmed) return;
      login._handoffArmed = true;

      if (document.body.classList.contains("is-booting")) {
        const bootTimeline = window.__FLG_TIMELINE__;
        if (bootTimeline?.forceBootComplete) {
          bootTimeline.forceBootComplete();
        } else {
          login._handoffArmed = false;
          window.setTimeout(handoffSignedInUser, 100);
          return;
        }
      }

      window.requestAnimationFrame(async () => {
        try {
          await login.beginAuthentication?.("已偵測到 Google 登入，正在進入工作區", { skipAuth: true });
        } catch (error) {
          console.warn("Worldforge signed-in handoff failed:", error);
          login._handoffArmed = false;
        }
      });
    }
    window.__FLG_HANDOFF_SIGNED_IN_USER__ = handoffSignedInUser;

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const accountMenu = document.getElementById("accountMenu");
        const historyDrawer = document.getElementById("historyDrawer");
        const overrideWindow = document.getElementById("overrideWindow");
        const logoutConfirmWindow = document.getElementById("logoutConfirmWindow");
        if (logoutConfirmWindow?.getAttribute("aria-hidden") === "false") {
          document.getElementById("cancelLogoutBtn")?.click();
          return;
        }
        if (accountMenu && !accountMenu.hidden) {
          accountMenu.hidden = true;
          document.getElementById("accountToggle")?.setAttribute("aria-expanded", "false");
          return;
        }
        if (historyDrawer && !historyDrawer.hidden) {
          historyDrawer.hidden = true;
          document.getElementById("historyToggle")?.setAttribute("aria-expanded", "false");
          return;
        }
        if (overrideWindow?.getAttribute("aria-hidden") === "false") {
          document.getElementById("abortOverrideBtn")?.click();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (!document.body.classList.contains("operational")) return;
        const analyzeButton = document.querySelector('[data-op="analyze"]');
        if (analyzeButton && !analyzeButton.disabled) {
          event.preventDefault();
          analyzeButton.click();
        }
      }
    });

    const manager = new SceneManager(document.getElementById("webgl-container"));
    const cameraController = new CameraController(manager);
    const core = new CoreEngine(manager.systemRoot);
    const runes = new RuneSystem(manager.systemRoot);
    const particles = new ParticleSystem(manager.systemRoot, manager);
    const post = new PostProcessingPipeline(manager);
    window.__FLG_TRIGGER_CA__ = (amount, duration) => post.triggerChromaticAberration(amount, duration);
    let linkStartFX = null;
    function ensureLinkStartFX() {
      if (!linkStartFX) {
        linkStartFX = new LinkStartFX(document.getElementById("linkStartFX"));
        updateFxMetrics?.();
      }
      return linkStartFX;
    }
    window.__FLG_LINK_START__ = {
      start(duration, sharedStartAt) {
        return ensureLinkStartFX()?.start?.(duration, sharedStartAt);
      },
      stop() {
        return linkStartFX?.stop?.();
      },
      get gl() {
        return linkStartFX?.gl || null;
      }
    };
    const hud = new HUDSystem();
    const login = new LoginController(core, runes, particles, post, hud);
    window.__FLG_LOGIN_CONTROLLER__ = login;
    new OperationalModeController(login, hud);
    const timeline = new AnimationTimeline(core, runes, particles, hud);
    window.__FLG_TIMELINE__ = timeline;
    const raphaelWebglProfile = createRaphaelWebglProfile();
    const raphaelOpticalBackground = new ArcaneOpticalBackground(THREE, manager.scene, raphaelWebglProfile);
    const raphaelSingularityCore = new ArcaneSingularityCore(THREE, manager.scene, raphaelWebglProfile, core);
    let raphaelComputationRing = null;
    let magiculeParticleField = null;
    let referenceGlyphRing = null;
    let goldBokehField = null;
    let steppedAnimationController = null;
    let deferredRaphaelLayersReady = false;
    let bloomTargetCount = [
      core.coreMesh,
      core.edgeShell,
      core.geometryGroup,
      core.scanGroup,
      core.pageGroup,
      runes.group,
      particles.group,
      raphaelSingularityCore?.group
    ].reduce((count, object) => count + enableBloomLayer(object), 0);

    const getRaphaelWebglState = () => ({
      energy: clamp(login.syncProgress + core.wake * 0.42 + core.hover * 0.32 + core.operational * 0.18, 0, 1),
      warp: clamp(core.shock + particles.spiral * 0.72 + post.shockEnergy * 0.35, 0, 1),
      handoff: document.body.classList.contains("operational") || core.operational > 0.3
    });
    let webglAnimationFrame = 0;
    let webglRuntimePaused = document.hidden;
    let webglRuntimeDisposed = false;
    let webglRuntimeTime = 0;
    let webglPauseReason = document.hidden ? "hidden" : "";

    function updateFxMetrics() {
      window.__FLG_BLOOM_SCENE__ = BLOOM_SCENE;
      document.documentElement.dataset.selectiveBloom = post.ready && post.useSelectiveBloom ? "active" : "fallback";
      document.documentElement.dataset.bloomLayer = String(BLOOM_SCENE);
      document.documentElement.dataset.bloomTargets = String(bloomTargetCount);
      document.documentElement.dataset.postPipeline = post.ready ? (post.useSelectiveBloom ? "selective-bloom" : "lightweight") : "renderer";
      if (post.fallbackReason) document.documentElement.dataset.postFallbackReason = post.fallbackReason;
      window.__FLG_LOGIN_FX_METRICS__ = {
        runeLayers: runes.metrics?.runeLayers || runes.rings.length,
        semanticZones: runes.metrics?.semanticZones || 7,
        particles: particles.metrics?.particles || particles.count,
        ingestionStreams: particles.metrics?.ingestionStreams || particles.streamCount,
        scanBands: core.scanBands.length,
        arcaneOpticalBackground: true,
        raphaelSingularityCore: true,
        raphaelComputationRing: !!raphaelComputationRing,
        magiculeParticleField: !!magiculeParticleField,
        referenceGlyphRing: !!referenceGlyphRing,
        goldBokehField: !!goldBokehField,
        steppedAnimationController: !!steppedAnimationController,
        magiculeParticles: magiculeParticleField?.count || 0,
        composerPasses: post.composer?.passes?.length || 0,
        selectiveBloom: post.ready && post.useSelectiveBloom,
        postPipeline: document.documentElement.dataset.postPipeline,
        postFallbackReason: post.fallbackReason || "",
        bloomLayer: BLOOM_SCENE,
        bloomTargets: bloomTargetCount,
        linkStartShader: !!linkStartFX?.gl,
        linkStartActive: !!linkStartFX?.active,
        linkStartPaused: !!linkStartFX?.paused,
        linkStartContextLost: !!linkStartFX?.contextLost,
        webglRuntime: document.documentElement.dataset.webglRuntime || "initializing",
        webglPaused: webglRuntimePaused,
        webglPauseReason,
        webglContextLost: manager.contextLost,
        webglDisposed: webglRuntimeDisposed || manager.disposed,
        modalGlass: false,
        dialogSurface: true,
        deferredRaphaelLayersReady,
        reducedMotion: prefersReducedMotion,
        mobile: mobileQuery.matches
      };
      document.documentElement.dataset.runeLayers = String(window.__FLG_LOGIN_FX_METRICS__.runeLayers);
      document.documentElement.dataset.ingestionStreams = String(window.__FLG_LOGIN_FX_METRICS__.ingestionStreams);
      document.documentElement.dataset.scanBands = String(window.__FLG_LOGIN_FX_METRICS__.scanBands);
      document.documentElement.dataset.linkStartShader = linkStartFX?.gl ? "ready" : "idle";
      document.documentElement.dataset.webglContext = manager.contextLost ? "lost" : manager.disposed ? "disposed" : "active";
      document.documentElement.dataset.modalGlass = "removed";
      document.documentElement.dataset.arcaneOpticalBackground = "active";
      document.documentElement.dataset.raphaelSingularityCore = "active";
      document.documentElement.dataset.raphaelDeferredLayers = deferredRaphaelLayersReady ? "ready" : "idle";
      if (raphaelComputationRing) document.documentElement.dataset.raphaelComputationRing = "active";
      if (magiculeParticleField) document.documentElement.dataset.magiculeParticleField = "active";
      if (referenceGlyphRing) document.documentElement.dataset.referenceGlyphRing = "active";
      if (goldBokehField) document.documentElement.dataset.goldBokehField = "active";
      if (steppedAnimationController) document.documentElement.dataset.steppedAnimationController = "active";
    }

    function initializeDeferredRaphaelLayers() {
      if (deferredRaphaelLayersReady) return;
      try {
        raphaelComputationRing = new RaphaelComputationRing(THREE, manager.scene, raphaelWebglProfile, core);
      } catch (err) {
        console.warn("[FLG] RaphaelComputationRing init failed:", err?.message || err);
      }
      try {
        magiculeParticleField = new MagiculeParticleField(THREE, manager.scene, raphaelWebglProfile, core);
      } catch (err) {
        console.warn("[FLG] MagiculeParticleField init failed:", err?.message || err);
      }
      try {
        referenceGlyphRing = new ReferenceGlyphRing(THREE, manager.scene, raphaelWebglProfile, core);
      } catch (err) {
        console.warn("[FLG] ReferenceGlyphRing init failed:", err?.message || err);
      }
      try {
        goldBokehField = new GoldBokehField(THREE, manager.scene, raphaelWebglProfile, core);
      } catch (err) {
        console.warn("[FLG] GoldBokehField init failed:", err?.message || err);
      }
      try {
        steppedAnimationController = new SteppedAnimationController({ reduced: raphaelWebglProfile.reduced });
      } catch (err) {
        console.warn("[FLG] SteppedAnimationController init failed:", err?.message || err);
      }
      bloomTargetCount += [
        raphaelComputationRing?.group,
        magiculeParticleField?.group,
        referenceGlyphRing?.group,
        goldBokehField?.group
      ].reduce((count, object) => count + enableBloomLayer(object), 0);
      deferredRaphaelLayersReady = true;
      updateFxMetrics();
    }

    function prewarmLinkStartFX() {
      if (navigator.webdriver && !window.__FLG_ALLOW_AUTOMATION_LINK_START_PREWARM__) {
        document.documentElement.dataset.linkStartPrewarm = "automation-skipped";
        updateFxMetrics();
        return null;
      }
      if (prefersReducedMotion || webglRuntimeDisposed || manager.contextLost) {
        updateFxMetrics();
        return null;
      }
      const fx = ensureLinkStartFX();
      document.documentElement.dataset.linkStartPrewarm = fx?.gl ? "ready" : "fallback";
      updateFxMetrics();
      return fx;
    }

    updateFxMetrics();
    deferToIdle(prewarmLinkStartFX, { timeout: 900 });
    deferToIdle(initializeDeferredRaphaelLayers, { timeout: 1800 });

    function getWebglRuntimeState() {
      if (webglRuntimeDisposed || manager.disposed) return "disposed";
      if (manager.contextLost) return "context-lost";
      if (webglRuntimePaused) return "paused";
      return "running";
    }

    function updateWebglRuntimeState() {
      const state = getWebglRuntimeState();
      document.documentElement.dataset.webglRuntime = state;
      if (webglPauseReason) {
        document.documentElement.dataset.webglPauseReason = webglPauseReason;
      } else {
        delete document.documentElement.dataset.webglPauseReason;
      }
      document.documentElement.dataset.webglContext = manager.contextLost ? "lost" : manager.disposed ? "disposed" : "active";
      window.__FLG_WEBGL_RUNTIME_STATE__ = {
        state,
        paused: webglRuntimePaused,
        pauseReason: webglPauseReason,
        disposed: webglRuntimeDisposed || manager.disposed,
        contextLost: manager.contextLost,
        frameScheduled: !!webglAnimationFrame,
        runtimeTime: Number(webglRuntimeTime.toFixed(3)),
        postReady: post.ready,
        postPipeline: document.documentElement.dataset.postPipeline || "renderer",
        linkStartActive: !!linkStartFX?.active,
        linkStartPaused: !!linkStartFX?.paused,
        linkStartContextLost: !!linkStartFX?.contextLost
      };
      updateFxMetrics();
    }

    function cancelWebglFrame() {
      if (webglAnimationFrame) cancelAnimationFrame(webglAnimationFrame);
      webglAnimationFrame = 0;
    }

    function scheduleWebglFrame() {
      if (webglRuntimeDisposed || webglRuntimePaused || manager.contextLost || manager.disposed || webglAnimationFrame) {
        updateWebglRuntimeState();
        return;
      }
      webglAnimationFrame = requestAnimationFrame(animate);
      updateWebglRuntimeState();
    }

    function pauseWebglRuntime(reason = "manual") {
      if (webglRuntimeDisposed) return;
      webglRuntimePaused = true;
      webglPauseReason = reason;
      cancelWebglFrame();
      linkStartFX?.pause?.();
      updateWebglRuntimeState();
    }

    function resumeWebglRuntime(reason = "manual") {
      if (webglRuntimeDisposed) return;
      if (manager.contextLost || manager.disposed) {
        pauseWebglRuntime("context-lost");
        return;
      }
      webglRuntimePaused = false;
      webglPauseReason = "";
      manager.clock.getDelta();
      linkStartFX?.resume?.();
      updateWebglRuntimeState();
      scheduleWebglFrame();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        pauseWebglRuntime("hidden");
      } else {
        resumeWebglRuntime("visible");
      }
    }

    function handleWebglContextLost() {
      pauseWebglRuntime("context-lost");
    }

    function handleWebglContextRestored() {
      post.resize();
      if (document.hidden) {
        pauseWebglRuntime("hidden");
      } else {
        resumeWebglRuntime("context-restored");
      }
    }

    function disposeWebglRuntime() {
      if (webglRuntimeDisposed) return;
      webglRuntimeDisposed = true;
      webglRuntimePaused = true;
      webglPauseReason = "disposed";
      cancelWebglFrame();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("flg:webgl-context-lost", handleWebglContextLost);
      window.removeEventListener("flg:webgl-context-restored", handleWebglContextRestored);
      linkStartFX?.dispose?.();
      steppedAnimationController?.dispose?.();
      goldBokehField?.dispose?.();
      referenceGlyphRing?.dispose?.();
      magiculeParticleField?.dispose?.();
      raphaelComputationRing?.dispose?.();
      raphaelSingularityCore?.dispose?.();
      raphaelOpticalBackground?.dispose?.();
      post.dispose();
      manager.dispose();
      updateWebglRuntimeState();
    }

    window.__FLG_WEBGL_RUNTIME__ = {
      pause: pauseWebglRuntime,
      resume: resumeWebglRuntime,
      dispose: disposeWebglRuntime,
      get state() {
        return window.__FLG_WEBGL_RUNTIME_STATE__;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("flg:webgl-context-lost", handleWebglContextLost);
    window.addEventListener("flg:webgl-context-restored", handleWebglContextRestored);
    window.addEventListener("pagehide", disposeWebglRuntime, { once: true });
    window.addEventListener("beforeunload", disposeWebglRuntime, { once: true });

    if ("PerformanceObserver" in window) {
      window.__FLG_CLS__ = 0;
      window.__FLG_LCP__ = 0;
      window.__FLG_INP__ = 0;
      window.__FLG_VITALS_READY__ = true;
      try {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) cls += entry.value;
          }
          window.__FLG_CLS__ = cls;
        }).observe({ type: "layout-shift", buffered: true });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__FLG_LCP__ = entry.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__FLG_INP__ = Math.max(window.__FLG_INP__ || 0, entry.duration);
          }
        }).observe({ type: "event", buffered: true, durationThreshold: 16 });
      } catch (error) {
        console.debug("[FLG vitals] observer unavailable", error?.message || error);
      }
    }

    window.addEventListener("resize", () => {
      if (!manager.contextLost && !manager.disposed) post.resize();
      updateWebglRuntimeState();
    });
    timeline.start();

    function animate() {
      webglAnimationFrame = 0;
      if (webglRuntimeDisposed || webglRuntimePaused || manager.contextLost || manager.disposed) {
        updateWebglRuntimeState();
        return;
      }
      const delta = Math.min(manager.clock.getDelta(), 0.05);
      webglRuntimeTime += delta;
      const time = webglRuntimeTime;
      manager.updateMouse();
      cameraController.update(delta, document.body.classList.contains("operational"));
      core.update(time, delta);
      runes.update(time, delta);
      particles.update(time, delta);
      const raphaelState = getRaphaelWebglState();
      const steppedSample = steppedAnimationController?.update(delta, time, raphaelState);
      if (steppedSample) raphaelState.stepped = steppedSample;
      raphaelOpticalBackground.update(delta, time, raphaelState);
      raphaelSingularityCore.update(delta, time, raphaelState);
      raphaelComputationRing?.update(delta, time, raphaelState);
      magiculeParticleField?.update(delta, time, raphaelState);
      referenceGlyphRing?.update(delta, time, raphaelState);
      goldBokehField?.update(delta, time, raphaelState);
      hud.update(time, login.syncProgress);
      post.update(time, delta);
      scheduleWebglFrame();
    }

    updateWebglRuntimeState();
    scheduleWebglFrame();
