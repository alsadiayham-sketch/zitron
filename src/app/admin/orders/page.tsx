"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onSnapshot, updateDoc } from "firebase/firestore";
import { Eye, Printer } from "lucide-react";
import { getCollection, getDocRef } from "@/lib/firebase";
import { formatCurrency, formatDate, readAdminSession, type AdminOrder, type OrderStatus } from "@/lib/admin";
import { AdminCard, AdminEmptyState, AdminModal, AdminPageHeader, LoadingState, StatusBadge } from "@/components/admin/AdminUI";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { canPrintOrder, getNextOrderAction, getOrderDisplayId, isActiveOrder, normalizeOrder, printOrders } from "@/lib/order-utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const printedBy = readAdminSession()?.name ?? "غير محدد";

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("orders"), (snapshot) => {
      setOrders(snapshot.docs.map((doc) => normalizeOrder(doc.id, doc.data())));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedOrderData = useMemo(() => {
    if (!selectedOrder) {
      return null;
    }

    return orders.find((order) => order.id === selectedOrder.id) ?? null;
  }, [orders, selectedOrder]);

  const activeOrders = useMemo(() => {
    return [...orders]
      .filter((order) => isActiveOrder(order.status))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [orders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setError("");
      setUpdatingOrderId(orderId);
      await updateDoc(getDocRef("orders", orderId), { status });
    } catch {
      setError("تعذر تحديث حالة الطلب حالياً. حاول مرة أخرى.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return <LoadingState label="جاري تحميل الطلبات النشطة..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="الطلبات النشطة"
        description="إدارة الطلبات الجارية، متابعة التحضير والتوصيل، والاطلاع على التفاصيل الكاملة لكل طلب."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders/all"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              كل الطلبات
            </Link>
            <Link
              href="/admin/orders/search"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)]"
            >
              بحث عن طلب
            </Link>
          </div>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {activeOrders.length === 0 ? (
        <AdminEmptyState title="لا توجد طلبات نشطة" description="عندما يصل طلب جديد أو يعود طلب قيد المعالجة سيظهر هنا مباشرة." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {activeOrders.map((order) => {
            const nextAction = getNextOrderAction(order.status);
            const isUpdating = updatingOrderId === order.id;

            return (
              <AdminCard
                key={order.id}
                className="cursor-pointer border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-right">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">رقم الطلب</p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-900">{getOrderDisplayId(order)}</h2>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">العميل</p>
                        <p className="mt-1 font-bold text-slate-900">{order.customerName || "—"}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.customerPhone || "بدون رقم هاتف"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">التاريخ</p>
                        <p className="mt-1 font-bold text-slate-900">{formatDate(order.date)}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.city || "المدينة غير محددة"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-500">الإجمالي</span>
                      <span className="text-xl font-bold text-[var(--primary)]">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </button>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {nextAction ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void updateStatus(order.id, nextAction.nextStatus);
                      }}
                      disabled={isUpdating}
                      className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {nextAction.label}
                    </button>
                  ) : null}

                  {canPrintOrder(order.status) ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        printOrders([order], `طباعة الطلب ${getOrderDisplayId(order)}`, printedBy);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Printer className="h-4 w-4" />
                      طباعة
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateStatus(order.id, "declined");
                    }}
                    disabled={isUpdating}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    رفض
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    className="mr-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    عرض التفاصيل
                  </button>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      <AdminModal
        open={Boolean(selectedOrderData)}
        onClose={() => setSelectedOrder(null)}
        title="تفاصيل الطلب"
        description="راجع بيانات العميل والمنتجات والملاحظات قبل متابعة حالة الطلب."
        size="max-w-5xl"
      >
        {selectedOrderData ? <OrderDetailsView order={selectedOrderData} /> : null}
      </AdminModal>
    </div>
  );
}
