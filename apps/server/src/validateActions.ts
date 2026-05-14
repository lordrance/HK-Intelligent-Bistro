import type { Cart, CartAction } from "@hk/shared";
import type { Catalog } from "@hk/shared";
import { getDishById } from "./catalog.js";

export type ValidateResult =
  | { ok: true; actions: CartAction[] }
  | { ok: false; reason: string };

/** Validates selectedModifiers for a dish (required groups, option ids, unknown keys). */
export function validateModifierPayload(
  catalog: Catalog,
  dishId: string,
  selectedModifiers: Record<string, string> | undefined,
): { ok: true } | { ok: false; reason: string } {
  const dish = getDishById(catalog, dishId);
  if (!dish) return { ok: false, reason: `Unknown dish id: ${dishId}` };

  const groups = dish.modifierGroups ?? [];
  const sel = selectedModifiers ?? {};

  for (const g of groups) {
    const picked = sel[g.id];
    if (g.required && !picked) {
      return { ok: false, reason: `Missing required modifier group: ${g.label} (${g.id})` };
    }
    if (!picked) continue;
    const okOpt = g.options.some((o) => o.id === picked);
    if (!okOpt) return { ok: false, reason: `Invalid option for group ${g.id} -> ${picked}` };
  }

  for (const key of Object.keys(sel)) {
    const g = groups.find((x) => x.id === key);
    if (!g) return { ok: false, reason: `Unknown modifier group key: ${key}` };
  }

  return { ok: true };
}

export function cartLineIdSet(cart: { items: { lineId: string }[] }) {
  return new Set(cart.items.map((i) => i.lineId));
}

export function validateCartActions(catalog: Catalog, cart: Cart, actions: CartAction[]): ValidateResult {
  const cartLineIds = cartLineIdSet(cart);

  for (const a of actions) {
    if (a.type === "ADD_LINE") {
      const m = validateModifierPayload(catalog, a.dishId, a.selectedModifiers);
      if (!m.ok) return m;
    }

    if (a.type === "REPLACE_DISH") {
      if (!cartLineIds.has(a.lineId)) {
        return { ok: false, reason: `lineId not found in cart: ${a.lineId}` };
      }
      const m = validateModifierPayload(catalog, a.newDishId, a.selectedModifiers);
      if (!m.ok) return m;
    }

    if (a.type === "UPDATE_MODIFIERS") {
      if (!cartLineIds.has(a.lineId)) {
        return { ok: false, reason: `lineId not found in cart: ${a.lineId}` };
      }
      const lineDishId = cart.items.find((i) => i.lineId === a.lineId)?.dishId;
      if (!lineDishId) {
        return { ok: false, reason: `lineId not found in cart: ${a.lineId}` };
      }
      const m = validateModifierPayload(catalog, lineDishId, a.selectedModifiers);
      if (!m.ok) return m;
    }

    if (a.type === "REMOVE_LINE" || a.type === "SET_QTY") {
      if (!cartLineIds.has(a.lineId)) {
        return { ok: false, reason: `lineId not found in cart: ${a.lineId}` };
      }
    }

    if (a.type === "SET_QTY" && a.qty < 0) {
      return { ok: false, reason: "SET_QTY qty cannot be negative" };
    }
  }

  return { ok: true, actions };
}
