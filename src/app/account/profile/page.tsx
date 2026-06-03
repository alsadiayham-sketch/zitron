"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword } from "firebase/auth";
import { updateDoc } from "firebase/firestore";
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
import { getDocRef } from "@/lib/firebase";

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
  const { user, loading, profile, profileLoading, signOut } = useAuth();
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    email: "",
    phone: "",
    currentPassword: "",
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
        currentPassword: "",
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
      await updateDoc(getDocRef("users", user.uid), {
        locations: nextLocations,
      });
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

      const nextEmail = detailsForm.email.trim();
      if (nextEmail && nextEmail !== user.email) {
        if (!detailsForm.currentPassword.trim()) {
          setError("أدخل كلمة المرور الحالية لتحديث البريد الإلكتروني.");
          return;
        }

        const credential = EmailAuthProvider.credential(user.email || nextEmail, detailsForm.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, nextEmail);
      }

      await updateDoc(getDocRef("users", user.uid), {
        name: detailsForm.name.trim(),
        email: nextEmail,
        phone: detailsForm.phone.trim(),
      });

      setDetailsForm((prev) => ({ ...prev, currentPassword: "" }));
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
      isDefault: locations.length === 0 || locations.every((location) => !location.isDefault),
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
      <section className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16" dir="rtl">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 text-slate-500 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          جاري تحميل ملفك الشخصي...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">الملف الشخصي</h1>
          <p className="mt-2 text-slate-500">إدارة بيانات الحساب والعناوين المحفوظة والطلبات السابقة.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <ShoppingBag className="h-4 w-4" />
            سجل الطلبات
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {message ? <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <UserCircle2 className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">بيانات الحساب</h2>
            </div>
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">الاسم الكامل</label>
                <input value={detailsForm.name} onChange={(event) => setDetailsForm({ ...detailsForm, name: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                <input type="email" value={detailsForm.email} onChange={(event) => setDetailsForm({ ...detailsForm, email: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">رقم الهاتف</label>
                <input type="tel" value={detailsForm.phone} onChange={(event) => setDetailsForm({ ...detailsForm, phone: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور الحالية (مطلوبة عند تغيير البريد)</label>
                <input type="password" value={detailsForm.currentPassword} onChange={(event) => setDetailsForm({ ...detailsForm, currentPassword: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="••••••••" />
              </div>
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <button type="submit" disabled={savingDetails} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">
                {savingDetails ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ البيانات
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <Pencil className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">تغيير كلمة المرور</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور الحالية</label>
                <input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور الجديدة</label>
                <input type="password" required minLength={6} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">تأكيد كلمة المرور الجديدة</label>
                <input type="password" required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              {passwordError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{passwordError}</div> : null}
              <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60">
                {savingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                تحديث كلمة المرور
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-slate-900">
              <MapPin className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">العناوين المحفوظة</h2>
            </div>

            <div className="space-y-3">
              {locations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">لا توجد عناوين محفوظة حتى الآن. أضف عنوانك الأول لتسريع عملية الشراء.</div>
              ) : (
                locations.map((location) => (
                  <div key={location.id} className="rounded-3xl border border-slate-200 p-4">
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

            <form onSubmit={handleSaveLocation} className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">{editingLocationId ? "تعديل العنوان" : "إضافة عنوان جديد"}</h3>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">اسم العنوان</label>
                <input value={locationForm.label} onChange={(event) => setLocationForm({ ...locationForm, label: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="مثال: البيت" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">المدينة</label>
                <input value={locationForm.city} onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">العنوان الكامل</label>
                <textarea value={locationForm.fullAddress} onChange={(event) => setLocationForm({ ...locationForm, fullAddress: event.target.value })} className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
              </div>
              {locationError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{locationError}</div> : null}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={savingLocation} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">
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
