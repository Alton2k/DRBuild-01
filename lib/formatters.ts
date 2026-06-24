export function formatMyrPrice(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits,
  }).format(value);
}
