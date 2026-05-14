import type { CartAction } from "@hk/shared";
import type { Catalog } from "@hk/shared";
import { getDishById } from "./catalog.js";

export type ValidateResult =
  | { ok: true; actions: CartAction[] }
  | { ok: false; reason: string };

export function validateCartActions(catalog: Catalog, cartLineIds: Set<string>, actions: CartAction[]): ValidateResult {
  for (const a of actions) {
    if (a.type === "ADD_LINE" || a.type === "REPLACE_DISH") {
      const dishId = a.type === "ADD_LINE" ? a.dishId : a.newDishId;
      const dish = getDishById(catalog, dishId);
      if (!dish) return { ok: false, reason: `Unknown dish id: ${dishId}` };

      const groups = dish.modifierGroups ?? [];
      for (const g of groups) {
        const picked = a.selectedModifiers?.[g.id];
        if (g.required && !picked) {
          return { ok: false, reason: `Missing required modifier group: ${g.label} (${g.id})` };
        }
        if (!picked) continue;
        const okOpt = g.options.some((o) => o.id === picked);
        if (!okOpt) return { ok: false, reason: `Invalid option for group ${g.id} -> ${picked}` };
      }
      // Reject unknown modifier group keys on the payload
      for (const key of Object.keys(a.selectedModifiers ?? {})) {
        const g = groups.find((x) => x.id === key);
        if (!g) return { ok: false, reason: `Unknown modifier group key: ${key}` };
      }
    }
    if (a.type === "REMOVE_LINE" || a.type === "SET_QTY" || a.type === "UPDATE_MODIFIERS" || a.type === "REPLACE_DISH") {
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

export function cartLineIdSet(cart: { items: { lineId: string }[] }) {
  return new Set(cart.items.map((i) => i.lineId));
}
