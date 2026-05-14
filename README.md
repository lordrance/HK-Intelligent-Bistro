# HK Intelligent Bistro

Monorepo: **Expo (React Native + Web)** client, **Node (Fastify)** API, and shared **Zod** contracts in `@hk/shared`.

## Prerequisites

- Node 20+
- pnpm 9+

## Setup

1. Copy env template and set your **DeepSeek** key locally (never commit real secrets):

```bash
cp .env.example .env
```

2. Install and build shared types:

```bash
pnpm install
pnpm --filter @hk/shared build
```

3. Start the API (default `http://0.0.0.0:8787`):

```bash
pnpm dev:server
```

4. Start the app (separate terminal). For a physical device, point `EXPO_PUBLIC_API_BASE_URL` to your machine’s LAN IP:

```bash
pnpm dev:mobile
```

## Product notes

- **AI**: `POST /assistant/intent` calls DeepSeek (OpenAI-compatible `baseURL`) with `json_object`, then **server-side validation** applies guardrails.
- **Cart**: Client and server share `applyCartActions` from `packages/shared`.
- **UI language**: All user-facing copy in the app and seed catalog is **English**. The concierge prompt asks the model to reply in English.
- **UI stack**: React Native primitives + `StyleSheet` + `expo-linear-gradient` for a polished dark “bistro” look (Tamagui was deferred due to TS friction in the RC we tried).

## Tests & CI

```bash
pnpm test
pnpm typecheck   # builds @hk/shared, then runs tsc for server + mobile
```

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `cursor/**` branches: install, shared build, unit tests, and TypeScript checks.

## Catalog

The API reads `apps/server/data/catalog.json` on each request (no stale in-memory cache after edits).

## Web layout

With `expo start --web`, shell content is centered up to **960px**; the menu uses **two columns** on wide viewports. The dish sheet modal caps at **560px** width.

## Concierge pending panel

Pending actions show **human-readable dish names and modifier labels** via `formatCartActionSummary` in `@hk/shared` (`packages/shared/src/cart/format-action-summary.ts`).

## Docker (API only)

The **Expo client** stays local (`pnpm dev:mobile` / Expo Go) for the best dev experience. The **Fastify API** is containerized.

Prerequisites: [Docker Engine](https://docs.docker.com/engine/install/) and Docker Compose v2.

1. Ensure `.env` exists (see `.env.example`) with at least `DEEPSEEK_API_KEY`. Compose reads variables from a `.env` file in the same directory as `docker-compose.yml` for interpolation.

2. Build and run:

```bash
docker compose up --build
```

3. API: `http://localhost:8787` (override host port with `API_PORT=9888 docker compose up`).

4. Point the mobile app at the API, e.g. `EXPO_PUBLIC_API_BASE_URL=http://localhost:8787` (or your LAN IP from a device).

`Dockerfile` builds `@hk/shared` and `@hk/server` inside the image. `docker-compose.yml` defines the `api` service with a health check on `/health`.

## Roadmap

Voice input, order history, stricter checkout, E2E tests, optional static web image for Expo export.
