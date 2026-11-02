"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus } from "lucide-react";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/account/profile");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const phone = formData.phone.trim().replace(/[\s()-]/g, "");
    if (fullName.length < 3) {
      setError("يرجى إدخال الاسم الأول واسم العائلة.");
      return;
    }
    if (!/^\+?\d{7,15}$/.test(phone)) {
      setError("يرجى إدخال رقم هاتف صالح من 7 إلى 15 رقماً.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await signUp(
        formData.email,
        formData.password,
        fullName,
        phone
      );
      router.replace("/account/profile");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--surface-soft)] py-10 sm:py-14" dir="rtl">
      <section className="clinical-container">
        <div className="mb-7 text-center">
          <h1 className="clinical-page-heading">إنشاء حساب جديد</h1>
          <p className="clinical-muted mx-auto mt-2 max-w-md">احفظ عناوينك وراجع طلباتك بسهولة في الزيارات القادمة.</p>
        </div>
        <div className="mx-auto max-w-lg">
          <div className="clinical-panel p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="signup-first-name" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">الاسم الأول *</label>
                  <input
                    id="signup-first-name"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                    className="clinical-input"
                    placeholder="محمد"
                  />
                </div>
                <div>
                  <label htmlFor="signup-last-name" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">اسم العائلة *</label>
                  <input
                    id="signup-last-name"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
                    className="clinical-input"
                    placeholder="الأحمد"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">البريد الإلكتروني *</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  className="clinical-input"
                  placeholder="example@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="signup-phone" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">رقم الهاتف *</label>
                <input
                  id="signup-phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="clinical-input"
                  placeholder="0590000000"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">كلمة المرور *</label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  className="clinical-input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">6 أحرف على الأقل</p>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">تأكيد كلمة المرور *</label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                  className="clinical-input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="clinical-button flex w-full items-center justify-center gap-2"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {submitting ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                لديك حساب بالفعل؟{" "}
                <Link href="/account" className="font-medium text-[var(--primary)] hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
