#!/usr/bin/env node
/**
 * End-to-end smoke against a running API (default http://127.0.0.1:8787).
 * Covers: health, catalog, assistant invalid body, assistant catalog version mismatch.
 * Does not call the LLM for the happy-path order flow (that needs a live key + network).
 *
 * Usage: SMOKE_API_BASE=http://127.0.0.1:8787 node scripts/smoke-e2e.mjs
 */
const base = (process.env.SMOKE_API_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");

async function mustOk(res, label) {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${label}: HTTP ${res.status} ${t.slice(0, 200)}`);
  }
}

async function main() {
  const health = await fetch(`${base}/health`);
  await mustOk(health, "GET /health");
  const healthJson = await health.json();
  if (healthJson.ok !== true) throw new Error("GET /health: expected { ok: true }");

  const catalogRes = await fetch(`${base}/catalog`);
  await mustOk(catalogRes, "GET /catalog");
  const catalog = await catalogRes.json();
  if (!catalog.version || !Array.isArray(catalog.dishes)) throw new Error("GET /catalog: bad shape");

  const badBody = await fetch(`${base}/assistant/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  await mustOk(badBody, "POST /assistant/intent (invalid)");
  const badJson = await badBody.json();
  if (!Array.isArray(badJson.cart_actions) || badJson.cart_actions.length !== 0) {
    throw new Error("POST /assistant/intent (invalid): expected empty cart_actions");
  }
  if (!String(badJson.assistant_message || "").toLowerCase().includes("invalid")) {
    throw new Error("POST /assistant/intent (invalid): expected invalid-payload hint");
  }

  const stale = await fetch(`${base}/assistant/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userText: "hello",
      messages: [],
      cart: { items: [], currency: "HKD" },
      catalogVersion: `${catalog.version}-stale-smoke`,
    }),
  });
  await mustOk(stale, "POST /assistant/intent (stale version)");
  const staleJson = await stale.json();
  if (!Array.isArray(staleJson.cart_actions) || staleJson.cart_actions.length !== 0) {
    throw new Error("POST /assistant/intent (stale): expected empty cart_actions");
  }
  if (!/menu|refresh|updated/i.test(String(staleJson.assistant_message || ""))) {
    throw new Error("POST /assistant/intent (stale): expected menu refresh hint");
  }

  console.log(`OK — full API smoke passed against ${base}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
