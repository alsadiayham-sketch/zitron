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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-red-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    <Sparkles className="h-4 w-4" />
                    خصص عرضك الآن
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">{offer.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    اختر {pickCount} منتجات بسعر إجمالي {formatCurrency(offer.comboPrice ?? 0)}
                    <span className="mx-2 text-slate-300">•</span>
                    سعر القطعة ضمن العرض {formatCurrency(unitPrice)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {offer.uniqueOnly
                      ? "يمكن اختيار كل منتج مرة واحدة فقط ضمن هذا العرض."
                      : "يمكنك تكرار نفس المنتج أكثر من مرة حتى تكتمل خيارات العرض."}
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

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {selectedCount}/{pickCount} مختارة
                </span>
                {isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                    <Check className="h-4 w-4" />
                    اكتمل الاختيار
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                مسح الاختيار
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {eligibleProducts.map((product) => {
                  const selectionCount = getSelectionCount(selectedProductIds, product.id);
                  const selectionLimitReached = selectedCount >= pickCount;
                  const canAdd = offer.uniqueOnly
                    ? !selectionLimitReached && selectionCount === 0
                    : !selectionLimitReached;

                  return (
                    <div
                      key={product.id}
                      className={`overflow-hidden rounded-[1.75rem] border bg-white transition ${selectionCount > 0 ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}
                    >
                      <div className="relative aspect-square bg-slate-50">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {selectionCount > 0 ? (
                          <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                            {selectionCount} مختارة
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 p-4 text-right">
                        <div>
                          <p className="text-xs font-medium text-[var(--primary)]">{product.range}</p>
                          <h3 className="mt-1 line-clamp-2 font-bold text-slate-900">{product.name}</h3>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-slate-400 line-through">{formatCurrency(product.price)}</span>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            ضمن العرض {formatCurrency(unitPrice)}
                          </span>
                        </div>

                        {offer.uniqueOnly ? (
                          <button
                            type="button"
                            onClick={() => updateSelection(product.id, selectionCount > 0 ? "remove" : "add")}
                            disabled={!canAdd && selectionCount === 0}
                            className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition ${selectionCount > 0 ? "bg-orange-500 text-white hover:bg-orange-600" : "border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"}`}
                          >
                            {selectionCount > 0 ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {selectionCount > 0 ? "إلغاء اختيار المنتج" : "اختيار المنتج"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateSelection(product.id, "add")}
                              disabled={!canAdd}
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelection(product.id, "remove")}
                              disabled={selectionCount === 0}
                              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="mr-auto text-xs text-slate-500">
                              تم اختيار هذا المنتج {selectionCount} مرة
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                لن تتم إضافة العرض إلى السلة إلا بعد إكمال اختيار {pickCount} منتجات.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isComplete}
                  className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200/50 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
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
