import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const filename = new URL("../functions/_lib/backend.ts", import.meta.url);
const source = readFileSync(filename, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: filename.pathname,
});
const moduleRecord = { exports: {} };
const context = vm.createContext({
  atob, btoa, console, crypto: globalThis.crypto, Date, Headers, JSON, Map, Math,
  Number, Object, Request, Response, Set, String, TextDecoder, TextEncoder, URL,
  URLSearchParams, fetch,
});
new vm.Script(`(function (exports, require, module) { ${outputText}\n})`, {
  filename: filename.pathname,
}).runInContext(context)(moduleRecord.exports, () => {
  throw new Error("Unexpected dependency");
}, moduleRecord);
const { calculateAuthoritativeOrder } = moduleRecord.exports;

const products = [
  { id: "p1", data: { name: "Serum", price: 50, image: "/p1.jpg", range: "A", category: "serums" } },
  { id: "p2", data: { name: "Cleanser", price: 30, image: "/p2.jpg", range: "B", category: "cleansers" } },
  { id: "gift", data: { name: "Gift", price: 20, image: "/gift.jpg", range: "G", category: "gifts" } },
];
const offers = [
  {
    id: "combo",
    data: {
      type: "combo",
      pickCount: 2,
      comboPrice: 60,
      eligibleProducts: ["p1", "p2"],
      uniqueOnly: true,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-01-01T00:00:00.000Z",
    },
  },
  {
    id: "gift-offer",
    data: {
      type: "free_product",
      minAmount: 50,
      eligibleProducts: ["gift"],
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-01-01T00:00:00.000Z",
    },
  },
];
const now = Date.parse("2026-10-29T00:00:00.000Z");

test("authoritative pricing ignores forged names, prices and free items", () => {
  const order = calculateAuthoritativeOrder({
    total: 110,
    items: [
      { id: "p1", name: "Fake", price: 0.01, quantity: 1 },
      { id: "p1__combo__combo", price: 0, quantity: 1 },
      { id: "p2__combo__combo", price: 0, quantity: 1 },
      { id: "gift__gift__gift-offer", price: 999, quantity: 1 },
    ],
  }, products, offers, now);

  assert.equal(order.total, 110);
  assert.equal(order.items[0].name, "Serum");
  assert.equal(order.items[0].price, 50);
  assert.equal(order.items.at(-1).price, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(order.appliedOffers.map((offer) => offer.type).sort())),
    ["combo", "free_product"]
  );
});

test("stale totals and forged unearned gifts are rejected", () => {
  assert.throws(() => calculateAuthoritativeOrder({
    total: 1,
    items: [{ id: "p1", quantity: 1 }, { id: "gift__gift__gift-offer", quantity: 1 }],
  }, products, offers, now), /Order total is stale/);

  assert.throws(() => calculateAuthoritativeOrder({
    total: 30,
    items: [{ id: "p2", quantity: 1 }, { id: "gift__gift__gift-offer", quantity: 1 }],
  }, products, offers, now), /Free gift selection is stale/);
});

test("invalid combo selections fail closed", () => {
  assert.throws(() => calculateAuthoritativeOrder({
    total: 60,
    items: [{ id: "p1__combo__combo", quantity: 2 }],
  }, products, offers, now), /Combo requires unique products/);
});

test("demo order status is derived only from authoritative catalog products", () => {
  const demoProducts = products.map((product) => ({
    ...product,
    data: { ...product.data, isDemo: true },
  }));
  const demoOrder = calculateAuthoritativeOrder({
    total: 50,
    isDemo: false,
    items: [{ id: "p1", quantity: 1 }],
  }, demoProducts, [], now);
  assert.equal(demoOrder.isDemo, true);

  const productionOrder = calculateAuthoritativeOrder({
    total: 50,
    isDemo: true,
    items: [{ id: "p1", quantity: 1 }],
  }, products, [], now);
  assert.equal(productionOrder.isDemo, false);
});
