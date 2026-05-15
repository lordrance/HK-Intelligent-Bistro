import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyCartActions, type AssistantIntentResponse } from "@hk/shared";

import { buildApp } from "./build-app.js";
import { openDb } from "./db.js";

/**
 * Full API journey: register → login → authenticated catalog → concierge intent (stubbed LLM).
 * The assistant stub exercises the same modifier / cart validation as production; no external API key.
 */
describe("user journey (API E2E, stubbed assistant)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: ReturnType<typeof openDb>;

  beforeAll(async () => {
    db = openDb(":memory:");
    app = await buildApp({
      database: db,
      jwtSecret: "test-secret-16chars!",
      logger: false,
      assistantE2eStub: true,
    });
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  it("register → login → catalog → AI adds milk tea → applyCartActions succeeds", async () => {
    const email = `journey_${Date.now()}@test.local`;
    const password = "journey-pass-9";

    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
      headers: { "content-type": "application/json" },
    });
    expect(reg.statusCode).toBe(200);
    const regBody = JSON.parse(reg.body) as { token: string; user: { id: string; email: string } };
    expect(regBody.user.email).toBe(email);
    expect(regBody.token.length).toBeGreaterThan(10);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
      headers: { "content-type": "application/json" },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = JSON.parse(login.body) as { token: string; user: { email: string } };
    expect(loginBody.user.email).toBe(email);

    const catRes = await app.inject({
      method: "GET",
      url: "/catalog",
      headers: { authorization: `Bearer ${loginBody.token}` },
    });
    expect(catRes.statusCode).toBe(200);
    const catalog = JSON.parse(catRes.body) as { version: string; currency: string };

    const intentRes = await app.inject({
      method: "POST",
      url: "/assistant/intent",
      payload: {
        userText: "I'd like hk silk milk tea hot please",
        messages: [{ role: "user", content: "hi" }],
        cart: { items: [], currency: catalog.currency },
        catalogVersion: catalog.version,
      },
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    expect(intentRes.statusCode).toBe(200);
    const intent = JSON.parse(intentRes.body) as AssistantIntentResponse;
    expect(intent.cart_actions.length).toBeGreaterThan(0);
    const add = intent.cart_actions.find((a) => a.type === "ADD_LINE");
    expect(add).toBeDefined();
    if (add?.type === "ADD_LINE") {
      expect(add.dishId).toBe("d_hk_milk_tea");
    }

    const applied = applyCartActions({ items: [], currency: catalog.currency }, intent.cart_actions);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.cart.items.length).toBe(1);
      expect(applied.cart.items[0]?.dishId).toBe("d_hk_milk_tea");
    }
  });
});
