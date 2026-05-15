import { describe, expect, it } from "vitest";
import type { Cart } from "../schemas/cart.js";
import type { Catalog } from "../schemas/menu.js";
import { formatCartActionSummary } from "./format-action-summary.js";

const miniCatalog: Catalog = {
  version: "t",
  currency: "USD",
  dishes: [
    {
      id: "d_a",
      name: "Alpha Bowl",
      description: "Test",
      category: "Mains",
      basePrice: 10,
      aliases: [],
      modifierGroups: [
        {
          id: "mg_s",
          label: "Size",
          required: true,
          maxSelect: 1,
          options: [
            { id: "o_s", label: "Small", priceDelta: 0 },
            { id: "o_l", label: "Large", priceDelta: 2 },
          ],
        },
      ],
    },
    {
      id: "d_b",
      name: "Beta Plate",
      description: "Test",
      category: "Mains",
      basePrice: 12,
      aliases: [],
      modifierGroups: [],
    },
  ],
};

describe("formatCartActionSummary", () => {
  it("describes ADD_LINE with modifiers", () => {
    const cart: Cart = { items: [], currency: "USD" };
    const s = formatCartActionSummary(miniCatalog, cart, {
      type: "ADD_LINE",
      dishId: "d_a",
      qty: 2,
      selectedModifiers: { mg_s: "o_l" },
    });
    expect(s).toContain("Alpha Bowl");
    expect(s).toContain("Size: Large");
    expect(s).toContain("2×");
  });

  it("describes REMOVE_LINE using cart context", () => {
    const cart: Cart = {
      currency: "USD",
      items: [
        {
          lineId: "ln1",
          dishId: "d_a",
          qty: 1,
          selectedModifiers: { mg_s: "o_s" },
        },
      ],
    };
    const s = formatCartActionSummary(miniCatalog, cart, { type: "REMOVE_LINE", lineId: "ln1" });
    expect(s).toContain("Remove:");
    expect(s).toContain("Alpha Bowl");
    expect(s).toContain("Small");
  });
});
