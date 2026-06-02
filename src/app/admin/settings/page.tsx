"use client";

import { FormEvent, useEffect, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { DEFAULT_SETTINGS, type AdminSettings } from "@/lib/admin";
import { getDocRef } from "@/lib/firebase";
import {
  AdminCard,
  AdminPageHeader,
  FieldLabel,
  LoadingState,
  TextArea,
  TextInput,
} from "@/components/admin/AdminUI";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(getDocRef("settings", "config"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<AdminSettings>) });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setMessage("");
      await setDoc(getDocRef("settings", "config"), settings, { merge: true });
      setMessage("تم حفظ الإعدادات بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل حفظ الإعدادات.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="جاري تحميل إعدادات المتجر..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إعدادات المتجر"
        description="حدّث النصوص الرئيسية وروابط التواصل والمعلومات العامة للمتجر من مكان واحد."
      />

      <form onSubmit={saveSettings} className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <AdminCard>
            <h2 className="text-lg font-bold text-slate-900">بيانات العلامة التجارية</h2>
            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel>اسم المتجر بالإنجليزية</FieldLabel>
                <TextInput value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} />
              </div>
              <div>
                <FieldLabel>اسم المتجر بالعربية</FieldLabel>
                <TextInput value={settings.storeNameAr} onChange={(event) => setSettings({ ...settings, storeNameAr: event.target.value })} />
              </div>
              <div>
                <FieldLabel>رمز العملة</FieldLabel>
                <TextInput value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} />
              </div>
              <div>
                <FieldLabel>اسم العملة</FieldLabel>
                <TextInput value={settings.currencyName} onChange={(event) => setSettings({ ...settings, currencyName: event.target.value })} />
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="text-lg font-bold text-slate-900">التواصل والحملات</h2>
            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel>رقم واتساب</FieldLabel>
                <TextInput value={settings.whatsappNumber} onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })} />
              </div>
              <div>
                <FieldLabel>رابط إنستغرام</FieldLabel>
                <TextInput value={settings.instagramLink} onChange={(event) => setSettings({ ...settings, instagramLink: event.target.value })} />
              </div>
              <div>
                <FieldLabel>عنوان البانر الرئيسي</FieldLabel>
                <TextInput value={settings.heroTitle} onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })} />
              </div>
              <div>
                <FieldLabel>الوصف الفرعي للبانر</FieldLabel>
                <TextArea value={settings.heroSubtitle} onChange={(event) => setSettings({ ...settings, heroSubtitle: event.target.value })} />
              </div>
            </div>
          </AdminCard>
        </section>

        <AdminCard>
          <h2 className="text-lg font-bold text-slate-900">نبذة عن المتجر</h2>
          <div className="mt-5">
            <FieldLabel>النص التعريفي</FieldLabel>
            <TextArea value={settings.aboutText} onChange={(event) => setSettings({ ...settings, aboutText: event.target.value })} className="min-h-44" />
          </div>
        </AdminCard>

        {message ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${message.includes("نجاح") ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>
            {message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </form>
    </div>
  );
}
