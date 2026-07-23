export function formatMoney(
  value: number | null | undefined,
  currencyCode: string | null | undefined
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const currency = currencyCode?.trim().toUpperCase();

  if (!currency) {
    return value.toFixed(2);
  }

  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}