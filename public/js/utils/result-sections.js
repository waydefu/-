// @ts-check

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const rewriteHeading = /^(?:#{1,3}\s*)?(?:✍️\s*)?(?:修改後全文|重寫全文|重寫後全文|完整重寫|REWRITE)\s*[:：]?\s*$/i;
const summaryHeading = /^(?:#{1,3}\s*)?(?:📋\s*)?(?:審查摘要|總編審查|語感審查|REVIEW SUMMARY|SUMMARY)\s*[:：]?\s*$/i;
const bracketRewrite = /^【(?:修改後全文|重寫全文|完整重寫)】$/;
const bracketSummary = /^【(?:審查摘要|總編審查|語感審查)】$/;

function normalizeHeading(line) {
  const trimmed = line.trim();
  if (rewriteHeading.test(trimmed) || bracketRewrite.test(trimmed)) return "rewrite";
  if (summaryHeading.test(trimmed) || bracketSummary.test(trimmed)) return "summary";
  return "";
}

export function splitAnalysisSections(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { rewrite: "", summary: "", fallback: "" };

  const buckets = { rewrite: [], summary: [] };
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
  }

  const rewrite = buckets.rewrite.join("\n").trim();
  const summary = buckets.summary.join("\n").trim();
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

export function sectionsToPlainText(parsed) {
  if (parsed?.fallback) return parsed.fallback;
  const parts = [];
  if (parsed?.rewrite) parts.push(`修改後全文\n\n${parsed.rewrite}`);
  if (parsed?.summary) parts.push(`審查摘要\n\n${parsed.summary}`);
  return parts.join("\n\n");
}
