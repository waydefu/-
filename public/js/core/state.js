// @ts-check

/** Lightweight pub/sub store for cross-module app state. */
export const AppState = (() => {
const state = {
db: null,
fbAuth: null,
appCheck: null,
appCheckReady: false,
appCheckStatus: "idle",
appCheckError: "",
firebaseReady: false,
firestoreReady: false,
currentUser: null,
isAnalyzing: false,
activeDropdown: null,
ime: false,
currentReqId: 0,
previousUser: null,
activeId: null,
analyzeAbort: null,
};
return {
get: (key) => state[key],
set: (key, value) => {
if (state[key] === value) return;
state[key] = value;
},
};
})();
