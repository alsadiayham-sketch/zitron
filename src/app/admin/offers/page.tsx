"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState, useEffect } from "react";
import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { CheckSquare, Pencil, Plus, Square, Tag, Trash2 } from "lucide-react";
import {
  AdminCard,
  AdminEmptyState,
  AdminModal,
  AdminPageHeader,
  FieldLabel,
  LoadingState,
  SelectInput,
  TextInput,
} from "@/components/admin/AdminUI";
import { formatCurrency, slugify } from "@/lib/admin";
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from "@/lib/categories";
import { getCollection, getDocRef } from "@/lib/firebase";
import { getOfferSectionLabel, isOfferActive } from "@/lib/offers";
import type { Offer, OfferType, Product } from "@/lib/types";

const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  free_shipping: "شحن مجاني",
  free_product: "منتج مجاني",
  combo: "عرض كومبو",
};

const emptyOffer: Offer = {
  id: "",
  type: "free_shipping",
  title: "",
  minAmount: 0,
  minQuantity: 0,
  eligibleProducts: [],
  targetSections: [],
  pickCount: 2,
  comboPrice: 0,
  uniqueOnly: false,
  startDate: "",
  endDate: "",
  createdAt: "",
};

function ProductPicker({
  products,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  products: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
  onSelectAll: (productIds: string[]) => void;
  onDeselectAll: (productIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        values.add(product.category);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ar"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (
        search.trim() &&
        !product.name.includes(search.trim()) &&
        !product.nameEn.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [products, categoryFilter, search]);

  const filteredIds = useMemo(() => filteredProducts.map((product) => product.id), [filteredProducts]);
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.includes(product.id));

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        لا توجد منتجات متاحة حالياً للاختيار.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث عن منتج..."
          className="min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--primary)]"
        >
          <option value="all">كل الأقسام</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category] ?? category}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => (allFilteredSelected ? onDeselectAll(filteredIds) : onSelectAll(filteredIds))}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${allFilteredSelected ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)]/10"}`}
        >
          {allFilteredSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allFilteredSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
        </button>
      </div>

      <p className="text-xs text-slate-500">{filteredProducts.length} منتج معروض • {selectedIds.length} محدد</p>

      <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const checked = selectedIds.includes(product.id);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onToggle(product.id)}
                className={`flex items-center gap-3 rounded-3xl border p-3 text-right transition ${checked ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/10" : "border-slate-200 bg-white hover:border-[var(--primary)]/40"}`}
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {product.image ? <Image src={product.image} alt={product.name} fill className="object-cover" sizes="56px" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{CATEGORY_LABELS[product.category] ?? product.category}</p>
                    </div>
                    <input type="checkbox" checked={checked} readOnly className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--primary)]">{formatCurrency(product.price)}</p>
                </div>
              </button>
            );
          })}
        </div>
        {filteredProducts.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">لا توجد منتجات مطابقة للبحث أو الفلتر.</p> : null}
      </div>
    </div>
  );
}

function SectionPicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (sectionId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {PRODUCT_CATEGORIES.map((category) => {
        const selected = selectedIds.includes(category.id);

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggle(category.id)}
            className={`flex items-center justify-between rounded-3xl border px-4 py-3 text-right transition ${selected ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/10" : "border-slate-200 bg-white hover:border-[var(--primary)]/40"}`}
          >
            <span className="text-sm font-semibold text-slate-900">{category.label}</span>
            {selected ? <CheckSquare className="h-4 w-4 text-[var(--primary)]" /> : <Square className="h-4 w-4 text-slate-400" />}
          </button>
        );
      })}
    </div>
  );
}

function formatDateLabel(dateStr?: string) {
  if (!dateStr) return "غير محدد";
  return new Date(dateStr).toLocaleDateString("ar-PS", { year: "numeric", month: "short", day: "numeric" });
}

