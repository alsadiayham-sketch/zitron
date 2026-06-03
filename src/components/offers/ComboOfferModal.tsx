"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Check, Minus, Plus, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/admin";
import { buildComboCartItems, getEligibleProducts, getSelectionCount } from "@/lib/offers";
import type { CartItem, Offer, Product } from "@/lib/types";

interface ComboOfferModalProps {
  open: boolean;
  offer: Offer | null;
  products: Product[];
  initialSelection?: string[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (items: Omit<CartItem, "quantity">[], selectedProductIds: string[]) => void;
}

export default function ComboOfferModal({
  open,
  offer,
  products,
  initialSelection = [],
  confirmLabel = "إضافة العرض إلى السلة",
  onClose,
  onConfirm,
}: ComboOfferModalProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => initialSelection);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );

  const eligibleProducts = useMemo(() => {
    if (!offer) return [];
    return getEligibleProducts(offer, productMap);
  }, [offer, productMap]);

  const pickCount = offer?.pickCount ?? 0;
  const selectedCount = selectedProductIds.length;
  const isComplete = selectedCount === pickCount && pickCount > 0;
  const unitPrice = Number(((offer?.comboPrice ?? 0) / Math.max(1, pickCount)).toFixed(2));

  const updateSelection = (productId: string, action: "add" | "remove") => {
    if (!offer) return;

    setSelectedProductIds((current) => {
      if (action === "add") {
        if (offer.uniqueOnly && current.includes(productId)) {
          return current;
        }

        if (current.length >= pickCount) {
          return current;
        }

        return [...current, productId];
      }

      const removalIndex = current.lastIndexOf(productId);
      if (removalIndex === -1) {
        return current;
      }

      return current.filter(
        (selectedId, index) => !(selectedId === productId && index === removalIndex)
      );
    });
  };

  const handleConfirm = () => {
    if (!offer || !isComplete) return;
    onConfirm(buildComboCartItems(offer, selectedProductIds, productMap), selectedProductIds);
  };

  return (
    <AnimatePresence>
      {open && offer ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex max-h-[95vh] sm:max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl sm:mx-4"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            {/* Header - fixed */}
            <div className="flex-shrink-0 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-red-50 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    <Sparkles className="h-4 w-4" />
                    خصص عرضك الآن
                  </div>
                  <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">{offer.title}</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    اختر {pickCount} منتجات بسعر إجمالي {formatCurrency(offer.comboPrice ?? 0)}
                    <span className="mx-2 text-slate-300">•</span>
                    سعر القطعة {formatCurrency(unitPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Status bar - fixed */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6 sm:py-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {selectedCount}/{pickCount} مختارة
                </span>
                {isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                    <Check className="h-4 w-4" />
                    اكتمل
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                مسح
              </button>
            </div>

            {/* Products grid - scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-6">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
                {eligibleProducts.map((product) => {
                  const selectionCount = getSelectionCount(selectedProductIds, product.id);
                  const selectionLimitReached = selectedCount >= pickCount;
                  const canAdd = offer.uniqueOnly
                    ? !selectionLimitReached && selectionCount === 0
                    : !selectionLimitReached;

                  return (
                    <div
                      key={product.id}
                      className={`overflow-hidden rounded-2xl sm:rounded-[1.75rem] border bg-white transition ${selectionCount > 0 ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}
                    >
                      <div className="relative aspect-square bg-slate-50">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-3 sm:p-4"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {selectionCount > 0 ? (
                          <div className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white">
                            {selectionCount}×
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 p-3 sm:p-4 text-right">
                        <div>
                          <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-900">{product.name}</h3>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="text-slate-400 line-through">{formatCurrency(product.price)}</span>
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-700">
                            {formatCurrency(unitPrice)}
                          </span>
                        </div>

                        {offer.uniqueOnly ? (
                          <button
                            type="button"
                            onClick={() => updateSelection(product.id, selectionCount > 0 ? "remove" : "add")}
                            disabled={!canAdd && selectionCount === 0}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-bold transition ${selectionCount > 0 ? "bg-orange-500 text-white hover:bg-orange-600" : "border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"}`}
                          >
                            {selectionCount > 0 ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {selectionCount > 0 ? "إلغاء" : "اختيار"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSelection(product.id, "add")}
                              disabled={!canAdd}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelection(product.id, "remove")}
                              disabled={selectionCount === 0}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="mr-auto text-[10px] sm:text-xs text-slate-500">
                              ×{selectionCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer - fixed */}
            <div className="flex-shrink-0 flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                اختر {pickCount} منتجات لإضافة العرض للسلة.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isComplete}
                  className="flex-1 sm:flex-initial rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200/50 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>

        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
