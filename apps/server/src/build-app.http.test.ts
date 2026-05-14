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
});
