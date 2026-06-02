"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { deleteDoc, onSnapshot, query, setDoc, orderBy, updateDoc } from "firebase/firestore";
import { ArrowDownUp, Pencil, Plus, Trash2, Upload, Video } from "lucide-react";
import { getCollection, getDocRef } from "@/lib/firebase";
import { slugify, uploadImageToImgbb, type AdminHeroSlide } from "@/lib/admin";
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

const emptySlide: AdminHeroSlide = {
  id: "",
  type: "image",
  url: "",
  title: "",
  subtitle: "",
  order: 1,
};

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<AdminHeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AdminHeroSlide>(emptySlide);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(query(getCollection("heroDisplay"), orderBy("order")), (snapshot) => {
      setSlides(
        snapshot.docs.map((doc) => ({
          ...(doc.data() as Omit<AdminHeroSlide, "id">),
          id: doc.id,
        }))
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreate = () => {
    setForm({ ...emptySlide, order: slides.length + 1 });
    setFormError("");
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (slide: AdminHeroSlide) => {
    setForm(slide);
    setFormError("");
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setFormError("");
      const url = await uploadImageToImgbb(file);
      setForm((current) => ({ ...current, type: "image", url }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const saveSlide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.url.trim()) {
      setFormError(form.type === "video" ? "يرجى إضافة رابط الفيديو." : "يرجى رفع صورة أو إضافة رابطها.");
      return;
    }

    const docId = form.id || slugify(form.title || `hero-${form.order}`) || crypto.randomUUID();
    const payload: AdminHeroSlide = {
      ...form,
      id: docId,
      order: Number(form.order || 1),
      url: form.url.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
    };

    try {
      setIsSaving(true);
      await setDoc(getDocRef("heroDisplay", docId), payload);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "فشل حفظ الشريحة.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSlide = async (slide: AdminHeroSlide) => {
    if (!window.confirm(`هل تريد حذف الشريحة "${slide.title || slide.id}"؟`)) return;
    await deleteDoc(getDocRef("heroDisplay", slide.id));
  };

  const updateSlideOrder = async (slide: AdminHeroSlide, newOrder: number) => {
    if (!Number.isFinite(newOrder) || newOrder < 1 || newOrder === slide.order) return;
    await updateDoc(getDocRef("heroDisplay", slide.id), { order: newOrder });
  };

  const orderedSummary = useMemo(() => slides.map((slide) => slide.order).join(" • "), [slides]);

  if (loading) {
    return <LoadingState label="جاري تحميل الشرائح الرئيسية..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة العرض الرئيسي"
        description="تحكم كامل في الشرائح الرئيسية للصفحة الأولى، سواء صور أو فيديوهات، مع ترتيبها ونصوصها."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)]"
          >
            <Plus className="h-4 w-4" />
            إضافة شريحة
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminCard>
          <p className="text-sm text-slate-500">عدد الشرائح</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{slides.length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">شرائح الصور</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{slides.filter((slide) => slide.type === "image").length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">ترتيب العرض</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{orderedSummary || "لا يوجد"}</p>
        </AdminCard>
      </section>

      <AdminCard>
        {slides.length === 0 ? (
          <AdminEmptyState title="لا توجد شرائح حالياً" description="أضف أول شريحة لتظهر في البانر الرئيسي للموقع." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {slides.map((slide) => (
              <div key={slide.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                  {slide.type === "image" ? (
                    <Image src={slide.url} alt={slide.title || slide.id} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 40vw" />
                  ) : (
                    <video src={slide.url} className="h-full w-full object-cover" controls muted playsInline />
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {slide.type === "image" ? "صورة" : "فيديو"}
                      </span>
                      <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        الترتيب {slide.order}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">{slide.title || "بدون عنوان"}</h3>
                    <p className="mt-2 text-sm text-slate-500">{slide.subtitle || "لا يوجد وصف فرعي"}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
                      <ArrowDownUp className="h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        defaultValue={slide.order}
                        onBlur={(event) => void updateSlideOrder(slide, Number(event.target.value))}
                        className="w-14 bg-transparent text-sm font-semibold outline-none"
                        aria-label="ترتيب الشريحة"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(slide)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="تعديل الشريحة"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSlide(slide)}
                      className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                      aria-label="حذف الشريحة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "تعديل الشريحة" : "إضافة شريحة جديدة"}
        description="يمكنك استخدام صورة مرفوعة إلى ImgBB أو رابط فيديو مباشر للشريحة."
      >
        <form onSubmit={saveSlide} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>نوع الشريحة</FieldLabel>
              <SelectInput
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as AdminHeroSlide["type"] })}
              >
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>الترتيب</FieldLabel>
              <TextInput type="number" min="1" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} />
            </div>
            <div>
              <FieldLabel>العنوان</FieldLabel>
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="عنوان الشريحة" />
            </div>
            <div>
              <FieldLabel>الرابط</FieldLabel>
              <TextInput
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder={form.type === "video" ? "https://...mp4" : "https://...jpg"}
              />
            </div>
          </div>

          {form.type === "image" ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FieldLabel>رفع صورة</FieldLabel>
                  <p className="text-xs text-slate-500">سيتم رفع الصورة إلى ImgBB واستخدام الرابط الناتج تلقائياً.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  {isUploading ? "جاري الرفع..." : "اختيار صورة"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event)} />
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Video className="h-4 w-4" />
                استخدم رابط فيديو مباشر بصيغة قابلة للتشغيل في المتصفح.
              </div>
            </div>
          )}

          <div>
            <FieldLabel>الوصف الفرعي</FieldLabel>
            <TextArea value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="وصف قصير يظهر أسفل العنوان" />
          </div>

          {form.url ? (
            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">معاينة</p>
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                {form.type === "image" ? (
                  <Image src={form.url} alt={form.title || "معاينة"} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
                ) : (
                  <video src={form.url} className="h-full w-full object-cover" controls muted playsInline />
                )}
              </div>
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة الشريحة"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
