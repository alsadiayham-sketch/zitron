"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDocs, limit, orderBy, query, startAfter, type DocumentData, type QueryConstraint, type QueryDocumentSnapshot } from "firebase/firestore";
import { Printer } from "lucide-react";
import { getCollection } from "@/lib/firebase";
import { formatCurrency, formatDate, readAdminSession, type AdminOrder, type OrderStatus } from "@/lib/admin";
import { AdminCard, AdminEmptyState, AdminModal, AdminPageHeader, LoadingState, SelectInput, StatusBadge, TextInput } from "@/components/admin/AdminUI";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { getOrderDisplayId, normalizeOrder, printOrders } from "@/lib/order-utils";

const PAGE_SIZE = 20;

type DateFilterMode = "all" | "after" | "before" | "between";

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "processing", label: "قيد التحضير" },
  { value: "prepared", label: "جاهز" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "completed", label: "مكتمل" },
  { value: "declined", label: "مرفوض" },
];

export default function AdminAllOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilters, setStatusFilters] = useState<OrderStatus[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const printedBy = readAdminSession()?.name ?? "غير محدد";
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const toggleStatusFilter = (status: OrderStatus) => {
    setStatusFilters((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status]
    );
  };

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const loadOrders = useCallback(async (reset = false) => {
    if ((!reset && !hasMoreRef.current) || loadingMoreRef.current) {
      return;
    }

    try {
      setError("");
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
        hasMoreRef.current = true;
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      const constraints: QueryConstraint[] = [orderBy("date", "desc"), limit(PAGE_SIZE)];
      if (!reset && lastDocRef.current) {
        constraints.push(startAfter(lastDocRef.current));
      }

      const snapshot = await getDocs(query(getCollection("orders"), ...constraints));
      const nextOrders = snapshot.docs.map((doc) => normalizeOrder(doc.id, doc.data()));

      setOrders((prev) => {
        if (reset) {
          return nextOrders;
        }

        const existingIds = new Set(prev.map((order) => order.id));
        return [...prev, ...nextOrders.filter((order) => !existingIds.has(order.id))];
      });

      lastDocRef.current = snapshot.docs.at(-1) ?? null;
      const nextHasMore = snapshot.docs.length === PAGE_SIZE;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
    } catch {
      setError("تعذر تحميل كل الطلبات حالياً. حاول مرة أخرى بعد قليل.");
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadOrders(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loadOrders]);

  useEffect(() => {
    const element = observerTargetRef.current;
    if (!element || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadOrders(false);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadOrders, loading, loadingMore, orders.length]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilters.length > 0 && !statusFilters.includes(order.status)) {
        return false;
      }

      if (cityFilter.trim() && !order.city?.toLowerCase().includes(cityFilter.trim().toLowerCase())) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = [order.customerName, order.customerPhone, getOrderDisplayId(order)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (dateFilterMode !== "all") {
        const orderTime = new Date(order.date || 0).getTime();
        if (Number.isNaN(orderTime)) {
          return false;
        }

        const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
        const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

        if (dateFilterMode === "after" && fromTime && orderTime < fromTime) {
          return false;
        }

        if (dateFilterMode === "before" && toTime && orderTime > toTime) {
          return false;
        }

        if (dateFilterMode === "between") {
          if (fromTime && orderTime < fromTime) {
            return false;
          }
          if (toTime && orderTime > toTime) {
            return false;
          }
        }
      }

      return true;
    });
  }, [cityFilter, dateFilterMode, fromDate, orders, searchTerm, statusFilters, toDate]);

  if (loading && orders.length === 0) {
    return <LoadingState label="جاري تحميل كل الطلبات..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="كل الطلبات"
        description="تصفح جميع الطلبات مع تحميل تدريجي، بحث سريع، وفلاتر حسب الحالة والمدينة والتاريخ."
        action={
          <button
            type="button"
            onClick={() => printOrders(filteredOrders, "قائمة الطلبات المفلترة", printedBy)}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            طباعة النتائج
          </button>
        }
      />

      <AdminCard className="space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">الحالة</p>
            {statusFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => setStatusFilters([])}
                className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-light)]"
              >
                عرض كل الحالات
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((option) => {
              const checked = statusFilters.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${checked ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStatusFilter(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">المدينة</p>
            <TextInput value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="ابحث باسم المدينة" />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">اسم العميل أو الهاتف</p>
            <TextInput value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="مثال: محمد أو 059..." />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">نوع التاريخ</p>
            <SelectInput value={dateFilterMode} onChange={(event) => setDateFilterMode(event.target.value as DateFilterMode)}>
              <option value="all">بدون فلترة</option>
              <option value="after">بعد تاريخ</option>
              <option value="before">قبل تاريخ</option>
              <option value="between">بين تاريخين</option>
            </SelectInput>
          </div>
        </div>

        {dateFilterMode !== "all" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(dateFilterMode === "after" || dateFilterMode === "between") ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">من تاريخ</p>
                <TextInput type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </div>
            ) : null}

            {(dateFilterMode === "before" || dateFilterMode === "between") ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">إلى تاريخ</p>
                <TextInput type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>المعروض حالياً: {filteredOrders.length} طلب من أصل {orders.length} طلب تم تحميله</span>
          {hasMore ? <span>مرر للأسفل لتحميل المزيد تلقائياً</span> : <span>تم تحميل جميع الطلبات المتاحة</span>}
        </div>
      </AdminCard>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <AdminCard className="overflow-hidden p-0">
        {filteredOrders.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState title="لا توجد طلبات مطابقة" description="جرّب تغيير الفلاتر أو استمر في التمرير لتحميل دفعات إضافية من الطلبات." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">رقم الطلب</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">الهاتف</th>
                  <th className="px-4 py-3">المدينة</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-bold text-slate-900">{getOrderDisplayId(order)}</td>
                    <td className="px-4 py-4">{order.customerName || "—"}</td>
                    <td className="px-4 py-4">{order.customerPhone || "—"}</td>
                    <td className="px-4 py-4">{order.city || "—"}</td>
                    <td className="px-4 py-4">{formatDate(order.date)}</td>
                    <td className="px-4 py-4 font-bold text-[var(--primary)]">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div ref={observerTargetRef} className="flex justify-center py-4 text-sm text-slate-500">
        {loadingMore ? "جاري تحميل المزيد من الطلبات..." : hasMore ? "" : "لا توجد طلبات إضافية"}
      </div>

      <AdminModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="تفاصيل الطلب"
        description="عرض شامل للطلب المحدد مع كامل بيانات العميل والعناصر."
        size="max-w-5xl"
      >
        {selectedOrder ? <OrderDetailsView order={selectedOrder} /> : null}
      </AdminModal>
    </div>
  );
}
