import Fastify from "fastify";
import cors from "@fastify/cors";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CatalogSchema } from "@hk/shared";
import { handleAssistantIntent } from "./assistant.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type BuildAppOptions = {
  /** When true, use Fastify's default request logger (noisy in tests). */
  logger?: boolean;
};

export async function buildApp(opts: BuildAppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.get("/catalog", async () => {
    const raw = await readFile(join(__dirname, "../data/catalog.json"), "utf8");
    return CatalogSchema.parse(JSON.parse(raw));
  });

  app.post("/assistant/intent", async (req, reply) => {
    try {
      const result = await handleAssistantIntent(req.body);
      return result;
    } catch (e) {
      req.log.error(e);
      return reply.status(500).send({ error: "assistant_failed" });
    }
  });

  return app;
}
