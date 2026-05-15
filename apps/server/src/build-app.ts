import Fastify from "fastify";
import cors from "@fastify/cors";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CatalogSchema } from "@hk/shared";
import { handleAssistantIntent } from "./assistant.js";
import { defaultDatabasePath, openDb, type SqliteDB } from "./db.js";
import { createBearerAuthPreHandler, registerAuthRoutes } from "./auth-routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type BuildAppOptions = {
  /** When true, use Fastify's default request logger (noisy in tests). */
  logger?: boolean;
  /** In-memory or injected DB for tests */
  database?: SqliteDB;
  /** Short secret allowed in tests only */
  jwtSecret?: string;
  /** When true, POST /assistant/intent skips the LLM and returns deterministic cart actions (Vitest / CI only). */
  assistantE2eStub?: boolean;
};

export async function buildApp(opts: BuildAppOptions = {}) {
  const jwtSecret = opts.jwtSecret ?? process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }
  if (!opts.jwtSecret && jwtSecret.length < 16) {
    throw new Error("JWT_SECRET must be at least 16 characters (set JWT_SECRET in .env)");
  }

  const db = opts.database ?? openDb(defaultDatabasePath());
  const bearerPreHandler = createBearerAuthPreHandler({ jwtSecret, db });
  const assistantE2eStub = opts.assistantE2eStub === true;

  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });

  registerAuthRoutes(app, { db, jwtSecret, bearerPreHandler });

  app.get("/health", async () => ({ ok: true }));

  app.get("/catalog", { preHandler: bearerPreHandler }, async () => {
    const raw = await readFile(join(__dirname, "../data/catalog.json"), "utf8");
    return CatalogSchema.parse(JSON.parse(raw));
  });

  app.post("/assistant/intent", { preHandler: bearerPreHandler }, async (req, reply) => {
    try {
      const result = await handleAssistantIntent(req.body, { e2eStub: assistantE2eStub });
      return result;
    } catch (e) {
      req.log.error(e);
      return reply.status(500).send({ error: "assistant_failed" });
    }
  });

  app.addHook("onClose", async () => {
    if (!opts.database) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
  });

  return app;
}
