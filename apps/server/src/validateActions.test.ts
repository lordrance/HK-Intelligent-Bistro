import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll } from "vitest";
import { CatalogSchema, type Cart } from "@hk/shared";
import { validateCartActions, validateModifierPayload } from "./validateActions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let catalog: ReturnType<typeof CatalogSchema.parse>;

beforeAll(async () => {
  const raw = await readFile(join(__dirname, "../data/catalog.json"), "utf8");
  catalog = CatalogSchema.parse(JSON.parse(raw));
});

const milkTeaCart: Cart = {
  currency: "HKD",
  items: [
    {
      lineId: "line_milk_1",
      dishId: "d_hk_milk_tea",
      qty: 1,
      selectedModifiers: { mg_size: "mo_size_m", mg_ice: "mo_ice_hot" },
    },
  ],
};

describe("validateModifierPayload", () => {
  it("accepts a valid milk tea selection", () => {
    const r = validateModifierPayload(catalog, "d_hk_milk_tea", {
      mg_size: "mo_size_m",
      mg_ice: "mo_ice_hot",
    });
    expect(r).toEqual({ ok: true });
  });

  it("rejects missing required group", () => {
    const r = validateModifierPayload(catalog, "d_hk_milk_tea", { mg_size: "mo_size_m" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("Missing required modifier");
  });

  it("rejects unknown modifier group key", () => {
    const r = validateModifierPayload(catalog, "d_hk_milk_tea", {
      mg_size: "mo_size_m",
      mg_ice: "mo_ice_hot",
      bogus: "x",
    });
    expect(r.ok).toBe(false);
  });
});

describe("validateCartActions", () => {
  it("accepts UPDATE_MODIFIERS when the payload matches the line dish", () => {
    const r = validateCartActions(catalog, milkTeaCart, [
      {
        type: "UPDATE_MODIFIERS",
        lineId: "line_milk_1",
        selectedModifiers: { mg_size: "mo_size_l", mg_ice: "mo_ice_less" },
      },
    ]);
    expect(r.ok).toBe(true);
  });

  it("rejects UPDATE_MODIFIERS that omits a required group for that dish", () => {
    const r = validateCartActions(catalog, milkTeaCart, [
      { type: "UPDATE_MODIFIERS", lineId: "line_milk_1", selectedModifiers: { mg_size: "mo_size_l" } },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("Missing required modifier");
  });

  it("rejects UPDATE_MODIFIERS with an invalid option id", () => {
    const r = validateCartActions(catalog, milkTeaCart, [
      {
        type: "UPDATE_MODIFIERS",
        lineId: "line_milk_1",
        selectedModifiers: { mg_size: "mo_size_m", mg_ice: "not_a_real_option" },
      },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejects UPDATE_MODIFIERS for an unknown lineId", () => {
    const r = validateCartActions(catalog, milkTeaCart, [
      { type: "UPDATE_MODIFIERS", lineId: "nope", selectedModifiers: { mg_size: "mo_size_m", mg_ice: "mo_ice_hot" } },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("lineId not found");
  });
});
