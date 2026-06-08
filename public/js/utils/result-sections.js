// @ts-check

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const REWRITE_KEYS = /^(?:修改後全文|修訂後全文|潤稿後全文|重寫全文|重寫後全文|完整重寫|REWRITE(?:TEN)?(?:\s+MANUSCRIPT)?)$/i;
const SUMMARY_KEYS = /^(?:審查摘要|審稿摘要|總編審查|語感審查|編輯審查|REVIEW\s+SUMMARY|EDITORIAL\s+REVIEW|SUMMARY)$/i;

/**
 * 把一行可能的標題正規化成 "rewrite" / "summary" / ""。
 * 容錯：剝掉 markdown 強調(粗體/斜體)、標題井號(#)、【】、emoji、尾端冒號、
 * 以及尾端補述（如「（共 420 字）」），再比對關鍵字。涵蓋各家 LLM 的標題排版差異。
 */
function normalizeHeading(line) {
  let s = line.trim();
  if (!s || s.length > 40) return "";                                // 過長 → 視為正文，避免誤判
  s = s.replace(/^#{1,6}\s*/, "");                                    // # 標題
  s = s.replace(/^[*_]{1,2}\s*/, "").replace(/\s*[*_]{1,2}$/, "");    // **粗體** / _斜體_
  s = s.replace(/^【\s*/, "").replace(/\s*】$/, "");                   // 【】
  s = s.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();    // emoji + 變體選擇符
  s = s.replace(/[:：]\s*$/, "").trim();                              // 尾端冒號
  s = s.replace(/\s*[（(].*$/, "").trim();                            // 尾端補述（共 X 字）
  if (REWRITE_KEYS.test(s)) return "rewrite";
  if (SUMMARY_KEYS.test(s)) return "summary";
  return "";
}

export function splitAnalysisSections(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { rewrite: "", summary: "", fallback: "" };

  const buckets = { rewrite: [], summary: [] };
  const preamble = [];
  let current = "";
  let sawHeading = false;

  for (const line of text.split(/\r?\n/)) {
    const heading = normalizeHeading(line);
    if (heading) {
      current = heading;
      sawHeading = true;
      continue;
    }
    if (current) buckets[current].push(line);
    else preamble.push(line);                       // 第一個 heading 之前的前導文字
  }

  let rewrite = buckets.rewrite.join("\n").trim();
  const summary = buckets.summary.join("\n").trim();

  // 救援：rewrite 空但有前導文字 → 多半是「修改後全文」標題沒被認出、正文落在 heading 前，補回 rewrite。
  if (!rewrite) {
    const lead = preamble.join("\n").trim();
    if (lead) rewrite = lead;
  }

  if (!sawHeading || (!rewrite && !summary)) return { rewrite: "", summary: "", fallback: text };
  return { rewrite, summary, fallback: "" };
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function flushParagraph(buffer, html) {
  if (!buffer.length) return;
  html.push(`<p>${renderInline(buffer.join("\n"))}</p>`);
  buffer.length = 0;
}

function flushList(list, html) {
  if (!list.length) return;
  html.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
  list.length = 0;
}

export function renderMarkdownLite(markdown) {
  const html = [];
  const paragraph = [];
  const list = [];

  for (const rawLine of String(markdown ?? "").split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraph, html);
      flushList(list, html);
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushParagraph(paragraph, html);
      flushList(list, html);
      html.push("<hr />");
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph(paragraph, html);
      flushList(list, html);
      const level = Math.min(3, headingMatch[1].length);
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }
    const listMatch = /^(?:[-*]|[0-9]+[.)])\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      flushParagraph(paragraph, html);
      list.push(listMatch[1]);
      continue;
    }
    if (trimmed.startsWith(">")) {
      flushParagraph(paragraph, html);
      flushList(list, html);
      html.push(`<blockquote>${renderInline(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    flushList(list, html);
    paragraph.push(line);
  }

  flushParagraph(paragraph, html);
  flushList(list, html);
  return html.join("\n");
}
