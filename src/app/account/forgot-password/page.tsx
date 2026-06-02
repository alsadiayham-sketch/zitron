"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await resetPassword(email);
      setSent(true);
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
          <h1 className="text-4xl font-bold mb-4">استعادة كلمة المرور</h1>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <Mail className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال رابط الاستعادة</h2>
                <p className="text-sm text-gray-600 mb-6">
                  أرسلنا رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong>.
                </p>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
                >
                  <ArrowRight className="h-4 w-4" />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-2 text-center text-2xl font-bold text-[var(--primary)]">نسيت كلمة المرور؟</h2>
                <p className="mb-8 text-center text-sm text-gray-600">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                      placeholder="example@email.com"
                    />
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-[var(--primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <Link href="/account" className="text-sm text-[var(--primary)] hover:underline">
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
