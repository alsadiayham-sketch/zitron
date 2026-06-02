import type { DocumentData } from "firebase/firestore";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, type AdminOrder, type OrderStatus } from "@/lib/admin";

export const CUSTOMER_NAME_STORAGE_KEY = "zitron-customer-name";
export const CUSTOMER_PHONE_STORAGE_KEY = "zitron-customer-phone";
export const CUSTOMER_ADDRESS_STORAGE_KEY = "zitron-customer-address";
export const CUSTOMER_CITY_STORAGE_KEY = "zitron-customer-city";

const PRINTABLE_STATUSES: OrderStatus[] = ["prepared", "out_for_delivery", "completed"];

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

export function generateOrderId() {
  return `ZT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function extractCityFromAddress(address: string) {
  const parts = address.split(/[،,\n-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts[0] ?? "";
}

export function parseOrderStatus(value: unknown): OrderStatus {
  switch (value) {
    case "processing":
    case "prepared":
    case "out_for_delivery":
    case "completed":
    case "declined":
    case "new":
      return value;
    case "cancelled":
      return "declined";
    default:
      return "new";
  }
}

export function normalizeOrder(docId: string, data: DocumentData): AdminOrder {
  const items = Array.isArray(data.items)
    ? data.items.map((item, index) => ({
        id: typeof item?.id === "string" ? item.id : `${docId}-${index}`,
        name: typeof item?.name === "string" ? item.name : "منتج بدون اسم",
        quantity: Number(item?.quantity || 0),
        price: Number(item?.price || 0),
        image: typeof item?.image === "string" ? item.image : undefined,
      }))
    : [];

  const customerAddress = typeof data.customerAddress === "string" ? data.customerAddress : "";
  const city = typeof data.city === "string" && data.city.trim() ? data.city.trim() : extractCityFromAddress(customerAddress);

  return {
    id: docId,
    orderId: typeof data.orderId === "string" && data.orderId.trim() ? data.orderId : docId,
    items,
    customerName: typeof data.customerName === "string" ? data.customerName : "",
    customerPhone: typeof data.customerPhone === "string" ? data.customerPhone : "",
    customerAddress,
    notes: typeof data.notes === "string" ? data.notes : "",
    city,
    total: Number(data.total || 0),
    status: parseOrderStatus(data.status),
    date: typeof data.date === "string" ? data.date : new Date().toISOString(),
    userId: typeof data.userId === "string" ? data.userId : undefined,
  };
}

export function getOrderDisplayId(order: Pick<AdminOrder, "orderId" | "id">) {
  return order.orderId || order.id;
}

export function isActiveOrder(status: OrderStatus) {
  return status !== "completed" && status !== "declined";
}

export function canPrintOrder(status: OrderStatus) {
  return PRINTABLE_STATUSES.includes(status);
}

export function getNextOrderAction(status: OrderStatus) {
  switch (status) {
    case "new":
      return { label: "بدء التحضير", nextStatus: "processing" as const };
    case "processing":
      return { label: "تم التحضير", nextStatus: "prepared" as const };
    case "prepared":
      return { label: "خرج للتوصيل", nextStatus: "out_for_delivery" as const };
    case "out_for_delivery":
      return { label: "تم التسليم", nextStatus: "completed" as const };
    default:
      return null;
  }
}

export function printOrders(orders: AdminOrder[], title = "طباعة الطلبات", printedBy = "غير محدد") {
  if (typeof window === "undefined" || orders.length === 0) {
    return;
  }

  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) {
    return;
  }

  const printedAt = formatDate(new Date().toISOString());
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
      .sheet { max-width: 980px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #1b3a6b, #345b8c); color: white; border-radius: 24px; padding: 28px; text-align: center; margin-bottom: 24px; }
      .brand { font-size: 30px; font-weight: 800; letter-spacing: 0.16em; }
      .subtitle { margin-top: 8px; font-size: 15px; opacity: 0.9; }
      .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; text-align: right; }
      .meta-card { background: rgba(255,255,255,0.14); border-radius: 16px; padding: 14px; }
      .meta-label { font-size: 12px; opacity: 0.8; margin-bottom: 6px; }
      .meta-value { font-size: 15px; font-weight: 700; }
      .order { background: white; border-radius: 24px; padding: 24px; margin-bottom: 18px; border: 1px solid #dbe4f0; box-shadow: 0 10px 30px rgba(15,23,42,0.05); page-break-inside: avoid; }
      .order-top { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
      .order-id { font-size: 26px; font-weight: 800; }
      .status { background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 8px 14px; font-weight: 700; font-size: 13px; }
      .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
      .detail { background: #f8fafc; border-radius: 18px; padding: 14px; }
      .detail-label { color: #64748b; font-size: 12px; margin-bottom: 4px; }
      .detail-value { font-size: 16px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 18px; }
      th, td { border: 1px solid #e2e8f0; padding: 12px 14px; text-align: right; }
      th { background: #eef4ff; color: #1e3a8a; font-size: 13px; }
      td { background: white; }
      .location { color: #475569; font-size: 13px; }
      .total { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 16px 18px; border-radius: 18px; background: #ecfdf5; color: #047857; font-size: 18px; font-weight: 800; }
      .notes { margin-top: 14px; border-radius: 18px; background: #fff7ed; padding: 14px 16px; }
      .notes strong { color: #c2410c; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <section class="header">
        <div class="brand">ZITRON</div>
        <div class="subtitle">${escapeHtml(title)}</div>
        <div class="meta">
          <div class="meta-card"><div class="meta-label">تاريخ ووقت الطباعة</div><div class="meta-value">${escapeHtml(printedAt)}</div></div>
          <div class="meta-card"><div class="meta-label">تمت الطباعة بواسطة</div><div class="meta-value">${escapeHtml(printedBy)}</div></div>
          <div class="meta-card"><div class="meta-label">عدد الطلبات</div><div class="meta-value">${orders.length}</div></div>
        </div>
      </section>
      ${orders.map((order) => {
        const rows = order.items.map((item) => `
          <tr>
            <td>${escapeHtml(getOrderDisplayId(order))}</td>
            <td>${escapeHtml(item.name)} <strong>× ${item.quantity}</strong></td>
            <td>${escapeHtml(order.customerName || "—")}</td>
            <td><div>${escapeHtml(order.city || "—")}</div><div class="location">${escapeHtml(order.customerAddress || "—")}</div></td>
          </tr>`).join("");

        return `
        <section class="order">
          <div class="order-top">
            <div>
              <div class="detail-label">رقم الطلب</div>
              <div class="order-id">${escapeHtml(getOrderDisplayId(order))}</div>
            </div>
            <div class="status">${escapeHtml(ORDER_STATUS_LABELS[order.status])}</div>
          </div>
          <div class="details">
            <div class="detail"><div class="detail-label">العميل</div><div class="detail-value">${escapeHtml(order.customerName || "—")}</div></div>
            <div class="detail"><div class="detail-label">الهاتف</div><div class="detail-value">${escapeHtml(order.customerPhone || "—")}</div></div>
            <div class="detail"><div class="detail-label">تاريخ الطلب</div><div class="detail-value">${escapeHtml(formatDate(order.date))}</div></div>
            <div class="detail"><div class="detail-label">موقع التوصيل</div><div class="detail-value">${escapeHtml(order.city || "—")}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>المنتج والكمية</th>
                <th>اسم العميل</th>
                <th>موقع التوصيل</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total"><span>إجمالي الطلب</span><span>${escapeHtml(formatCurrency(order.total))}</span></div>
          ${order.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${escapeHtml(order.notes)}</div>` : ""}
        </section>`;
      }).join("")}
    </div>
    <script>window.onload = () => window.print();</script>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
