import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadAdminModule() {
  const filename = new URL("src/lib/admin.ts", root);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename.pathname,
  });
  const moduleRecord = { exports: {} };
  const context = vm.createContext({ Intl, JSON, Number, Object, String, URL });
  const wrapper = new vm.Script(`(function (exports, require, module) { ${outputText}\n})`, {
    filename: filename.pathname,
  }).runInContext(context);

  wrapper(moduleRecord.exports, (request) => {
    if (request === "@/lib/categories") return { PRODUCT_CATEGORIES: [{ id: "sun", label: "الحماية من الشمس" }] };
    throw new Error(`Unexpected import: ${request}`);
  }, moduleRecord);

  return moduleRecord.exports;
}

const admin = loadAdminModule();

test("product serialization omits cleared optional Firestore fields", () => {
  const payload = admin.serializeProductForSave({
    id: "product-1",
    name: "منتج",
    nameEn: "Product",
    range: "",
    rangeId: "",
    category: "sun",
    price: 99,
    rating: 5,
    reviews: 0,
    image: "https://example.test/product.jpg",
    images: ["https://example.test/product.jpg"],
    description: "",
    benefits: [],
    ingredients: "",
    howToUse: "",
    volume: "",
    skinType: [],
    oldPrice: undefined,
    badge: undefined,
  });

  assert.equal("oldPrice" in payload, false);
  assert.equal("badge" in payload, false);
});
