/* Fantasy Lore Guardian — 本地違禁詞掃描 Worker */
let catalog = [];

const overlaps = (hits, start, end) =>
hits.some((h) => start < h.end && end > h.start);

self.onmessage = (e) => {
const { type, text, words } = e.data || {};
if (type === "init") {
catalog = (words || []).slice().sort((a, b) => b.term.length - a.term.length);
self.postMessage({ type: "ready", count: catalog.length });
return;
}
if (type === "scan") {
const src = typeof text === "string" ? text : "";
const hits = [];
for (const entry of catalog) {
const term = entry.term;
if (!term) continue;
let idx = 0;
while ((idx = src.indexOf(term, idx)) !== -1) {
const end = idx + term.length;
if (!overlaps(hits, idx, end)) {
hits.push({
word: term,
start: idx,
end,
suggestion: entry.replace || "",
});
}
idx += 1;
}
}
hits.sort((a, b) => a.start - b.start);
self.postMessage({ type: "result", hits, scanId: e.data.scanId });
}
};
