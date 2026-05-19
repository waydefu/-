// @ts-check

/** Lightweight pub/sub store for cross-module app state. */
export const AppState = (() => {
const state = {
db: null,
fbAuth: null,
firebaseReady: false,
firestoreReady: false,
currentUser: null,
isAnalyzing: false,
activeDropdown: null,
introPlayed: false,
ime: false,
currentReqId: 0,
previousUser: null,
activeId: null,
analyzeAbort: null,
};
const listeners = new Map();
const notify = (key, value) => {
(listeners.get(key) || []).forEach((fn) => {
try { fn(value, key); } catch (e) { console.warn("[FLG] AppState listener:", e); }
});
};
return {
get: (key) => state[key],
set: (key, value) => {
if (state[key] === value) return;
state[key] = value;
notify(key, value);
},
subscribe: (key, fn) => {
if (!listeners.has(key)) listeners.set(key, []);
listeners.get(key).push(fn);
return () => {
const arr = listeners.get(key);
if (!arr) return;
const i = arr.indexOf(fn);
if (i >= 0) arr.splice(i, 1);
};
},
};
})();

/** @type {import('./types.js').HistoryItem[]} */
export const historyData = [];

/** Selected history item ids. */
export const selectedIds = new Set();
