import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

const getNumberAfter = (pattern) => {
  const match = rules.match(pattern);
  assert.ok(match, `Missing rules pattern: ${pattern}`);
  return Number(match[1]);
};

const MIN_TS = getNumberAfter(/d\.ts >= (\d+)/);
const MAX_TS = getNumberAfter(/d\.ts <= (\d+)/);
const MAX_DRAFT = getNumberAfter(/d\.draft\.size\(\) <= (\d+)/);
const MAX_RESULT = getNumberAfter(/d\.result\.size\(\) <= (\d+)/);
const MAX_PREVIEW = getNumberAfter(/d\.preview\.size\(\) <= (\d+)/);
const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const ALLOWED_FIELDS = ["id", "ts", "draft", "result", "preview"];

const validDoc = (id = "hist_12345") => ({
  id,
  ts: 1760000000000,
  draft: "王城的鐘聲在雨裡沉下去。",
  result: "修改後全文\n王城的鐘聲在雨裡沉下去。\n\n審查摘要\n可用。",
  preview: "王城的鐘聲在雨裡沉下去。",
});

const hasOnlyAllowedFields = (doc) =>
  Object.keys(doc).every((key) => ALLOWED_FIELDS.includes(key)) &&
  ALLOWED_FIELDS.every((key) => Object.hasOwn(doc, key));

const canWriteHistory = ({ authUid, userId, historyId, data }) => {
  if (!authUid || authUid !== userId) return false;
  if (!hasOnlyAllowedFields(data)) return false;
  if (typeof data.id !== "string" || data.id !== historyId || !ID_PATTERN.test(data.id)) return false;
  if (typeof data.draft !== "string" || data.draft.length <= 0 || data.draft.length > MAX_DRAFT) return false;
  if (typeof data.result !== "string" || data.result.length <= 0 || data.result.length > MAX_RESULT) return false;
  if (typeof data.preview !== "string" || data.preview.length > MAX_PREVIEW) return false;
  if (typeof data.ts !== "number" || data.ts < MIN_TS || data.ts > MAX_TS) return false;
  return true;
};

describe("Firestore history rules contract", () => {
  it("keeps owner-only read/write and default deny in the rules file", () => {
    assert.match(rules, /allow read: if isOwner\(userId\);/);
    assert.match(rules, /allow delete: if isOwner\(userId\);/);
    assert.match(rules, /allow create, update: if isOwner\(userId\) && validHistoryDoc\(\);/);
    assert.match(rules, /request\.auth != null && request\.auth\.uid == uid/);
    assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);
  });

  it("accepts a valid owner history document", () => {
    assert.equal(canWriteHistory({
      authUid: "alice",
      userId: "alice",
      historyId: "hist_12345",
      data: validDoc(),
    }), true);
  });

  it("rejects cross-user writes, id mismatch, and extra fields", () => {
    assert.equal(canWriteHistory({
      authUid: "mallory",
      userId: "alice",
      historyId: "hist_12345",
      data: validDoc(),
    }), false);

    assert.equal(canWriteHistory({
      authUid: "alice",
      userId: "alice",
      historyId: "hist_12345",
      data: validDoc("other_123"),
    }), false);

    assert.equal(canWriteHistory({
      authUid: "alice",
      userId: "alice",
      historyId: "hist_12345",
      data: { ...validDoc(), owner: "alice" },
    }), false);
  });

  it("rejects invalid ids, timestamps, and oversized text fields", () => {
    const cases = [
      { ...validDoc("short"), id: "short" },
      { ...validDoc(), ts: MIN_TS - 1 },
      { ...validDoc(), ts: MAX_TS + 1 },
      { ...validDoc(), draft: "" },
      { ...validDoc(), draft: "界".repeat(MAX_DRAFT + 1) },
      { ...validDoc(), result: "" },
      { ...validDoc(), result: "界".repeat(MAX_RESULT + 1) },
      { ...validDoc(), preview: "界".repeat(MAX_PREVIEW + 1) },
    ];

    for (const data of cases) {
      assert.equal(canWriteHistory({
        authUid: "alice",
        userId: "alice",
        historyId: data.id,
        data,
      }), false);
    }
  });
});
