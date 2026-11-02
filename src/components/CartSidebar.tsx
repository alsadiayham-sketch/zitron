"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ComboOfferModal from "@/components/offers/ComboOfferModal";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/admin";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import { groupComboCartItems, isComboCartItemId, isOfferActive } from "@/lib/offers";
import type { Offer } from "@/lib/types";

export default function CartSidebar() {
  const router = useRouter();
  const { items, removeItem, replaceComboItems, updateQuantity, totalItems, totalPrice, isCartOpen, setIsCartOpen } = useCart();
  const { products } = useProducts();
  const { offers, loading: offersLoading } = useOffers();
  const [activeComboOffer, setActiveComboOffer] = useState<Offer | null>(null);
  const [editingSelection, setEditingSelection] = useState<string[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const comboTrigger = useRef<HTMLButtonElement | null>(null);
  const regularItems = useMemo(() => items.filter((item) => !isComboCartItemId(item.id)), [items]);
  const comboGroups = useMemo(() => groupComboCartItems(items), [items]);
  const comboOfferMap = useMemo(() => new Map(offers.filter((offer) => offer.type === "combo" && isOfferActive(offer)).map((offer) => [offer.id, offer] as const)), [offers]);

  useEffect(() => {
    if (!isCartOpen) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen || activeComboOffer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsCartOpen(false);
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const buttons = Array.from(dialog.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"))
        .filter(button => button.getClientRects().length > 0);
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!first || !last) return;
      const outside = !dialog.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeComboOffer, isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;
  const closeCart = () => setIsCartOpen(false);

  return <><button type="button" aria-label="إغلاق سلة التسوق" className="fixed inset-0 z-[60] bg-slate-950/50" onClick={closeCart} />
    <aside ref={dialog} className="fixed left-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-lg" dir="rtl" role="dialog" aria-modal={activeComboOffer ? undefined : true} aria-label="سلة التسوق" aria-hidden={activeComboOffer ? true : undefined} inert={activeComboOffer ? true : undefined}>
      <header className="flex items-center justify-between border-b border-[var(--border)] p-4"><h2 id="cart-title" className="flex items-center gap-2 text-lg font-bold text-[var(--foreground)]"><ShoppingBag className="h-5 w-5 text-[var(--accent)]" />سلة التسوق ({totalItems})</h2><button ref={closeButton} type="button" aria-label="إغلاق" onClick={closeCart} className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--surface-soft)]"><X className="h-5 w-5" /></button></header>
      <div className="flex-1 overflow-y-auto p-4">{items.length === 0 ? <div className="py-16 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-[var(--muted)]" /><p className="mt-4 text-[var(--muted)]">سلة التسوق فارغة</p><button onClick={closeCart} className="mt-4 min-h-11 text-sm font-semibold text-[var(--primary)] hover:underline">تابع التسوق</button></div> : <div className="space-y-3">
        {regularItems.map((item) => <div key={item.id} className="flex gap-3 rounded-lg border border-[var(--border)] p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--surface-soft)]"><Image src={item.image || "/images/product-unavailable.svg"} alt={item.name} fill className="object-contain p-1" sizes="80px" /></div><div className="min-w-0 flex-1"><p className="text-xs text-[var(--muted)]">{item.range}</p><div className="mt-1 flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{item.name}</h3>{item.id.startsWith("demo-") ? <span className="shrink-0 rounded-md bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">تجريبي</span> : null}</div><p className="mt-1 text-sm font-bold text-[var(--primary)]">{formatCurrency(item.price)}</p><div className="mt-2 flex items-center gap-2"><button type="button" aria-label={`تقليل كمية ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)]"><Minus className="h-3.5 w-3.5" /></button><span className="w-6 text-center text-sm font-semibold">{item.quantity}</span><button type="button" aria-label={`زيادة كمية ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)]"><Plus className="h-3.5 w-3.5" /></button><button type="button" aria-label={`حذف ${item.name}`} onClick={() => removeItem(item.id)} className="mr-auto flex h-9 w-9 items-center justify-center rounded-md text-red-700 hover:bg-red-50"><X className="h-4 w-4" /></button></div></div></div>)}
        {comboGroups.map((group) => { const comboOffer = comboOfferMap.get(group.offerId); const unavailable = !offersLoading && !comboOffer; return <section key={group.offerId} className={`rounded-lg border p-3 ${unavailable ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-[var(--accent-light)]"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[var(--foreground)]">{comboOffer?.title ?? "عرض خاص"}</h3><p className="mt-1 text-xs text-[var(--muted)]">{group.totalQuantity} قطعة ضمن هذا العرض</p>{unavailable ? <p className="mt-1 text-xs font-semibold text-red-800">هذا العرض منتهي أو لم يعد متاحاً.</p> : null}</div>{comboOffer ? <button type="button" onClick={(event) => { comboTrigger.current = event.currentTarget; setActiveComboOffer(comboOffer); setEditingSelection(group.selectedProductIds); }} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--primary)]"><Pencil className="h-3.5 w-3.5" />تعديل</button> : unavailable ? <button type="button" onClick={() => replaceComboItems(group.offerId, [])} className="min-h-9 rounded-md border border-red-300 bg-[var(--surface)] px-3 text-xs font-semibold text-red-800">حذف العرض</button> : null}</div><div className="mt-3 space-y-2">{group.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface)] px-3 py-2"><div><p className="text-sm font-semibold text-[var(--foreground)]">{item.name}</p><p className="text-xs text-[var(--muted)]">الكمية: {item.quantity}</p></div><p className="text-sm font-bold text-[var(--primary)]">{formatCurrency(item.price * item.quantity)}</p></div>)}</div></section>; })}
      </div>}</div>
      {items.length > 0 ? <footer className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex items-center justify-between"><span className="text-sm text-[var(--muted)]">المجموع الفرعي</span><strong className="text-lg text-[var(--primary)]">{formatCurrency(totalPrice)}</strong></div><button onClick={() => { closeCart(); router.push("/checkout"); }} className="clinical-button w-full min-h-11">إتمام الطلب</button><button onClick={closeCart} className="w-full min-h-11 text-sm font-semibold text-[var(--primary)] hover:underline">متابعة التسوق</button></footer> : null}
    </aside>
    <ComboOfferModal key={activeComboOffer ? `${activeComboOffer.id}-${editingSelection.join(",")}` : "cart-combo-closed"} open={Boolean(activeComboOffer)} offer={activeComboOffer} products={products} initialSelection={editingSelection} confirmLabel="حفظ التعديلات" returnFocusRef={comboTrigger} fallbackFocusRef={closeButton} onClose={() => { setActiveComboOffer(null); setEditingSelection([]); }} onConfirm={(comboItems) => { if (!activeComboOffer) return; replaceComboItems(activeComboOffer.id, comboItems); setActiveComboOffer(null); setEditingSelection([]); }} />
  </>;
}
