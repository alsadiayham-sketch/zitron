"use client";

import { FormEvent, useState } from "react";
import { getDocs, limit, query, where } from "firebase/firestore";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/AdminUI";
import { getCollection } from "@/lib/firebase";
import { formatCurrency, formatDate, type AdminOrder } from "@/lib/admin";
import { getOrderDisplayId, normalizeOrder } from "@/lib/order-utils";

export default function TrackOrderPage() {
  const [searchValue, setSearchValue] = useState(() => {
    if (typeof window === "undefined") return "";
    const preset = new URLSearchParams(window.location.search).get("orderId");
    return preset ? preset.toUpperCase() : "";
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchValue.trim().toUpperCase();
    if (!normalized) {
      setError("أدخل رقم الطلب أولاً.");
      setResult(null);
      setSearched(false);
      return;
    }
    try {
      setLoading(true); setError(""); setSearched(true);
      const snapshot = await getDocs(query(getCollection("orders"), where("orderId", "==", normalized), limit(1)));
      const match = snapshot.docs[0];
      setResult(match ? normalizeOrder(match.id, match.data()) : null);
    } catch {
      setError("تعذر التحقق من الطلب حالياً. حاول مرة أخرى لاحقاً.");
      setResult(null);
    } finally { setLoading(false); }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8" dir="rtl">
      <div className="rounded-[2rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-dark)_100%)] p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">تتبع الطلب</h1>
        <p className="mt-3 text-white/80">أدخل رقم الطلب الخاص بك للحصول على الحالة الحالية والعناصر المطلوبة.</p>
        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input value={searchValue} onChange={(event) => setSearchValue(event.target.value.toUpperCase())} placeholder="مثال: ZT-AB12CD" className="flex-1 rounded-full border border-white/20 bg-white/95 px-5 py-3 text-slate-900 outline-none transition focus:border-white focus:ring-2 focus:ring-white/30" />
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[var(--primary)] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"><Search className="h-4 w-4" />{loading ? "جاري البحث..." : "بحث"}</button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-100">{error}</p> : null}
      </div>
      {result ? <div className="mt-8 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">رقم الطلب</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{getOrderDisplayId(result)}</h2></div><StatusBadge status={result.status} /></div><div className="grid gap-4 md:grid-cols-3"><div className="rounded-3xl bg-slate-50 p-4"><p className="text-sm text-slate-500">التاريخ</p><p className="mt-2 font-bold text-slate-900">{formatDate(result.date)}</p></div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-sm text-slate-500">الإجمالي</p><p className="mt-2 font-bold text-[var(--primary)]">{formatCurrency(result.total)}</p></div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-sm text-slate-500">عدد المنتجات</p><p className="mt-2 font-bold text-slate-900">{result.items.length}</p></div></div><div><h3 className="text-lg font-bold text-slate-900">المنتجات</h3><div className="mt-4 space-y-3">{result.items.map((item, index) => <div key={`${item.id}-${index}`} className="flex items-center justify-between rounded-3xl border border-slate-200 p-4"><div><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-sm text-slate-500">الكمية: {item.quantity}</p></div><p className="font-bold text-[var(--primary)]">{formatCurrency(item.price * item.quantity)}</p></div>)}</div></div></div> : searched && !loading ? <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold text-slate-900">لم يتم العثور على الطلب</h2><p className="mt-3 text-slate-500">تأكد من إدخال رقم الطلب بشكل صحيح ثم أعد المحاولة.</p></div> : null}
    </section>
  );
}
