/**
 * Fix hero display - upload working images to imgbb and update Firestore
 * Run: node scripts/fix-hero.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const IMGBB_API_KEY = "d14f65fb697224837b49489e5f8d8b57";

const firebaseConfig = {
  apiKey: "AIzaSyAIsq4QV6wxwMb8phPa3tU14p2NRSXvTdY",
  authDomain: "dimaboutique-b4f16.firebaseapp.com",
  projectId: "dimaboutique-b4f16",
  storageBucket: "dimaboutique-b4f16.firebasestorage.app",
  messagingSenderId: "438611658146",
  appId: "1:438611658146:web:83b1a97cfc42bd12aadefb",
};

const app = initializeApp(firebaseConfig);
const rawDb = getFirestore(app);

function getProjectDoc(collectionName, docId) {
  return doc(rawDb, "projects", "zitron", collectionName, docId);
}

async function uploadToImgbb(imageUrl, name) {
  try {
    console.log(`  Uploading: ${name}...`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`  Failed to download ${name}: ${response.status}`);
      return imageUrl;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64);
    formData.append("name", name);

    const uploadResponse = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await uploadResponse.json();
    if (data.success) {
      console.log(`  ✅ ${name} → ${data.data.url}`);
      return data.data.url;
    }
    console.log(`  ⚠️ Upload failed for ${name}`);
    return imageUrl;
  } catch (err) {
    console.log(`  ⚠️ Error: ${err.message}`);
    return imageUrl;
  }
}

async function main() {
  console.log("🔧 Fixing hero display...\n");

  // Upload banner image to imgbb
  const bannerUrl = await uploadToImgbb(
    "https://noreva-laboratoires.com/wp-content/uploads/2026/05/banner_launcher_home_2-1920x667.png",
    "zitron-hero-banner-1"
  );
  await new Promise(r => setTimeout(r, 1500));

  const mobileBannerUrl = await uploadToImgbb(
    "https://noreva-laboratoires.com/wp-content/uploads/2026/05/banner_hero_2_mobile.png",
    "zitron-hero-mobile-1"
  );
  await new Promise(r => setTimeout(r, 1500));

  // Videos stay on original URLs (imgbb doesn't host videos)
  const videoUrl1 = "https://noreva-laboratoires.com/wp-content/uploads/2026/05/16-2-1.mp4";
  const videoUrl2 = "https://noreva-laboratoires.com/wp-content/uploads/2026/05/Bergasol-eau-solaire.mp4";

  // Updated hero slides
  const heroSlides = [
    {
      id: "slide-1",
      type: "image",
      url: bannerUrl,
      mobileUrl: mobileBannerUrl,
      title: "العناية بالبشرة المتقدمة",
      subtitle: "حلول ديرماتولوجية فرنسية لجمال بشرتك الطبيعي",
      order: 1,
    },
    {
      id: "slide-2",
      type: "video",
      url: videoUrl1,
      title: "تقنية متطورة",
      subtitle: "أبحاث علمية لبشرة صحية",
      order: 2,
    },
    {
      id: "slide-3",
      type: "video",
      url: videoUrl2,
      title: "حماية من الشمس",
      subtitle: "حماية فائقة مع ملمس خفيف",
      order: 3,
    },
  ];

  console.log("\n🔥 Updating Firestore heroDisplay...");
  for (const slide of heroSlides) {
    await setDoc(getProjectDoc("heroDisplay", slide.id), slide);
    console.log(`  ✅ ${slide.id} (${slide.type})`);
  }

  // Delete old slide-3 and slide-4 that had broken URLs
  const { deleteDoc } = await import("firebase/firestore");
  try {
    await deleteDoc(getProjectDoc("heroDisplay", "slide-4"));
    console.log("  🗑️ Deleted old slide-4");
  } catch (e) {}

  console.log("\n✨ Hero display fixed!");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
