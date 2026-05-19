// @ts-check

/** @param {string} id */
export const $ = (id) => document.getElementById(id);
/** DOM id map for all static page elements. */
export const DOM = {
loginScreen:    "loginScreen",
loginGl:        "loginGl",
loginGoogleBtn: "loginGoogleBtn",
loginGuestBtn:  "loginGuestBtn",
loginErr:       "loginErr",
loginClock:     "loginClock",
navOverlay:     "navOverlay",
histTrigger:    "histTrigger",
histPanel:      "histPanel",
histBadge:      "histBadge",
userTrigger:    "userTrigger",
userPanel:      "userPanel",
panelSync:      "panelSync",
historyList:    "historyList",
historyEmpty:   "historyEmpty",
paDelBtn:       "paDelBtn",
paClearBtn:     "paClearBtn",
panelActions:   "panelActions",
confirmClearAll:"confirmClearAll",
confirmClearYes:"confirmClearYes",
confirmClearNo: "confirmClearNo",
confirmDelSel:  "confirmDelSel",
confirmDelLabel:"confirmDelLabel",
confirmDelYes:  "confirmDelYes",
confirmDelNo:   "confirmDelNo",
draftInput:     "draftInput",
spellList:      "spellList",
spellWarn:      "spellWarn",
result:         "result",
checkBtn:       "checkBtn",
clearBtn:       "clearBtn",
focusModeBtn:   "focusModeBtn",
charCount:      "charCount",
srAnnouncer:    "srAnnouncer",
year:           "year",
};
// Resolve all DOM references
/** @type {Record<string, any>} */
export const el = {};
for (const [key, id] of Object.entries(DOM)) {
el[key] = $(id);
}
