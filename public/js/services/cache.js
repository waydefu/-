// @ts-check

import { UI_CONFIG } from '../core/config.js';

const CACHE_KEY_SEPARATOR = "::";

/** LocalStorage-backed LRU cache for analysis results. */
export class AnalysisCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map();
    this._storageKey = "flg_analysis_cache_v2";
    this._ttlMs = 24 * 60 * 60 * 1000;
    this._maxPersist = 10;
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      const now = Date.now();
      for (const [k, v] of arr) {
        if (v && v.ts && now - v.ts < this._ttlMs) this.map.set(k, v);
      }
    } catch (_) {}
  }

  _saveToStorage() {
    try {
      const entries = [...this.map.entries()].slice(-this._maxPersist);
      localStorage.setItem(this._storageKey, JSON.stringify(entries));
    } catch (_) {}
  }

  async hash(text) {
    const payload = new TextEncoder().encode(text);
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", payload);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
    return "f_" + (h >>> 0).toString(16);
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this._ttlMs) {
      this.map.delete(key);
      return null;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.result;
  }

  makeTextKey(uid, text) {
    return [
      UI_CONFIG.ANALYSIS_RULE_VERSION,
      uid,
      text,
    ].join(CACHE_KEY_SEPARATOR);
  }

  async getByText(uid, text) {
    return this.get(await this.hash(this.makeTextKey(uid, text)));
  }

  async set(uid, text, result) {
    const key = await this.hash(this.makeTextKey(uid, text));
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { result, ts: Date.now() });
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this._saveToStorage();
  }
}

/** Shared analysis response cache. */
export const analysisCache = new AnalysisCache(UI_CONFIG.CACHE_MAX_ENTRIES);
