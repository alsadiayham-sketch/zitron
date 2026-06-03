import type { CartItem, Offer, Product } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/categories";

export function isOfferActive(offer: Offer): boolean {
  const now = new Date();
  if (offer.startDate && new Date(offer.startDate) > now) return false;
  if (offer.endDate && new Date(offer.endDate) < now) return false;
  return true;
}

export function getComboCartItemId(productId: string, offerId: string) {
  return `${productId}__combo__${offerId}`;
}

export function isComboCartItemId(itemId: string) {
  return itemId.includes("__combo__");
}

export function getComboOfferIdFromItemId(itemId: string) {
  const separator = "__combo__";
  const index = itemId.lastIndexOf(separator);
  if (index === -1) return null;
  return itemId.slice(index + separator.length) || null;
}

export function getBaseProductIdFromItemId(itemId: string) {
  for (const separator of ["__combo__", "__gift__"]) {
    const index = itemId.lastIndexOf(separator);
    if (index !== -1) {
      return itemId.slice(0, index);
    }
  }

  return itemId;
}

export function getEligibleProducts(offer: Offer, productMap: Map<string, Product>) {
  return (offer.eligibleProducts ?? [])
    .map((productId) => productMap.get(productId))
    .filter((product): product is Product => Boolean(product));
}

export function getSelectionCount(selectedProductIds: string[], productId: string) {
  return selectedProductIds.filter((selectedId) => selectedId === productId).length;
}

export function buildComboCartItems(
  offer: Offer,
  selectedProductIds: string[],
  productMap: Map<string, Product>
): Omit<CartItem, "quantity">[] {
  const comboUnitPrice = Number(
    ((offer.comboPrice ?? 0) / Math.max(1, offer.pickCount ?? 1)).toFixed(2)
  );

  return selectedProductIds.flatMap((productId) => {
    const product = productMap.get(productId);
    if (!product) return [];

    return [
      {
        id: getComboCartItemId(product.id, offer.id),
        name: `${product.name} (عرض خاص)`,
        price: comboUnitPrice,
        image: product.image,
        range: product.range,
      },
    ];
  });
}

export function getOfferSectionLabel(offer: Offer) {
  if (!offer.targetSections?.length) return "";

  return offer.targetSections
    .map((sectionId) => CATEGORY_LABELS[sectionId] ?? sectionId)
    .join("، ");
}

function getOfferSectionMetrics(
  items: CartItem[],
  productMap: Map<string, Product>,
  targetSections: string[]
) {
  const targetSet = new Set(targetSections);

  return items.reduce(
    (totals, item) => {
      const productId = getBaseProductIdFromItemId(item.id);
      const product = productMap.get(productId);
      if (!product || !targetSet.has(product.category)) {
        return totals;
      }

      return {
        amount: totals.amount + item.price * item.quantity,
        quantity: totals.quantity + item.quantity,
      };
    },
    { amount: 0, quantity: 0 }
  );
}

export function doesOfferQualify(
  offer: Offer,
  items: CartItem[],
  productMap: Map<string, Product>,
  cartSubtotal: number
) {
  if (offer.targetSections?.length) {
    const { amount, quantity } = getOfferSectionMetrics(items, productMap, offer.targetSections);

    if ((offer.minQuantity ?? 0) > 0) {
      return quantity >= Number(offer.minQuantity ?? 0);
    }

    return amount >= Number(offer.minAmount ?? 0);
  }

  return cartSubtotal >= Number(offer.minAmount ?? 0);
}

export function groupComboCartItems(items: CartItem[]) {
  const groups = new Map<
    string,
    {
      offerId: string;
      items: CartItem[];
      selectedProductIds: string[];
      totalPrice: number;
      totalQuantity: number;
    }
  >();

  for (const item of items) {
    const offerId = getComboOfferIdFromItemId(item.id);
    if (!offerId) continue;

    const current = groups.get(offerId) ?? {
      offerId,
      items: [],
      selectedProductIds: [],
      totalPrice: 0,
      totalQuantity: 0,
    };

    current.items.push(item);
    current.totalPrice += item.price * item.quantity;
    current.totalQuantity += item.quantity;

    const productId = getBaseProductIdFromItemId(item.id);
    for (let index = 0; index < item.quantity; index += 1) {
      current.selectedProductIds.push(productId);
    }

    groups.set(offerId, current);
  }

  return Array.from(groups.values());
}
