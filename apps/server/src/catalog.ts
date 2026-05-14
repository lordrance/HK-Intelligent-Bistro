import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CatalogSchema, type Catalog, type Dish } from "@hk/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cached: Catalog | null = null;

export async function loadCatalog(): Promise<Catalog> {
  if (cached) return cached;
  const raw = await readFile(join(__dirname, "../data/catalog.json"), "utf8");
  const json = JSON.parse(raw);
  cached = CatalogSchema.parse(json);
  return cached;
}

export function getDishById(catalog: Catalog, dishId: string): Dish | undefined {
  return catalog.dishes.find((d) => d.id === dishId);
}
