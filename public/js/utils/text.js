// @ts-check

/** @param {unknown} str */
export const escapeHtml = (str) =>
String(str)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#39;");
/** @param {number} ts */
export const formatDate = (ts) => {
const d = new Date(ts);
const pad = (n) => String(n).padStart(2, "0");
return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