function getOfferStatus(offer: Offer): { label: string; color: string } {
  const now = new Date();
  if (offer.startDate && new Date(offer.startDate) > now) return { label: "لم يبدأ", color: "bg-amber-100 text-amber-700" };
  if (offer.endDate && new Date(offer.endDate) < now) return { label: "منتهي", color: "bg-slate-200 text-slate-600" };
  return { label: "فعّال", color: "bg-emerald-100 text-emerald-700" };
}

function describeOffer(offer: Offer) {
  const sectionLabel = getOfferSectionLabel(offer);

  if (offer.type === "free_shipping") {
    if (sectionLabel && (offer.minQuantity ?? 0) > 0) {
      return `شحن مجاني عند شراء ${offer.minQuantity} قطعة من قسم ${sectionLabel}.`;
    }

    if (sectionLabel) {
      return `شحن مجاني عند وصول مشتريات قسم ${sectionLabel} إلى ${formatCurrency(offer.minAmount ?? 0)}.`;
    }

    return `شحن مجاني للطلبات التي تبدأ من ${formatCurrency(offer.minAmount ?? 0)}.`;
  }

  if (offer.type === "free_product") {
    if (sectionLabel && (offer.minQuantity ?? 0) > 0) {
      return `منتج مجاني عند شراء ${offer.minQuantity} قطعة من قسم ${sectionLabel} مع ${(offer.eligibleProducts?.length ?? 0)} منتج متاح للاختيار.`;
    }

    if (sectionLabel) {
      return `منتج مجاني عند وصول مشتريات قسم ${sectionLabel} إلى ${formatCurrency(offer.minAmount ?? 0)} مع ${(offer.eligibleProducts?.length ?? 0)} منتج متاح.`;
    }

    return `منتج مجاني عند وصول الطلب إلى ${formatCurrency(offer.minAmount ?? 0)} مع ${(offer.eligibleProducts?.length ?? 0)} منتج متاح للاختيار.`;
  }

  return `اختيار ${offer.pickCount ?? 0} منتجات من ${(offer.eligibleProducts?.length ?? 0)} بسعر ثابت ${formatCurrency(offer.comboPrice ?? 0)}.`;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<Offer>(emptyOffer);

  useEffect(() => {
    const unsubscribeOffers = onSnapshot(getCollection("offers"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ ...(doc.data() as Omit<Offer, "id">), id: doc.id }))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      setOffers(data);
      setOffersLoading(false);
    });

    const unsubscribeProducts = onSnapshot(getCollection("products"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ ...(doc.data() as Omit<Product, "id">), id: doc.id }))
        .sort((a, b) => a.name.localeCompare(b.name, "ar"));

      setProducts(data);
      setProductsLoading(false);
    });

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, []);

  const loading = offersLoading || productsLoading;
  const selectedProducts = useMemo(
    () => products.filter((product) => (form.eligibleProducts ?? []).includes(product.id)),
    [form.eligibleProducts, products]
  );
  const selectedSections = form.targetSections ?? [];
  const sectionBasedTrigger = selectedSections.length > 0;
  const usesQuantityTrigger = sectionBasedTrigger && Number(form.minQuantity ?? 0) > 0;

  const openCreate = () => {
    setForm({ ...emptyOffer, createdAt: "", eligibleProducts: [], targetSections: [] });
    setFormError("");
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (offer: Offer) => {
    setForm({
      ...emptyOffer,
      ...offer,
      eligibleProducts: offer.eligibleProducts ?? [],
      targetSections: offer.targetSections ?? [],
      minAmount: offer.minAmount ?? 0,
      minQuantity: offer.minQuantity ?? 0,
      pickCount: offer.pickCount ?? 2,
      comboPrice: offer.comboPrice ?? 0,
      uniqueOnly: offer.uniqueOnly ?? false,
      startDate: offer.startDate ?? "",
      endDate: offer.endDate ?? "",
    });
    setFormError("");
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setFormError("");
  };

  const toggleProduct = (productId: string) => {
    setForm((current) => {
      const selected = current.eligibleProducts ?? [];
      const nextSelected = selected.includes(productId)
        ? selected.filter((id) => id !== productId)
        : [...selected, productId];
      return { ...current, eligibleProducts: nextSelected };
    });
  };

  const selectAllProducts = (productIds: string[]) => {
    setForm((current) => {
      const selected = new Set(current.eligibleProducts ?? []);
      productIds.forEach((id) => selected.add(id));
      return { ...current, eligibleProducts: Array.from(selected) };
    });
  };

  const deselectAllProducts = (productIds: string[]) => {
    setForm((current) => {
      const toRemove = new Set(productIds);
      return {
        ...current,
        eligibleProducts: (current.eligibleProducts ?? []).filter((id) => !toRemove.has(id)),
      };
    });
  };

  const toggleSection = (sectionId: string) => {
    setForm((current) => {
      const selected = current.targetSections ?? [];
      const nextSelected = selected.includes(sectionId)
        ? selected.filter((id) => id !== sectionId)
        : [...selected, sectionId];

      return {
        ...current,
        targetSections: nextSelected,
        ...(nextSelected.length === 0 ? { minQuantity: 0 } : {}),
      };
    });
  };

  const setTriggerMode = (mode: "amount" | "quantity") => {
    setForm((current) => ({
      ...current,
      minAmount: mode === "amount" ? Math.max(1, Number(current.minAmount ?? 0)) : 0,
      minQuantity: mode === "quantity" ? Math.max(1, Number(current.minQuantity ?? 0)) : 0,
    }));
  };

  const saveOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const minAmount = Number(form.minAmount ?? 0);
    const minQuantity = Number(form.minQuantity ?? 0);
    const pickCount = Number(form.pickCount ?? 0);
    const comboPrice = Number(form.comboPrice ?? 0);
    const eligibleProducts = Array.from(new Set((form.eligibleProducts ?? []).filter(Boolean)));
    const targetSections = Array.from(new Set((form.targetSections ?? []).filter(Boolean)));

    if (!title) {
      setFormError("يرجى إدخال نص العرض الذي سيظهر في البانر.");
      return;
    }

    if ((form.type === "free_product" || form.type === "combo") && eligibleProducts.length === 0) {
      setFormError("يرجى اختيار منتج واحد على الأقل لهذا العرض.");
      return;
    }

    if (form.type === "combo") {
      if (pickCount <= 0) {
        setFormError("يرجى إدخال عدد المنتجات التي يختارها العميل.");
        return;
      }

      if (comboPrice <= 0) {
        setFormError("يرجى إدخال السعر الثابت لعرض الكومبو.");
        return;
      }
    }

    if ((form.type === "free_shipping" || form.type === "free_product") && targetSections.length > 0 && minQuantity > 0) {
      if (minQuantity <= 0) {
        setFormError("يرجى إدخال الحد الأدنى للكمية بشكل صحيح.");
        return;
      }
    } else if (form.type === "free_shipping" || form.type === "free_product") {
      if (minAmount <= 0) {
        setFormError("يرجى إدخال الحد الأدنى للطلب بشكل صحيح.");
        return;
      }
    }

    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      setFormError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return;
    }

    const docId = form.id || slugify(`${form.type}-${title}`) || crypto.randomUUID();
    const raw: Record<string, unknown> = {
      id: docId,
      type: form.type,
      title,
      createdAt: form.createdAt || new Date().toISOString(),
    };

    if (form.startDate) raw.startDate = form.startDate;
    if (form.endDate) raw.endDate = form.endDate;
    if (targetSections.length > 0 && form.type !== "combo") raw.targetSections = targetSections;
    if (form.type === "free_shipping" || form.type === "free_product") {
      if (targetSections.length > 0 && minQuantity > 0) {
        raw.minQuantity = minQuantity;
      } else {
        raw.minAmount = minAmount;
      }
    }
    if (form.type === "free_product" || form.type === "combo") raw.eligibleProducts = eligibleProducts;
    if (form.type === "combo") {
      raw.pickCount = pickCount;
      raw.comboPrice = comboPrice;
      raw.uniqueOnly = form.uniqueOnly ?? false;
    }

    try {
      setIsSaving(true);
      await setDoc(getDocRef("offers", docId), raw);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "فشل حفظ العرض.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOffer = async (offer: Offer) => {
    if (!window.confirm(`هل تريد حذف العرض "${offer.title}"؟`)) return;
    await deleteDoc(getDocRef("offers", offer.id));
  };

  if (loading) {
    return <LoadingState label="جاري تحميل العروض والمنتجات..." />;
  }

  const activeCount = offers.filter((offer) => isOfferActive(offer)).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة العروض"
        description="أنشئ عروض الشحن المجاني والمنتج المجاني والكومبو مع إمكانية استهداف أقسام محددة وتفعيلها تلقائياً بين تاريخ البداية والنهاية."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)]"
          >
            <Plus className="h-4 w-4" />
            إضافة عرض
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminCard>
          <p className="text-sm text-slate-500">إجمالي العروض</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{offers.length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">العروض الفعّالة حالياً</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{activeCount}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">العروض المستهدفة للأقسام</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{offers.filter((offer) => (offer.targetSections?.length ?? 0) > 0).length}</p>
        </AdminCard>
      </section>

      <AdminCard>
        {offers.length === 0 ? (
          <AdminEmptyState title="لا توجد عروض حالياً" description="أضف أول عرض ليظهر تلقائياً في البانر وصفحات المتجر عند حلول تاريخ البداية." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {offers.map((offer) => {
              const status = getOfferStatus(offer);
              const sectionLabel = getOfferSectionLabel(offer);

              return (
                <div key={offer.id} className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">{OFFER_TYPE_LABELS[offer.type]}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-900">{offer.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{describeOffer(offer)}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>من: {formatDateLabel(offer.startDate)}</span>
                        <span>إلى: {formatDateLabel(offer.endDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(offer)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" aria-label="تعديل العرض">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void deleteOffer(offer)} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50" aria-label="حذف العرض">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {sectionLabel ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.targetSections?.map((sectionId) => (
                        <span key={sectionId} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {CATEGORY_LABELS[sectionId] ?? sectionId}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {(offer.eligibleProducts?.length ?? 0) > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.eligibleProducts?.slice(0, 4).map((productId) => {
                        const product = products.find((item) => item.id === productId);
                        return product ? (
                          <span key={productId} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {product.name}
                          </span>
                        ) : null;
                      })}
                      {(offer.eligibleProducts?.length ?? 0) > 4 ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">+{(offer.eligibleProducts?.length ?? 0) - 4} منتجات</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "تعديل العرض" : "إضافة عرض جديد"}
        description="حدد نوع العرض وتواريخ سريانه والمنتجات أو الأقسام المؤهلة. العرض يظهر تلقائياً بين تاريخ البداية والنهاية."
      >
        <form onSubmit={saveOffer} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>نوع العرض</FieldLabel>
              <SelectInput
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as OfferType,
                    ...(event.target.value === "combo" ? { targetSections: [], minQuantity: 0, minAmount: 0 } : {}),
                  }))
                }
              >
                <option value="free_shipping">شحن مجاني</option>
                <option value="free_product">منتج مجاني</option>
                <option value="combo">عرض كومبو</option>
              </SelectInput>
            </div>

            <div className="md:col-span-1" />

            <div className="md:col-span-2">
              <FieldLabel>نص البانر</FieldLabel>
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: شحن مجاني لمنتجات الحماية من الشمس" />
            </div>

            <div>
              <FieldLabel>تاريخ البداية (اختياري)</FieldLabel>
              <TextInput type="date" value={form.startDate ?? ""} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              <p className="mt-1 text-xs text-slate-400">اتركه فارغاً ليبدأ فوراً</p>
            </div>

            <div>
              <FieldLabel>تاريخ النهاية (اختياري)</FieldLabel>
              <TextInput type="date" value={form.endDate ?? ""} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              <p className="mt-1 text-xs text-slate-400">اتركه فارغاً ليبقى دائماً</p>
            </div>

            {form.type !== "combo" ? (
              <div className="md:col-span-2 space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">استهداف أقسام محددة (اختياري)</h3>
                    <p className="mt-1 text-sm text-slate-500">عند تحديد أقسام، سيتم تفعيل العرض فقط على المنتجات الموجودة داخل هذه الأقسام.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{selectedSections.length} قسم محدد</span>
                </div>

                <SectionPicker selectedIds={selectedSections} onToggle={toggleSection} />

                {sectionBasedTrigger ? (
                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setTriggerMode("amount")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!usesQuantityTrigger ? "bg-[var(--primary)] text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)]/40"}`}>الحد الأدنى بالقيمة</button>
                      <button type="button" onClick={() => setTriggerMode("quantity")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${usesQuantityTrigger ? "bg-[var(--primary)] text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)]/40"}`}>الحد الأدنى بالكمية</button>
                    </div>

                    {usesQuantityTrigger ? (
                      <div>
                        <FieldLabel>الحد الأدنى للكمية من القسم</FieldLabel>
                        <TextInput type="number" min="1" value={form.minQuantity ?? 1} onChange={(event) => setForm({ ...form, minQuantity: Number(event.target.value), minAmount: 0 })} />
                      </div>
                    ) : (
                      <div>
                        <FieldLabel>الحد الأدنى لقيمة مشتريات الأقسام المحددة</FieldLabel>
                        <TextInput type="number" min="0" value={form.minAmount ?? 0} onChange={(event) => setForm({ ...form, minAmount: Number(event.target.value), minQuantity: 0 })} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <FieldLabel>الحد الأدنى للطلب</FieldLabel>
                    <TextInput type="number" min="0" value={form.minAmount ?? 0} onChange={(event) => setForm({ ...form, minAmount: Number(event.target.value), minQuantity: 0 })} />
                  </div>
                )}
              </div>
            ) : null}

            {form.type === "combo" ? (
              <>
                <div>
                  <FieldLabel>عدد المنتجات المختارة</FieldLabel>
                  <TextInput type="number" min="1" value={form.pickCount ?? 1} onChange={(event) => setForm({ ...form, pickCount: Number(event.target.value) })} />
                </div>
                <div>
                  <FieldLabel>السعر الثابت للكومبو</FieldLabel>
                  <TextInput type="number" min="0" value={form.comboPrice ?? 0} onChange={(event) => setForm({ ...form, comboPrice: Number(event.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[var(--primary)]/40">
                    <input type="checkbox" checked={form.uniqueOnly ?? false} onChange={(event) => setForm({ ...form, uniqueOnly: event.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                    <div>
                      <span className="text-sm font-semibold text-slate-900">منتجات فريدة فقط</span>
                      <p className="text-xs text-slate-500">عند التفعيل، لا يمكن للعميل اختيار نفس المنتج أكثر من مرة</p>
                    </div>
                  </label>
                </div>
              </>
            ) : null}
          </div>

          {(form.type === "free_product" || form.type === "combo") ? (
            <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">اختيار المنتجات المؤهلة</h3>
                  <p className="mt-1 text-sm text-slate-500">اختر المنتجات التي ستظهر للعميل ضمن هذا العرض. يمكنك الفلترة بحسب القسم أو تحديد الكل.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{selectedProducts.length} منتج محدد</span>
              </div>

              <ProductPicker products={products} selectedIds={form.eligibleProducts ?? []} onToggle={toggleProduct} onSelectAll={selectAllProducts} onDeselectAll={deselectAllProducts} />
            </div>
          ) : null}

          {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">إلغاء</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">
              <Tag className="h-4 w-4" />
              {isSaving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء العرض"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
