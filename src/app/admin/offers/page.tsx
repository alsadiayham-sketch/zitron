"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
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
import { getCollection, getDocRef } from "@/lib/firebase";
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
  active: true,
  minAmount: 0,
  eligibleProducts: [],
  pickCount: 2,
  comboPrice: 0,
  createdAt: "",
};

function ProductPicker({
  products,
  selectedIds,
  onToggle,
}: {
  products: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        لا توجد منتجات متاحة حالياً للاختيار.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const checked = selectedIds.includes(product.id);

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onToggle(product.id)}
            className={`flex items-center gap-3 rounded-3xl border p-3 text-right transition ${checked ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/10" : "border-slate-200 bg-white hover:border-[var(--primary)]/40"}`}
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
              {product.image ? <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="line-clamp-1 font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.range}</p>
                </div>
                <input type="checkbox" checked={checked} readOnly className="mt-1 h-4 w-4 accent-[var(--primary)]" />
              </div>
              <p className="mt-2 text-sm font-bold text-[var(--primary)]">{formatCurrency(product.price)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function describeOffer(offer: Offer) {
  if (offer.type === "free_shipping") {
    return `شحن مجاني للطلبات التي تبدأ من ${formatCurrency(offer.minAmount ?? 0)}.`;
  }

  if (offer.type === "free_product") {
    return `منتج مجاني عند وصول الطلب إلى ${formatCurrency(offer.minAmount ?? 0)} مع ${offer.eligibleProducts?.length ?? 0} منتج متاح للاختيار.`;
  }

  return `اختيار ${offer.pickCount ?? 0} منتجات من ${offer.eligibleProducts?.length ?? 0} بسعر ثابت ${formatCurrency(offer.comboPrice ?? 0)}.`;
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
        .sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        });

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

  const openCreate = () => {
    setForm({ ...emptyOffer, createdAt: "", eligibleProducts: [] });
    setFormError("");
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (offer: Offer) => {
    setForm({
      ...emptyOffer,
      ...offer,
      eligibleProducts: offer.eligibleProducts ?? [],
      minAmount: offer.minAmount ?? 0,
      pickCount: offer.pickCount ?? 2,
      comboPrice: offer.comboPrice ?? 0,
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

  const saveOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const minAmount = Number(form.minAmount ?? 0);
    const pickCount = Number(form.pickCount ?? 0);
    const comboPrice = Number(form.comboPrice ?? 0);
    const eligibleProducts = Array.from(new Set((form.eligibleProducts ?? []).filter(Boolean)));

    if (!title) {
      setFormError("يرجى إدخال نص العرض الذي سيظهر في البانر.");
      return;
    }

    if ((form.type === "free_shipping" || form.type === "free_product") && minAmount <= 0) {
      setFormError("يرجى إدخال الحد الأدنى للطلب بشكل صحيح.");
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

    const docId = form.id || slugify(`${form.type}-${title}`) || crypto.randomUUID();
    const payload: Offer = {
      id: docId,
      type: form.type,
      title,
      active: form.active,
      createdAt: form.createdAt || new Date().toISOString(),
      minAmount: form.type === "free_shipping" || form.type === "free_product" ? minAmount : undefined,
      eligibleProducts: form.type === "free_product" || form.type === "combo" ? eligibleProducts : undefined,
      pickCount: form.type === "combo" ? pickCount : undefined,
      comboPrice: form.type === "combo" ? comboPrice : undefined,
    };

    try {
      setIsSaving(true);
      await setDoc(getDocRef("offers", docId), payload);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "فشل حفظ العرض.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOfferActive = async (offer: Offer) => {
    await updateDoc(getDocRef("offers", offer.id), { active: !offer.active });
  };

  const deleteOffer = async (offer: Offer) => {
    if (!window.confirm(`هل تريد حذف العرض "${offer.title}"؟`)) return;
    await deleteDoc(getDocRef("offers", offer.id));
  };

  if (loading) {
    return <LoadingState label="جاري تحميل العروض والمنتجات..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة العروض"
        description="أنشئ عروض الشحن المجاني والمنتج المجاني والكومبو، وتحكم في ظهورها بالبانر وفي صفحة الدفع مباشرة من Firestore."
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
          <p className="text-sm text-slate-500">العروض المفعّلة</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{offers.filter((offer) => offer.active).length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">عروض الكومبو</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{offers.filter((offer) => offer.type === "combo").length}</p>
        </AdminCard>
      </section>

      <AdminCard>
        {offers.length === 0 ? (
          <AdminEmptyState title="لا توجد عروض حالياً" description="أضف أول عرض ليظهر تلقائياً في البانر وصفحة الدفع." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        {OFFER_TYPE_LABELS[offer.type]}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleOfferActive(offer)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${offer.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                      >
                        {offer.active ? "مفعّل" : "غير مفعّل"}
                      </button>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">{offer.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{describeOffer(offer)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(offer)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="تعديل العرض"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteOffer(offer)}
                      className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50"
                      aria-label="حذف العرض"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

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
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        +{(offer.eligibleProducts?.length ?? 0) - 4} منتجات
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "تعديل العرض" : "إضافة عرض جديد"}
        description="اختر نوع العرض، حدّد الشروط والمنتجات، ثم احفظه ليعمل مباشرة في البانر وصفحة الدفع."
      >
        <form onSubmit={saveOffer} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>نوع العرض</FieldLabel>
              <SelectInput value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as OfferType })}>
                <option value="free_shipping">شحن مجاني</option>
                <option value="free_product">منتج مجاني</option>
                <option value="combo">عرض كومبو</option>
              </SelectInput>
            </div>

            <div>
              <FieldLabel>حالة العرض</FieldLabel>
              <SelectInput value={form.active ? "active" : "inactive"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}>
                <option value="active">مفعّل</option>
                <option value="inactive">غير مفعّل</option>
              </SelectInput>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>نص البانر</FieldLabel>
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: شحن مجاني للطلبات فوق 50 شيكل" />
            </div>

            {(form.type === "free_shipping" || form.type === "free_product") ? (
              <div>
                <FieldLabel>الحد الأدنى للطلب</FieldLabel>
                <TextInput type="number" min="0" value={form.minAmount ?? 0} onChange={(event) => setForm({ ...form, minAmount: Number(event.target.value) })} />
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
              </>
            ) : null}
          </div>

          {(form.type === "free_product" || form.type === "combo") ? (
            <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">اختيار المنتجات المؤهلة</h3>
                  <p className="mt-1 text-sm text-slate-500">اختر المنتجات التي ستظهر للعميل ضمن هذا العرض.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedProducts.length} منتج محدد
                </span>
              </div>

              <ProductPicker products={products} selectedIds={form.eligibleProducts ?? []} onToggle={toggleProduct} />
            </div>
          ) : null}

          {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              إلغاء
            </button>
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
