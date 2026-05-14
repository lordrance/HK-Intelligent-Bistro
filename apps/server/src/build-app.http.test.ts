import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./build-app.js";

describe("buildApp HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("GET /catalog returns a valid catalog shape", async () => {
    const res = await app.inject({ method: "GET", url: "/catalog" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { version?: string; dishes?: unknown[] };
    expect(typeof body.version).toBe("string");
    expect(Array.isArray(body.dishes)).toBe(true);
    expect(body.dishes!.length).toBeGreaterThan(0);
  });

  it("POST /assistant/intent returns a safe JSON envelope for an invalid body (no LLM)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {},
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { assistant_message?: string; cart_actions?: unknown[] };
    expect(Array.isArray(body.cart_actions)).toBe(true);
    expect(body.cart_actions).toEqual([]);
    expect(body.assistant_message?.toLowerCase()).toContain("invalid");
  });

  it("POST /assistant/intent detects catalog version mismatch before calling the model", async () => {
    const catRes = await app.inject({ method: "GET", url: "/catalog" });
    const version = (JSON.parse(catRes.body) as { version: string }).version;
    const res = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {
        userText: "one milk tea please",
        messages: [],
        cart: { items: [], currency: "HKD" },
        catalogVersion: `${version}-definitely-stale`,
      },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { assistant_message?: string; cart_actions?: unknown[] };
    expect(body.cart_actions).toEqual([]);
    expect(body.assistant_message?.toLowerCase()).toMatch(/menu|refresh|updated/);
  });
});
