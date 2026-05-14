import type { Cart, Catalog } from "@hk/shared";

export function lineUnitPrice(catalog: Catalog, dishId: string, selectedModifiers: Record<string, string>): number {
  const dish = catalog.dishes.find((d) => d.id === dishId);
  if (!dish) return 0;
  let total = dish.basePrice;
  for (const g of dish.modifierGroups ?? []) {
    const optId = selectedModifiers[g.id];
    const opt = g.options.find((o) => o.id === optId);
    if (opt) total += opt.priceDelta;
  }
  return total;
}

export function cartTotal(catalog: Catalog, cart: Cart): number {
  return cart.items.reduce((sum, li) => sum + lineUnitPrice(catalog, li.dishId, li.selectedModifiers) * li.qty, 0);
}
