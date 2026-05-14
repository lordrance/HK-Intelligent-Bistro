import type { Catalog, Dish } from "@hk/shared";

function norm(s: string) {
  return s.trim().toLowerCase();
}

function scoreDish(q: string, dish: Dish): number {
  const nq = norm(q);
  if (!nq) return 0;
  let score = 0;
  const name = norm(dish.name);
  const desc = norm(dish.description);
  const cat = norm(dish.category);
  if (name.includes(nq) || nq.includes(name)) score += 8;
  if (name.split(/\s+/).some((w) => w && nq.includes(w))) score += 4;
  if (desc.includes(nq)) score += 1;
  if (cat.includes(nq)) score += 1;
  for (const a of dish.aliases ?? []) {
    const na = norm(a);
    if (na && (nq.includes(na) || na.includes(nq))) score += 6;
  }
  return score;
}

/** 从用户输入里拆出若干 token（中英数字），用于粗召回 */
function tokens(userText: string): string[] {
  const cleaned = userText.replace(/[^\p{L}\p{N}]+/gu, " ");
  return cleaned.split(/\s+/).filter(Boolean).slice(0, 12);
}

export function searchDishes(catalog: Catalog, userText: string, topK: number): Dish[] {
  const toks = tokens(userText);
  if (toks.length === 0) return catalog.dishes.slice(0, topK);

  const scored = catalog.dishes.map((d) => {
    const s = toks.reduce((acc, t) => acc + scoreDish(t, d), 0);
    return { d, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const filtered = scored.filter((x) => x.s > 0);
  const pick = (filtered.length ? filtered : scored).slice(0, topK).map((x) => x.d);
  return pick;
}
