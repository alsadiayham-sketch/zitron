export interface Product {
  id: string;
  name: string;
  nameEn: string;
  range: string;
  rangeId: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
  images: string[];
  description: string;
  benefits: string[];
  ingredients: string;
  howToUse: string;
  volume: string;
  skinType: string[];
}

export interface HeroSlide {
  id: string;
  type: "image" | "video";
  url: string;
  mobileUrl?: string;
  title: string;
  subtitle: string;
  order: number;
}

export type OfferType = "free_shipping" | "free_product" | "combo";

export interface Offer {
  id: string;
  type: OfferType;
  title: string;
  minAmount?: number;
  eligibleProducts?: string[];
  pickCount?: number;
  comboPrice?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export type AppliedOffer =
  | { type: "free_shipping"; offerId: string }
  | { type: "free_product"; offerId: string; productId: string; productName: string }
  | { type: "combo"; offerId: string; products: string[]; comboPrice: number };

export interface Order {
  id?: string;
  _docId?: string;
  orderId?: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  city?: string;
  total: number;
  status: "new" | "processing" | "prepared" | "out_for_delivery" | "completed" | "declined";
  date: string;
  notes?: string;
  appliedOffers?: AppliedOffer[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  range: string;
  quantity: number;
}

export interface SiteUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  orders?: number;
}

export interface SiteSettings {
  storeName: string;
  storeNameAr: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  currency: string;
  currencyName: string;
  whatsappNumber: string;
  instagramLink: string;
}

export interface SiteAssets {
  logo: string;
  paymentVisa?: string;
  paymentMastercard?: string;
  paymentMada?: string;
}
