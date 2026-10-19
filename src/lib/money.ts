export function formatZar(amount: number, locale = "en-ZA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
