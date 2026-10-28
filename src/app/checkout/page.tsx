"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, getOrderTrackingToken, setDoc } from "@/lib/store-data";
import {
  CheckCircle2,
  Copy,
  Gift,
  MapPinned,
  NotebookPen,
  Pencil,
  Phone,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ComboOfferModal from "@/components/offers/ComboOfferModal";
import { formatCurrency } from "@/lib/admin";
import { getCollection, getDocRef } from "@/lib/store-data";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import {
  CUSTOMER_ADDRESS_STORAGE_KEY,
  CUSTOMER_CITY_STORAGE_KEY,
  CUSTOMER_NAME_STORAGE_KEY,
  CUSTOMER_PHONE_STORAGE_KEY,
  extractCityFromAddress,
  generateOrderId,
  normalizePhone,
  saveOrderToLocalHistory,
} from "@/lib/order-utils";
import {
  doesOfferQualify,
  getRegularCartCatalogIssues,
  getEligibleProducts,
  groupComboCartItems,
  isComboCartItemId,
  isOfferActive,
} from "@/lib/offers";
import type { AppliedOffer, CartItem, Offer } from "@/lib/types";
import type { AdminOrder, SavedLocation } from "@/lib/admin";

type CheckoutFormState = {
  customerName: string;
  customerPhone: string;
  city: string;
  customerAddress: string;
  notes: string;
};

type FreeSelections = Record<string, string>;

const initialFormState: CheckoutFormState = {
  customerName: "",
  customerPhone: "",
  city: "",
  customerAddress: "",
  notes: "",
};

function generateLocationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `location-${Date.now()}`;
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, refreshItem, removeItem, replaceComboItems } = useCart();
  const { user, profile } = useAuth();
  const offersState = useOffers() as ReturnType<typeof useOffers> & { error?: string };
  const { offers, loading: offersLoading, error: offersError = "" } = offersState;
  const { products: offerProducts, loading: productsLoading, error: productsError } = useProducts();
  const [formData, setFormData] = useState<CheckoutFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");
  const [successTrackingToken, setSuccessTrackingToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<"new" | string>("new");
  const [saveNewAddressPreference, setSaveNewAddressPreference] = useState<"yes" | "no" | null>(null);
  const [selectedFreeProducts, setSelectedFreeProducts] = useState<FreeSelections>({});
  const [activeComboOffer, setActiveComboOffer] = useState<Offer | null>(null);
  const [editingComboSelection, setEditingComboSelection] = useState<string[]>([]);
  const initializedProfile = useRef(false);
  const submissionLock = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFormData((current) => ({
        ...current,
        customerName: current.customerName || window.localStorage.getItem(CUSTOMER_NAME_STORAGE_KEY) || "",
        customerPhone: current.customerPhone || window.localStorage.getItem(CUSTOMER_PHONE_STORAGE_KEY) || "",
        city: current.city || window.localStorage.getItem(CUSTOMER_CITY_STORAGE_KEY) || "",
        customerAddress: current.customerAddress || window.localStorage.getItem(CUSTOMER_ADDRESS_STORAGE_KEY) || "",
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const savedLocations = useMemo(() => profile?.locations ?? [], [profile?.locations]);
  const hasSavedLocations = savedLocations.length > 0;

  useEffect(() => {
    if (!user || !profile || initializedProfile.current) {
      return;
    }

    initializedProfile.current = true;
    const defaultLocation = savedLocations.find((location) => location.isDefault) ?? savedLocations[0];
    const frame = window.requestAnimationFrame(() => {
      setFormData((prev) => ({
        ...prev,
        customerName: profile.name || prev.customerName,
        customerPhone: profile.phone || prev.customerPhone,
        city: defaultLocation?.city || prev.city,
        customerAddress: defaultLocation?.fullAddress || prev.customerAddress,
      }));

      if (defaultLocation) {
        setSelectedLocationId(defaultLocation.id);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [profile, savedLocations, user]);

  const activeOffers = useMemo(
    () => offers.filter((offer) => isOfferActive(offer)).sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [offers]
  );
  const productMap = useMemo(
    () => new Map(offerProducts.map((product) => [product.id, product] as const)),
    [offerProducts]
  );
  const regularItems = useMemo(() => items.filter((item) => !isComboCartItemId(item.id)), [items]);
  const catalogIssues = useMemo(
    () => productsLoading || productsError ? [] : getRegularCartCatalogIssues(items, productMap),
    [items, productMap, productsError, productsLoading]
  );
  const comboGroups = useMemo(() => groupComboCartItems(items), [items]);
  const activeComboOfferMap = useMemo(
    () =>
      new Map(
        activeOffers
          .filter((offer) => offer.type === "combo")
          .map((offer) => [offer.id, offer] as const)
      ),
    [activeOffers]
  );
  const invalidComboGroups = useMemo(() => {
    if (offersLoading || productsLoading) return [];

    return comboGroups.filter((group) => {
      const offer = activeComboOfferMap.get(group.offerId);
      if (!offer) return true;
      if (group.totalQuantity !== Math.floor(Number(offer.pickCount))) return true;
      if (offer.uniqueOnly && new Set(group.selectedProductIds).size !== group.selectedProductIds.length) return true;
      const eligibleIds = new Set(getEligibleProducts(offer, productMap).map((product) => product.id));
      return group.selectedProductIds.some((productId) => !eligibleIds.has(productId));
    });
  }, [activeComboOfferMap, comboGroups, offersLoading, productMap, productsLoading]);

  const qualifyingFreeShippingOffers = useMemo(
    () =>
      activeOffers.filter(
        (offer) =>
          offer.type === "free_shipping" &&
          doesOfferQualify(offer, items, productMap, totalPrice)
      ),
    [activeOffers, items, productMap, totalPrice]
  );

  const qualifyingFreeProductOffers = useMemo(
    () =>
      activeOffers.filter(
        (offer) =>
          offer.type === "free_product" &&
          doesOfferQualify(offer, items, productMap, totalPrice) &&
          getEligibleProducts(offer, productMap).length > 0
      ),
    [activeOffers, items, productMap, totalPrice]
  );

  const freeProductOrderItems = useMemo<CartItem[]>(() => {
    return qualifyingFreeProductOffers.flatMap((offer) => {
      const selectedProductId = selectedFreeProducts[offer.id];
      const product = selectedProductId ? productMap.get(selectedProductId) : undefined;

      if (!product) {
        return [];
      }

      return [
        {
          id: `${product.id}__gift__${offer.id}`,
          name: `${product.name} (هدية مجانية)`,
          price: 0,
          image: product.image,
          quantity: 1,
          range: product.range,
        },
      ];
    });
  }, [productMap, qualifyingFreeProductOffers, selectedFreeProducts]);

  const orderItems = useMemo(() => [...items, ...freeProductOrderItems], [freeProductOrderItems, items]);
  const orderItemCount = useMemo(() => orderItems.reduce((sum, item) => sum + item.quantity, 0), [orderItems]);

  const updateField = (field: keyof CheckoutFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyLocation = (location: SavedLocation) => {
    setSelectedLocationId(location.id);
    setFormData((prev) => ({ ...prev, city: location.city, customerAddress: location.fullAddress }));
  };

  const useNewAddress = () => {
    setSelectedLocationId("new");
    setFormData((prev) => ({
      ...prev,
      city: hasSavedLocations ? "" : prev.city,
      customerAddress: hasSavedLocations ? "" : prev.customerAddress,
    }));
  };

  const selectFreeProduct = (offerId: string, productId: string) => {
    setSelectedFreeProducts((current) => ({ ...current, [offerId]: productId }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLock.current) return;

    if (items.length === 0) {
      setError("السلة فارغة حالياً، أضف منتجات قبل إتمام الطلب.");
      return;
    }

    if (offersLoading || productsLoading) {
      setError("جاري التحقق من العروض المتاحة. انتظر لحظة ثم أعد المحاولة.");
      return;
    }

    if (productsError || offersError) {
      setError(productsError || offersError || "تعذر التحقق من بيانات المتجر. أعد تحميل الصفحة وحاول مرة أخرى.");
      return;
    }

    const liveCatalogIssues = getRegularCartCatalogIssues(items, productMap);
    if (liveCatalogIssues.length > 0) {
      setError("تغيرت بعض منتجات السلة أو لم تعد متاحة. راجع التنبيه أدناه قبل تأكيد الطلب.");
      return;
    }

    const liveActiveOffers = offers.filter((offer) => isOfferActive(offer, new Date()));
    const liveComboOfferMap = new Map(
      liveActiveOffers
        .filter((offer) => offer.type === "combo")
        .map((offer) => [offer.id, offer] as const)
    );
    const hasInvalidCombo = comboGroups.some((group) => {
      const offer = liveComboOfferMap.get(group.offerId);
      if (!offer || group.totalQuantity !== Math.floor(Number(offer.pickCount))) return true;
      if (offer.uniqueOnly && new Set(group.selectedProductIds).size !== group.selectedProductIds.length) return true;
      const eligibleIds = new Set(getEligibleProducts(offer, productMap).map((product) => product.id));
      return group.selectedProductIds.some((productId) => !eligibleIds.has(productId));
    });

    if (hasInvalidCombo) {
      setError("انتهت صلاحية أحد العروض المركبة أو تغيرت منتجاته. احذف العرض غير المتاح أو عدّله قبل تأكيد الطلب.");
      return;
    }

    const liveFreeProductOffers = liveActiveOffers.filter(
      (offer) =>
        offer.type === "free_product" &&
        doesOfferQualify(offer, items, productMap, totalPrice) &&
        getEligibleProducts(offer, productMap).length > 0
    );
    const missingFreeProductOffer = liveFreeProductOffers.find((offer) => {
      const selectedProductId = selectedFreeProducts[offer.id];
      return !selectedProductId || !getEligibleProducts(offer, productMap).some((product) => product.id === selectedProductId);
    });

    if (missingFreeProductOffer) {
      setError("يرجى اختيار المنتج المجاني المؤهل قبل تأكيد الطلب.");
      return;
    }

    const submittedGiftItems: CartItem[] = liveFreeProductOffers.flatMap((offer) => {
      const productId = selectedFreeProducts[offer.id];
      const product = productId ? productMap.get(productId) : undefined;
      return product
        ? [{
            id: `${product.id}__gift__${offer.id}`,
            name: `${product.name} (هدية مجانية)`,
            price: 0,
            image: product.image,
            quantity: 1,
            range: product.range,
          }]
        : [];
    });
    const submittedOrderItems = [...items, ...submittedGiftItems];
    const submittedAppliedOffers: AppliedOffer[] = [
      ...liveActiveOffers
        .filter((offer) => offer.type === "free_shipping" && doesOfferQualify(offer, items, productMap, totalPrice))
        .map((offer) => ({ type: "free_shipping" as const, offerId: offer.id })),
      ...liveFreeProductOffers.map((offer) => {
        const productId = selectedFreeProducts[offer.id];
        const product = productMap.get(productId);
        return {
          type: "free_product" as const,
          offerId: offer.id,
          productId,
          productName: product?.name ?? "",
        };
      }),
      ...comboGroups.map((group) => ({
        type: "combo" as const,
        offerId: group.offerId,
        products: group.selectedProductIds,
        comboPrice: Math.round(group.totalPrice * 100) / 100,
      })),
    ];

    const customerName = formData.customerName.trim();
    const customerPhone = normalizePhone(formData.customerPhone);
    const customerAddress = formData.customerAddress.trim();
    const city = formData.city.trim() || extractCityFromAddress(customerAddress);
    if (customerName.length < 2) {
      setError("يرجى إدخال اسم كامل صالح.");
      return;
    }
    if (!/^\+?\d{7,15}$/.test(customerPhone)) {
      setError("يرجى إدخال رقم هاتف صالح من 7 إلى 15 رقماً.");
      return;
    }
    if (!city || customerAddress.length < 5) {
      setError("يرجى إدخال المدينة وعنوان توصيل واضح.");
      return;
    }

    try {
      submissionLock.current = true;
      setSubmitting(true);
      setError("");

      const requestedOrderId = generateOrderId();
      const orderRef = await addDoc(getCollection("orders"), {
        orderId: requestedOrderId,
        items: submittedOrderItems,
        customerName,
        customerPhone,
        customerAddress,
        notes: formData.notes.trim(),
        total: totalPrice,
        status: "new",
        date: new Date().toISOString(),
        city,
        appliedOffers: submittedAppliedOffers,
        ...(user ? { userId: user.uid } : {}),
      });

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(CUSTOMER_NAME_STORAGE_KEY, customerName);
          window.localStorage.setItem(CUSTOMER_PHONE_STORAGE_KEY, customerPhone);
          window.localStorage.setItem(CUSTOMER_CITY_STORAGE_KEY, city);
          window.localStorage.setItem(CUSTOMER_ADDRESS_STORAGE_KEY, customerAddress);
        } catch {
          // Order completion must not fail because browser storage is unavailable.
        }
      }

      const canonical = orderRef.data as Partial<AdminOrder>;
      const localOrder: AdminOrder = {
        id: orderRef.id,
        orderId: canonical.orderId || requestedOrderId,
        items: Array.isArray(canonical.items) ? canonical.items as AdminOrder["items"] : submittedOrderItems,
        customerName: canonical.customerName || customerName,
        customerPhone: canonical.customerPhone || customerPhone,
        customerAddress: canonical.customerAddress || customerAddress,
        notes: canonical.notes || formData.notes.trim(),
        city: canonical.city || city,
        total: Number.isFinite(Number(canonical.total)) ? Number(canonical.total) : totalPrice,
        status: canonical.status || "new",
        date: canonical.date || new Date().toISOString(),
        userId: canonical.userId || user?.uid,
      };
      saveOrderToLocalHistory(localOrder);

      if (user) {
        const shouldSaveAddress = selectedLocationId === "new" && saveNewAddressPreference === "yes";
        const nextLocations = shouldSaveAddress
          ? [
              ...(profile?.locations ?? []),
              {
                id: generateLocationId(),
                label: "العنوان الرئيسي",
                city,
                fullAddress: customerAddress,
                isDefault: (profile?.locations?.length ?? 0) === 0,
              },
            ]
          : undefined;

        try {
          await setDoc(getDocRef("users", user.uid), {
            name: customerName,
            email: profile?.email || user.email || "",
            phone: customerPhone,
            ...(nextLocations ? { locations: nextLocations } : {}),
          }, { merge: true });
        } catch {
          // The order is already placed; profile synchronization can recover later.
        }
      }

      clearCart();
      setSelectedFreeProducts({});
      setSuccessOrderId(localOrder.orderId || localOrder.id);
      setSuccessTrackingToken(getOrderTrackingToken(localOrder.orderId || localOrder.id) ?? "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر إرسال الطلب الآن. يرجى المحاولة مرة أخرى بعد قليل.");
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  const copyOrderId = async () => {
    await navigator.clipboard.writeText(successOrderId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (successOrderId) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8" dir="rtl">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-emerald-800">تم استلام طلبك بنجاح</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-lg text-emerald-700">
            <span>رقم الطلب الخاص بك هو {successOrderId}</span>
            <button type="button" onClick={() => void copyOrderId()} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <Copy className="h-4 w-4" />
              {copied ? "تم النسخ!" : "نسخ"}
            </button>
          </div>
          <p className="mt-2 text-sm text-emerald-700/90">احتفظ برقم الطلب لاستخدامه في صفحة التتبع.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/account/orders?orderId=${encodeURIComponent(successOrderId)}${successTrackingToken ? `&token=${encodeURIComponent(successTrackingToken)}` : ""}`} className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700">عرض طلباتي</Link>
            <Link href={`/track?orderId=${encodeURIComponent(successOrderId)}${successTrackingToken ? `&token=${encodeURIComponent(successTrackingToken)}` : ""}`} className="rounded-full border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100">تتبع الطلب</Link>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8" dir="rtl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShoppingBag className="mx-auto h-14 w-14 text-slate-300" />
          <h1 className="mt-5 text-3xl font-bold text-slate-900">سلة التسوق فارغة</h1>
          <p className="mt-3 text-slate-500">أضف منتجاتك المفضلة أولاً ثم عُد لإتمام الطلب.</p>
          <Link href="/products" className="mt-8 inline-flex rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--primary-light)]">تصفح المنتجات</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">إتمام الطلب</h1>
        <p className="mt-2 text-slate-500">أكمل بياناتك وسنقوم بتجهيز طلبك في أسرع وقت ممكن.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.8fr,1.2fr]">
        <form onSubmit={handleSubmit} className="order-2 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {productsError || offersError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {productsError || offersError}
              <span className="mt-1 block">لن يتم إرسال الطلب حتى ينجح التحقق من بيانات المتجر.</span>
            </div>
          ) : null}

          {catalogIssues.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
              <div>
                <h2 className="font-bold text-amber-900">تحتاج السلة إلى مراجعة</h2>
                <p className="mt-1 text-sm text-amber-800">لن نرسل منتجات محذوفة أو بأسعار قديمة.</p>
              </div>
              {catalogIssues.map(({ item, product, type }) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-slate-600">
                      {type === "deleted"
                        ? "لم يعد هذا المنتج موجوداً في المتجر."
                        : `تغير السعر من ${formatCurrency(item.price)} إلى ${formatCurrency(product?.price ?? 0)}.`}
                    </p>
                  </div>
                  {type === "deleted" ? (
                    <button type="button" onClick={() => removeItem(item.id)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-100">
                      حذف من السلة
                    </button>
                  ) : product ? (
                    <button
                      type="button"
                      onClick={() => refreshItem(item.id, {
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        range: product.range,
                      })}
                      className="rounded-full border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      اعتماد السعر الجديد
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {qualifyingFreeShippingOffers.length > 0 ? (
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5" />
                <div>
                  <p className="font-bold">🎉 شحن مجاني!</p>
                  <p className="mt-1 text-sm">هذا الطلب مؤهل للشحن المجاني بفضل العرض النشط.</p>
                </div>
              </div>
            </div>
          ) : null}

          {qualifyingFreeProductOffers.map((offer) => {
            const eligibleProducts = getEligibleProducts(offer, productMap);
            const selectedProductId = selectedFreeProducts[offer.id];

            return (
              <div key={offer.id} className="space-y-4 rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5">
                <div className="flex items-start gap-3">
                  <Gift className="mt-1 h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">اختر منتجك المجاني</h2>
                    <p className="mt-1 text-sm text-slate-600">{offer.title}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {eligibleProducts.map((product) => {
                    const isSelected = selectedProductId === product.id;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectFreeProduct(offer.id, product.id)}
                        className={`overflow-hidden rounded-[1.5rem] border bg-white text-right transition ${isSelected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-[var(--primary)]/40"}`}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          {product.image ? <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" /> : null}
                        </div>
                        <div className="space-y-2 p-4">
                          <p className="font-bold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.range}</p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">مجاني</span>
                            <span className="text-sm text-slate-400 line-through">{formatCurrency(product.price)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {user && hasSavedLocations ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-900">العناوين المحفوظة</h2>
                <button type="button" onClick={useNewAddress} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)]">إضافة عنوان جديد</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {savedLocations.map((location) => (
                  <button key={location.id} type="button" onClick={() => applyLocation(location)} className={`rounded-3xl border p-4 text-right transition ${selectedLocationId === location.id ? "border-[var(--primary)] bg-white ring-2 ring-[var(--primary)]/10" : "border-slate-200 bg-white hover:border-[var(--primary)]/40"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">{location.label}</h3>
                      {location.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">الافتراضي</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{location.city}</p>
                    <p className="mt-1 text-sm text-slate-500">{location.fullAddress}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2 md:col-span-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><UserRound className="h-4 w-4 text-[var(--primary)]" />الاسم الكامل</span>
              <input required value={formData.customerName} onChange={(event) => updateField("customerName", event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="أدخل الاسم الكامل" />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Phone className="h-4 w-4 text-[var(--primary)]" />رقم الهاتف</span>
              <input required type="tel" value={formData.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="0590000000" />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPinned className="h-4 w-4 text-[var(--primary)]" />المدينة</span>
              <input value={formData.city} onChange={(event) => updateField("city", event.target.value)} disabled={selectedLocationId !== "new"} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:bg-slate-100 disabled:text-slate-500" placeholder="مثال: القدس" />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPinned className="h-4 w-4 text-[var(--primary)]" />العنوان</span>
              <textarea required value={formData.customerAddress} onChange={(event) => updateField("customerAddress", event.target.value)} disabled={selectedLocationId !== "new"} className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:bg-slate-100 disabled:text-slate-500" placeholder="المدينة، الحي، اسم الشارع، وأي تفاصيل إضافية" />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><NotebookPen className="h-4 w-4 text-[var(--primary)]" />ملاحظات (اختياري)</span>
              <textarea value={formData.notes} onChange={(event) => updateField("notes", event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="أضف أي تفاصيل تساعدنا في تجهيز الطلب" />
            </label>
          </div>

          {user && selectedLocationId === "new" ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">هل تريد حفظ هذا العنوان للاستخدام لاحقاً؟</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => setSaveNewAddressPreference("yes")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${saveNewAddressPreference === "yes" ? "bg-[var(--primary)] text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>نعم</button>
                <button type="button" onClick={() => setSaveNewAddressPreference("no")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${saveNewAddressPreference === "no" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>لا</button>
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <button type="submit" disabled={submitting || offersLoading || productsLoading || Boolean(productsError) || Boolean(offersError) || catalogIssues.length > 0} className="w-full rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "جاري إرسال الطلب..." : offersLoading || productsLoading ? "جاري التحقق من العروض..." : "تأكيد الطلب"}</button>
        </form>

        <aside className="order-1 space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">ملخص السلة</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{orderItemCount} قطعة</span>
          </div>

          <div className="space-y-4">
            {regularItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-white border border-slate-100">
                    <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--primary)]">{item.range}</p>
                    <h3 className="mt-1 font-bold text-slate-900 line-clamp-1">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">الكمية: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-[var(--primary)] flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}

            {comboGroups.map((group) => {
              const comboOffer = activeComboOfferMap.get(group.offerId);
              const isInvalid = !offersLoading && !productsLoading && invalidComboGroups.some((item) => item.offerId === group.offerId);
              return (
                <div key={group.offerId} className={`space-y-3 rounded-3xl border p-4 ${isInvalid ? "border-rose-200 bg-rose-50" : "border-sky-200 bg-sky-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`flex items-center gap-2 ${isInvalid ? "text-rose-800" : "text-sky-800"}`}>
                      <Sparkles className="h-4 w-4" />
                      <div>
                        <p className="font-bold">
                          {offersLoading || productsLoading
                            ? "جاري تحميل تفاصيل العرض..."
                            : comboOffer?.title ?? "عرض خاص غير متاح"}
                        </p>
                        {isInvalid ? <p className="mt-1 text-xs font-medium">انتهى العرض أو تغيرت المنتجات المؤهلة.</p> : null}
                      </div>
                    </div>
                    {comboOffer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveComboOffer(comboOffer);
                          setEditingComboSelection(group.selectedProductIds);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </button>
                    ) : isInvalid ? (
                      <button
                        type="button"
                        onClick={() => replaceComboItems(group.offerId, [])}
                        className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        حذف العرض
                      </button>
                    ) : null}
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                        <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="48px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">الكمية: {item.quantity}</p>
                      </div>
                      <p className={`flex-shrink-0 font-bold ${isInvalid ? "text-rose-700" : "text-sky-700"}`}>{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              );
            })}

            {freeProductOrderItems.length > 0 ? (
              <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Gift className="h-4 w-4" />
                  <p className="font-bold">الهدايا المجانية</p>
                </div>
                {freeProductOrderItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">هدية مجانية ضمن العرض</p>
                    </div>
                    <p className="font-bold text-emerald-700">مجاني</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl bg-amber-50 p-4 text-amber-800">
            <div className="flex items-center justify-between gap-3 text-sm font-medium text-amber-700">
              <span>إجمالي المنتجات</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-lg font-bold">
              <span>الإجمالي النهائي</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-amber-700">
              {qualifyingFreeShippingOffers.length > 0
                ? "يشمل الإجمالي توصيلاً مجانياً."
                : "سعر التوصيل غير مشمول في الإجمالي."}
            </p>
          </div>

          <Link href="/track" className="block text-center text-sm font-semibold text-[var(--primary)] transition hover:underline">لديك رقم طلب؟ تتبع طلبك من هنا</Link>
        </aside>
      </div>

      <ComboOfferModal
        key={activeComboOffer ? `${activeComboOffer.id}-${editingComboSelection.join(",")}` : "checkout-combo-closed"}
        open={Boolean(activeComboOffer)}
        offer={activeComboOffer}
        products={offerProducts}
        initialSelection={editingComboSelection}
        confirmLabel="حفظ التعديلات"
        onClose={() => {
          setActiveComboOffer(null);
          setEditingComboSelection([]);
        }}
        onConfirm={(comboItems) => {
          if (!activeComboOffer) {
            return;
          }

          replaceComboItems(activeComboOffer.id, comboItems);
          setActiveComboOffer(null);
          setEditingComboSelection([]);
        }}
      />
    </section>
  );
}
