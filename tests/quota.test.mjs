import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);
const {
  DAILY_LIMIT_ANON,
  DAILY_LIMIT_AUTHED,
  QuotaExceededError,
  applyQuotaIncrement,
  applyQuotaRefund,
} = require("../functions/lib/quota.js");

const today = "2026-05-20";

describe("quota transaction helpers", () => {
  it("increments a new daily quota document with a server event id", () => {
    const mutation = applyQuotaIncrement(undefined, today, true, "evt_a");

    assert.equal(mutation.changed, true);
    assert.deepEqual(mutation.data, {
      date: today,
      count: 1,
      batches: { evt_a: true },
    });
  });

  it("does not double-charge the same accepted request", () => {
    const doc = { date: today, count: 3, batches: { evt_a: true } };
    const mutation = applyQuotaIncrement(doc, today, true, "evt_a");

    assert.deepEqual(mutation, { changed: false });
    assert.deepEqual(doc, { date: today, count: 3, batches: { evt_a: true } });
  });

  it("resets count and event ids on a new day", () => {
    const mutation = applyQuotaIncrement(
      { date: "2026-05-19", count: DAILY_LIMIT_ANON, batches: { old_evt: true } },
      today,
      true,
      "evt_new",
    );

    assert.equal(mutation.changed, true);
    assert.deepEqual(mutation.data, {
      date: today,
      count: 1,
      batches: { evt_new: true },
    });
  });

  it("rejects requests at anonymous and signed-in daily limits", () => {
    assert.throws(
      () => applyQuotaIncrement({ date: today, count: DAILY_LIMIT_ANON, batches: {} }, today, true, "evt_over"),
      QuotaExceededError,
    );
    assert.throws(
      () => applyQuotaIncrement({ date: today, count: DAILY_LIMIT_AUTHED, batches: {} }, today, false, "evt_over"),
      QuotaExceededError,
    );
  });

  it("refunds a charged request once and keeps count non-negative", () => {
    const refunded = applyQuotaRefund({ date: today, count: 1, batches: { evt_a: true } }, today, "evt_a");

    assert.equal(refunded.changed, true);
    assert.deepEqual(refunded.data, { date: today, count: 0, batches: {} });

    assert.deepEqual(applyQuotaRefund(refunded.data, today, "evt_a"), { changed: false });
  });

  it("does not refund missing or previous-day events", () => {
    assert.deepEqual(applyQuotaRefund(undefined, today, "evt_a"), { changed: false });
    assert.deepEqual(
      applyQuotaRefund({ date: "2026-05-19", count: 1, batches: { evt_a: true } }, today, "evt_a"),
      { changed: false },
    );
    assert.deepEqual(
      applyQuotaRefund({ date: today, count: 1, batches: { other: true } }, today, "evt_a"),
      { changed: false },
    );
  });
});
