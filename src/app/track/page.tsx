"use client";

import { FormEvent, useEffect, useState } from "react";
import { getDocs, limit, query, setOrderTrackingTokenForLookup, where } from "@/lib/store-data";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/AdminUI";
import { getCollection } from "@/lib/store-data";
import { formatCurrency, formatDate, type AdminOrder } from "@/lib/admin";
import {
  DEMO_ORDERS,
  getOrderDisplayId,
  normalizeOrder,
  saveOrderToLocalHistory,
} from "@/lib/order-utils";

const lifecycle = [
  { status: "new", label: "تم استلام الطلب" },
  { status: "processing", label: "قيد التجهيز" },
  { status: "prepared", label: "جاهز للتوصيل" },
  { status: "out_for_delivery", label: "خرج للتوصيل" },
  { status: "completed", label: "تم التسليم" },
] as const;

export default function TrackOrderPage() {
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [usingCachedFallback, setUsingCachedFallback] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const preset = new URLSearchParams(window.location.search).get("orderId");
      if (preset) setSearchValue(preset.trim().toUpperCase());
      const token = new URLSearchParams(window.location.search).get("token");
      if (preset && token) setOrderTrackingTokenForLookup(preset.trim().toUpperCase(), token);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchValue.trim().toUpperCase();
    if (!normalized) {
      setError("أدخل رقم الطلب أولاً.");
      setResult(null);
      setSearched(false);
      return;
    }

    if (!/^ZT-[A-Z0-9]{6,12}$/.test(normalized)) {
      setError("صيغة رقم الطلب غير صحيحة. يجب أن يبدأ الرقم بـ ZT-.");
      setResult(null);
      setSearched(false);
      return;
    }

    const demoMatch = DEMO_ORDERS.find((order) => getOrderDisplayId(order).toUpperCase() === normalized);
    if (demoMatch) {
      setError("");
      setSearched(true);
      setUsingCachedFallback(false);
      setResult(demoMatch);
      return;
    }

    try {
      setLoading(true); setError(""); setSearched(true); setUsingCachedFallback(false);
      const snapshot = await getDocs(query(getCollection("orders"), where("orderId", "==", normalized), limit(1)));
      const match = snapshot.docs[0];
      const remoteOrder = match ? normalizeOrder(match.id, match.data()) : null;
      setResult(remoteOrder);
      if (remoteOrder) {
        saveOrderToLocalHistory(remoteOrder);
      }
    } catch {
      setError("يتطلب هذا الطلب رابط التتبع الآمن أو تسجيل الدخول إلى الحساب المرتبط به.");
      setResult(null);
    } finally { setLoading(false); }
  };

  return (
    <section className="clinical-container py-8 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 text-center">
          <h1 className="clinical-page-heading">تتبع الطلب</h1>
          <p className="clinical-muted mt-2">استخدم رقم الطلب ورابط التتبع الآمن الذي استلمته بعد إتمام الشراء.</p>
        </div>
        <div className="clinical-panel p-5 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="tracking-order-id" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">رقم الطلب</label>
            <input id="tracking-order-id" value={searchValue} onChange={(event) => { setSearchValue(event.target.value.toUpperCase()); setError(""); setUsingCachedFallback(false); }} placeholder="مثال: ZT-AB12CD" autoComplete="off" className="clinical-input" aria-invalid={Boolean(error)} aria-describedby={error ? "tracking-error" : undefined} />
          </div>
          <button type="submit" disabled={loading} className="clinical-button inline-flex min-h-12 items-center justify-center gap-2"><Search className="h-4 w-4" />{loading ? "جاري البحث..." : "عرض الحالة"}</button>
        </form>
        <button type="button" onClick={() => { setSearchValue("ZT-DEMO01"); setResult(DEMO_ORDERS[0]); setSearched(true); setError(""); setUsingCachedFallback(false); }} className="mt-4 text-sm font-semibold text-[var(--primary)] underline underline-offset-4">عرض طلب تجريبي موضّح</button>
        {error ? <p id="tracking-error" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p> : null}
        </div>
      </div>
      {result ? <div className="clinical-panel mx-auto mt-8 max-w-5xl space-y-6 p-5 sm:p-6">{usingCachedFallback ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">نسخة محفوظة محلياً — قد لا تعكس آخر تحديث للحالة.</div> : null}<div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">رقم الطلب</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{getOrderDisplayId(result)}</h2></div><StatusBadge status={result.status} /></div><div><h3 className="mb-4 text-lg font-bold text-slate-900">مسار الطلب</h3><ol className="grid gap-2 sm:grid-cols-5">{lifecycle.map((step, index) => { const currentIndex = lifecycle.findIndex((item) => item.status === result.status); const reached = index <= currentIndex; return <li key={step.status} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${reached ? "border-[var(--accent)]/30 bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]"}`}><span className="mb-1 block text-xs">{index + 1}</span>{step.label}</li>; })}</ol></div><dl className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--surface-soft)] p-4"><dt className="text-sm text-slate-500">التاريخ</dt><dd className="mt-2 font-bold text-slate-900">{formatDate(result.date)}</dd></div><div className="rounded-xl bg-[var(--surface-soft)] p-4"><dt className="text-sm text-slate-500">الإجمالي</dt><dd className="mt-2 font-bold text-[var(--primary)]">{formatCurrency(result.total)}</dd></div><div className="rounded-xl bg-[var(--surface-soft)] p-4"><dt className="text-sm text-slate-500">عدد المنتجات</dt><dd className="mt-2 font-bold text-slate-900">{result.items.length}</dd></div></dl><div><h3 className="text-lg font-bold text-slate-900">المنتجات</h3><div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">{result.items.map((item, index) => <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 p-4"><div><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-sm text-slate-500">الكمية: {item.quantity}</p></div><p className="shrink-0 font-bold text-[var(--primary)]">{formatCurrency(item.price * item.quantity)}</p></div>)}</div></div></div> : searched && !loading ? <div className="clinical-panel mx-auto mt-8 max-w-3xl p-8 text-center"><h2 className="text-2xl font-bold text-slate-900">لم يتم العثور على الطلب</h2><p className="clinical-muted mt-3">تأكد من رقم الطلب ومن فتح رابط التتبع الآمن الصحيح ثم أعد المحاولة.</p></div> : null}
    </section>
  );
}
