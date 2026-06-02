"use client";

import Image from "next/image";
import { MapPin, NotebookPen, Package2, Phone, ReceiptText, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/admin/AdminUI";
import { formatCurrency, formatDate, type AdminOrder } from "@/lib/admin";
import { getOrderDisplayId } from "@/lib/order-utils";

export default function OrderDetailsView({
  order,
  showStatus = true,
}: {
  order: AdminOrder;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">رقم الطلب</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{getOrderDisplayId(order)}</h3>
        </div>
        {showStatus ? <StatusBadge status={order.status} /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">التاريخ</p>
          <p className="mt-2 font-bold text-slate-900">{formatDate(order.date)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">الإجمالي</p>
          <p className="mt-2 font-bold text-[var(--primary)]">{formatCurrency(order.total)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">المدينة</p>
          <p className="mt-2 font-bold text-slate-900">{order.city || "—"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">عدد المنتجات</p>
          <p className="mt-2 font-bold text-slate-900">{order.items.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <UserRound className="h-5 w-5 text-[var(--primary)]" />
            <h4 className="font-bold">بيانات العميل</h4>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-500">الاسم الكامل</p>
              <p className="mt-1 font-semibold text-slate-900">{order.customerName || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">رقم الهاتف</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
                <Phone className="h-4 w-4 text-[var(--primary)]" />
                <span>{order.customerPhone || "—"}</span>
              </p>
            </div>
            <div>
              <p className="text-slate-500">العنوان</p>
              <p className="mt-1 flex items-start gap-2 font-semibold text-slate-900">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                <span>{order.customerAddress || "—"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <NotebookPen className="h-5 w-5 text-[var(--primary)]" />
            <h4 className="font-bold">ملاحظات الطلب</h4>
          </div>
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            {order.notes || "لا توجد ملاحظات مضافة لهذا الطلب."}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <ReceiptText className="h-5 w-5 text-[var(--primary)]" />
          <h4 className="font-bold">تفاصيل المنتجات</h4>
        </div>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-contain p-2" sizes="80px" />
                  ) : (
                    <Package2 className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">الكمية: {item.quantity}</p>
                  <p className="mt-1 text-sm text-slate-500">سعر الوحدة: {formatCurrency(item.price)}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[var(--primary)]">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
