/** Display catalog amounts with correct currency formatting. */
export function formatCatalogMoney(currency: string, amount: number): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return `${currency} ${amount}`;
}
