"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "@/lib/store-data";
import { Boxes, ShoppingCart, Wallet, UsersRound } from "lucide-react";
import { getCollection } from "@/lib/store-data";
import { formatCurrency, formatDate, type AdminOrder, type AdminUser } from "@/lib/admin";
import { AdminCard, AdminEmptyState, AdminPageHeader, LoadingState, StatusBadge } from "@/components/admin/AdminUI";

type DashboardOrder = AdminOrder & { isDemo?: boolean };

export default function AdminDashboardPage() {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let remainingSources = 3;
    const completeSource = () => {
      remainingSources -= 1;
      if (remainingSources === 0) setLoading(false);
    };
    const handleError = () => {
      setLoadError("تعذر تحميل بعض مؤشرات لوحة التحكم. يمكنك تحديث الصفحة للمحاولة مجدداً.");
      completeSource();
    };

    const stopProducts = onSnapshot(
      getCollection("products"),
      (snapshot) => {
        setProductIds(snapshot.docs.map((doc) => doc.id));
        completeSource();
      },
      handleError
    );

    const stopOrders = onSnapshot(
      getCollection("orders"),
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ ...(doc.data() as Omit<DashboardOrder, "id">), id: doc.id })));
        completeSource();
      },
      handleError
    );

    const stopUsers = onSnapshot(
      getCollection("users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ ...(doc.data() as Omit<AdminUser, "id">), id: doc.id })));
        completeSource();
      },
      handleError
    );

    return () => {
      stopProducts();
      stopOrders();
      stopUsers();
    };
  }, []);

  const demoOrders = useMemo(
    () => orders.filter((order) => order.isDemo === true || order.id.startsWith("demo-")),
    [orders]
  );
  const realOrders = useMemo(() => orders.filter((order) => !demoOrders.includes(order)), [demoOrders, orders]);
  const revenue = useMemo(
    () => realOrders.reduce((total, order) => total + Number(order.total || 0), 0),
    [realOrders]
  );

  const recentOrders = useMemo(() => {
    return [...realOrders]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 6);
  }, [realOrders]);

  if (loading) {
    return <LoadingState label="جاري تحميل مؤشرات المتجر..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="لوحة التحكم"
        description="نظرة سريعة على أداء المتجر، آخر الطلبات، وإحصاءات قاعدة البيانات بشكل مباشر."
      />
      {loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "إجمالي المنتجات",
            value: productIds.length.toString(),
            icon: Boxes,
            accent: "bg-sky-100 text-sky-700",
          },
          {
            title: "إجمالي الطلبات",
            value: realOrders.length.toString(),
            icon: ShoppingCart,
            accent: "bg-amber-100 text-amber-700",
          },
          {
            title: "الإيرادات",
            value: formatCurrency(revenue),
            icon: Wallet,
            accent: "bg-emerald-100 text-emerald-700",
          },
          {
            title: "إجمالي العملاء",
            value: users.length.toString(),
            icon: UsersRound,
            accent: "bg-violet-100 text-violet-700",
          },
        ].map((stat) => (
          <AdminCard key={stat.title} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{stat.title}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-2xl p-3 ${stat.accent}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </AdminCard>
        ))}
      </section>
      {demoOrders.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          تم استبعاد {demoOrders.length} طلب تجريبي من مؤشرات الطلبات والإيرادات.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <AdminCard>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">أحدث الطلبات</h2>
              <p className="mt-1 text-sm text-slate-500">تحديث مباشر لآخر الطلبات الواردة إلى المتجر.</p>
            </div>
          </div>

          {recentOrders.length === 0 ? (
            <AdminEmptyState title="لا توجد طلبات بعد" description="بمجرد وصول طلب جديد سيظهر هنا مع حالته الحالية." />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{order.customerName || "عميل جديد"}</h3>
                      <StatusBadge status={order.status || "new"} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">رقم الطلب: {order.id}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(order.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">الإجمالي</p>
                    <p className="mt-1 text-xl font-bold text-[var(--primary)]">{formatCurrency(Number(order.total || 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-bold text-slate-900">ملخص سريع</h2>
          <p className="mt-1 text-sm text-slate-500">مؤشرات تساعدك على المتابعة اليومية.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">متوسط قيمة الطلب</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(realOrders.length ? revenue / realOrders.length : 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">طلبات مكتملة</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {realOrders.filter((order) => order.status === "completed").length}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">عملاء نشطون</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {users.filter((user) => Number(user.orders || 0) > 0).length}
              </p>
            </div>
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
