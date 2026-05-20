import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "fantasy-lore-guardian-rules-test";
let testEnv;

const validHistory = (id = "hist_12345678") => ({
  id,
  ts: 1760000000000,
  draft: "The knight entered the keep.",
  result: "The knight entered the keep.",
  preview: "The knight entered the keep.",
});

describe("Firestore emulator rules", () => {
  before(async () => {
    assert.ok(
      process.env.FIRESTORE_EMULATOR_HOST,
      "Run with `npm run test:rules` so Firestore emulator is available.",
    );

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });

    await testEnv.clearFirestore();
  });

  after(async () => {
    await testEnv?.cleanup();
  });

  it("allows an owner to create, read, update, and delete a valid history document", async () => {
    const db = testEnv.authenticatedContext("owner-a").firestore();
    const ref = doc(db, "users/owner-a/history/hist_12345678");

    await assertSucceeds(setDoc(ref, validHistory()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { preview: "Updated preview" }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("rejects anonymous access and cross-user reads/writes", async () => {
    const ownerDb = testEnv.authenticatedContext("owner-b").firestore();
    const otherDb = testEnv.authenticatedContext("owner-c").firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const ref = doc(ownerDb, "users/owner-b/history/hist_abcdefgh");

    await assertSucceeds(setDoc(ref, validHistory("hist_abcdefgh")));
    await assertFails(getDoc(doc(otherDb, "users/owner-b/history/hist_abcdefgh")));
    await assertFails(setDoc(doc(otherDb, "users/owner-b/history/hist_cross"), validHistory("hist_cross")));
    await assertFails(getDoc(doc(anonDb, "users/owner-b/history/hist_abcdefgh")));
  });

  it("rejects invalid fields, id mismatch, and oversized content", async () => {
    const db = testEnv.authenticatedContext("owner-d").firestore();

    await assertFails(setDoc(
      doc(db, "users/owner-d/history/hist_badextra"),
      { ...validHistory("hist_badextra"), extra: true },
    ));
    await assertFails(setDoc(
      doc(db, "users/owner-d/history/hist_mismatch"),
      validHistory("different_id"),
    ));
    await assertFails(setDoc(
      doc(db, "users/owner-d/history/hist_toolong"),
      { ...validHistory("hist_toolong"), draft: "x".repeat(8193) },
    ));
  });

  it("keeps default deny outside users/{uid}/history/{id}", async () => {
    const db = testEnv.authenticatedContext("owner-e").firestore();

    await assertFails(setDoc(doc(db, "users/owner-e/private/profile"), { ok: true }));
    await assertFails(setDoc(doc(db, "system/settings"), { ok: true }));
  });
});
