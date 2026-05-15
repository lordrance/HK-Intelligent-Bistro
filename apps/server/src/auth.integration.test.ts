import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDb } from "./db.js";
import { buildApp } from "./build-app.js";

describe("auth HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: ReturnType<typeof openDb>;

  beforeAll(async () => {
    db = openDb(":memory:");
    app = await buildApp({ database: db, jwtSecret: "test-secret-16chars!", logger: false });
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  it("POST /auth/register returns 409 for duplicate email", async () => {
    const email = "dup-auth@test.local";
    const first = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password123" },
      headers: { "content-type": "application/json" },
    });
    expect(first.statusCode).toBe(200);
    const firstBody = JSON.parse(first.body) as { token: string; user: { id: string; email: string } };
    expect(firstBody.token.length).toBeGreaterThan(10);
    expect(firstBody.user.email).toBe(email);
    expect(firstBody.user.id.length).toBeGreaterThan(0);
    const second = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "otherpass456" },
      headers: { "content-type": "application/json" },
    });
    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body)).toMatchObject({ error: "email_taken" });
  });

  it("POST /auth/login returns token for valid credentials", async () => {
    const email = "login-auth@test.local";
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password123" },
      headers: { "content-type": "application/json" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "password123" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { token: string; user: { email: string } };
    expect(body.token.length).toBeGreaterThan(10);
    expect(body.user.email).toBe(email);
  });
});
