"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ComboOfferModal from "@/components/offers/ComboOfferModal";
import { useCart } from "@/context/CartContext";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import { formatCurrency } from "@/lib/admin";
import { getEligibleProducts, getOfferSectionLabel, isOfferActive } from "@/lib/offers";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

function OfferContent() {
  const searchParams = useSearchParams();
  const offerId = searchParams.get("id") ?? "";
  const { offers, loading: offersLoading, error: offersError } = useOffers();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const { addItem } = useCart();
  const [comboOpen, setComboOpen] = useState(false);

  const offer = offers.find((item) => item.id === offerId);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product] as const)), [products]);
  const eligibleProducts = offer ? getEligibleProducts(offer, productMap) : [];
  const sectionLabel = offer ? getOfferSectionLabel(offer) : "";

  if (offersLoading || productsLoading) {
    return <p role="status" className="p-12 text-center">جاري تحميل تفاصيل العرض...</p>;
  }

  if (offersError || productsError) {
    return <p role="alert" className="clinical-container py-12 text-center text-red-800">{offersError || productsError}</p>;
  }

  if (!offer || !isOfferActive(offer)) {
    return (
      <main className="clinical-container py-12">
        <div className="clinical-panel mx-auto max-w-2xl text-center">
          <h1 className="clinical-page-heading">العرض غير متاح</h1>
          <p className="clinical-muted mt-3">انتهى هذا العرض أو لم يعد متاحاً حالياً.</p>
          <Link href="/products" className="clinical-button mt-6">تصفح المنتجات</Link>
        </div>
      </main>
    );
  }

  const categoryLabels = (offer.targetSections ?? [])
    .map((section) => PRODUCT_CATEGORIES.find((category) => category.id === section)?.label)
    .filter(Boolean)
    .join("، ");

  return (
    <main>
      <section className="border-b border-[var(--border)] bg-[var(--surface-soft)] py-8 sm:py-12">
        <div className="clinical-container">
          <Link href="/products" className="text-sm font-semibold text-[var(--primary)] hover:underline">العودة إلى المنتجات</Link>
          <h1 className="clinical-page-heading mt-4">{offer.title}</h1>
          <p className="clinical-muted mt-2">تفاصيل العرض وشروط الاستفادة منه.</p>
        </div>
      </section>

      <section className="clinical-container py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="clinical-panel space-y-4">
            <h2 className="text-xl font-bold text-[var(--foreground)]">كيف تستفيد من العرض؟</h2>
            {offer.type === "combo" ? (
              <>
                <p>اختر {offer.pickCount ?? 0} منتجات من المنتجات المؤهلة بسعر إجمالي {formatCurrency(offer.comboPrice ?? 0)}{offer.uniqueOnly ? "، مع اختيار منتجات مختلفة." : "."}</p>
                <button type="button" className="clinical-button min-h-11" onClick={() => setComboOpen(true)}>اختيار المنتجات</button>
              </>
            ) : offer.type === "free_shipping" ? (
              <p>{offer.minQuantity ? `شحن مجاني عند شراء ${offer.minQuantity} قطعة` : `شحن مجاني عند وصول الطلب إلى ${formatCurrency(offer.minAmount ?? 0)}`}{sectionLabel ? ` من قسم ${sectionLabel}` : ""}.</p>
            ) : (
              <p>{offer.minQuantity ? `منتج مجاني عند شراء ${offer.minQuantity} قطعة` : `منتج مجاني عند وصول الطلب إلى ${formatCurrency(offer.minAmount ?? 0)}`}{sectionLabel ? ` من قسم ${sectionLabel}` : ""}.</p>
            )}
            {categoryLabels ? <p className="text-sm text-[var(--muted)]">الأقسام المشمولة: {categoryLabels}</p> : null}
          </div>

          {eligibleProducts.length > 0 ? (
            <div className="clinical-panel">
              <h2 className="text-xl font-bold text-[var(--foreground)]">المنتجات المشمولة</h2>
              <div className="mt-4 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {eligibleProducts.map((product) => (
                  <Link key={product.id} href={`/product?id=${encodeURIComponent(product.id)}`} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 font-semibold text-[var(--primary)] hover:bg-[var(--surface-soft)]">
                    <span>{product.name}</span>
                    <span className="shrink-0 text-sm">{formatCurrency(product.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {offer.type === "combo" ? (
        <ComboOfferModal
          open={comboOpen}
          offer={offer}
          products={products}
          initialSelection={[]}
          onClose={() => setComboOpen(false)}
          onConfirm={(items) => {
            items.forEach(({ quantity, ...item }) => {
              for (let index = 0; index < quantity; index += 1) {
                addItem(item);
              }
            });
            setComboOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

export default function OfferPage() {
  return <Suspense fallback={<p role="status" className="p-12 text-center">جاري تحميل تفاصيل العرض...</p>}><OfferContent /></Suspense>;
}
