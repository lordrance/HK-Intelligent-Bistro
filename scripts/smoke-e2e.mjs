#!/usr/bin/env node
/**
 * End-to-end smoke against a running API (default http://127.0.0.1:8787).
 * Covers: health, anonymous catalog 401, register, Bearer catalog + assistant flows.
 * Does not call the LLM for the happy-path order flow (that needs a live key + network).
 *
 * Full register → login → catalog → concierge → client cart apply is in Vitest:
 * apps/server/src/user-journey.test.ts (stubbed assistant, no API key; run: pnpm test:journey).
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

async function mustStatus(res, status, label) {
  if (res.status !== status) {
    const t = await res.text();
    throw new Error(`${label}: expected HTTP ${status}, got ${res.status} ${t.slice(0, 200)}`);
  }
}

async function main() {
  const health = await fetch(`${base}/health`);
  await mustOk(health, "GET /health");
  const healthJson = await health.json();
  if (healthJson.ok !== true) throw new Error("GET /health: expected { ok: true }");

  const catalogNoAuth = await fetch(`${base}/catalog`);
  await mustStatus(catalogNoAuth, 401, "GET /catalog (no Bearer)");

  const email = `smoke_${Date.now()}@example.com`;
  const password = "smokepass1";
  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await mustOk(reg, "POST /auth/register");
  const session = await reg.json();
  if (!session.token || typeof session.token !== "string") {
    throw new Error("POST /auth/register: expected token string");
  }
  if (
    !session.user ||
    typeof session.user !== "object" ||
    typeof session.user.id !== "string" ||
    typeof session.user.email !== "string"
  ) {
    throw new Error("POST /auth/register: expected user { id, email }");
  }
  const authHeaders = { Authorization: `Bearer ${session.token}` };

  const catalogRes = await fetch(`${base}/catalog`, { headers: authHeaders });
  await mustOk(catalogRes, "GET /catalog (Bearer)");
  const catalog = await catalogRes.json();
  if (!catalog.version || !Array.isArray(catalog.dishes)) throw new Error("GET /catalog: bad shape");

  const badBody = await fetch(`${base}/assistant/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
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
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({
      userText: "hello",
      messages: [],
      cart: { items: [], currency: catalog.currency || "USD" },
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
