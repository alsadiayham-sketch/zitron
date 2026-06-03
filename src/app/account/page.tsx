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
      router.replace("/");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await signIn(email, password);
      router.replace("/");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16" dir="rtl">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 text-slate-500 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          جاري التحقق من الحساب...
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl font-bold">حسابي</h1>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-center text-2xl font-bold text-[var(--primary)]">تسجيل الدخول</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
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
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                ليس لديك حساب؟{" "}
                <Link href="/account/signup" className="font-medium text-[var(--primary)] hover:underline">
                  إنشاء حساب جديد
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
