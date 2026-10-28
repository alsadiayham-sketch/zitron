import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

function loadAdapter(fetch) {
  const output = ts.transpileModule(source("src/lib/store-data.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleRecord = { exports: {} };
  const context = vm.createContext({
    console, fetch, URLSearchParams,
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    setTimeout: () => 1, clearTimeout() {},
  });
  const wrapper = new vm.Script(`(function(exports,require,module){${output}\n})`).runInContext(context);
  wrapper(moduleRecord.exports, (name) => {
    assert.equal(name, "@/lib/firebase");
    return { auth: { authStateReady: async () => {}, currentUser: null } };
  }, moduleRecord);
  return moduleRecord.exports;
}

const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const response = (data) => ({ ok: true, json: async () => data });

test("frontend data access uses the authenticated API adapter, not Firestore", () => {
  const files = [
    "src/context/AuthContext.tsx",
    "src/app/checkout/page.tsx",
    "src/app/track/page.tsx",
    "src/app/admin/layout.tsx",
    "src/lib/firebase-hooks.ts",
  ];
  for (const file of files) {
    assert.doesNotMatch(source(file), /firebase\/firestore/);
  }
  assert.match(source("src/lib/store-data.ts"), /authStateReady\(\)/);
  assert.match(source("src/lib/store-data.ts"), /X-Zitron-Request/);
  assert.match(source("src/lib/store-data.ts"), /credentials:\s*"same-origin"/);
  assert.doesNotMatch(source("src/lib/admin.ts"), /api\.imgbb|ImgBB|d14f65/);
  assert.match(source("src/lib/admin.ts"), /\/api\/upload/);
});

test("admin sessions have no browser storage authority or embedded password", () => {
  const admin = source("src/lib/admin.ts");
  const layout = source("src/app/admin/layout.tsx");
  assert.doesNotMatch(admin, /sessionStorage|localStorage/);
  assert.doesNotMatch(layout, /ADMIN_PASSWORD|ADMIN_USERNAME/);
  assert.match(layout, /fetch\("\/api\/session"/);
  assert.match(layout, /fetch\("\/api\/login"/);
});

test("saved changes refresh active subscriptions without waiting for the polling interval", async () => {
  let price = 10;
  const adapter = loadAdapter(async (_url, init) => {
    if (init.method === "POST") {
      price = JSON.parse(init.body).data.price;
      return response({});
    }
    return response({ docs: [{ id: "product", data: { price } }] });
  });
  const prices = [];
  const unsubscribe = adapter.onSnapshot(adapter.getCollection("products"), snapshot => prices.push(snapshot.docs[0].data().price));
  await nextTurn();
  await adapter.setDoc(adapter.getDocRef("products", "product"), { price: 12 });
  assert.deepEqual(prices, [10, 12]);
  unsubscribe();
});

test("a write during an in-flight read queues a fresh read before completing", async () => {
  let release;
  let reads = 0;
  let price = 10;
  const adapter = loadAdapter(async (_url, init) => {
    if (init.method === "POST") {
      price = JSON.parse(init.body).data.price;
      return response({});
    }
    reads++;
    if (reads === 1) return new Promise(resolve => { release = () => resolve(response({ docs: [{ id: "product", data: { price: 10 } }] })); });
    return response({ docs: [{ id: "product", data: { price } }] });
  });
  const prices = [];
  const unsubscribe = adapter.onSnapshot(adapter.getCollection("products"), snapshot => prices.push(snapshot.docs[0].data().price));
  await nextTurn();
  const save = adapter.setDoc(adapter.getDocRef("products", "product"), { price: 12 });
  await nextTurn();
  release();
  await save;
  assert.equal(reads, 2);
  assert.equal(prices.at(-1), 12);
  unsubscribe();
});

test("unsubscribing suppresses stale responses after an account or page change", async () => {
  let release;
  const adapter = loadAdapter(() => new Promise(resolve => { release = () => resolve(response({ docs: [{ id: "user", data: { name: "Old account" } }] })); }));
  let received = 0;
  const unsubscribe = adapter.onSnapshot(adapter.getCollection("users"), () => { received++; });
  await nextTurn();
  unsubscribe();
  release();
  await nextTurn();
  assert.equal(received, 0);
});
