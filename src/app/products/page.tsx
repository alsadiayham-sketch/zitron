"use client";

import Link from "next/link";
import { ChevronDown, Filter, Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { filterProducts } from "@/lib/catalog";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import { useCart } from "@/context/CartContext";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { isOfferActive } from "@/lib/offers";
import ProductCard from "@/components/ProductCard";

const categories = [{ id: "all", label: "الكل" }, ...PRODUCT_CATEGORIES];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCategory = searchParams.get("cat") || "all";
  const [sortBy, setSortBy] = useState("popular");
  const { addItem } = useCart();
  const { products, loading, error } = useProducts();
  const { offers } = useOffers();

  const filtered = filterProducts(products, new URLSearchParams(searchParams.toString()));
  const setActiveCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") params.delete("cat");
    else params.set("cat", category);
    router.push(`/products?${params.toString()}`, { scroll: false });
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return b.reviews - a.reviews;
  });

  const activeSectionOffers = useMemo(
    () =>
      offers.filter(
        (offer) =>
          isOfferActive(offer) &&
          (offer.targetSections?.length ?? 0) > 0
      ),
    [offers]
  );

  const currentCategoryOffers = useMemo(
    () =>
      activeCategory === "all"
        ? activeSectionOffers
        : activeSectionOffers.filter((offer) => offer.targetSections?.includes(activeCategory)),
    [activeCategory, activeSectionOffers]
  );

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface-soft)] py-5 sm:py-8">
        <div className="clinical-container">
          <p className="clinical-muted text-sm">المنتجات</p>
          <h1 className="clinical-page-heading mt-2">تسوّق حسب احتياجك</h1>
          <p className="mt-2 hidden max-w-2xl text-sm leading-7 text-[var(--muted)] sm:block">ابحث، صفِّ النتائج، واقرأ تفاصيل كل منتج قبل إضافته إلى السلة.</p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="clinical-container">
          <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
            <form action="/products" className="flex min-w-0 gap-2">
              {Array.from(searchParams.entries()).filter(([key]) => key !== "q").map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">البحث في المنتجات</span>
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input name="q" defaultValue={searchParams.get("q") ?? ""} key={searchParams.get("q")} placeholder="ابحث بالاسم أو المجموعة" className="clinical-input w-full pr-11" />
              </label>
              <button className="clinical-button min-h-11 px-5">بحث</button>
            </form>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1 lg:w-52">
                <span className="sr-only">ترتيب المنتجات</span>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <select aria-label="ترتيب المنتجات" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="clinical-input w-full appearance-none pr-9">
                  <option value="popular">الأكثر شعبية</option>
                  <option value="price-asc">السعر: من الأقل</option>
                  <option value="price-desc">السعر: من الأعلى</option>
                  <option value="rating">التقييم</option>
                </select>
                <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              </label>
              {searchParams.size > 0 ? <Link href="/products" className="clinical-button-secondary inline-flex min-h-11 items-center px-4 text-sm">مسح</Link> : null}
            </div>
          </div>

          <details className="group mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 font-semibold text-[var(--foreground)]">
              <span>تصفية حسب الفئة</span>
              <ChevronDown className="h-5 w-5 transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" />
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-3 py-3">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} aria-pressed={activeCategory === cat.id} className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none ${activeCategory === cat.id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]"}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </details>
          {currentCategoryOffers.length > 0 ? (
            <details className="group mb-4 rounded-lg border border-[var(--border)] bg-[var(--accent-light)]" aria-label="العروض المتاحة">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-[var(--foreground)]">
                <span>العروض المتاحة ({currentCategoryOffers.length})</span>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" />
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] px-3 py-3">
                {currentCategoryOffers.map((offer) => {
                  const sectionLabels = (offer.targetSections ?? []).map((section) => categories.find((category) => category.id === section)?.label).filter(Boolean).join("، ");
                  return <div key={offer.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><p className="font-semibold text-[var(--primary)]">{offer.title}</p>{sectionLabels ? <p className="mt-1 text-[var(--muted)]">{sectionLabels}</p> : null}</div>;
                })}
              </div>
            </details>
          ) : null}

          {loading ? <p role="status" className="clinical-panel py-12 text-center">جاري تحميل المنتجات...</p> : error ? <p role="alert" className="clinical-panel border-red-300 text-red-800">{error}</p> : <p className="mb-4 text-sm text-[var(--muted)]">{sorted.length} منتج</p>}
          {!loading && !error && !sorted.length && <p className="py-12 text-center">لا توجد منتجات مطابقة. جرّب تغيير البحث أو الفلاتر.</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {sorted.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={(item) => addItem({ id: item.id, name: item.name, price: item.price, image: item.image, range: item.range })} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<p role="status" className="p-12 text-center">جاري تحميل المنتجات...</p>}><ProductsContent /></Suspense>;
}
