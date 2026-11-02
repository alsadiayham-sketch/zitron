"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/admin";
import { useOffers } from "@/lib/firebase-hooks";
import { isOfferActive } from "@/lib/offers";
import { getDoc, getDocRef } from "@/lib/store-data";
import type { Product } from "@/lib/types";

type DetailProduct = Product & { isDemo?: boolean };
type DetailTab = "description" | "ingredients" | "howToUse";

export default function ProductDetailClient({ id }: { id: string }) {
  const isPlaceholder = !id || id === "placeholder" || id.includes("/");
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(!isPlaceholder);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");
  const { addItem } = useCart();
  const { offers } = useOffers();

  useEffect(() => {
    if (isPlaceholder) return;
    let cancelled = false;
    async function fetchProduct() {
      try {
        const snapshot = await getDoc(getDocRef("products", id));
        if (!cancelled && snapshot.exists()) setProduct({ ...snapshot.data(), id: snapshot.id } as DetailProduct);
      } catch (caught) {
        console.error("Error fetching product:", caught);
        if (!cancelled) setError("تعذر تحميل المنتج. تحقق من اتصالك ثم أعد المحاولة.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchProduct();
    return () => { cancelled = true; };
  }, [id, isPlaceholder]);

  const images = useMemo(() => product ? [...new Set([product.image, ...(product.images ?? [])].filter(Boolean))] : [], [product]);
  const activeSectionOffers = useMemo(() => product ? offers.filter((offer) => isOfferActive(offer) && (offer.targetSections?.length ?? 0) > 0 && offer.targetSections?.includes(product.category)) : [], [offers, product]);
  const isDemo = Boolean(product?.isDemo || product?.id.startsWith("demo-"));
  const hasRating = Boolean(product && product.rating > 0 && product.reviews > 0);

  if (loading) return <div className="clinical-container py-16"><p role="status" className="clinical-panel text-center">جاري تحميل المنتج...</p></div>;
  if (!product) {
    return <div className="clinical-container py-16 text-center"><h1 role={error ? "alert" : undefined} className="text-2xl font-bold text-[var(--foreground)]">{error || "المنتج غير موجود"}</h1>{error ? <button className="mt-4 text-sm font-semibold text-[var(--primary)] hover:underline" onClick={() => window.location.reload()}>إعادة المحاولة</button> : null}<Link href="/products" className="mt-5 block text-sm font-semibold text-[var(--primary)] hover:underline">العودة للمنتجات</Link></div>;
  }

  const handleAddToCart = () => {
    for (let index = 0; index < quantity; index += 1) addItem({ id: product.id, name: product.name, price: product.price, image: product.image, range: product.range });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };
  const tabs: Array<{ id: DetailTab; label: string; content: string }> = [
    { id: "description", label: "الوصف", content: product.description },
    { id: "ingredients", label: "المكونات", content: product.ingredients },
    { id: "howToUse", label: "طريقة الاستخدام", content: product.howToUse },
  ];

  return (
    <>
      <nav className="border-b border-[var(--border)] bg-[var(--surface-soft)]" aria-label="مسار التنقل">
        <div className="clinical-container flex min-h-12 items-center gap-2 overflow-x-auto py-2 text-sm text-[var(--muted)]">
          <Link href="/" className="shrink-0 hover:text-[var(--primary)]">الرئيسية</Link><span>/</span><Link href="/products" className="shrink-0 hover:text-[var(--primary)]">المنتجات</Link><span>/</span><span className="truncate font-medium text-[var(--foreground)]">{product.name}</span>
        </div>
      </nav>
      <section className="py-6 sm:py-10">
        <div className="clinical-container grid gap-5 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 sm:p-6">
            <div className="relative h-56 sm:h-72 lg:h-auto lg:aspect-[4/5]">
              <Image src={images[activeImage] || "/images/product-unavailable.svg"} alt={product.name} fill priority className="object-contain p-4" sizes="(max-width: 1024px) 100vw, 50vw" />
              <div className="absolute right-0 top-0 flex gap-2">
                {product.badge ? <span className="rounded-md bg-[var(--primary)] px-2 py-1 text-xs font-semibold text-white">{product.badge}</span> : null}
                {isDemo ? <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">بيانات تجريبية</span> : null}
              </div>
            </div>
            {images.length > 1 ? <div className="mt-4 flex flex-wrap gap-2">{images.map((image, index) => <button key={image} type="button" aria-label={`صورة المنتج ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)} className={`relative h-16 w-16 overflow-hidden rounded-md border ${activeImage === index ? "border-[var(--accent)] ring-2 ring-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}><Image src={image} alt="" fill sizes="64px" className="object-contain p-1" /></button>)}</div> : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--muted)]">{product.range}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">{product.name}</h1>
            {product.nameEn ? <p className="mt-2 text-sm text-[var(--muted)]" dir="ltr">{product.nameEn}</p> : null}
            {hasRating ? <p className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--muted)]"><Star className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]" />{product.rating} ({product.reviews} تقييمات)</p> : null}
            <div className="mt-5 flex flex-wrap items-baseline gap-3"><strong className="text-3xl text-[var(--primary)]">{formatCurrency(product.price)}</strong>{product.oldPrice ? <span className="text-sm text-[var(--muted)] line-through">{formatCurrency(product.oldPrice)}</span> : null}{product.volume ? <span className="rounded-md bg-[var(--surface-soft)] px-2 py-1 text-sm text-[var(--muted)]">{product.volume}</span> : null}</div>
            {product.skinType?.length ? <div className="mt-4 flex flex-wrap gap-2">{product.skinType.map((skinType) => <span key={skinType} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">{skinType}</span>)}</div> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex min-h-11 items-center rounded-md border border-[var(--input-border)] bg-[var(--surface)]">
                <button type="button" aria-label="تقليل الكمية" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="flex h-11 w-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <output className="w-10 text-center font-semibold" aria-label={`الكمية ${quantity}`}>{quantity}</output>
                <button type="button" aria-label="زيادة الكمية" disabled={quantity >= 99} onClick={() => setQuantity((current) => Math.min(99, current + 1))} className="flex h-11 w-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={handleAddToCart} className="clinical-button flex min-h-11 flex-1 items-center justify-center gap-2 px-5">{added ? <><Check className="h-5 w-5" />تمت الإضافة</> : <><ShoppingBag className="h-5 w-5" />أضف للسلة</>}</button>
            </div>
            {activeSectionOffers.length > 0 ? <aside className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--accent-light)] p-3 text-sm"><p className="font-semibold text-[var(--foreground)]">عروض مرتبطة بهذه الفئة</p><ul className="mt-1 list-inside list-disc text-[var(--muted)]">{activeSectionOffers.map((offer) => <li key={offer.id}>{offer.title}</li>)}</ul></aside> : null}
            <p className="mt-6 max-w-2xl leading-8 text-[var(--muted)]">{product.description}</p>
            {product.benefits?.length ? <ul className="mt-5 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">{product.benefits.map((benefit) => <li key={benefit} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />{benefit}</li>)}</ul> : null}
            <p className="mt-3 text-sm text-[var(--muted)]">تظهر خيارات التوصيل والعروض المطبقة في صفحة إتمام الطلب.</p>
          </div>
        </div>
      </section>
      <section className="border-t border-[var(--border)] bg-[var(--surface-soft)] py-7 sm:py-10">
        <div className="clinical-container max-w-4xl">
          <div className="flex overflow-x-auto border-b border-[var(--border)]">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id} className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${activeTab === tab.id ? "border-[var(--accent)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{tab.label}</button>)}</div>
          <div className="py-6"><p className="whitespace-pre-line leading-8 text-[var(--muted)]">{tabs.find((tab) => tab.id === activeTab)?.content || "لا تتوفر تفاصيل إضافية لهذا المنتج حالياً."}</p></div>
        </div>
      </section>
    </>
  );
}
