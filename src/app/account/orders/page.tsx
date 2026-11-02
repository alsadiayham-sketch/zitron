"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onSnapshot, query, where } from "@/lib/store-data";
import { Copy, ReceiptText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCollection } from "@/lib/store-data";
import { type AdminOrder } from "@/lib/admin";
import { AdminModal, LoadingState, StatusBadge } from "@/components/admin/AdminUI";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import {
  getOrderDisplayId,
  mergeOrderHistories,
  normalizeOrder,
  ORDER_HISTORY_STORAGE_KEY,
  parseStoredOrders,
} from "@/lib/order-utils";
import { formatCurrency, formatDate } from "@/lib/admin";

export default function AccountOrdersPage() {
  const { user, profileError, loading: authLoading } = useAuth();
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<AdminOrder[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersKey, setOrdersKey] = useState("");
  const [readyKey, setReadyKey] = useState("");
  const [loadError, setLoadError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const shouldListen = !authLoading && Boolean(user);
  const subscriptionKey = user?.uid ?? "guest";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHighlightedOrderId(new URLSearchParams(window.location.search).get("orderId"));
      setLocalOrders(parseStoredOrders(window.localStorage.getItem(ORDER_HISTORY_STORAGE_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!shouldListen) return;

    let userOrders: AdminOrder[] = [];
    const unsubscribers: Array<() => void> = [];

    const syncOrders = () => {
      setOrders(mergeOrderHistories([], userOrders));
      setOrdersKey(subscriptionKey);
      setReadyKey(subscriptionKey);
      setLoadError("");
    };
    const handleError = () => {
      setLoadError("تعذر تحديث الطلبات من الشبكة. يتم عرض الطلبات المحفوظة على هذا الجهاز.");
      setReadyKey(subscriptionKey);
    };

    if (user) {
      unsubscribers.push(onSnapshot(query(getCollection("orders"), where("userId", "==", user.uid)), (snapshot) => {
        userOrders = snapshot.docs.map((doc) => normalizeOrder(doc.id, doc.data()));
        syncOrders();
      }, handleError));
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [shouldListen, subscriptionKey, user]);

  const displayedOrders = useMemo(
    () => mergeOrderHistories(localOrders, shouldListen && ordersKey === subscriptionKey ? orders : []),
    [localOrders, orders, ordersKey, shouldListen, subscriptionKey]
  );
  const isLoading = authLoading || (shouldListen && readyKey !== subscriptionKey);
  const hasHighlightedOrder = useMemo(() => displayedOrders.some((order) => getOrderDisplayId(order) === highlightedOrderId), [displayedOrders, highlightedOrderId]);

  const copyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(orderId);
      window.setTimeout(() => setCopiedOrderId(null), 1500);
    } catch {
      setLoadError("تعذر نسخ رقم الطلب تلقائياً. حدده وانسخه يدوياً.");
    }
  };

  if (isLoading) {
    return <LoadingState label="جاري تحميل طلباتك..." />;
  }

  return (
    <section className="clinical-container py-8 sm:py-10" dir="rtl">
      <div className="mb-6 flex flex-col gap-3 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="clinical-page-heading">طلباتي</h1>
          <p className="clinical-muted mt-2">الطلبات المرتبطة بحسابك والطلبات المحفوظة على هذا الجهاز.</p>
        </div>
        <Link href="/track" className="clinical-button-secondary">تتبع طلب برقم الطلب</Link>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-2" aria-label="أقسام الحساب">
        {user ? <Link href="/account/profile" className="min-w-max rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--primary)]">الملف والعناوين</Link> : null}
        <Link href="/account/orders" aria-current="page" className="min-w-max rounded-lg bg-[var(--accent-light)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)]">سجل الطلبات</Link>
        <Link href="/track" className="min-w-max rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--primary)]">تتبع طلب</Link>
      </nav>

      {loadError || profileError ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError || profileError}</div> : null}

      {highlightedOrderId && hasHighlightedOrder ? <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span>تم تسجيل طلبك بنجاح. رقم الطلب الجديد: {highlightedOrderId}</span><button type="button" onClick={() => void copyOrderId(highlightedOrderId)} className="rounded-full border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-100">{copiedOrderId === highlightedOrderId ? "تم النسخ!" : "نسخ رقم الطلب"}</button></div> : null}

      {displayedOrders.length === 0 ? <div className="clinical-panel p-8 text-center"><ReceiptText className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-2xl font-bold text-slate-900">لا توجد طلبات بعد</h2><p className="clinical-muted mt-3">عند إتمام أول طلب أو ربطه بحسابك سيظهر هنا مباشرة.</p></div> : <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white"><div className="divide-y divide-[var(--border)]">{displayedOrders.map((order) => { const displayId = getOrderDisplayId(order); const highlighted = displayId === highlightedOrderId; return <div key={order.id} className={`p-4 sm:p-5 ${highlighted ? "bg-emerald-50" : "bg-white"}`}><button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-right"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">رقم الطلب</p><h2 className="mt-1 text-xl font-bold text-slate-900">{displayId}</h2></div><StatusBadge status={order.status} /></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"><p>التاريخ: {formatDate(order.date)}</p><p>الإجمالي: <span className="font-bold text-[var(--primary)]">{formatCurrency(order.total)}</span></p></div></button><div className="mt-4"><button type="button" onClick={() => void copyOrderId(displayId)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"><Copy className="h-3.5 w-3.5" />{copiedOrderId === displayId ? "تم النسخ!" : "نسخ رقم الطلب"}</button></div></div>; })}</div></div>}

      <AdminModal open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title="تفاصيل الطلب" description="هذه هي التفاصيل الكاملة لطلبك والحالة الحالية له." size="max-w-5xl">{selectedOrder ? <OrderDetailsView order={selectedOrder} /> : null}</AdminModal>
    </section>
  );
}
