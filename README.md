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

## Tests

```bash
pnpm test
```

- **Catalog**: The API reads `apps/server/data/catalog.json` on each request (no stale in-memory cache after edits).

## Roadmap

Voice input, order history, stricter checkout, E2E tests, Docker Compose.
