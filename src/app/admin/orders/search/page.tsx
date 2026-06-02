"use client";

import { FormEvent, useState } from "react";
import { getDocs, limit, query, where } from "firebase/firestore";
import { Printer, Search } from "lucide-react";
import { getCollection } from "@/lib/firebase";
import { readAdminSession, type AdminOrder } from "@/lib/admin";
import { AdminCard, AdminEmptyState, AdminPageHeader, TextInput } from "@/components/admin/AdminUI";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { normalizeOrder, printOrders } from "@/lib/order-utils";

export default function AdminOrderSearchPage() {
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const printedBy = readAdminSession()?.name ?? "غير محدد";

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchValue.trim().toUpperCase();

    if (!normalized) {
      setError("أدخل رقم الطلب للبحث.");
      setResult(null);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);
      const snapshot = await getDocs(
        query(getCollection("orders"), where("orderId", "==", normalized), limit(1))
      );
      const match = snapshot.docs[0];
      setResult(match ? normalizeOrder(match.id, match.data()) : null);
    } catch {
      setError("تعذر تنفيذ البحث الآن. حاول مرة أخرى لاحقاً.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="بحث عن طلب"
        description="ابحث برقم الطلب المطبوع مثل ZT-XXXXXX للحصول على النتيجة المطابقة فقط."
      />

      <AdminCard>
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row">
          <TextInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value.toUpperCase())}
            placeholder="مثال: ZT-AB12CD"
            className="flex-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </form>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </AdminCard>

      {result ? (
        <AdminCard className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">تم العثور على الطلب</h2>
              <p className="mt-1 text-sm text-slate-500">يمكنك مراجعة التفاصيل الكاملة أو طباعة الطلب مباشرة.</p>
            </div>
            <button
              type="button"
              onClick={() => printOrders([result], `طباعة الطلب ${result.orderId || result.id}`, printedBy)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              طباعة الطلب
            </button>
          </div>
          <OrderDetailsView order={result} />
        </AdminCard>
      ) : searched && !loading ? (
        <AdminEmptyState title="لا يوجد طلب مطابق" description="تأكد من إدخال رقم الطلب كاملاً كما ظهر للعميل دون أي اقتراحات تلقائية." />
      ) : null}
    </div>
  );
}
