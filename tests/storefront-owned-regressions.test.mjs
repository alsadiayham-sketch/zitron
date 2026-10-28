import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadTypeScriptModule(relativePath, mocks = {}) {
  const filename = new URL(relativePath, root);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename.pathname,
  });
  const moduleRecord = { exports: {} };
  const context = vm.createContext({
    console,
    crypto: globalThis.crypto,
    Date,
    JSON,
    Math,
    Map,
    Number,
    Object,
    Set,
    String,
    URLSearchParams,
  });
  const wrapper = new vm.Script(`(function (exports, require, module) { ${outputText}\n})`, {
    filename: filename.pathname,
  }).runInContext(context);

  wrapper(moduleRecord.exports, (request) => {
    if (request in mocks) return mocks[request];
    throw new Error(`Unexpected import in ${relativePath}: ${request}`);
  }, moduleRecord);

  return moduleRecord.exports;
}

const offerIdSeparator = "__combo__";
const offers = loadTypeScriptModule("src/lib/offers.ts", {
  "@/lib/categories": { CATEGORY_LABELS: {} },
});

const cart = loadTypeScriptModule("src/context/CartContext.tsx", {
  react: {
    createContext: () => ({}),
    useCallback: (value) => value,
    useContext: () => null,
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useState: () => [undefined, () => {}],
  },
  "react/jsx-runtime": { jsx: () => null },
  "@/lib/offers": {
    getComboOfferIdFromItemId: (id) => id.split(offerIdSeparator)[1] ?? null,
    isComboCartItemId: (id) => id.includes(offerIdSeparator),
  },
});

const orders = loadTypeScriptModule("src/lib/order-utils.ts", {
  "@/lib/admin": {
    formatCurrency: (value) => String(value),
    formatDate: (value) => String(value),
    ORDER_STATUS_LABELS: {},
  },
});

const catalog = loadTypeScriptModule("src/lib/catalog.ts");

test("catalog honors deep-linked category, range, skin and search filters", () => {
  const products = [
    { id: "cleanser", category: "cleansers", rangeId: "exfoliac", name: "غسول", nameEn: "Foaming Gel", range: "Exfoliac", skinType: ["دهنية"] },
    { id: "serum", category: "serums", rangeId: "norelift", name: "سيروم", nameEn: "Serum", range: "Norelift", skinType: ["جافة"] },
  ];
  for (const query of ["cat=cleansers", "range=exfoliac", "skin=oily", "q=foaming", "cat=hygiene"]) {
    assert.equal(catalog.filterProducts(products, new URLSearchParams(query))[0]?.id, "cleanser");
    assert.equal(catalog.filterProducts(products, new URLSearchParams(query)).length, 1);
  }
  assert.equal(catalog.filterProducts(products, new URLSearchParams("cat=serums&range=exfoliac")).length, 0);
});

test("stored cart hydration rejects malformed data and merges duplicate lines", () => {
  const parsed = cart.parseStoredCart(JSON.stringify([
    { id: "p1", name: "منتج", price: 10, quantity: 2, image: "", range: "" },
    { id: "p1", name: "منتج", price: 10, quantity: 3, image: "", range: "" },
    { id: "bad", name: "", price: -1, quantity: 1 },
    { id: "p2", name: "آخر", price: 5, quantity: 500 },
  ]));

  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), [
    { id: "p1", name: "منتج", price: 10, quantity: 5, image: "", range: "" },
    { id: "p2", name: "آخر", price: 5, quantity: 99, image: "", range: "" },
  ]);
  assert.equal(cart.parseStoredCart("{broken").length, 0);
});

test("combo items preserve the exact configured total and duplicate quantity", () => {
  const product = {
    id: "p1",
    name: "منتج",
    image: "/p.png",
    range: "مجموعة",
  };
  const offer = {
    id: "combo-1",
    type: "combo",
    title: "عرض",
    pickCount: 3,
    comboPrice: 100,
    uniqueOnly: false,
    eligibleProducts: ["p1"],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const items = offers.buildComboCartItems(offer, ["p1", "p1", "p1"], new Map([["p1", product]]));

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.ok(Math.abs(items[0].price * items[0].quantity - 100) < Number.EPSILON * 100);
});

test("combo selection and offer dates fail closed", () => {
  const uniqueOffer = {
    id: "combo-2",
    type: "combo",
    title: "عرض",
    pickCount: 2,
    comboPrice: 50,
    uniqueOnly: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const product = { id: "p1", name: "منتج", image: "", range: "" };

  assert.equal(
    offers.buildComboCartItems(uniqueOffer, ["p1", "p1"], new Map([["p1", product]])).length,
    0
  );
  assert.equal(offers.isOfferActive({ ...uniqueOffer, startDate: "not-a-date" }), false);
  assert.equal(
    offers.isOfferActive(
      { ...uniqueOffer, startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-31T23:59:59.000Z" },
      new Date("2026-10-28T12:00:00.000Z")
    ),
    true
  );
});

test("regular cart items reject deleted products and stale catalog prices", () => {
  const items = [
    { id: "deleted", name: "محذوف", price: 10, quantity: 1, image: "", range: "" },
    { id: "changed", name: "قديم", price: 15, quantity: 1, image: "", range: "" },
    { id: "current", name: "حالي", price: 20, quantity: 1, image: "", range: "" },
    { id: "combo__combo__offer-1", name: "عرض", price: 5, quantity: 1, image: "", range: "" },
  ];
  const productMap = new Map([
    ["changed", { id: "changed", price: 17 }],
    ["current", { id: "current", price: 20 }],
  ]);

  const issues = offers.getRegularCartCatalogIssues(items, productMap);
  assert.deepEqual(
    JSON.parse(JSON.stringify(issues.map((issue) => ({ id: issue.item.id, type: issue.type })))),
    [
      { id: "deleted", type: "deleted" },
      { id: "changed", type: "price_changed" },
    ]
  );
});

test("order normalization removes invalid lines and normalizes phone and totals", () => {
  const order = orders.normalizeOrder("doc-1", {
    orderId: "ZT-ABC12345",
    items: [
      { id: "p1", name: "منتج", quantity: 2, price: 12.5 },
      { id: "bad", name: "تالف", quantity: 0, price: 10 },
    ],
    customerPhone: "(059) 123-4567",
    customerAddress: "القدس، شارع المثال",
    total: "not-a-number",
    status: "cancelled",
    date: "invalid",
  });

  assert.equal(order.items.length, 1);
  assert.equal(order.total, 25);
  assert.equal(order.customerPhone, "0591234567");
  assert.equal(order.city, "القدس");
  assert.equal(order.status, "declined");
  assert.ok(Number.isFinite(Date.parse(order.date)));
});
