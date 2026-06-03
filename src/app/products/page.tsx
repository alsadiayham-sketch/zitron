"use client";

import Link from "next/link";
import Image from "next/image";
import { Filter, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import { useCart } from "@/context/CartContext";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/admin";
import { isOfferActive } from "@/lib/offers";

const categories = [{ id: "all", label: "الكل" }, ...PRODUCT_CATEGORIES];

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const { addItem } = useCart();
  const { products } = useProducts();
  const { offers } = useOffers();

  const filtered = activeCategory === "all"
    ? products
    : products.filter((product) => product.category === activeCategory);

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
      {/* Page Header */}
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">منتجاتنا</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            اكتشف مجموعتنا الكاملة من منتجات العناية بالبشرة المطورة من قبل أطباء الجلدية
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section-specific offers banner - always displayed */}
          {activeSectionOffers.length > 0 ? (
            <div className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-l from-orange-500 via-red-500 to-pink-500 p-[2px] shadow-lg shadow-orange-200/40">
              <div className="rounded-[calc(2rem-2px)] bg-white px-6 py-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 shadow-sm">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">🔥 عروض حصرية على الأقسام</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(activeCategory === "all" ? activeSectionOffers : currentCategoryOffers).map((offer) => {
                    const sectionLabels = (offer.targetSections ?? [])
                      .map((s) => categories.find((c) => c.id === s)?.label)
                      .filter(Boolean)
                      .join("، ");
                    return (
                      <div key={offer.id} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm">
                        <span className="font-bold text-orange-700">{offer.title}</span>
                        {sectionLabels ? <span className="text-orange-500">({sectionLabels})</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-6 mb-10">
            <div className="flex-1 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="popular">الأكثر شعبية</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">التقييم</option>
              </select>
            </div>
          </div>

          {currentCategoryOffers.length > 0 && activeCategory !== "all" ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
              ✨ هذا القسم يتضمن عروضاً نشطة — تحقق من التفاصيل أعلاه!
            </div>
          ) : null}

          <p className="text-gray-500 text-sm mb-6">{sorted.length} منتج</p>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-6 card-hover border border-gray-100 group"
              >
                <Link href={`/products/${product.id}`}>
                  <div className="relative aspect-[3/4] mb-4 bg-[var(--secondary)] rounded-xl overflow-hidden flex items-center justify-center">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {product.badge && (
                      <span className="absolute top-3 right-3 bg-[var(--accent)] text-white text-xs px-3 py-1 rounded-full">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-xs text-[var(--primary)] font-medium mb-1">
                    {product.range}
                  </p>
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-bold text-sm mb-2 group-hover:text-[var(--primary)] transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i <= product.rating
                            ? "fill-[var(--star)] text-[var(--star)]"
                            : "text-gray-300"
                        }
                      />
                    ))}
                    <span className="text-xs text-gray-500 mr-1">
                      ({product.reviews})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--primary)]">
                      {formatCurrency(product.price)}
                    </span>
                    <button
                      onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image, range: product.range })}
                      className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs py-2 px-4 rounded-full transition-colors"
                    >
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
