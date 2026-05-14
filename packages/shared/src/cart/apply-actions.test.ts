import { describe, expect, it } from "vitest";
import { applyCartActions, type Cart, type CartAction } from "../index.js";

describe("applyCartActions", () => {
  it("merges identical dish + modifier lines", () => {
    const cart: Cart = { items: [], currency: "HKD" };
    const actions: CartAction[] = [
      { type: "ADD_LINE", dishId: "d_a", qty: 1, selectedModifiers: { g1: "o1" } },
      { type: "ADD_LINE", dishId: "d_a", qty: 2, selectedModifiers: { g1: "o1" } },
    ];
    const r = applyCartActions(cart, actions);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cart.items.length).toBe(1);
    expect(r.cart.items[0].qty).toBe(3);
  });

  it("returns error for SET_QTY on unknown lineId", () => {
    const cart: Cart = { items: [], currency: "HKD" };
    const r = applyCartActions(cart, [{ type: "SET_QTY", lineId: "missing", qty: 1 }]);
    expect(r.ok).toBe(false);
  });

  it("CLEAR_CART removes all lines", () => {
    const cart: Cart = {
      currency: "HKD",
      items: [{ lineId: "x", dishId: "d", qty: 2, selectedModifiers: {} }],
    };
    const r = applyCartActions(cart, [{ type: "CLEAR_CART" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cart.items.length).toBe(0);
  });
});
