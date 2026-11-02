"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { setDoc } from "@/lib/store-data";
import {
  LoaderCircle,
  LogOut,
  MapPin,
  Pencil,
  Save,
  ShoppingBag,
  UserCircle2,
} from "lucide-react";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";
import type { SavedLocation } from "@/lib/admin";
import { getDocRef } from "@/lib/store-data";

const emptyLocationForm = {
  label: "",
  city: "",
  fullAddress: "",
};

function generateLocationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `location-${Date.now()}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, profile, profileError, profileLoading, signOut } = useAuth();
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/account");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDetailsForm((prev) => ({
        ...prev,
        name: profile.name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [profile, user?.email]);

  const locations = useMemo(() => profile?.locations ?? [], [profile?.locations]);

  const resetLocationForm = () => {
    setEditingLocationId(null);
    setLocationForm(emptyLocationForm);
    setLocationError("");
  };

  const updateLocations = async (nextLocations: SavedLocation[]) => {
    if (!user) {
      return;
    }

    setSavingLocation(true);
    setLocationError("");

    try {
      await setDoc(getDocRef("users", user.uid), {
        locations: nextLocations,
      }, { merge: true });
      resetLocationForm();
      setMessage("تم تحديث العناوين المحفوظة بنجاح.");
    } catch (nextError) {
      setLocationError(getAuthErrorMessage(nextError));
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    try {
      setSavingDetails(true);
      setError("");
      setMessage("");

      const nextName = detailsForm.name.trim();
      const nextPhone = detailsForm.phone.trim().replace(/[\s()-]/g, "");
      if (nextName.length < 2) {
        setError("يرجى إدخال اسم صالح.");
        return;
      }
      if (nextPhone && !/^\+?\d{7,15}$/.test(nextPhone)) {
        setError("يرجى إدخال رقم هاتف صالح من 7 إلى 15 رقماً.");
        return;
      }
      await setDoc(getDocRef("users", user.uid), {
        name: nextName,
        phone: nextPhone,
        createdAt: profile?.createdAt || new Date().toISOString(),
      }, { merge: true });

      setMessage("تم تحديث بيانات الملف الشخصي بنجاح.");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !user.email) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError("");
      setMessage("");

      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("تم تغيير كلمة المرور بنجاح.");
    } catch (nextError) {
      setPasswordError(getAuthErrorMessage(nextError));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!locationForm.label.trim() || !locationForm.city.trim() || !locationForm.fullAddress.trim()) {
      setLocationError("يرجى تعبئة جميع بيانات العنوان.");
      return;
    }

    const normalizedLocation: SavedLocation = {
      id: editingLocationId ?? generateLocationId(),
      label: locationForm.label.trim(),
      city: locationForm.city.trim(),
      fullAddress: locationForm.fullAddress.trim(),
      isDefault: editingLocationId
        ? Boolean(locations.find((location) => location.id === editingLocationId)?.isDefault)
        : locations.length === 0 || locations.every((location) => !location.isDefault),
    };

    const nextLocations = editingLocationId
      ? locations.map((location) => (location.id === editingLocationId ? { ...location, ...normalizedLocation } : location))
      : [...locations, normalizedLocation];

    await updateLocations(nextLocations);
  };

  const handleEditLocation = (location: SavedLocation) => {
    setEditingLocationId(location.id);
    setLocationForm({
      label: location.label,
      city: location.city,
      fullAddress: location.fullAddress,
    });
    setLocationError("");
  };

  const handleDeleteLocation = async (locationId: string) => {
    const filtered = locations.filter((location) => location.id !== locationId);
    const hasDefault = filtered.some((location) => location.isDefault);
    const nextLocations = filtered.map((location, index) => ({
      ...location,
      isDefault: hasDefault ? location.isDefault : index === 0,
    }));

    await updateLocations(nextLocations);
  };

  const handleSetDefaultLocation = async (locationId: string) => {
    await updateLocations(
      locations.map((location) => ({
        ...location,
        isDefault: location.id === locationId,
      }))
    );
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  if (loading || profileLoading || !user) {
    return (
      <section className="clinical-container flex min-h-[50vh] items-center justify-center py-12" dir="rtl">
        <div className="clinical-panel flex items-center gap-3 px-6 py-4 text-[var(--muted)]" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          جاري تحميل ملفك الشخصي...
        </div>
      </section>
    );
  }

  return (
    <section className="clinical-container py-8 sm:py-10" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="clinical-page-heading">الملف الشخصي</h1>
          <p className="clinical-muted mt-2">إدارة بيانات الحساب والعناوين المحفوظة بأمان.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/orders"
            className="clinical-button-secondary inline-flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            سجل الطلبات
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-2" aria-label="أقسام الحساب">
        <Link href="/account/profile" aria-current="page" className="min-w-max rounded-lg bg-[var(--accent-light)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)]">الملف والعناوين</Link>
        <Link href="/account/orders" className="min-w-max rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--primary)]">سجل الطلبات</Link>
        <Link href="/track" className="min-w-max rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--primary)]">تتبع طلب</Link>
      </nav>

      {message ? <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {profileError ? <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="clinical-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <UserCircle2 className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">بيانات الحساب</h2>
            </div>
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold text-slate-700">الاسم الكامل</label>
                <input id="profile-name" value={detailsForm.name} onChange={(event) => setDetailsForm({ ...detailsForm, name: event.target.value })} className="clinical-input" />
              </div>
              <div>
                <label htmlFor="profile-email" className="mb-2 block text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                <input id="profile-email" type="email" value={detailsForm.email} readOnly aria-readonly="true" className="clinical-input cursor-not-allowed bg-[var(--surface-soft)] text-[var(--muted)]" />
              </div>
              <div>
                <label htmlFor="profile-phone" className="mb-2 block text-sm font-semibold text-slate-700">رقم الهاتف</label>
                <input id="profile-phone" type="tel" value={detailsForm.phone} onChange={(event) => setDetailsForm({ ...detailsForm, phone: event.target.value })} className="clinical-input" />
              </div>
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <button type="submit" disabled={savingDetails} className="clinical-button inline-flex items-center gap-2">
                {savingDetails ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ البيانات
              </button>
            </form>
          </div>

          <div className="clinical-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <Pencil className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">تغيير كلمة المرور</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور الحالية</label>
                <input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="clinical-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور الجديدة</label>
                <input type="password" required minLength={6} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="clinical-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">تأكيد كلمة المرور الجديدة</label>
                <input type="password" required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="clinical-input" />
              </div>
              {passwordError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{passwordError}</div> : null}
              <button type="submit" disabled={savingPassword} className="clinical-button-secondary inline-flex items-center gap-2">
                {savingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                تحديث كلمة المرور
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="clinical-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <MapPin className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">العناوين المحفوظة</h2>
            </div>

            <div className="space-y-3">
              {locations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">لا توجد عناوين محفوظة حتى الآن. أضف عنوانك الأول لتسريع عملية الشراء.</div>
              ) : (
                locations.map((location) => (
                  <div key={location.id} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{location.label}</h3>
                          {location.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">الافتراضي</span> : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{location.city}</p>
                        <p className="mt-1 text-sm text-slate-500">{location.fullAddress}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!location.isDefault ? <button type="button" onClick={() => void handleSetDefaultLocation(location.id)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] hover:text-[var(--primary)]">تعيين كافتراضي</button> : null}
                        <button type="button" onClick={() => handleEditLocation(location)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] hover:text-[var(--primary)]">تعديل</button>
                        <button type="button" onClick={() => void handleDeleteLocation(location.id)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">حذف</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSaveLocation} className="mt-6 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <h3 className="font-bold text-slate-900">{editingLocationId ? "تعديل العنوان" : "إضافة عنوان جديد"}</h3>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">اسم العنوان</label>
                <input value={locationForm.label} onChange={(event) => setLocationForm({ ...locationForm, label: event.target.value })} className="clinical-input" placeholder="مثال: البيت" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">المدينة</label>
                <input value={locationForm.city} onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })} className="clinical-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">العنوان الكامل</label>
                <textarea value={locationForm.fullAddress} onChange={(event) => setLocationForm({ ...locationForm, fullAddress: event.target.value })} className="clinical-input min-h-28" />
              </div>
              {locationError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{locationError}</div> : null}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={savingLocation} className="clinical-button inline-flex items-center gap-2">
                  {savingLocation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingLocationId ? "حفظ التعديل" : "إضافة العنوان"}
                </button>
                {editingLocationId ? <button type="button" onClick={resetLocationForm} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">إلغاء</button> : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
