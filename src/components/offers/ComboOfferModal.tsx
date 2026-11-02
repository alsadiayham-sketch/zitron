"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { Check, Minus, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/admin";
import { buildComboCartItems, getEligibleProducts, getSelectionCount } from "@/lib/offers";
import type { CartItem, Offer, Product } from "@/lib/types";

interface ComboOfferModalProps {
  open: boolean;
  offer: Offer | null;
  products: Product[];
  initialSelection?: string[];
  confirmLabel?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: (items: CartItem[], selectedProductIds: string[]) => void;
}

export default function ComboOfferModal({
  open,
  offer,
  products,
  initialSelection = [],
  confirmLabel = "إضافة العرض إلى السلة",
  returnFocusRef,
  fallbackFocusRef,
  onClose,
  onConfirm,
}: ComboOfferModalProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => initialSelection);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnFocusTarget = returnFocusRef?.current;
    const fallbackFocusTarget = fallbackFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
      const returnTarget = [returnFocusTarget, previousFocus.current, fallbackFocusTarget].find(
        (target): target is HTMLElement => Boolean(target?.isConnected)
      );
      returnTarget?.focus();
    };
  }, [fallbackFocusRef, open, returnFocusRef]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );

  const eligibleProducts = useMemo(() => {
    if (!offer) return [];
    return getEligibleProducts(offer, productMap);
  }, [offer, productMap]);

  const eligibleProductIds = useMemo(
    () => new Set(eligibleProducts.map((product) => product.id)),
    [eligibleProducts]
  );
  const validSelectedProductIds = selectedProductIds.filter((productId) => eligibleProductIds.has(productId));
  const pickCount = Math.max(0, Math.floor(Number(offer?.pickCount ?? 0)));
  const selectedCount = validSelectedProductIds.length;
  const isComplete = selectedCount === pickCount && pickCount > 0;
  const unitPrice = Number(offer?.comboPrice ?? 0) / Math.max(1, pickCount);

  const updateSelection = (productId: string, action: "add" | "remove") => {
    if (!offer) return;

    setSelectedProductIds((current) => {
      const validCurrent = current.filter((selectedId) => eligibleProductIds.has(selectedId));
      if (action === "add") {
        if (offer.uniqueOnly && validCurrent.includes(productId)) {
          return validCurrent;
        }

        if (validCurrent.length >= pickCount) {
          return validCurrent;
        }

        return [...validCurrent, productId];
      }

      const removalIndex = validCurrent.lastIndexOf(productId);
      if (removalIndex === -1) {
        return validCurrent;
      }

      return validCurrent.filter(
        (selectedId, index) => !(selectedId === productId && index === removalIndex)
      );
    });
  };

  const handleConfirm = () => {
    if (!offer || !isComplete) return;
    const items = buildComboCartItems(offer, validSelectedProductIds, productMap);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    if (itemCount !== pickCount) return;
    onConfirm(items, validSelectedProductIds);
  };

  return (
    <>
      {open && offer ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
          onClick={onClose}
          role="presentation"
        >
          <div
            className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl bg-[var(--surface)] shadow-lg sm:max-h-[90vh] sm:rounded-xl"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تخصيص العرض"
            ref={dialogRef}
          >
            <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">تخصيص العرض: {offer.title}</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    اختر {pickCount} منتجات بسعر إجمالي {formatCurrency(offer.comboPrice ?? 0)}
                    <span className="mx-2 text-slate-300">•</span>
                    سعر القطعة {formatCurrency(unitPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border)] px-5 py-3 sm:px-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="rounded-md bg-[var(--surface-soft)] px-3 py-1 font-semibold text-[var(--foreground)]">
                  {selectedCount}/{pickCount} مختارة
                </span>
                {isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-light)] px-3 py-1 font-semibold text-[var(--foreground)]">
                    <Check className="h-4 w-4" />
                    اكتمل
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="min-h-9 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                مسح
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-6">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
                {eligibleProducts.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--muted)]">
                    لا توجد منتجات متاحة لهذا العرض حالياً.
                  </div>
                ) : eligibleProducts.map((product) => {
                  const selectionCount = getSelectionCount(validSelectedProductIds, product.id);
                  const selectionLimitReached = selectedCount >= pickCount;
                  const canAdd = offer.uniqueOnly
                    ? !selectionLimitReached && selectionCount === 0
                    : !selectionLimitReached;

                  return (
                    <div
                      key={product.id}
                      className={`overflow-hidden rounded-lg border bg-[var(--surface)] transition-colors duration-200 ${selectionCount > 0 ? "border-[var(--accent)] ring-2 ring-[var(--accent-light)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
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
                          <div className="absolute left-2 top-2 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white">
                            {selectionCount}×
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 p-3 sm:p-4 text-right">
                        <div>
                          <div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-[var(--foreground)]">{product.name}</h3>{(product as Product & { isDemo?: boolean }).isDemo || product.id.startsWith("demo-") ? <span className="shrink-0 rounded-md bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">تجريبي</span> : null}</div>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="text-slate-400 line-through">{formatCurrency(product.price)}</span>
                          <span className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 font-semibold text-[var(--foreground)]">
                            {formatCurrency(unitPrice)}
                          </span>
                        </div>

                        {offer.uniqueOnly ? (
                          <button
                            type="button"
                            onClick={() => updateSelection(product.id, selectionCount > 0 ? "remove" : "add")}
                            disabled={!canAdd && selectionCount === 0}
                            className={`flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm font-bold transition-colors ${selectionCount > 0 ? "bg-[var(--accent)] text-white hover:bg-[var(--primary)]" : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"}`}
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
                              className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelection(product.id, "remove")}
                              disabled={selectionCount === 0}
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"
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

            <div className="flex-shrink-0 flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                اختر {pickCount} منتجات لإضافة العرض للسلة.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isComplete}
                  className="flex-1 sm:flex-initial rounded-md bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </>
  );
}
