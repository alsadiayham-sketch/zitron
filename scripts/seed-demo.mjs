import { mkdir, writeFile } from "node:fs/promises";
import { createD1RecordIfAbsent } from "./d1-data.mjs";

const apply = process.argv.includes("--apply");
const now = new Date().toISOString();
const categories = [
  ["sun", "الحماية من الشمس", "sunactive", "صن أكتيف"],
  ["serums", "السيروم", "norelift", "نوريليف"],
  ["day-care", "العناية النهارية", "sensidiane", "سنسيديان"],
  ["night-care", "العناية الليلية", "norelift", "نوريليف"],
  ["tinted", "العناية الملونة", "sensidiane", "سنسيديان"],
  ["body", "العناية بالجسم", "xerodiane", "زيروديان"],
  ["cleansers", "المنظفات", "exfoliac", "إكسفولياك"],
  ["micellar", "ماء ميسيلار", "sensidiane", "سنسيديان"],
  ["shampoos", "الشامبو", "hexaphane", "هيكسافان"],
  ["deodorants", "مزيلات العرق", "deoliane", "ديوليان"],
  ["masks", "الأقنعة", "exfoliac", "إكسفولياك"],
  ["hands", "العناية باليدين", "xerodiane", "زيروديان"],
  ["feet", "العناية بالقدمين", "xerodiane", "زيروديان"],
  ["lotions", "اللوشن", "trio-white", "تريو وايت"],
  ["eye-lip", "محيط العين والشفاه", "norelift", "نوريليف"],
  ["body-cleansers", "منظفات الجسم", "xerodiane", "زيروديان"],
];
const products = categories.map(([category, label, rangeId, range], index) => ({
  id: `demo-${category}`,
  name: `${label} - نموذج تجريبي`,
  nameEn: `ZITRON Demo ${category}`,
  category, rangeId, range,
  price: 25 + index * 5,
  rating: 0, reviews: 0, badge: "تجريبي",
  image: `/images/demo/${category}.svg`,
  images: [`/images/demo/${category}.svg`],
  description: "بيانات تجريبية لاختبار التصفح والسلة والطلبات. هذا ليس منتجاً حقيقياً للبيع.",
  benefits: ["عنصر تجريبي لاختبار المتجر"],
  ingredients: "غير مطبق على البيانات التجريبية.",
  howToUse: "للاختبار فقط، لا يُشحن ولا يُستخدم على البشرة.",
  volume: "نموذج تجريبي",
  skinType: ["جافة", "دهنية", "حساسة", "مختلطة"],
  isDemo: true,
}));
const records = products.map(({ id, ...data }) => ({ collection: "products", id, data }));
const statuses = ["new", "processing", "prepared", "out_for_delivery", "completed", "declined"];
for (let index = 0; index < 12; index++) {
  const number = String(index + 1).padStart(3, "0");
  records.push({ collection: "users", id: `demo-customer-${number}`, data: {
    name: `عميل تجريبي ${number}`, email: `customer-${number}@zitron.example`, phone: "0000000000",
    createdAt: now, orders: 2, isDemo: true,
    locations: [{ id: `demo-address-${number}`, label: "عنوان تجريبي", city: ["رام الله", "القدس", "نابلس"][index % 3], fullAddress: "عنوان تجريبي - لا يتم التوصيل", isDefault: true }],
  } });
}
for (let index = 0; index < 24; index++) {
  const product = products[index % products.length];
  const customerNumber = String(index % 12 + 1).padStart(3, "0");
  const quantity = index % 3 + 1;
  records.push({ collection: "orders", id: `demo-order-${String(index + 1).padStart(3, "0")}`, data: {
    orderId: `ZT-DEMO${String(index + 1).padStart(3, "0")}`,
    userId: `demo-customer-${customerNumber}`, customerName: `عميل تجريبي ${customerNumber}`,
    customerPhone: "0000000000", city: ["رام الله", "القدس", "نابلس"][index % 3],
    customerAddress: "عنوان تجريبي - لا يتم التوصيل", status: statuses[index % statuses.length],
    date: new Date(Date.now() - index * 86400000).toISOString(),
    notes: "DEMO: طلب تجريبي لا يُنفّذ ولا يُشحن.", isDemo: true,
    items: [{ id: product.id, name: product.name, image: product.image, price: product.price, quantity, range: product.range }],
    total: product.price * quantity, appliedOffers: [],
  } });
}
records.push(
  { collection: "offers", id: "demo-combo", data: { type: "combo", title: "عرض تجريبي: اختر منتجين بـ 40 شيكل", eligibleProducts: products.slice(0, 6).map(p => p.id), pickCount: 2, comboPrice: 40, uniqueOnly: true, createdAt: now, isDemo: true } },
  { collection: "offers", id: "demo-gift", data: { type: "free_product", title: "هدية تجريبية عند شراء نموذجين تجريبيين", minQuantity: 2, targetSections: ["deodorants"], eligibleProducts: ["demo-hands"], createdAt: now, isDemo: true } },
  { collection: "offers", id: "demo-shipping", data: { type: "free_shipping", title: "عرض تجريبي: توصيل مجاني لطلبات النماذج من 100 شيكل", minAmount: 100, targetSections: ["deodorants", "feet"], createdAt: now, isDemo: true } },
);

async function main() {
  await mkdir(new URL("../public/images/demo/", import.meta.url), { recursive: true });
  for (const [index, product] of products.entries()) {
    const color = ["#1b3a6b", "#285747", "#633d65", "#70482f"][index % 4];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="#f4f5f7"/><rect x="100" y="140" width="400" height="460" rx="12" fill="${color}"/><text x="300" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" fill="white">ZITRON</text><text x="300" y="350" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="white">${product.category.toUpperCase()}</text><text x="300" y="465" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="white">DEMO / NOT FOR SALE</text><text x="300" y="540" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="white">${String(index + 1).padStart(2, "0")}</text></svg>`;
    await writeFile(new URL(`../public/images/demo/${product.category}.svg`, import.meta.url), svg);
  }
  let created = 0;
  for (const record of records) {
    if (!apply) continue;
    const inserted = await createD1RecordIfAbsent(record.collection, record.id, record.data);
    if (inserted) created++;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", planned: records.length, created, products: products.length, customers: 12, orders: 24, offers: 3 }));
}
await main();
