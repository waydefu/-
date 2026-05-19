// @ts-check

const HEADING_PATTERNS = {
  rewrite: /(?:^|\n)\s*(?:#{1,4}\s*)?(?:✍️\s*)?修改後全文\s*[:：]?\s*/u,
  summary: /(?:^|\n)\s*(?:#{1,4}\s*)?(?:📋\s*)?審查摘要\s*[:：]?\s*/u,
};

const cleanSectionText = (text) =>
  text
    .replace(/^\s*[-—=]{3,}\s*/u, "")
    .replace(/\s*[-—=]{3,}\s*$/u, "")
    .trim();

export const splitAnalysisSections = (rawText) => {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return { rewrite: "", summary: "", fallback: "（無回應）" };

  const rewriteMatch = raw.match(HEADING_PATTERNS.rewrite);
  const summaryMatch = raw.match(HEADING_PATTERNS.summary);

  if (!rewriteMatch || !summaryMatch || summaryMatch.index <= rewriteMatch.index) {
    return { rewrite: "", summary: "", fallback: raw };
  }

  const rewriteStart = rewriteMatch.index + rewriteMatch[0].length;
  const summaryStart = summaryMatch.index + summaryMatch[0].length;
  const rewrite = cleanSectionText(raw.slice(rewriteStart, summaryMatch.index));
  const summary = cleanSectionText(raw.slice(summaryStart));

  if (!rewrite || !summary) return { rewrite: "", summary: "", fallback: raw };
  return { rewrite, summary, fallback: "" };
};
