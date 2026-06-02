/**
 * Script to upload product images to imgbb and seed Firebase Firestore
 * Run: node scripts/seed-firebase.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";

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
const PROJECT_ID = "zitron";

function getProjectCollection(name) {
  return collection(doc(rawDb, "projects", PROJECT_ID), name);
}

function getProjectDoc(collectionName, docId) {
  return doc(rawDb, "projects", PROJECT_ID, collectionName, docId);
}

// Upload image URL to imgbb
async function uploadToImgbb(imageUrl, name) {
  try {
    console.log(`  Uploading: ${name}...`);
    // Download image as base64
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`  ⚠️ Failed to download ${name}: ${response.status}`);
      return imageUrl; // fallback to original URL
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Upload to imgbb
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64);
    formData.append("name", name);

    const uploadResponse = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.log(`  ⚠️ imgbb upload failed for ${name}: ${uploadResponse.status}`);
      return imageUrl;
    }

    const data = await uploadResponse.json();
    if (data.success) {
      console.log(`  ✅ ${name} → ${data.data.url}`);
      return data.data.url;
    }
    return imageUrl;
  } catch (err) {
    console.log(`  ⚠️ Error uploading ${name}: ${err.message}`);
    return imageUrl;
  }
}

// Product data
const products = [
  {
    id: "sensidiane-ar-cc-cream-light",
    name: "كريم CC مصحح اللون - درجة فاتحة",
    nameEn: "SENSIDIANE AR+ CC Cream Light",
    range: "سنسيديان AR+",
    rangeId: "sensidiane",
    category: "tinted",
    price: 159,
    rating: 5,
    reviews: 128,
    badge: "الأكثر مبيعاً",
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2022/10/Visuel_Produit_800x1000_SensidianeAR_SoinARCC_40ml-1.png"],
    description: "كريم CC مصحح للون مع حماية SPF30 مصمم خصيصاً للبشرة الحساسة والمعرضة للاحمرار. يوحد لون البشرة ويخفي الاحمرار بشكل فوري مع تقديم عناية طويلة الأمد.",
    benefits: ["يخفي الاحمرار فوراً", "يوحد لون البشرة", "حماية SPF30", "يهدئ البشرة الحساسة", "ترطيب يدوم 24 ساعة"],
    ingredients: "ماء، سيكلوبنتاسيلوكسان، ثاني أكسيد التيتانيوم، غليسرين، حمض الهيالورونيك، فيتامين E، مستخلص العرقسوس",
    howToUse: "يوزع بالتساوي على الوجه والرقبة صباحاً بعد السيروم. يمكن استخدامه وحده أو كقاعدة للمكياج.",
    volume: "40 مل",
    skinType: ["حساسة", "جافة", "عادية"],
  },
  {
    id: "exfoliac-global-6",
    name: "كريم العناية الشاملة 6 في 1",
    nameEn: "EXFOLIAC Global 6",
    range: "إكسفولياك",
    rangeId: "exfoliac",
    category: "day-care",
    price: 139,
    rating: 4,
    reviews: 95,
    badge: "جديد",
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2023/09/Visuel_Produit_800x1000_Exfoliac_Global_XPRO_30ml.png"],
    description: "كريم متعدد الوظائف 6 في 1 للبشرة المعرضة للشوائب. يعالج حب الشباب والبقع والمسام الواسعة واللمعان الزائد مع ترطيب البشرة وحمايتها.",
    benefits: ["يقلل حب الشباب", "يضيق المسام", "يزيل اللمعان", "يفتح البقع الداكنة", "يرطب البشرة", "يحمي من الأشعة فوق البنفسجية"],
    ingredients: "ماء، نياسيناميد، حمض الساليسيليك، زنك PCA، مستخلص الشاي الأخضر، حمض الأزيليك، غليسرين",
    howToUse: "يوضع صباحاً ومساءً على بشرة نظيفة. تجنب منطقة العينين.",
    volume: "30 مل",
    skinType: ["دهنية", "مختلطة", "معرضة لحب الشباب"],
  },
  {
    id: "sensidiane-soothing-cream",
    name: "كريم مهدئ للبشرة الحساسة",
    nameEn: "SENSIDIANE Soothing Cream",
    range: "سنسيديان",
    rangeId: "sensidiane",
    category: "day-care",
    price: 129,
    rating: 5,
    reviews: 203,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2022/10/Visuel_Produit_800x1000_SensidianeAR_SoinARintensif_30ml-1.png"],
    description: "كريم مهدئ خفيف الملمس للبشرة الحساسة والتفاعلية. يقوي حاجز البشرة ويقلل الشعور بالانزعاج والاحمرار.",
    benefits: ["يهدئ البشرة فوراً", "يقوي حاجز البشرة", "يقلل الاحمرار", "ترطيب طويل الأمد", "ملمس خفيف غير دهني"],
    ingredients: "ماء، زبدة الشيا، سيراميد 3، حمض الهيالورونيك، بيسابولول، ألانتوين، فيتامين B5",
    howToUse: "يوضع صباحاً و/أو مساءً على بشرة نظيفة مع التدليك بلطف.",
    volume: "40 مل",
    skinType: ["حساسة", "جافة", "تفاعلية"],
  },
  {
    id: "sunactive-spf50-cream",
    name: "كريم الحماية من الشمس SPF50+",
    nameEn: "SUN ACTIVE SPF50+ Cream",
    range: "صن أكتيف",
    rangeId: "sunactive",
    category: "sun",
    price: 149,
    oldPrice: 179,
    rating: 5,
    reviews: 167,
    badge: "الأكثر مبيعاً",
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2025/04/Visuel_Produit_800x1000_Bergasol_Spray_Invisible_SPF50_200ml.png"],
    description: "حماية عالية جداً من أشعة UVA/UVB للوجه. تركيبة خفيفة غير دهنية مقاومة للماء، مناسبة لجميع أنواع البشرة.",
    benefits: ["حماية SPF50+ واسعة الطيف", "مقاوم للماء", "ملمس خفيف غير دهني", "لا يترك أثراً أبيض", "مناسب للبشرة الحساسة"],
    ingredients: "ماء، أوكتوكريلين، تينوسورب S، تينوسورب M، فيتامين E، ألوفيرا، غليسرين",
    howToUse: "يوضع بسخاء قبل التعرض للشمس بـ 20 دقيقة. يعاد وضعه كل ساعتين وبعد السباحة.",
    volume: "40 مل",
    skinType: ["جميع أنواع البشرة"],
  },
  {
    id: "exfoliac-foaming-gel",
    name: "جل رغوي منظف للبشرة الدهنية",
    nameEn: "EXFOLIAC Foaming Gel",
    range: "إكسفولياك",
    rangeId: "exfoliac",
    category: "cleansers",
    price: 89,
    rating: 4,
    reviews: 112,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2022/10/Visuel_Produit_800x1000_Eczeane_baume_flacon_400ml.png"],
    description: "جل منظف رغوي لطيف للبشرة الدهنية والمعرضة لحب الشباب. ينظف البشرة بعمق ويزيل الشوائب والدهون الزائدة دون تجفيفها.",
    benefits: ["ينظف بعمق", "يزيل الدهون الزائدة", "يضيق المسام", "لطيف على البشرة", "خالٍ من الصابون"],
    ingredients: "ماء، كوكاميدوبروبيل بيتاين، حمض الساليسيليك 2%، زنك PCA، غليسرين، مستخلص النعناع",
    howToUse: "يستخدم صباحاً ومساءً. يرغّى على بشرة مبللة ثم يشطف جيداً بالماء.",
    volume: "200 مل",
    skinType: ["دهنية", "مختلطة"],
  },
  {
    id: "sensidiane-micellar-water",
    name: "ماء ميسيلار للبشرة الحساسة",
    nameEn: "SENSIDIANE Micellar Water",
    range: "سنسيديان",
    rangeId: "sensidiane",
    category: "micellar",
    price: 99,
    rating: 5,
    reviews: 156,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2022/10/Visuel_Produit_800x1000_Sensidiane_EauMicellaire_400ml.png"],
    description: "ماء ميسيلار مهدئ ينظف ويزيل المكياج بلطف فائق. مصمم خصيصاً للبشرة الحساسة والتفاعلية.",
    benefits: ["ينظف ويزيل المكياج", "يهدئ البشرة", "لا يحتاج للشطف", "خالٍ من العطور", "يحترم حاجز البشرة"],
    ingredients: "ماء، بوليثيلين غليكول، غليسرين، بيسابولول، ألانتوين، مستخلص البابونج",
    howToUse: "يوضع على قطنة ويمسح به الوجه والعينين والشفاه حتى تصبح القطنة نظيفة.",
    volume: "400 مل",
    skinType: ["حساسة", "جميع أنواع البشرة"],
  },
  {
    id: "norelift-chrono-filler-serum",
    name: "سيروم مضاد للتجاعيد كرونو فيلر",
    nameEn: "NORELIFT Chrono-Filler Serum",
    range: "نوريليف",
    rangeId: "norelift",
    category: "serums",
    price: 219,
    rating: 5,
    reviews: 88,
    badge: "جديد",
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2025/10/Visuel_Produit_800x1000_TWmela_Serum_30ml.png"],
    description: "سيروم مركز مضاد للشيخوخة يعمل على ملء التجاعيد وشد البشرة. يحفز إنتاج الكولاجين ويعيد النضارة والإشراق.",
    benefits: ["يملأ التجاعيد", "يشد البشرة", "يحفز الكولاجين", "يعيد الإشراق", "نتائج مرئية خلال أسبوعين"],
    ingredients: "ماء، حمض الهيالورونيك المجزأ، ريتينول مغلف، فيتامين C، ببتيدات الكولاجين، سكوالين",
    howToUse: "يوضع مساءً على بشرة نظيفة قبل الكريم الليلي. 3-4 قطرات كافية للوجه والرقبة.",
    volume: "15 مل",
    skinType: ["ناضجة", "جافة", "عادية"],
  },
  {
    id: "trio-white-serum",
    name: "سيروم مضاد للتصبغات",
    nameEn: "TRIO WHITE Depigmenting Serum",
    range: "تريو وايت",
    rangeId: "trio-white",
    category: "serums",
    price: 199,
    rating: 4,
    reviews: 95,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2025/04/Visuel_Produit_800x1000_Bergasol_Mousse_Flouteur_SPF50_50ml.png"],
    description: "سيروم مبيض مكثف يقلل البقع الداكنة ويوحد لون البشرة. يعمل على جميع أنواع التصبغات بما في ذلك الكلف وآثار حب الشباب.",
    benefits: ["يقلل البقع الداكنة", "يوحد لون البشرة", "يمنع تكون تصبغات جديدة", "يعزز الإشراق", "مناسب لجميع ألوان البشرة"],
    ingredients: "ماء، نياسيناميد 5%، أربوتين، فيتامين C المستقر، حمض الكوجيك، حمض الترانيكساميك، غليسرين",
    howToUse: "يوضع صباحاً ومساءً على المناطق المتصبغة. يُتبع بواقي الشمس صباحاً.",
    volume: "30 مل",
    skinType: ["جميع أنواع البشرة"],
  },
  {
    id: "xerodiane-plus-cream",
    name: "كريم مغذي للبشرة الجافة جداً",
    nameEn: "XERODIANE Plus Nourishing Cream",
    range: "زيروديان",
    rangeId: "xerodiane",
    category: "body",
    price: 119,
    rating: 5,
    reviews: 76,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2025/04/Visuel_Produit_800x1000_Bergasol_Eau_Solaire_SPF50_150ml.png"],
    description: "كريم مغذي مكثف للبشرة الجافة جداً والأتوبية. يعيد بناء حاجز الترطيب ويقلل الحكة والجفاف.",
    benefits: ["ترطيب مكثف 48 ساعة", "يعيد بناء حاجز البشرة", "يقلل الحكة", "مناسب للأطفال والكبار", "خالٍ من العطور"],
    ingredients: "ماء، زبدة الشيا، سيراميد 1-3-6، كوليسترول، حمض اللينوليك، نياسيناميد، غليسرين",
    howToUse: "يوضع مرة أو مرتين يومياً على الجسم مع التدليك حتى الامتصاص.",
    volume: "200 مل",
    skinType: ["جافة جداً", "أتوبية"],
  },
  {
    id: "exfoliac-anti-imperfections-mask",
    name: "قناع مقشر منقي للبشرة",
    nameEn: "EXFOLIAC Anti-Imperfections Mask",
    range: "إكسفولياك",
    rangeId: "exfoliac",
    category: "masks",
    price: 109,
    rating: 4,
    reviews: 54,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2025/05/Visuel_Produit_800x1000_Bergasol_BBcremeSolaire__SPF50_40ml.png"],
    description: "قناع تنقية وتقشير لطيف للبشرة المعرضة للشوائب. ينظف المسام بعمق ويمتص الدهون الزائدة.",
    benefits: ["ينقي البشرة بعمق", "يمتص الدهون الزائدة", "يقلل الشوائب", "يضيق المسام", "بشرة أكثر نقاءً وصفاءً"],
    ingredients: "كاولين، بنتونيت، حمض الساليسيليك، فحم نباتي منشط، زنك، مستخلص الشاي الأخضر",
    howToUse: "يوضع طبقة سميكة على الوجه مرتين أسبوعياً. يترك 10 دقائق ثم يشطف.",
    volume: "50 مل",
    skinType: ["دهنية", "مختلطة"],
  },
  {
    id: "norelift-night-cream",
    name: "كريم ليلي مجدد للبشرة",
    nameEn: "NORELIFT Night Regenerating Cream",
    range: "نوريليف",
    rangeId: "norelift",
    category: "night-care",
    price: 189,
    rating: 4,
    reviews: 67,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2022/10/Visuel_Produit_800x1000_SensidianeAR_SoinARCC_40ml-1.png"],
    description: "كريم ليلي مضاد للشيخوخة يعمل أثناء النوم لتجديد البشرة. يحفز عملية الإصلاح الخلوي ويقلل التجاعيد.",
    benefits: ["يجدد البشرة ليلاً", "يقلل التجاعيد", "يحسن مرونة البشرة", "يغذي بعمق", "بشرة مشدودة ومشرقة صباحاً"],
    ingredients: "ماء، ريتينول، حمض الهيالورونيك، ببتيدات، زبدة الشيا، فيتامين E، سكوالين",
    howToUse: "يوضع مساءً على بشرة نظيفة بعد السيروم. يدلك بحركات دائرية صاعدة.",
    volume: "40 مل",
    skinType: ["ناضجة", "جافة"],
  },
  {
    id: "hexaphane-shampoo",
    name: "شامبو مضاد لتساقط الشعر",
    nameEn: "HEXAPHANE Anti-Hair Loss Shampoo",
    range: "هيكسافان",
    rangeId: "hexaphane",
    category: "shampoos",
    price: 79,
    rating: 4,
    reviews: 91,
    images: ["https://noreva-laboratoires.com/wp-content/uploads/2023/09/Visuel_Produit_800x1000_Exfoliac_Global_XPRO_30ml.png"],
    description: "شامبو يومي مقوي يحارب تساقط الشعر ويعزز نموه. يغذي فروة الرأس ويقوي بصيلات الشعر.",
    benefits: ["يقلل تساقط الشعر", "يقوي بصيلات الشعر", "يغذي فروة الرأس", "للاستخدام اليومي", "يضفي حيوية ولمعاناً"],
    ingredients: "ماء، بيوتين، كافيين، زنك، بيريثيون، كيراتين، بانثينول، مستخلص الجينسنغ",
    howToUse: "يوضع على شعر مبلل ويدلك فروة الرأس لمدة دقيقتين. يشطف ويكرر إذا لزم الأمر.",
    volume: "250 مل",
    skinType: ["جميع أنواع الشعر"],
  },
];

// Hero display slides
const heroDisplay = [
  {
    id: "slide-1",
    type: "image",
    url: "https://noreva-laboratoires.com/wp-content/uploads/2025/05/banner_launcher_home_2-1920x667.png",
    title: "العناية بالبشرة المتقدمة",
    subtitle: "حلول ديرماتولوجية لجمال بشرتك",
    order: 1,
  },
  {
    id: "slide-2",
    type: "video",
    url: "https://noreva-laboratoires.com/wp-content/uploads/2025/04/16-2-1.mp4",
    title: "تقنية متطورة",
    subtitle: "أبحاث علمية لبشرة صحية",
    order: 2,
  },
  {
    id: "slide-3",
    type: "image",
    url: "https://noreva-laboratoires.com/wp-content/uploads/2026/05/hero_NL_1920x667-4.png",
    title: "مجموعة نوريليف",
    subtitle: "مضاد للشيخوخة - نتائج مرئية",
    order: 3,
  },
  {
    id: "slide-4",
    type: "video",
    url: "https://noreva-laboratoires.com/wp-content/uploads/2025/05/Bergasol-eau-solaire.mp4",
    title: "حماية من الشمس",
    subtitle: "حماية فائقة مع ملمس خفيف",
    order: 4,
  },
];

// Settings
const settings = {
  storeName: "ZITRON",
  storeNameAr: "زيترون",
  heroTitle: "العناية بالبشرة المتقدمة",
  heroSubtitle: "حلول ديرماتولوجية فرنسية لجمال بشرتك الطبيعي",
  aboutText: "زيترون - علامة تجارية متخصصة في العناية بالبشرة تقدم حلولاً ديرماتولوجية متقدمة مبنية على أحدث الأبحاث العلمية.",
  currency: "₪",
  currencyName: "شيكل",
  whatsappNumber: "",
  instagramLink: "",
};

async function main() {
  console.log("🚀 Starting ZITRON Firebase seed...\n");

  // Step 1: Upload product images to imgbb
  console.log("📸 Uploading product images to imgbb...\n");
  const uploadedProducts = [];

  for (const product of products) {
    const uploadedImages = [];
    for (let i = 0; i < product.images.length; i++) {
      const imgUrl = await uploadToImgbb(product.images[i], `${product.id}-${i}`);
      uploadedImages.push(imgUrl);
      // Rate limit - wait 1s between uploads
      await new Promise((r) => setTimeout(r, 1000));
    }
    uploadedProducts.push({
      ...product,
      image: uploadedImages[0],
      images: uploadedImages,
    });
  }

  // Step 2: Upload hero images to imgbb (skip videos)
  console.log("\n🎬 Uploading hero display images to imgbb...\n");
  const uploadedHeroDisplay = [];
  for (const slide of heroDisplay) {
    if (slide.type === "image") {
      const imgUrl = await uploadToImgbb(slide.url, `hero-${slide.id}`);
      uploadedHeroDisplay.push({ ...slide, url: imgUrl });
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      // Videos stay on original URLs
      uploadedHeroDisplay.push(slide);
    }
  }

  // Step 3: Seed Firestore
  console.log("\n🔥 Seeding Firestore...\n");

  // Seed products
  console.log("  Writing products...");
  for (const product of uploadedProducts) {
    await setDoc(getProjectDoc("products", product.id), product);
    console.log(`    ✅ ${product.name}`);
  }

  // Seed hero display
  console.log("\n  Writing hero display...");
  for (const slide of uploadedHeroDisplay) {
    await setDoc(getProjectDoc("heroDisplay", slide.id), slide);
    console.log(`    ✅ ${slide.id} (${slide.type})`);
  }

  // Seed settings
  console.log("\n  Writing settings...");
  await setDoc(getProjectDoc("settings", "config"), settings);
  console.log("    ✅ Settings saved");

  console.log("\n✨ Done! Firebase seeded successfully.");
  console.log(`   Firestore path: projects/zitron/`);
  console.log(`   Collections: products (${uploadedProducts.length}), heroDisplay (${uploadedHeroDisplay.length}), settings`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
