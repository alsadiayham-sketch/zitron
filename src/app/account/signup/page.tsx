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

    try {
      setSubmitting(true);
      setError("");
      await signUp(
        formData.email,
        formData.password,
        `${formData.firstName} ${formData.lastName}`.trim(),
        formData.phone
      );
      router.replace("/");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">إنشاء حساب جديد</h1>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-center text-2xl font-bold text-[var(--primary)]">سجل الآن</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">الاسم الأول *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                    placeholder="محمد"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">اسم العائلة *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                    placeholder="الأحمد"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                  placeholder="0590000000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-500">6 أحرف على الأقل</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">تأكيد كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {submitting ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                لديك حساب بالفعل؟{" "}
                <Link href="/account" className="font-medium text-[var(--primary)] hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
