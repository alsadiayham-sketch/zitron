"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { Pencil, Plus, Trash2, Upload, ImagePlus } from "lucide-react";
import type { Product } from "@/lib/types";
import { getCollection, getDocRef } from "@/lib/firebase";
import { CATEGORY_OPTIONS, createEmptyProduct, formatCurrency, slugify, uploadMultipleImages } from "@/lib/admin";
import {
  AdminCard,
  AdminEmptyState,
  AdminModal,
  AdminPageHeader,
  FieldLabel,
  LoadingState,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/AdminUI";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<Product>(createEmptyProduct());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("products"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<Product, "id">),
        id: doc.id,
      }));
      data.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreate = () => {
    setForm(createEmptyProduct());
    setFormError("");
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      ...product,
      images: product.images?.length ? product.images : product.image ? [product.image] : [],
      badge: product.badge ?? "",
      oldPrice: product.oldPrice ?? undefined,
    });
    setFormError("");
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving || isUploading) return;
    setIsModalOpen(false);
    setFormError("");
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    try {
      setIsUploading(true);
      setFormError("");
      const uploadedUrls = await uploadMultipleImages(files);
      setForm((current) => {
        const mergedImages = [...current.images, ...uploadedUrls].filter(Boolean);
        return {
          ...current,
          image: mergedImages[0] ?? current.image,
          images: mergedImages,
        };
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر رفع الصور.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("يرجى إدخال اسم المنتج.");
      return;
    }
    if (!form.image && form.images.length === 0) {
      setFormError("يرجى رفع صورة واحدة على الأقل للمنتج.");
      return;
    }

    const docId = form.id.trim() || slugify(form.nameEn || form.name) || crypto.randomUUID();
    const sanitizedImages = (form.images.length ? form.images : [form.image])
      .map((value) => value.trim())
      .filter(Boolean);

    const payload: Product = {
      ...form,
      id: docId,
      price: Number(form.price || 0),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
      rating: Number(form.rating || 0),
      reviews: Number(form.reviews || 0),
      badge: form.badge?.trim() || undefined,
      image: sanitizedImages[0] ?? "",
      images: sanitizedImages,
      benefits: form.benefits.map((item) => item.trim()).filter(Boolean),
      skinType: form.skinType.map((item) => item.trim()).filter(Boolean),
      description: form.description.trim(),
      ingredients: form.ingredients.trim(),
      howToUse: form.howToUse.trim(),
      range: form.range.trim(),
      rangeId: form.rangeId.trim(),
      volume: form.volume.trim(),
      category: form.category.trim(),
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
    };

    try {
      setIsSaving(true);
      await setDoc(getDocRef("products", docId), payload);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "فشل حفظ المنتج.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`هل تريد حذف المنتج "${product.name}"؟`)) return;
    await deleteDoc(getDocRef("products", product.id));
  };

  const totalValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price || 0), 0),
    [products]
  );

  if (loading) {
    return <LoadingState label="جاري تحميل المنتجات..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة المنتجات"
        description="أضف المنتجات، حدّث بياناتها، وارفع الصور إلى ImgBB مباشرة من لوحة الإدارة."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)]"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminCard>
          <p className="text-sm text-slate-500">عدد المنتجات</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{products.length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">متوسط السعر</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {formatCurrency(products.length ? totalValue / products.length : 0)}
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">منتجات بعروض</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {products.filter((product) => Boolean(product.badge)).length}
          </p>
        </AdminCard>
      </section>

      <AdminCard className="overflow-hidden">
        {products.length === 0 ? (
          <AdminEmptyState title="لا توجد منتجات حالياً" description="ابدأ بإضافة أول منتج ليظهر في المتجر فوراً." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">المنتج</th>
                  <th className="px-4 py-3">الفئة</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3">الشارة</th>
                  <th className="px-4 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{product.nameEn || product.range}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{CATEGORY_OPTIONS.find((item) => item.value === product.category)?.label ?? product.category}</td>
                    <td className="px-4 py-4 font-semibold text-[var(--primary)]">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-4">{product.badge || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="تعديل المنتج"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProduct(product)}
                          className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                          aria-label="حذف المنتج"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "تعديل المنتج" : "إضافة منتج جديد"}
        description="أدخل المعلومات الأساسية، ارفع الصور، واحفظ التغييرات مباشرة في Firestore."
      >
        <form onSubmit={saveProduct} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>اسم المنتج بالعربية</FieldLabel>
              <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div>
              <FieldLabel>اسم المنتج بالإنجليزية</FieldLabel>
              <TextInput value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} />
            </div>
            <div>
              <FieldLabel>المجموعة</FieldLabel>
              <TextInput value={form.range} onChange={(event) => setForm({ ...form, range: event.target.value })} placeholder="مثل: سنسيديان" />
            </div>
            <div>
              <FieldLabel>معرّف المجموعة</FieldLabel>
              <TextInput value={form.rangeId} onChange={(event) => setForm({ ...form, rangeId: event.target.value })} placeholder="sensidiane" />
            </div>
            <div>
              <FieldLabel>الفئة</FieldLabel>
              <SelectInput value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>الحجم</FieldLabel>
              <TextInput value={form.volume} onChange={(event) => setForm({ ...form, volume: event.target.value })} placeholder="40 مل" />
            </div>
            <div>
              <FieldLabel>السعر الحالي</FieldLabel>
              <TextInput type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required />
            </div>
            <div>
              <FieldLabel>السعر السابق</FieldLabel>
              <TextInput
                type="number"
                min="0"
                value={form.oldPrice ?? ""}
                onChange={(event) =>
                  setForm({ ...form, oldPrice: event.target.value ? Number(event.target.value) : undefined })
                }
                placeholder="اختياري"
              />
            </div>
            <div>
              <FieldLabel>التقييم</FieldLabel>
              <TextInput type="number" min="0" max="5" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })} />
            </div>
            <div>
              <FieldLabel>عدد المراجعات</FieldLabel>
              <TextInput type="number" min="0" value={form.reviews} onChange={(event) => setForm({ ...form, reviews: Number(event.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>شارة ترويجية</FieldLabel>
              <TextInput value={form.badge ?? ""} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="مثال: الأكثر مبيعاً" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <FieldLabel>صور المنتج</FieldLabel>
                <p className="text-xs text-slate-500">يمكن رفع أكثر من صورة، وستُستخدم الأولى كصورة رئيسية.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                {isUploading ? "جاري الرفع..." : "رفع صور"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleImageUpload(event)} />
              </label>
            </div>

            {form.images.length === 0 ? (
              <div className="mt-4 flex min-h-32 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <div className="text-center">
                  <ImagePlus className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm">لم يتم رفع أي صور بعد</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {form.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="rounded-3xl border border-slate-200 p-3">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                      <Image src={url} alt={`صورة ${index + 1}`} fill className="object-cover" sizes="180px" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{index === 0 ? "الصورة الرئيسية" : `صورة ${index + 1}`}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => {
                            const updatedImages = current.images.filter((_, imageIndex) => imageIndex !== index);
                            return {
                              ...current,
                              images: updatedImages,
                              image: updatedImages[0] ?? "",
                            };
                          })
                        }
                        className="text-xs font-semibold text-rose-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>أنواع البشرة (مفصولة بفواصل)</FieldLabel>
              <TextInput
                value={form.skinType.join(", ")}
                onChange={(event) =>
                  setForm({
                    ...form,
                    skinType: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                  })
                }
                placeholder="حساسة, جافة, عادية"
              />
            </div>
            <div>
              <FieldLabel>الفوائد (كل فائدة مفصولة بفاصلة)</FieldLabel>
              <TextInput
                value={form.benefits.join(", ")}
                onChange={(event) =>
                  setForm({
                    ...form,
                    benefits: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                  })
                }
                placeholder="ترطيب, تهدئة, حماية"
              />
            </div>
          </div>

          <div>
            <FieldLabel>الوصف</FieldLabel>
            <TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <div>
            <FieldLabel>المكونات</FieldLabel>
            <TextArea value={form.ingredients} onChange={(event) => setForm({ ...form, ingredients: event.target.value })} />
          </div>
          <div>
            <FieldLabel>طريقة الاستخدام</FieldLabel>
            <TextArea value={form.howToUse} onChange={(event) => setForm({ ...form, howToUse: event.target.value })} />
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة المنتج"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
