import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CatalogSchema, type Catalog, type Dish } from "@hk/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCatalog(): Promise<Catalog> {
  const raw = await readFile(join(__dirname, "../data/catalog.json"), "utf8");
  const json = JSON.parse(raw);
  return CatalogSchema.parse(json);
}

export function getDishById(catalog: Catalog, dishId: string): Dish | undefined {
  return catalog.dishes.find((d) => d.id === dishId);
}
