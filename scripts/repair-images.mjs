import { mkdir, readFile, writeFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, terminate, updateDoc } from "firebase/firestore";

const origin = "https://noreva-laboratoires.com/wp-content/uploads/";
const productSources = {
  "exfoliac-anti-imperfections-mask": "2022/11/Visuel_Produit_800x1000_Exfoliac_Masque_Purifiant_50ml.png",
  "exfoliac-foaming-gel": "2022/11/Visuel_Produit_1520x1340_Exfoliac_Gel_Moussant_Doux_200ml.png",
  "exfoliac-global-6": "2022/11/Noreva_Produit_Exfoliac_Global6pro_Vignette_896x1080.png",
  "hexaphane-shampoo": "2025/04/Visuel_Produit_800x1000_Hexaphane_ShampoingAntichute_250ml.png",
  "sensidiane-ar-cc-cream-light": "2022/10/Visuel_Produit_800x1000_SensidianeAR_SoinARCC_40ml-1.png",
  "sensidiane-micellar-water": "2022/10/Sensidiane_P01674-Eau-micellaire-demaquillante-apaisante-400ml_610x733px-3.png",
  "sensidiane-soothing-cream": "2022/10/Sensidiane_P01002-Creme-legere-apaisante-40ml_610x733px.png",
};
// These seed records previously displayed unrelated products. Do not misrepresent them.
const needsPhoto = ["norelift-chrono-filler-serum", "norelift-night-cream", "sunactive-spf50-cream", "trio-white-serum", "xerodiane-plus-cream"];
const assets = [
  ["https://i.ibb.co/LX1svn0G/zitron-logo.png", "zitron-logo.png"],
  ["https://i.ibb.co/VWNkFrSq/zitron-hero-banner-1.webp", "hero-desktop.webp"],
  ["https://i.ibb.co/dsgKPWCW/zitron-hero-mobile-1.png", "hero-mobile.png"],
];
const apply = process.argv.includes("--apply");
const source = await readFile(new URL("../src/lib/firebase.ts", import.meta.url), "utf8");
const config = Object.fromEntries([...source.matchAll(/^\s+(\w+): "([^"]+)",?$/gm)].map((match) => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
async function download(url, file) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(`Image download failed (${response.status}): ${url}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > 24 * 1024 * 1024) throw new Error(`Invalid image size: ${url}`);
  await writeFile(new URL(`../public/images/${file}`, import.meta.url), data);
}
try {
  await mkdir(new URL("../public/images/catalog/", import.meta.url), { recursive: true });
  for (const [url, file] of assets) await download(url, file);
  for (const [id, path] of Object.entries(productSources)) {
    await download(origin + path, `catalog/${id}.png`);
    if (apply) await updateDoc(doc(db, "projects", "zitron", "products", id), {
      image: `/images/catalog/${id}.png`, images: [`/images/catalog/${id}.png`],
      imageSource: origin + path, imageStatus: "verified",
    });
    console.log(`Verified packshot: ${id}`);
  }
  if (apply) {
    for (const id of needsPhoto) await updateDoc(doc(db, "projects", "zitron", "products", id), {
      image: "/images/product-unavailable.svg", images: ["/images/product-unavailable.svg"],
      imageStatus: "needs-photo",
    });
    const hero = doc(db, "projects", "zitron", "heroDisplay", "slide-1");
    if ((await getDoc(hero)).exists()) await updateDoc(hero, { url: "/images/hero-desktop.webp", mobileUrl: "/images/hero-mobile.png" });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "download-only", verified: Object.keys(productSources).length, needsPhoto }));
} finally {
  await terminate(db);
}
