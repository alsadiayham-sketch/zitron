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
      activeCategory === "all"
        ? []
        : offers.filter(
            (offer) =>
              isOfferActive(offer) &&
              (offer.targetSections?.length ?? 0) > 0 &&
              offer.targetSections?.includes(activeCategory)
          ),
    [activeCategory, offers]
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

          {activeSectionOffers.length > 0 ? (
            <div className="mb-6 space-y-3 rounded-[2rem] border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5">
              <div className="flex items-center gap-2 text-orange-700">
                <Sparkles className="h-5 w-5" />
                <p className="font-bold">عروض مفعلة لهذا القسم</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSectionOffers.map((offer) => (
                  <span key={offer.id} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {offer.title}
                  </span>
                ))}
              </div>
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
