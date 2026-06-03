"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingBag, Minus, Plus, Check, Sparkles } from "lucide-react";
import { useEffect, use, useMemo, useState } from "react";
import { getDoc } from "firebase/firestore";
import { getDocRef } from "@/lib/firebase";
import { useOffers } from "@/lib/firebase-hooks";
import { formatCurrency } from "@/lib/admin";
import { isOfferActive } from "@/lib/offers";
import type { Product } from "@/lib/types";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isPlaceholder = id === "placeholder";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!isPlaceholder);
  const { addItem } = useCart();
  const { offers } = useOffers();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "ingredients" | "howToUse">("description");

  useEffect(() => {
    if (isPlaceholder) {
      return;
    }

    async function fetchProduct() {
      try {
        const docRef = getDocRef("products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ ...docSnap.data(), id: docSnap.id } as Product);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      }
      setLoading(false);
    }

    void fetchProduct();
  }, [id, isPlaceholder]);

  const activeSectionOffers = useMemo(
    () =>
      product
        ? offers.filter(
            (offer) =>
              isOfferActive(offer) &&
              (offer.targetSections?.length ?? 0) > 0 &&
              offer.targetSections?.includes(product.category)
          )
        : [],
    [offers, product]
  );

  if (loading) return (<div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div></div>);
  if (!product) return (<div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-[var(--primary)] mb-4">المنتج غير موجود</h1><Link href="/products" className="text-[var(--primary)] hover:underline">العودة للمنتجات</Link></div></div>);

  const handleAddToCart = () => { for (let i = 0; i < quantity; i++) { addItem({ id: product.id, name: product.name, price: product.price, image: product.image, range: product.range }); } setAdded(true); setTimeout(() => setAdded(false), 2000); };

  return (
    <>
      <div className="bg-gray-50 py-3"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><nav className="flex items-center gap-2 text-sm text-gray-500"><Link href="/" className="hover:text-[var(--primary)]">الرئيسية</Link><span>/</span><Link href="/products" className="hover:text-[var(--primary)]">المنتجات</Link><span>/</span><span className="text-[var(--primary)]">{product.name}</span></nav></div></div>
      <section className="py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid lg:grid-cols-2 gap-12"><div className="bg-[var(--secondary)] rounded-2xl p-8 flex items-center justify-center relative">{product.badge && (<span className="absolute top-4 right-4 bg-[var(--accent)] text-white text-sm px-4 py-1 rounded-full">{product.badge}</span>)}<div className="relative w-full max-w-[400px] aspect-[4/5]"><Image src={product.image} alt={product.name} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" priority /></div></div><div><p className="text-[var(--primary)] font-medium text-sm mb-2">{product.range}</p><h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1><p className="text-gray-500 text-sm mb-4">{product.nameEn}</p>{activeSectionOffers.length > 0 ? <div className="mb-4 space-y-2 rounded-[1.5rem] border border-orange-200 bg-orange-50 p-4">{activeSectionOffers.map((offer) => (<div key={offer.id} className="flex items-center gap-2 text-sm font-semibold text-orange-700"><Sparkles className="h-4 w-4" />{offer.title}</div>))}</div> : null}<div className="flex items-center gap-2 mb-6"><div className="flex gap-0.5">{[1,2,3,4,5].map((i) => (<Star key={i} size={16} className={i <= product.rating ? "fill-[var(--star)] text-[var(--star)]" : "text-gray-300"} />))}</div><span className="text-sm text-gray-500">({product.reviews} تقييم)</span></div><div className="flex items-center gap-3 mb-6"><span className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(product.price)}</span>{product.oldPrice && <span className="text-lg text-gray-400 line-through">{formatCurrency(product.oldPrice)}</span>}</div><div className="flex flex-wrap gap-4 mb-6 text-sm"><span className="bg-gray-100 px-3 py-1 rounded-full">{product.volume}</span>{product.skinType.map((st) => (<span key={st} className="bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 rounded-full">{st}</span>))}</div><p className="text-gray-600 leading-relaxed mb-6">{product.description}</p><div className="mb-8"><h3 className="font-bold text-sm mb-3">الفوائد الرئيسية:</h3><ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">{product.benefits.map((b) => (<li key={b} className="flex items-center gap-2 text-sm text-gray-600"><Check size={14} className="text-green-500 flex-shrink-0" />{b}</li>))}</ul></div><div className="flex items-center gap-4"><div className="flex items-center border rounded-full"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"><Minus size={16} /></button><span className="w-10 text-center font-medium">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"><Plus size={16} /></button></div><button onClick={handleAddToCart} className={`flex-1 flex items-center justify-center gap-2 py-3 px-8 rounded-full font-medium transition-all ${added ? "bg-green-500 text-white" : "bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white"}`}>{added ? (<><Check size={18} />تمت الإضافة!</>) : (<><ShoppingBag size={18} />أضف للسلة</>)}</button></div>{product.price >= 49 && <p className="text-green-600 text-sm mt-4">✓ هذا المنتج مؤهل للشحن المجاني</p>}</div></div><div className="mt-16"><div className="border-b flex gap-8"><button onClick={() => setActiveTab("description")} className={`pb-3 text-sm font-medium transition-colors ${activeTab === "description" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-gray-500 hover:text-gray-700"}`}>الوصف التفصيلي</button><button onClick={() => setActiveTab("ingredients")} className={`pb-3 text-sm font-medium transition-colors ${activeTab === "ingredients" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-gray-500 hover:text-gray-700"}`}>المكونات</button><button onClick={() => setActiveTab("howToUse")} className={`pb-3 text-sm font-medium transition-colors ${activeTab === "howToUse" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-gray-500 hover:text-gray-700"}`}>طريقة الاستخدام</button></div><div className="py-8">{activeTab === "description" && (<div><p className="text-gray-600 leading-relaxed mb-4">{product.description}</p><ul className="space-y-2">{product.benefits.map((b) => (<li key={b} className="flex items-center gap-2 text-gray-600"><Check size={14} className="text-green-500" />{b}</li>))}</ul></div>)}{activeTab === "ingredients" && <p className="text-gray-600 leading-relaxed">{product.ingredients}</p>}{activeTab === "howToUse" && <p className="text-gray-600 leading-relaxed">{product.howToUse}</p>}</div></div></div></section>
    </>
  );
}
