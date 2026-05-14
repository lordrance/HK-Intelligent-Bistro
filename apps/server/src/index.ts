import "dotenv/config";
import { buildApp } from "./build-app.js";

const app = await buildApp({ logger: true });
const port = Number(process.env.SERVER_PORT ?? "8787");
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`server listening on ${port}`);
