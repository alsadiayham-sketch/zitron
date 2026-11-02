"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageCheck, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import ComboOfferModal from "@/components/offers/ComboOfferModal";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { useHeroDisplay, useOffers, useProducts } from "@/lib/firebase-hooks";
import { formatCurrency } from "@/lib/admin";
import { isOfferActive } from "@/lib/offers";
import type { Offer, Product } from "@/lib/types";

export default function Home() {
  const { addItem, replaceComboItems } = useCart();
  const { products: allProducts, loading: productsLoading, error: productsError } = useProducts();
  const { offers, error: offersError } = useOffers();
  const { slides: heroSlides } = useHeroDisplay();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeComboOffer, setActiveComboOffer] = useState<Offer | null>(null);
  const products = useMemo(() => {
    const realProducts = allProducts.filter((product) => !(product as Product & { isDemo?: boolean }).isDemo && !product.id.startsWith("demo-"));
    const demoProducts = allProducts.filter((product) => (product as Product & { isDemo?: boolean }).isDemo || product.id.startsWith("demo-"));
    return [...realProducts, ...demoProducts].slice(0, 4);
  }, [allProducts]);
  const activeSlide = heroSlides.length ? heroSlides[currentSlide % heroSlides.length] : null;

  const comboOffers = useMemo(
    () => offers.filter((offer) => offer.type === "combo" && isOfferActive(offer) && (offer.eligibleProducts?.length ?? 0) > 0 && (offer.pickCount ?? 0) > 0),
    [offers]
  );

  const changeSlide = (direction: 1 | -1) => {
    if (!heroSlides.length) return;
    setCurrentSlide((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
        <div className="clinical-container grid gap-6 py-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch lg:py-10">
          <div className="flex flex-col justify-center py-2 lg:py-8">
            <p className="text-sm font-semibold text-[var(--accent)]">ZITRON للعناية بالبشرة</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">اختيارات واضحة لروتينك اليومي</h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">تصفّح المنتجات حسب الفئة أو نوع البشرة، واقرأ التفاصيل والمكونات وطريقة الاستخدام قبل الطلب.</p>
            <form action="/products" className="mt-6 hidden gap-2 sm:flex">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">ابحث عن منتج</span>
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input name="q" type="search" className="clinical-input w-full pr-11" placeholder="ابحث باسم المنتج أو المجموعة" />
              </label>
              <button className="clinical-button min-h-11 px-5">بحث</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/products" className="clinical-button-secondary inline-flex min-h-11 items-center gap-2 px-4 text-sm"><ShoppingBag className="h-4 w-4" />تسوّق المنتجات</Link>
              <Link href="/ranges" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--primary)] hover:underline">استكشف المجموعات</Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {activeSlide ? (
              <>
                <div className="relative h-56 sm:h-64 lg:h-[28rem]">
                  {activeSlide.type === "video" ? (
                    <video key={activeSlide.id} src={activeSlide.url} className="h-full w-full object-cover" controls playsInline preload="metadata" />
                  ) : (
                    <picture>
                      {activeSlide.mobileUrl ? <source media="(max-width: 640px)" srcSet={activeSlide.mobileUrl} /> : null}
                      <img src={activeSlide.url} alt={activeSlide.title || "ZITRON"} className="h-full w-full object-cover" />
                    </picture>
                  )}
                  {heroSlides.length > 1 ? (
                    <div className="absolute left-3 top-3 flex gap-2">
                      <button type="button" onClick={() => changeSlide(1)} aria-label="المحتوى التالي" className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--foreground)]"><ChevronLeft className="h-5 w-5" /></button>
                      <button type="button" onClick={() => changeSlide(-1)} aria-label="المحتوى السابق" className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--foreground)]"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                  ) : null}
                </div>
                {(activeSlide.title || activeSlide.subtitle) ? (
                  <div className="border-t border-[var(--border)] p-4 text-[var(--foreground)]">
                    {activeSlide.title ? <h2 className="text-lg font-bold">{activeSlide.title}</h2> : null}
                    {activeSlide.subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{activeSlide.subtitle}</p> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center p-8 text-center sm:h-64 lg:h-[28rem]">
                <PackageCheck className="h-9 w-9 text-[var(--accent)]" />
                <p className="mt-3 font-semibold text-[var(--foreground)]">ابدأ من المجموعة المناسبة لك</p>
                <Link href="/products" className="mt-4 text-sm font-semibold text-[var(--primary)] hover:underline">عرض جميع المنتجات</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-9 sm:py-12">
        <div className="clinical-container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="clinical-muted text-sm">تسوّق بسرعة</p>
              <h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">منتجات مختارة</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-[var(--primary)] hover:underline">عرض الكل</Link>
          </div>
          {productsLoading ? <p role="status" className="clinical-panel mt-5 text-center">جاري تحميل المنتجات...</p> : null}
          {!productsLoading && productsError ? <div role="alert" className="clinical-panel mt-5 border-red-300 text-center text-red-800"><p>{productsError}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-semibold text-[var(--primary)] hover:underline">إعادة المحاولة</button></div> : null}
          {!productsLoading && !productsError && products.length === 0 ? <p className="clinical-panel mt-5 text-center text-[var(--muted)]">لا توجد منتجات متاحة حالياً.</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {!productsError ? products.map((product) => <ProductCard key={product.id} product={product} onAdd={(item) => addItem({ id: item.id, name: item.name, price: item.price, image: item.image, range: item.range })} />) : null}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface-soft)] py-8">
        <div className="clinical-container grid gap-3 sm:grid-cols-3">
          <Link href="/products?skin=sensitive" className="clinical-panel flex min-h-24 items-center gap-3 transition-colors duration-200 hover:border-[var(--accent)]">
            <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
            <span><strong className="block text-[var(--foreground)]">حسب نوع البشرة</strong><span className="text-sm text-[var(--muted)]">صفِّ النتائج حسب احتياجك</span></span>
          </Link>
          <Link href="/ranges" className="clinical-panel flex min-h-24 items-center gap-3 transition-colors duration-200 hover:border-[var(--accent)]">
            <PackageCheck className="h-5 w-5 text-[var(--accent)]" />
            <span><strong className="block text-[var(--foreground)]">حسب المجموعة</strong><span className="text-sm text-[var(--muted)]">استكشف المنتجات المتصلة</span></span>
          </Link>
          <Link href="/track" className="clinical-panel flex min-h-24 items-center gap-3 transition-colors duration-200 hover:border-[var(--accent)]">
            <Search className="h-5 w-5 text-[var(--accent)]" />
            <span><strong className="block text-[var(--foreground)]">متابعة الطلب</strong><span className="text-sm text-[var(--muted)]">تحقق من حالة طلبك</span></span>
          </Link>
        </div>
      </section>

      {comboOffers.length > 0 ? (
        <section className="py-9 sm:py-12">
          <div className="clinical-container">
            <div className="flex items-end justify-between gap-4">
              <div><p className="clinical-muted text-sm">العروض المتاحة</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">اختر عرضك</h2></div>
              <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">تظهر تفاصيل الاختيار والسعر قبل الإضافة إلى السلة.</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {comboOffers.map((offer) => (
                <article key={offer.id} className="clinical-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">{offer.title}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">اختر {offer.pickCount} منتجات بسعر إجمالي {formatCurrency(offer.comboPrice ?? 0)}{offer.uniqueOnly ? " — اختيارات مختلفة" : ""}.</p>
                  </div>
                  <button type="button" onClick={() => setActiveComboOffer(offer)} className="clinical-button min-h-11 shrink-0 px-4 text-sm">اختيار المنتجات</button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {offersError ? <div className="clinical-container pb-8"><p role="alert" className="clinical-panel border-red-300 text-red-800">{offersError}</p></div> : null}

      <ComboOfferModal
        key={activeComboOffer?.id ?? "home-combo-closed"}
        open={Boolean(activeComboOffer)}
        offer={activeComboOffer}
        products={allProducts}
        confirmLabel="إضافة العرض إلى السلة"
        onClose={() => setActiveComboOffer(null)}
        onConfirm={(comboItems) => {
          if (!activeComboOffer) return;
          replaceComboItems(activeComboOffer.id, comboItems);
          setActiveComboOffer(null);
        }}
      />
    </>
  );
}
