"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProducts } from "@/lib/firebase-hooks";

const ranges = [
  ["sensidiane", "سنسيديان", "SENSIDIANE"], ["exfoliac", "إكسفولياك", "EXFOLIAC"], ["sunactive", "صن أكتيف", "SUN ACTIVE"], ["xerodiane", "زيروديان", "XERODIANE"], ["norelift", "نوريليف", "NORELIFT"], ["trio-white", "تريو وايت", "TRIO WHITE"], ["hexaphane", "هيكسافان", "HEXAPHANE"], ["deoliane", "ديوليان", "DEOLIANE"],
] as const;

export default function RangesPage() {
  const { products, loading, error } = useProducts();
  return <><section className="border-b border-[var(--border)] bg-[var(--surface-soft)] py-8 sm:py-10"><div className="clinical-container"><p className="clinical-muted text-sm">المجموعات</p><h1 className="clinical-page-heading mt-2">تصفح حسب المجموعة</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">اختر مجموعة لعرض منتجاتها المتاحة.</p></div></section><section className="py-7 sm:py-10"><div className="clinical-container">{error ? <p role="alert" className="clinical-panel border-red-300 text-red-800">{error}</p> : null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ranges.map(([id, name, nameEn]) => { const count = products.filter((product) => product.rangeId === id).length; return <Link key={id} href={`/products?range=${id}`} className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-200 hover:border-[var(--accent)]"><p className="text-xs font-semibold tracking-wide text-[var(--muted)]" dir="ltr">{nameEn}</p><h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">{name}</h2><p className="mt-2 text-sm text-[var(--muted)]">{loading ? "جاري تحميل المنتجات..." : `${count} منتجات متاحة`}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">عرض المنتجات<ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 motion-reduce:transition-none" /></span></Link>; })}</div></div></section></>;
}
