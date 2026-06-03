export const PRODUCT_CATEGORIES = [
  { id: "sun", label: "الحماية من الشمس" },
  { id: "serums", label: "السيروم" },
  { id: "day-care", label: "العناية النهارية" },
  { id: "night-care", label: "العناية الليلية" },
  { id: "tinted", label: "العناية الملونة" },
  { id: "body", label: "العناية بالجسم" },
  { id: "cleansers", label: "المنظفات" },
  { id: "micellar", label: "ماء ميسيلار" },
  { id: "shampoos", label: "الشامبو" },
  { id: "deodorants", label: "مزيلات العرق" },
  { id: "masks", label: "الأقنعة" },
  { id: "hands", label: "العناية باليدين" },
] as const;

export const CATEGORY_LABELS = Object.fromEntries(
  PRODUCT_CATEGORIES.map((category) => [category.id, category.label])
) as Record<string, string>;
