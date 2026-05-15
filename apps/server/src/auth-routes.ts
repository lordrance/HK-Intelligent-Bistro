import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { SqliteDB } from "./db.js";
import { signUserToken, verifyUserToken } from "./auth-jwt.js";

const CredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

function jwtExpiresDays(): number {
  const raw = process.env.JWT_EXPIRES_DAYS;
  const n = raw ? Number(raw) : 7;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 365) : 7;
}

export function createBearerAuthPreHandler(deps: { jwtSecret: string; db: SqliteDB }) {
  return async function authBearer(req: FastifyRequest, reply: FastifyReply) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    const token = h.slice(7).trim();
    if (!token) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    const userId = await verifyUserToken(deps.jwtSecret, token);
    if (!userId) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    const row = deps.db
      .prepare("SELECT id, email FROM users WHERE id = ?")
      .get(userId) as { id: string; email: string } | undefined;
    if (!row) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    req.authUser = row;
  };
}

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { db: SqliteDB; jwtSecret: string; bearerPreHandler: ReturnType<typeof createBearerAuthPreHandler> },
) {
  const { db, jwtSecret, bearerPreHandler } = deps;

  app.post("/auth/register", async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_body" });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 12);
    try {
      db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
        id,
        email,
        passwordHash,
        createdAt,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE constraint")) {
        return reply.status(409).send({ error: "email_taken" });
      }
      throw e;
    }
    const token = await signUserToken(jwtSecret, id, jwtExpiresDays());
    return { token, user: { id, email } };
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_body" });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return reply.status(401).send({ error: "invalid_credentials" });
    }
    const token = await signUserToken(jwtSecret, row.id, jwtExpiresDays());
    return { token, user: { id: row.id, email: row.email } };
  });

  app.get("/auth/me", { preHandler: bearerPreHandler }, async (req) => {
    const u = req.authUser!;
    return { id: u.id, email: u.email };
  });
}
