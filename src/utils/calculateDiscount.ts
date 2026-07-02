export type DiscountMode = "percent" | "amount";

export interface DiscountInput {
  mode: DiscountMode;
  value: number;
}

export function discountAmount(baseAmount: number, discount?: DiscountInput) {
  if (!discount || discount.value <= 0 || baseAmount <= 0) return 0;
  const raw = discount.mode === "percent"
    ? baseAmount * (Math.min(discount.value, 100) / 100)
    : discount.value;
  return Math.min(baseAmount, Math.max(0, raw));
}

export function formatDiscountLabel(discount?: DiscountInput) {
  if (!discount || discount.value <= 0) return "";
  return discount.mode === "percent" ? `${discount.value}%` : `₹${discount.value}`;
}
