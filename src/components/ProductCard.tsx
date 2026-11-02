"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { formatCurrency } from "@/lib/admin";
import type { Product } from "@/lib/types";

type CatalogProduct = Product & { isDemo?: boolean };

function isDemoProduct(product: CatalogProduct) {
  return product.isDemo === true || product.id.startsWith("demo-");
}

export default function ProductCard({
  product,
  onAdd,
}: {
  product: CatalogProduct;
  onAdd: (product: Product) => void;
}) {
  const hasRating = Number.isFinite(product.rating) && product.rating > 0 && product.reviews > 0;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <Link href={`/product?id=${encodeURIComponent(product.id)}`} className="relative block aspect-[4/5] bg-[var(--surface-soft)]">
        <Image
          src={product.image || "/images/product-unavailable.svg"}
          alt={product.name}
          fill
          className="object-contain p-5 transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute right-3 top-3 flex flex-wrap gap-2">
          {product.badge ? <span className="rounded-md bg-[var(--primary)] px-2 py-1 text-xs font-semibold text-white">{product.badge}</span> : null}
          {isDemoProduct(product) ? <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">بيانات تجريبية</span> : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-[var(--muted)]">{product.range || "منتجات العناية بالبشرة"}</p>
        <Link href={`/product?id=${encodeURIComponent(product.id)}`} className="min-h-11 text-sm font-bold leading-6 text-[var(--foreground)] transition-colors hover:text-[var(--primary)]">
          {product.name}
        </Link>
        {product.volume ? <p className="text-xs text-[var(--muted)]">{product.volume}</p> : null}
        {hasRating ? (
          <div className="flex items-center gap-1 text-xs text-[var(--muted)]" aria-label={`التقييم ${product.rating} من 5، ${product.reviews} تقييمات`}>
            <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
            <span>{product.rating} ({product.reviews})</span>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="font-bold text-[var(--primary)]">{formatCurrency(product.price)}</p>
            {product.oldPrice ? <p className="text-xs text-[var(--muted)] line-through">{formatCurrency(product.oldPrice)}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="clinical-button inline-flex min-h-11 items-center gap-1.5 px-3 text-sm"
            aria-label={`أضف ${product.name} إلى السلة`}
          >
            <Plus className="h-4 w-4" />
            <span>أضف</span>
          </button>
        </div>
      </div>
    </article>
  );
}
