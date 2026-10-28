import assert from "node:assert/strict";
import test from "node:test";
import { digest, sanitizeRecord } from "../scripts/migrate-to-d1.mjs";

test("migration preserves customer records and excludes worker credentials from snapshots", () => {
  const customer = { name: "Demo", phone: "0000000000", locations: [{ city: "Demo city" }] };
  assert.deepEqual(sanitizeRecord("users", customer), customer);
  const worker = { name: "Worker", email: "worker@example.test", password: "old-exposed-password", role: "worker" };
  assert.deepEqual(sanitizeRecord("workers", worker), {
    name: "Worker", email: "worker@example.test", role: "worker", disabled: true,
  });
  assert.equal(worker.password, "old-exposed-password");
});

test("migration receipts ignore key order but detect changed nested data", () => {
  assert.equal(digest({ b: 2, a: { y: 4, x: 3 } }), digest({ a: { x: 3, y: 4 }, b: 2 }));
  assert.notEqual(digest({ locations: [{ city: "A" }] }), digest({ locations: [{ city: "B" }] }));
});
