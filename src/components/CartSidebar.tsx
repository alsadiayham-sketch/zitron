"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ComboOfferModal from "@/components/offers/ComboOfferModal";
import { formatCurrency } from "@/lib/admin";
import { useOffers, useProducts } from "@/lib/firebase-hooks";
import { groupComboCartItems, isComboCartItemId, isOfferActive } from "@/lib/offers";
import type { Offer } from "@/lib/types";

export default function CartSidebar() {
  const router = useRouter();
  const { items, removeItem, replaceComboItems, updateQuantity, totalItems, totalPrice, isCartOpen, setIsCartOpen } = useCart();
  const { products } = useProducts();
  const { offers } = useOffers();
  const [activeComboOffer, setActiveComboOffer] = useState<Offer | null>(null);
  const [editingSelection, setEditingSelection] = useState<string[]>([]);

  const regularItems = useMemo(
    () => items.filter((item) => !isComboCartItemId(item.id)),
    [items]
  );
  const comboGroups = useMemo(() => groupComboCartItems(items), [items]);
  const comboOfferMap = useMemo(
    () =>
      new Map(
        offers
          .filter((offer) => offer.type === "combo" && isOfferActive(offer))
          .map((offer) => [offer.id, offer] as const)
      ),
    [offers]
  );

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setIsCartOpen(false)} />

      <div className="fixed top-0 left-0 z-[70] flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slideInRight" dir="rtl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--primary)]">
            <ShoppingBag size={22} />
            سلة التسوق ({totalItems})
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">سلة التسوق فارغة</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 font-medium text-[var(--primary)] hover:underline">
                تابع التسوق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {regularItems.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-xl bg-gray-50 p-3">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--primary)]">{item.range}</p>
                    <h4 className="truncate text-sm font-medium">{item.name}</h4>
                    <p className="mt-1 text-sm font-bold text-[var(--primary)]">{formatCurrency(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border bg-white hover:bg-gray-100">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border bg-white hover:bg-gray-100">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="mr-auto text-red-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {comboGroups.map((group) => {
                const comboOffer = comboOfferMap.get(group.offerId);

                return (
                  <div key={group.offerId} className="rounded-[1.5rem] border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-orange-700">
                          <Sparkles className="h-4 w-4" />
                          <p className="font-bold">{comboOffer?.title ?? "عرض خاص"}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{group.totalQuantity} قطعة ضمن هذا العرض</p>
                      </div>
                      {comboOffer ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveComboOffer(comboOffer);
                            setEditingSelection(group.selectedProductIds);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-2">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">الكمية: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-orange-700">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="space-y-4 border-t p-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">المجموع الفرعي</span>
              <span className="text-lg font-bold text-[var(--primary)]">{formatCurrency(totalPrice)}</span>
            </div>
            <button
              onClick={() => {
                setIsCartOpen(false);
                router.push("/checkout");
              }}
              className="w-full rounded-full bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
            >
              إتمام الطلب
            </button>
            <button onClick={() => setIsCartOpen(false)} className="w-full text-center text-sm font-medium text-[var(--primary)] hover:underline">
              متابعة التسوق
            </button>
          </div>
        ) : null}
      </div>

      <ComboOfferModal
        key={activeComboOffer ? `${activeComboOffer.id}-${editingSelection.join(",")}` : "cart-combo-closed"}
        open={Boolean(activeComboOffer)}
        offer={activeComboOffer}
        products={products}
        initialSelection={editingSelection}
        confirmLabel="حفظ التعديلات"
        onClose={() => {
          setActiveComboOffer(null);
          setEditingSelection([]);
        }}
        onConfirm={(comboItems) => {
          if (!activeComboOffer) {
            return;
          }

          replaceComboItems(activeComboOffer.id, comboItems);
          setActiveComboOffer(null);
          setEditingSelection([]);
        }}
      />
    </>
  );
}
