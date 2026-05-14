import type { Cart } from "../schemas/cart.js";
import type { CartAction } from "../schemas/actions.js";
import type { Catalog } from "../schemas/menu.js";

function dishName(catalog: Catalog, dishId: string): string {
  return catalog.dishes.find((d) => d.id === dishId)?.name ?? dishId;
}

/** Human-readable modifier picks for a dish. */
export function formatModifiers(catalog: Catalog, dishId: string, selected: Record<string, string>): string {
  const dish = catalog.dishes.find((d) => d.id === dishId);
  if (!dish) return "";
  const parts: string[] = [];
  for (const g of dish.modifierGroups ?? []) {
    const optId = selected[g.id];
    if (!optId) continue;
    const opt = g.options.find((o) => o.id === optId);
    parts.push(`${g.label}: ${opt?.label ?? optId}`);
  }
  return parts.join("; ");
}

function lineDescriptor(catalog: Catalog, cart: Cart, lineId: string): string {
  const li = cart.items.find((i) => i.lineId === lineId);
  if (!li) return `line ${lineId.slice(0, 8)}…`;
  const name = dishName(catalog, li.dishId);
  const mods = formatModifiers(catalog, li.dishId, li.selectedModifiers);
  return mods ? `${name} — ${mods}` : name;
}

/** One-line English summary for UI (e.g. concierge pending panel). */
export function formatCartActionSummary(catalog: Catalog, cart: Cart, action: CartAction): string {
  switch (action.type) {
    case "ADD_LINE": {
      const name = dishName(catalog, action.dishId);
      const mods = formatModifiers(catalog, action.dishId, action.selectedModifiers);
      const detail = mods ? `${name} — ${mods}` : name;
      return `Add ${action.qty}× ${detail}`;
    }
    case "REMOVE_LINE": {
      const li = cart.items.find((i) => i.lineId === action.lineId);
      const desc = lineDescriptor(catalog, cart, action.lineId);
      return li ? `Remove: ${desc} (×${li.qty})` : `Remove: ${desc}`;
    }
    case "SET_QTY": {
      const li = cart.items.find((i) => i.lineId === action.lineId);
      const desc = lineDescriptor(catalog, cart, action.lineId);
      if (action.qty === 0) return `Remove: ${desc}${li ? ` (was ×${li.qty})` : ""}`;
      return `Set quantity to ${action.qty}: ${desc}${li && li.qty !== action.qty ? ` (was ×${li.qty})` : ""}`;
    }
    case "UPDATE_MODIFIERS": {
      const li = cart.items.find((i) => i.lineId === action.lineId);
      const base = lineDescriptor(catalog, cart, action.lineId);
      const next = li ? formatModifiers(catalog, li.dishId, action.selectedModifiers) : "";
      return next ? `Update options: ${base} → ${next}` : `Update options: ${base}`;
    }
    case "CLEAR_CART":
      return `Clear cart (${cart.items.length} line(s))`;
    case "REPLACE_DISH": {
      const cur = cart.items.find((i) => i.lineId === action.lineId);
      const oldName = cur ? dishName(catalog, cur.dishId) : "current line";
      const newName = dishName(catalog, action.newDishId);
      const mods = formatModifiers(catalog, action.newDishId, action.selectedModifiers);
      const qtyNote = action.qty != null ? ` ×${action.qty}` : "";
      return `Replace ${oldName} → ${newName}${mods ? ` (${mods})` : ""}${qtyNote}`;
    }
  }
}
