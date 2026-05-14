import type { Cart, CartLine } from "../schemas/cart.js";
import type { CartAction } from "../schemas/actions.js";

function randomLineId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function mergeKey(line: CartLine) {
  const keys = Object.keys(line.selectedModifiers).sort();
  const mod = keys.map((k) => `${k}:${line.selectedModifiers[k]}`).join("|");
  return `${line.dishId}::${mod}`;
}

export type ApplyResult =
  | { ok: true; cart: Cart }
  | { ok: false; error: string };

/**
 * Applies server-returned cart_actions in order (pure function; unit-test friendly).
 */
export function applyCartActions(cart: Cart, actions: CartAction[]): ApplyResult {
  let items = cart.items.map((i) => ({ ...i, selectedModifiers: { ...i.selectedModifiers } }));

  for (const action of actions) {
    if (action.type === "CLEAR_CART") {
      items = [];
      continue;
    }
    if (action.type === "REMOVE_LINE") {
      items = items.filter((l) => l.lineId !== action.lineId);
      continue;
    }
    if (action.type === "SET_QTY") {
      const idx = items.findIndex((l) => l.lineId === action.lineId);
      if (idx === -1) return { ok: false, error: `SET_QTY: unknown lineId ${action.lineId}` };
      if (action.qty === 0) items.splice(idx, 1);
      else items[idx] = { ...items[idx], qty: action.qty };
      continue;
    }
    if (action.type === "UPDATE_MODIFIERS") {
      const idx = items.findIndex((l) => l.lineId === action.lineId);
      if (idx === -1) return { ok: false, error: `UPDATE_MODIFIERS: unknown lineId ${action.lineId}` };
      items[idx] = { ...items[idx], selectedModifiers: { ...action.selectedModifiers } };
      continue;
    }
    if (action.type === "REPLACE_DISH") {
      const idx = items.findIndex((l) => l.lineId === action.lineId);
      if (idx === -1) return { ok: false, error: `REPLACE_DISH: unknown lineId ${action.lineId}` };
      const qty = action.qty ?? items[idx].qty;
      items[idx] = {
        ...items[idx],
        dishId: action.newDishId,
        qty,
        selectedModifiers: { ...action.selectedModifiers },
      };
      continue;
    }
    if (action.type === "ADD_LINE") {
      const incoming: CartLine = {
        lineId: randomLineId(),
        dishId: action.dishId,
        qty: action.qty,
        selectedModifiers: { ...action.selectedModifiers },
        note: action.note,
      };
      const mkey = mergeKey(incoming);
      const existing = items.find((l) => mergeKey(l) === mkey);
      if (existing) {
        items = items.map((l) =>
          l.lineId === existing.lineId ? { ...l, qty: l.qty + incoming.qty } : l,
        );
      } else {
        items = [...items, incoming];
      }
    }
  }

  return { ok: true, cart: { ...cart, items, updatedAt: nowIso() } };
}
