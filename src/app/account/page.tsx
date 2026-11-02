"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/account/profile");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await signIn(email.trim(), password);
      router.replace("/account/profile");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <section className="clinical-container flex min-h-[50vh] items-center justify-center py-12" dir="rtl">
        <div className="clinical-panel flex items-center gap-3 px-6 py-4 text-[var(--muted)]" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          جاري التحقق من الحساب...
        </div>
      </section>
    );
  }

  return (
    <div className="bg-[var(--surface-soft)] py-10 sm:py-14" dir="rtl">
      <section className="clinical-container">
        <div className="mb-7 text-center">
          <p className="text-sm font-semibold text-[var(--accent)]">حساب العميل</p>
          <h1 className="clinical-page-heading mt-2">تسجيل الدخول</h1>
          <p className="clinical-muted mx-auto mt-2 max-w-md">ادخل إلى ملفك وعناوينك وسجل طلباتك من مكان واحد.</p>
        </div>

        <div className="mx-auto max-w-md">
          <div className="clinical-panel p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="account-email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">البريد الإلكتروني</label>
                <input
                  id="account-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  autoComplete="email"
                  className="clinical-input"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label htmlFor="account-password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">كلمة المرور</label>
                <input
                  id="account-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  className="clinical-input"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center justify-end text-sm">
                <Link href="/account/forgot-password" className="text-[var(--primary)] hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="clinical-button flex w-full items-center justify-center gap-2"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                ليس لديك حساب؟{" "}
                <Link href="/account/signup" className="font-medium text-[var(--primary)] hover:underline">
                  إنشاء حساب جديد
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
