import type { Deal } from "./deals";

export function getDealDiscountPercent(deal: Pick<Deal, "originalPrice" | "price">) {
  if (!deal.originalPrice || deal.originalPrice <= deal.price) {
    return null;
  }

  return Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
}

export function getDealSavingsAmount(deal: Pick<Deal, "originalPrice" | "price">) {
  if (!deal.originalPrice || deal.originalPrice <= deal.price) {
    return null;
  }

  return deal.originalPrice - deal.price;
}
