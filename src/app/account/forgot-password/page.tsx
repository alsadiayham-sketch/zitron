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
    <div className="bg-[var(--surface-soft)] py-10 sm:py-14" dir="rtl">
      <section className="clinical-container">
        <div className="mb-7 text-center">
          <h1 className="clinical-page-heading">استعادة كلمة المرور</h1>
          <p className="clinical-muted mx-auto mt-2 max-w-md">سنرسل رابطاً آمناً إلى بريدك لإعادة تعيين كلمة المرور.</p>
        </div>
        <div className="mx-auto max-w-md">
          <div className="clinical-panel p-6 sm:p-8">
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
                  className="clinical-button inline-flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-2 text-center text-xl font-bold text-[var(--foreground)]">أدخل بريد الحساب</h2>
                <p className="clinical-muted mb-8 text-center text-sm">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">البريد الإلكتروني *</label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="clinical-input"
                      placeholder="example@email.com"
                    />
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="clinical-button w-full"
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
    </div>
  );
}
