"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { Copy, ReceiptText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCollection } from "@/lib/firebase";
import { type AdminOrder } from "@/lib/admin";
import { AdminModal, LoadingState, StatusBadge } from "@/components/admin/AdminUI";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { CUSTOMER_PHONE_STORAGE_KEY, getOrderDisplayId, normalizeOrder } from "@/lib/order-utils";
import { formatCurrency, formatDate } from "@/lib/admin";

function mergeOrders(primary: AdminOrder[], secondary: AdminOrder[]) {
  return [...primary, ...secondary]
    .reduce<AdminOrder[]>((all, order) => {
      if (!all.some((current) => current.id === order.id)) all.push(order);
      return all;
    }, [])
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

export default function AccountOrdersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [highlightedOrderId] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("orderId")));
  const [storedPhone] = useState(() => (typeof window === "undefined" ? "" : window.localStorage.getItem(CUSTOMER_PHONE_STORAGE_KEY) ?? ""));
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const effectivePhone = (profile?.phone || storedPhone).trim();
  const shouldListen = !authLoading && Boolean(user || effectivePhone);

  useEffect(() => {
    if (!shouldListen) {
      return;
    }

    let userOrders: AdminOrder[] = [];
    let phoneOrders: AdminOrder[] = [];
    const unsubscribers: Array<() => void> = [];

    const syncOrders = () => {
      setOrders(mergeOrders(userOrders, phoneOrders));
      setReady(true);
    };

    if (user) {
      unsubscribers.push(onSnapshot(query(getCollection("orders"), where("userId", "==", user.uid)), (snapshot) => {
        userOrders = snapshot.docs.map((doc) => normalizeOrder(doc.id, doc.data()));
        syncOrders();
      }));
    }

    if (effectivePhone) {
      unsubscribers.push(onSnapshot(query(getCollection("orders"), where("customerPhone", "==", effectivePhone)), (snapshot) => {
        phoneOrders = snapshot.docs.map((doc) => normalizeOrder(doc.id, doc.data()));
        syncOrders();
      }));
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [effectivePhone, shouldListen, user]);

  const displayedOrders = useMemo(() => (shouldListen ? orders : []), [orders, shouldListen]);
  const isLoading = authLoading || (shouldListen && !ready);
  const hasHighlightedOrder = useMemo(() => displayedOrders.some((order) => getOrderDisplayId(order) === highlightedOrderId), [displayedOrders, highlightedOrderId]);

  const copyOrderId = async (orderId: string) => {
    await navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    window.setTimeout(() => setCopiedOrderId(null), 1500);
  };

  if (isLoading) {
    return <LoadingState label="جاري تحميل طلباتك..." />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">طلباتي</h1>
          <p className="mt-2 text-slate-500">نعرض الطلبات المرتبطة بحسابك، مع جلب الطلبات الأقدم المرتبطة برقم الهاتف إن وُجد.</p>
        </div>
        <Link href="/track" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)]">تتبع طلب برقم الطلب</Link>
      </div>

      {highlightedOrderId && hasHighlightedOrder ? <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span>تم تسجيل طلبك بنجاح. رقم الطلب الجديد: {highlightedOrderId}</span><button type="button" onClick={() => void copyOrderId(highlightedOrderId)} className="rounded-full border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-100">{copiedOrderId === highlightedOrderId ? "تم النسخ!" : "نسخ رقم الطلب"}</button></div> : null}

      {displayedOrders.length === 0 ? <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm"><ReceiptText className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-2xl font-bold text-slate-900">لا توجد طلبات بعد</h2><p className="mt-3 text-slate-500">عند إتمام أول طلب أو ربطه بحسابك سيظهر هنا مباشرة.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{displayedOrders.map((order) => { const displayId = getOrderDisplayId(order); const highlighted = displayId === highlightedOrderId; return <div key={order.id} className={`rounded-[2rem] border bg-white p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${highlighted ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"}`}><button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-right"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">رقم الطلب</p><h2 className="mt-1 text-xl font-bold text-slate-900">{displayId}</h2></div><StatusBadge status={order.status} /></div><div className="mt-5 space-y-2 text-sm text-slate-600"><p>التاريخ: {formatDate(order.date)}</p><p>الإجمالي: <span className="font-bold text-[var(--primary)]">{formatCurrency(order.total)}</span></p></div></button><div className="mt-4"><button type="button" onClick={() => void copyOrderId(displayId)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"><Copy className="h-3.5 w-3.5" />{copiedOrderId === displayId ? "تم النسخ!" : "نسخ رقم الطلب"}</button></div></div>; })}</div>}

      <AdminModal open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title="تفاصيل الطلب" description="هذه هي التفاصيل الكاملة لطلبك والحالة الحالية له." size="max-w-5xl">{selectedOrder ? <OrderDetailsView order={selectedOrder} /> : null}</AdminModal>
    </section>
  );
}
