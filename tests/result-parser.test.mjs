import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  renderMarkdownLite,
  sectionsToPlainText,
  splitAnalysisSections,
} from "../public/js/utils/result-sections.js";

describe("result parser", () => {
  it("splits rewrite and review summary sections from the model response", () => {
    const parsed = splitAnalysisSections(`✍️ 修改後全文

王城的鐘聲在雨裡沉下去。

📋 審查摘要

- 語感更穩。
- 階級質地可再加。`);

    assert.equal(parsed.rewrite, "王城的鐘聲在雨裡沉下去。");
    assert.equal(parsed.summary, "- 語感更穩。\n- 階級質地可再加。");
    assert.equal(parsed.fallback, "");
  });

  it("keeps the full response when expected headings are missing", () => {
    const parsed = splitAnalysisSections("完整但未分段的分析結果");

    assert.equal(parsed.rewrite, "");
    assert.equal(parsed.summary, "");
    assert.equal(parsed.fallback, "完整但未分段的分析結果");
  });

  it("supports markdown headings and safe inline formatting", () => {
    const parsed = splitAnalysisSections(`## 修改後全文

**男爵**在雨中停步。

## 審查摘要

- 避免爵士直譯。`);

    assert.equal(parsed.rewrite, "**男爵**在雨中停步。");
    assert.match(renderMarkdownLite(parsed.rewrite), /<strong>男爵<\/strong>/);
    assert.doesNotMatch(renderMarkdownLite("<script>alert(1)</script>"), /<script>/);
    assert.match(sectionsToPlainText(parsed), /修改後全文/);
  });

  it("keeps hard-logic summary labels inside the review summary section", () => {
    const parsed = splitAnalysisSections(`✍️ 修改後全文

他咬住牙，又把手探向椅腳旁的手機。

📋 審查摘要

硬傷：原句沒有交代拿手機是為了求救。
語感：魔力表述避免使用本源。
已處理：重寫補足動作目的與感官來源。`);

    assert.match(parsed.summary, /硬傷：/);
    assert.match(parsed.summary, /語感：/);
    assert.match(parsed.summary, /已處理：/);
    assert.equal(parsed.fallback, "");
  });
});
