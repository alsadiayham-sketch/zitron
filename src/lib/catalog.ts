import type { Product } from "./types";

const skinLabels: Record<string, string[]> = {
  dry: ["جافة", "جافة جداً"],
  oily: ["دهنية"],
  sensitive: ["حساسة"],
  combination: ["مختلطة"],
  acne: ["دهنية", "مختلطة", "معرضة لحب الشباب"],
};

const concernRanges: Record<string, string[]> = {
  pigmentation: ["trio-white"],
  wrinkles: ["norelift", "alpha-km"],
  dryness: ["xerodiane", "aquareva"],
  redness: ["sensidiane"],
};

export function filterProducts(products: Product[], filters: URLSearchParams) {
  const category = filters.get("cat");
  const range = filters.get("range");
  const skin = filters.get("skin");
  const concern = filters.get("concern");
  const search = (filters.get("q") ?? "").trim().toLocaleLowerCase();
  return products.filter((product) => {
    const categoryMatches = !category || category === "all" ||
      product.category === category ||
      (category === "spf" && product.category === "sun") ||
      (category === "face" && ["serums", "day-care", "night-care", "tinted", "masks", "eye-lip"].includes(product.category)) ||
      (category === "hygiene" && ["cleansers", "micellar", "shampoos", "deodorants", "body-cleansers"].includes(product.category));
    return categoryMatches &&
      (!range || product.rangeId === range) &&
      (!skin || (skinLabels[skin] ?? [skin]).some((label) => (product.skinType ?? []).includes(label))) &&
      (!concern || (concernRanges[concern] ?? []).includes(product.rangeId)) &&
      (!search || `${product.name} ${product.nameEn} ${product.range} ${product.description}`.toLocaleLowerCase().includes(search));
  });
}
