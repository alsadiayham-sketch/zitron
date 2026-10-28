"use client";

import type { Product } from "@/lib/types";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

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
  role: "worker";
  createdAt: string;
  disabled?: boolean;
}

export interface AdminSession {
  role: AdminRole;
  name: string;
  email?: string;
}

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

export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map(({ id, label }) => ({ value: id, label }));

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

export function serializeProductForSave(product: Product): Product {
  const { oldPrice, badge, ...requiredFields } = product;
  const serialized: Product = { ...requiredFields };

  if (oldPrice !== undefined) {
    serialized.oldPrice = oldPrice;
  }

  if (badge?.trim()) {
    serialized.badge = badge.trim();
  }

  return serialized;
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

export function isValidNonNegativeNumber(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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

let _cachedSession: AdminSession | null = null;

export function readAdminSession(): AdminSession | null {
  return _cachedSession;
}

export function writeAdminSession(session: AdminSession) {
  _cachedSession = session;
  notifyAdminAuthChange();
}

export function clearAdminSession() {
  _cachedSession = null;
  notifyAdminAuthChange();
}

function canvasBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/webp" | "image/png", quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر تجهيز الصورة.")), type, quality));
}

async function prepareImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("يرجى اختيار صورة JPEG أو PNG أو WebP فقط.");
  }
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => { URL.revokeObjectURL(url); resolve(element); };
    element.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذر قراءة الصورة.")); };
    element.src = url;
  });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const type: "image/jpeg" | "image/webp" | "image/png" = file.type === "image/png" ? "image/png" : "image/webp";
  for (let quality = 0.9; quality >= 0.45; quality -= 0.1) {
    const blob = await canvasBlob(canvas, type, quality);
    if (blob.size <= 750 * 1024) return blob;
  }
  throw new Error("الصورة كبيرة جداً بعد الضغط. اختر صورة أصغر من 750 كيلوبايت.");
}

export async function uploadImage(file: File) {
  const blob = await prepareImage(file);
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",")[1] ?? "") : reject(new Error("تعذر قراءة الصورة."));
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(blob);
  });
  const { apiRequest } = await import("@/lib/store-data");
  const payload = await apiRequest("/api/upload", {
    method: "POST",
    body: JSON.stringify({ image: base64, mimeType: blob.type }),
  }) as { url?: string };
  if (!payload.url) throw new Error("تعذر رفع الصورة.");
  return payload.url;
}

export async function uploadMultipleImages(files: File[]) {
  const urls = await Promise.all(files.map((file) => uploadImage(file)));
  return urls.filter(Boolean);
}
