"use client";

import type { Product } from "@/lib/types";

export type OrderStatus = "new" | "processing" | "prepared" | "out_for_delivery" | "completed" | "declined";
export type AdminRole = "admin" | "worker";

export interface SavedLocation {
  id: string;
  label: string;
  city: string;
  fullAddress: string;
  isDefault: boolean;
}

export interface UserProfileDoc {
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  orders?: number;
  locations?: SavedLocation[];
}

export interface AdminHeroSlide {
  id: string;
  type: "image" | "video";
  url: string;
  title: string;
  subtitle: string;
  order: number;
}

export interface AdminOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface AdminOrder {
  id: string;
  orderId?: string;
  items: AdminOrderItem[];
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  city?: string;
  total: number;
  status: OrderStatus;
  date?: string;
  userId?: string;
}

export interface AdminUser extends UserProfileDoc {
  id: string;
}

export interface WorkerRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "worker";
  createdAt: string;
}

export interface AdminSession {
  role: AdminRole;
  name: string;
  email?: string;
}

export const ADMIN_SESSION_STORAGE_KEY = "zitron_admin";
export const ADMIN_AUTH_EVENT = "zitron-admin-auth-change";

export interface AdminSettings {
  storeName: string;
  storeNameAr: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  currency: string;
  currencyName: string;
  whatsappNumber: string;
  instagramLink: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  contactWorkHours: string;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  storeName: "ZITRON",
  storeNameAr: "زترون",
  heroTitle: "عناية متقدمة ببشرتك",
  heroSubtitle: "منتجات فعالة وطبيعية لكل احتياجات البشرة.",
  aboutText: "نحن نهتم ببشرتك عبر منتجات مختارة بعناية تمنحك نتائج ملموسة وتجربة فاخرة.",
  currency: "ILS",
  currencyName: "شيكل",
  whatsappNumber: "",
  instagramLink: "",
  contactAddress: "رام الله، فلسطين",
  contactPhone: "0599123456",
  contactEmail: "info@zitron.com",
  contactWorkHours: "الأحد - الخميس: 9:00 ص - 6:00 م",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "جديد",
  processing: "قيد التحضير",
  prepared: "جاهز",
  out_for_delivery: "في الطريق",
  completed: "مكتمل",
  declined: "مرفوض",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-700 ring-sky-200",
  processing: "bg-amber-100 text-amber-700 ring-amber-200",
  prepared: "bg-violet-100 text-violet-700 ring-violet-200",
  out_for_delivery: "bg-orange-100 text-orange-700 ring-orange-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  declined: "bg-rose-100 text-rose-700 ring-rose-200",
};

export const CATEGORY_OPTIONS = [
  { value: "sun", label: "الحماية من الشمس" },
  { value: "serums", label: "السيروم" },
  { value: "day-care", label: "العناية النهارية" },
  { value: "night-care", label: "العناية الليلية" },
  { value: "tinted", label: "العناية الملونة" },
  { value: "body", label: "العناية بالجسم" },
  { value: "cleansers", label: "المنظفات" },
  { value: "micellar", label: "ماء ميسيلار" },
  { value: "shampoos", label: "الشامبو" },
  { value: "deodorants", label: "مزيلات العرق" },
  { value: "masks", label: "الأقنعة" },
  { value: "hands", label: "العناية باليدين" },
];

export function createEmptyProduct(): Product {
  return {
    id: "",
    name: "",
    nameEn: "",
    range: "",
    rangeId: "",
    category: CATEGORY_OPTIONS[0]?.value ?? "day-care",
    price: 0,
    oldPrice: undefined,
    rating: 5,
    reviews: 0,
    badge: "",
    image: "",
    images: [],
    description: "",
    benefits: [],
    ingredients: "",
    howToUse: "",
    volume: "",
    skinType: [],
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function subscribeToAdminAuth(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ADMIN_AUTH_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ADMIN_AUTH_EVENT, handler);
  };
}

export function notifyAdminAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

let _cachedSessionRaw: string | null = null;
let _cachedSession: AdminSession | null = null;

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

  // Return cached result if sessionStorage value hasn't changed
  if (raw === _cachedSessionRaw) {
    return _cachedSession;
  }

  _cachedSessionRaw = raw;

  if (!raw) {
    _cachedSession = null;
    return null;
  }

  if (raw === "true") {
    _cachedSession = { role: "admin", name: "مدير النظام" };
    return _cachedSession;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if ((parsed.role === "admin" || parsed.role === "worker") && typeof parsed.name === "string") {
      _cachedSession = {
        role: parsed.role,
        name: parsed.name,
        email: typeof parsed.email === "string" ? parsed.email : undefined,
      };
      return _cachedSession;
    }
  } catch {
    _cachedSession = null;
    return null;
  }

  _cachedSession = null;
  return null;
}

export function writeAdminSession(session: AdminSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyAdminAuthChange();
}

export function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  notifyAdminAuthChange();
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("تعذر قراءة الملف."));
        return;
      }
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(new Error("فشل رفع الصورة."));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToImgbb(file: File) {
  const base64 = await readFileAsBase64(file);
  const formData = new FormData();
  formData.append("image", base64);
  formData.append("name", file.name);

  const response = await fetch(
    "https://api.imgbb.com/1/upload?key=d14f65fb697224837b49489e5f8d8b57",
    {
      method: "POST",
      body: formData,
    }
  );

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "فشل رفع الصورة إلى ImgBB.");
  }

  return payload.data.url as string;
}

export async function uploadMultipleImages(files: File[]) {
  const urls = await Promise.all(files.map((file) => uploadImageToImgbb(file)));
  return urls.filter(Boolean);
}
