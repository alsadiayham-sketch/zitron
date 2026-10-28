import type { CartItem, Offer, Product } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/categories";

function parseOfferDate(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

export function isOfferActive(offer: Offer, at = new Date()): boolean {
  const now = at.getTime();
  const start = parseOfferDate(offer.startDate);
  const end = parseOfferDate(offer.endDate);

  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (start !== null && start > now) return false;
  if (end !== null && end < now) return false;
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

export type CartCatalogIssue = {
  item: CartItem;
  product: Product | null;
  type: "deleted" | "price_changed";
};

export function getRegularCartCatalogIssues(
  items: CartItem[],
  productMap: Map<string, Product>
): CartCatalogIssue[] {
  return items.flatMap<CartCatalogIssue>((item) => {
    if (isComboCartItemId(item.id)) return [];

    const product = productMap.get(item.id);
    if (!product) {
      return [{ item, product: null, type: "deleted" as const }];
    }

    const productPrice = Number(product.price);
    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return [{ item, product: null, type: "deleted" as const }];
    }

    const cartPrice = Math.round(Number(item.price) * 100);
    const catalogPrice = Math.round(productPrice * 100);
    if (cartPrice !== catalogPrice) {
      return [{ item, product, type: "price_changed" as const }];
    }

    return [];
  });
}

export function buildComboCartItems(
  offer: Offer,
  selectedProductIds: string[],
  productMap: Map<string, Product>
): CartItem[] {
  const pickCount = Math.floor(Number(offer.pickCount));
  const comboPrice = Number(offer.comboPrice);
  if (
    pickCount <= 0 ||
    !Number.isFinite(comboPrice) ||
    comboPrice < 0 ||
    selectedProductIds.length !== pickCount
  ) {
    return [];
  }

  const counts = selectedProductIds.reduce<Map<string, number>>((result, productId) => {
    result.set(productId, (result.get(productId) ?? 0) + 1);
    return result;
  }, new Map());

  if (offer.uniqueOnly && Array.from(counts.values()).some((quantity) => quantity > 1)) {
    return [];
  }

  const comboUnitPrice = comboPrice / pickCount;

  return Array.from(counts.entries()).flatMap(([productId, quantity]) => {
    const product = productMap.get(productId);
    if (!product) return [];

    return [
      {
        id: getComboCartItemId(product.id, offer.id),
        name: `${product.name} (عرض خاص)`,
        price: comboUnitPrice,
        image: product.image,
        range: product.range,
        quantity,
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
  if (!isOfferActive(offer)) return false;

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
