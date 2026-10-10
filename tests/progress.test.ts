import test from "node:test";
import assert from "node:assert/strict";
import { editDraft, emptyProgress, isComplete, markComplete, parseProgress, sourceFor } from "../src/lib/progress";
import { exercises, upstream } from "../src/lib/exercises";
import { isVerified } from "../src/lib/compiler";

const exercise = exercises.find((item) => item.id === "intro2")!;

test("a completed draft survives JSON export/import", () => {
  const source = 'fn main() { println!("Hello, Rust!"); }';
  const progress = markComplete(editDraft(emptyProgress(), exercise, source), exercise, source);
  const restored = parseProgress(JSON.stringify(progress));
  assert.equal(sourceFor(restored, exercise), source);
  assert.equal(isComplete(restored, exercise), true);
});

test("editing a verified solution clears completion, even if the edit is later undone", () => {
  const progress = markComplete(emptyProgress(), exercise, exercise.source);
  const changed = editDraft(progress, exercise, "fn main() {}");
  assert.equal(isComplete(changed, exercise), false);
  assert.equal(isComplete(editDraft(changed, exercise, exercise.source), exercise), false);
});

test("a compile finishing after the user edited cannot complete the newer source", () => {
  const changed = editDraft(emptyProgress(), exercise, "fn main() {}");
  assert.equal(isComplete(markComplete(changed, exercise, exercise.source), exercise), false);
});

test("imports reject different corpora, unknown exercises and inconsistent completion", () => {
  const progress = emptyProgress();
  assert.throws(() => parseProgress(JSON.stringify({ ...progress, corpus: "old-version" })));
  assert.throws(() => parseProgress(JSON.stringify({ ...progress, drafts: { __proto__: null, nonexistent: "code" } })));
  assert.throws(() => parseProgress(JSON.stringify({ ...progress, completed: { [exercise.id]: { source: "wrong source", at: new Date().toISOString() } } })));
  assert.throws(() => parseProgress('{"version":1,"corpus":"' + upstream.commit + '","selected":"intro1","drafts":{"__proto__":"code"},"completed":{}}'));
});

test("imports reject invalid timestamps, huge payloads, arrays and malformed JSON", () => {
  const progress = emptyProgress();
  assert.throws(() => parseProgress(JSON.stringify({ ...progress, completed: { [exercise.id]: { source: exercise.source, at: "never" } } })));
  assert.throws(() => parseProgress(" ".repeat(2_000_001)));
  assert.throws(() => parseProgress(JSON.stringify({ ...progress, drafts: [] })));
  assert.throws(() => parseProgress("not json"));
});

test("native-only exercises never receive browser completion", () => {
  for (const item of exercises.filter((item) => item.limitation)) {
    assert.equal(isVerified(item, { ok: true, passed: 5 }), false);
    assert.equal(isComplete(markComplete(emptyProgress(), item, item.source), item), false);
  }
});

test("test exercises require at least one passing test; compilation alone is insufficient", () => {
  const item = exercises.find((item) => item.test && !item.limitation)!;
  assert.equal(isVerified(item, { ok: true }), false);
  assert.equal(isVerified(item, { ok: true, passed: 0 }), false);
  assert.equal(isVerified(item, { ok: false, passed: 1 }), false);
  assert.equal(isVerified(item, { ok: true, passed: 1 }), true);
  assert.equal(isVerified(exercise, { ok: true }), true);
  assert.equal(isVerified(exercise, { ok: true, verification: "check-only" }), false);
  assert.equal(isVerified(item, { ok: true, passed: 1, verification: "check-only" }), false);
});

test("the bundled release has unique IDs, stable order and all upstream exercises", () => {
  assert.equal(exercises.length, upstream.count);
  assert.equal(new Set(exercises.map((item) => item.id)).size, exercises.length);
  exercises.forEach((item, index) => {
    assert.equal(item.order, index);
    assert.ok(item.source.length > 0);
    assert.ok(item.path.endsWith(`${item.id}.rs`));
  });
});
