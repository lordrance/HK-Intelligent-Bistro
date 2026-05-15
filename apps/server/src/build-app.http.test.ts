import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDb } from "./db.js";
import { buildApp } from "./build-app.js";

describe("buildApp HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: ReturnType<typeof openDb>;
  let token: string;

  beforeAll(async () => {
    db = openDb(":memory:");
    app = await buildApp({ database: db, jwtSecret: "test-secret-16chars!", logger: false });
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "e2e-http@test.local", password: "password123" },
      headers: { "content-type": "application/json" },
    });
    expect(reg.statusCode).toBe(200);
    token = (JSON.parse(reg.body) as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("GET /catalog without token returns 401", async () => {
    const res = await app.inject({ method: "GET", url: "/catalog" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /catalog with Bearer returns a valid catalog shape", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { version?: string; dishes?: unknown[] };
    expect(typeof body.version).toBe("string");
    expect(Array.isArray(body.dishes)).toBe(true);
    expect(body.dishes!.length).toBeGreaterThan(0);
  });

  it("POST /assistant/intent returns 401 without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {},
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /assistant/intent returns a safe JSON envelope for an invalid body (no LLM)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {},
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { assistant_message?: string; cart_actions?: unknown[] };
    expect(Array.isArray(body.cart_actions)).toBe(true);
    expect(body.cart_actions).toEqual([]);
    expect(body.assistant_message?.toLowerCase()).toContain("invalid");
  });

  it("POST /assistant/intent detects catalog version mismatch before calling the model", async () => {
    const catRes = await app.inject({
      method: "GET",
      url: "/catalog",
      headers: { authorization: `Bearer ${token}` },
    });
    const version = (JSON.parse(catRes.body) as { version: string }).version;
    const res = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {
        userText: "one milk tea please",
        messages: [],
        cart: { items: [], currency: "USD" },
        catalogVersion: `${version}-definitely-stale`,
      },
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { assistant_message?: string; cart_actions?: unknown[] };
    expect(body.cart_actions).toEqual([]);
    expect(body.assistant_message?.toLowerCase()).toMatch(/menu|refresh|updated/);
  });

  it("POST /assistant/intent returns 200 with guidance when DEEPSEEK_API_KEY is unset (no 500)", async () => {
    const prev = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      const catRes = await app.inject({
        method: "GET",
        url: "/catalog",
        headers: { authorization: `Bearer ${token}` },
      });
      const { version, currency } = JSON.parse(catRes.body) as { version: string; currency: string };
      const res = await app.inject({
        method: "POST",
        url: "/assistant/intent",
        payload: {
          userText: "hello",
          messages: [],
          cart: { items: [], currency },
          catalogVersion: version,
        },
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { assistant_message?: string; cart_actions?: unknown[] };
      expect(body.cart_actions).toEqual([]);
      expect(String(body.assistant_message).toLowerCase()).toMatch(/not configured|deepseek/);
    } finally {
      if (prev !== undefined) process.env.DEEPSEEK_API_KEY = prev;
    }
  });
});
