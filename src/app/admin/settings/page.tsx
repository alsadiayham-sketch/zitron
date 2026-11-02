"use client";

import { FormEvent, useEffect, useState } from "react";
import { onSnapshot, setDoc } from "@/lib/store-data";
import { DEFAULT_SETTINGS, getErrorMessage, isValidHttpUrl, type AdminSettings } from "@/lib/admin";
import { getDocRef } from "@/lib/store-data";
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
  const [hasSaveError, setHasSaveError] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      getDocRef("settings", "config"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<AdminSettings>) });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
        setLoading(false);
      },
      () => {
        setMessage("تعذر تحميل الإعدادات حالياً. حدّث الصفحة وحاول مرة أخرى.");
        setHasSaveError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings.storeName.trim() || !settings.storeNameAr.trim()) {
      setMessage("يرجى إدخال اسمي المتجر بالعربية والإنجليزية.");
      setHasSaveError(true);
      return;
    }
    if (settings.instagramLink.trim() && !isValidHttpUrl(settings.instagramLink.trim())) {
      setMessage("يرجى إدخال رابط إنستغرام صحيح يبدأ بـ http أو https.");
      setHasSaveError(true);
      return;
    }
    try {
      setIsSaving(true);
      setMessage("");
      setHasSaveError(false);
      await setDoc(getDocRef("settings", "config"), settings, { merge: true });
      setMessage("تم حفظ الإعدادات بنجاح.");
      setHasSaveError(false);
    } catch (error) {
      setMessage(getErrorMessage(error, "فشل حفظ الإعدادات."));
      setHasSaveError(true);
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
                <FieldLabel htmlFor="settings-store-name">اسم المتجر بالإنجليزية</FieldLabel>
                <TextInput id="settings-store-name" value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-store-name-ar">اسم المتجر بالعربية</FieldLabel>
                <TextInput id="settings-store-name-ar" value={settings.storeNameAr} onChange={(event) => setSettings({ ...settings, storeNameAr: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-currency">رمز العملة</FieldLabel>
                <TextInput id="settings-currency" value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-currency-name">اسم العملة</FieldLabel>
                <TextInput id="settings-currency-name" value={settings.currencyName} onChange={(event) => setSettings({ ...settings, currencyName: event.target.value })} />
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="text-lg font-bold text-slate-900">التواصل والحملات</h2>
            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel htmlFor="settings-whatsapp">رقم واتساب</FieldLabel>
                <TextInput id="settings-whatsapp" value={settings.whatsappNumber} onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-instagram">رابط إنستغرام</FieldLabel>
                <TextInput id="settings-instagram" value={settings.instagramLink} onChange={(event) => setSettings({ ...settings, instagramLink: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-hero-title">عنوان البانر الرئيسي</FieldLabel>
                <TextInput id="settings-hero-title" value={settings.heroTitle} onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="settings-hero-subtitle">الوصف الفرعي للبانر</FieldLabel>
                <TextArea id="settings-hero-subtitle" value={settings.heroSubtitle} onChange={(event) => setSettings({ ...settings, heroSubtitle: event.target.value })} />
              </div>
            </div>
          </AdminCard>
        </section>

        <AdminCard>
          <h2 className="text-lg font-bold text-slate-900">بيانات التواصل</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="settings-contact-address">العنوان</FieldLabel>
              <TextInput id="settings-contact-address" value={settings.contactAddress} onChange={(event) => setSettings({ ...settings, contactAddress: event.target.value })} />
            </div>
            <div>
              <FieldLabel htmlFor="settings-contact-phone">رقم الهاتف</FieldLabel>
              <TextInput id="settings-contact-phone" value={settings.contactPhone} onChange={(event) => setSettings({ ...settings, contactPhone: event.target.value })} />
            </div>
            <div>
              <FieldLabel htmlFor="settings-contact-email">البريد الإلكتروني</FieldLabel>
              <TextInput id="settings-contact-email" type="email" value={settings.contactEmail} onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })} />
            </div>
            <div>
              <FieldLabel htmlFor="settings-contact-hours">ساعات العمل</FieldLabel>
              <TextInput id="settings-contact-hours" value={settings.contactWorkHours} onChange={(event) => setSettings({ ...settings, contactWorkHours: event.target.value })} />
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-bold text-slate-900">نبذة عن المتجر</h2>
          <div className="mt-5">
            <FieldLabel htmlFor="settings-about-text">النص التعريفي</FieldLabel>
            <TextArea id="settings-about-text" value={settings.aboutText} onChange={(event) => setSettings({ ...settings, aboutText: event.target.value })} className="min-h-44" />
          </div>
        </AdminCard>

        {message ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${hasSaveError ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
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
