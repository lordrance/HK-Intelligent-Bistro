# Agents

## Cursor Cloud specific instructions

### Services overview

| Service | How to run | Port |
|---------|-----------|------|
| Fastify API (`@hk/server`) | `DOTENV_CONFIG_PATH=/workspace/.env pnpm dev:server` | 8787 |
| Expo Web (`@hk/mobile`) | `cd apps/mobile && EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787 npx expo start --web --port 8081` | 8081 |

### Key gotchas

- **dotenv and pnpm workspaces**: `pnpm --filter @hk/server dev` sets CWD to `apps/server/`, so `dotenv/config` cannot find the root `.env`. Prefix the dev:server command with `DOTENV_CONFIG_PATH=/workspace/.env` or export it in your shell before running.
- **`@hk/shared` must be built first**: Before running the server, mobile client, or typecheck, run `pnpm --filter @hk/shared build`. The shared package produces `dist/` output consumed by both server and mobile.
- **`JWT_SECRET` is required**: The server crashes without it. Must be >= 16 characters. Set it in `.env` (copy from `.env.example`).
- **`DEEPSEEK_API_KEY` is optional**: Without it, `POST /assistant/intent` returns HTTP 200 with guidance text and empty `cart_actions`; no 500 error.
- **Node.js 22+ required**: The server uses `node:sqlite` (experimental built-in). CI uses Node 22.
- **Expo web cart page may crash Chrome in headless/VM environments**: The menu, dish detail, and add-to-cart flows work; the cart tab navigation can trigger a renderer crash (Error code 4) in limited Chrome setups. This does not affect API testing or native mobile.

### Standard commands (see README and `package.json` for full details)

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Build shared | `pnpm --filter @hk/shared build` |
| Unit tests | `pnpm test` |
| Typecheck | `pnpm typecheck` |
| Smoke E2E (needs running server) | `pnpm smoke:e2e` |
| User journey test | `pnpm test:journey` |
