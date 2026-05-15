# HK Intelligent Bistro

**Intelligent Bistro** is a full-stack **demo** for a Hong Kong–style café / bistro ordering flow: users **register and sign in**, browse a catalog, use an **AI Concierge** (natural language) to add items, adjust the cart, and complete a **simulated checkout** (no real payment).  

The client is **Expo** (React Native + **Web**, **Expo Router**). The API is **Fastify** with **SQLite**. Shared contracts and pure cart logic live in **`@hk/shared`** (Zod schemas, `applyCartActions`, `formatCartActionSummary`, and more).

In-app copy and the seed **menu are English**. The Concierge system prompt instructs the model to reply in **English**.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Docker (API only)](#docker-api-only)
- [Environment variables](#environment-variables)
- [Testing and CI](#testing-and-ci)
- [HTTP API summary](#http-api-summary)
- [Mobile client: Web, emulators, and devices](#mobile-client-web-emulators-and-devices)
- [UI and theming](#ui-and-theming)
- [FAQ](#faq)
- [Roadmap (non-binding)](#roadmap-non-binding)
- [GitHub repository profile](#github-repository-profile)
  - [Short description](#short-description-github-description-field--max-350-characters-keep-under-limit)
  - [Longer blurb](#longer-blurb-readme-intro-about-sidebar-if-you-paste-extended-text-elsewhere)
  - [Detailed repository description](#detailed-repository-description-english-for-submissions-or-extended-about)
  - [Brief overview of code structure](#brief-overview-of-code-structure)
  - [AI tools used in development](#ai-tools-used-in-development)
  - [Suggested Topics](#suggested-topics)
  - [GitHub CLI (optional)](#github-cli-optional)
- [License and contributing](#license-and-contributing)
- [Optional: update `main` from a feature branch](#optional-update-main-from-a-feature-branch)

---

## Overview

This monorepo ships a cohesive **bistro** experience:

1. **Authentication** — Email and password; JWT access tokens; session restore via `GET /auth/me`. Web stores the token in `localStorage`; native uses `expo-secure-store`.
2. **Catalog** — Bearer-protected `GET /catalog`; categories, search, dish detail with required modifier groups (`apps/server/data/catalog.json`).
3. **Cart** — Client and server share **`applyCartActions`**; undo, clear, quantity changes. Concierge returns **`cart_actions`**; the server runs **`validateCartActions`** before applying anything destructive.
4. **Concierge** — `POST /assistant/intent` uses the **OpenAI-compatible SDK** against **DeepSeek** (override with `DEEPSEEK_BASE_URL`). Responses are structured JSON. If **`DEEPSEEK_API_KEY` is unset**, the API returns **HTTP 200** with a short configuration message, **empty `cart_actions`**, and **no 500** errors.
5. **Checkout** — Client-only **demo payment** (card fields validated for format on device; nothing sensitive is sent to the server).

---

## Features

| Area | Description |
|------|-------------|
| **Auth** | Register / login; JWT; `GET /auth/me` for hydration. |
| **Menu** | Authenticated catalog; dish modal with modifiers. |
| **Cart** | Lines, modifiers, undo stack, clear; totals from catalog prices. |
| **Concierge** | NL ordering; high-confidence add-only paths can auto-apply; destructive actions can require confirmation in the client. |
| **Checkout** | Simulated pay flow for demos and UX testing. |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Client** | Expo 54, React 19, React Native, **Expo Router**, **NativeWind v4** + Tailwind, Zustand |
| **API** | Fastify 5, **node:sqlite** / SQLite, **jose** (JWT), **bcryptjs**, Zod, OpenAI SDK (DeepSeek-compatible) |
| **Shared** | Zod schemas, `CartAction` discriminated union, `applyCartActions`, `formatCartActionSummary` |
| **Containers** | Multi-stage **Dockerfile**; **docker-compose** runs the **API** service only |
| **Tests** | Vitest (`@hk/shared`, `@hk/server`); `scripts/smoke-e2e.mjs` against a running API |

---

## Repository layout

```
.
├── apps/
│   ├── mobile/                 # Expo Router app
│   │   ├── app/                # Routes: login, register, (tabs), dish/[id], checkout, global.css
│   │   ├── src/
│   │   │   ├── components/     # UI primitives and screen chrome
│   │   │   ├── lib/            # api, authFetch, scrollStyles, responsive, pricing, …
│   │   │   ├── store/          # authStore, bistroStore
│   │   │   └── theme/tokens.ts # Design tokens (aligned with Tailwind)
│   │   ├── app.config.ts       # extra.apiBaseUrl ← EXPO_PUBLIC_API_BASE_URL
│   │   ├── metro.config.js     # NativeWind + monorepo node_modules resolution
│   │   └── tailwind.config.ts
│   └── server/
│       ├── src/                # build-app, auth-routes, assistant, catalog, db, …
│       ├── data/               # catalog.json; SQLite path (mounted in Docker)
│       └── package.json        # dev: tsx watch; build: tsup
├── packages/shared/            # Schemas and pure cart helpers
├── scripts/smoke-e2e.mjs       # Smoke: health, anonymous 401, register, Bearer catalog, assistant edge cases
├── docker-compose.yml          # API service, env, healthcheck
├── Dockerfile                  # Production image for @hk/shared + @hk/server
├── pnpm-workspace.yaml
└── package.json                # dev:server, dev:mobile, test, typecheck, smoke:e2e, test:journey
```

---

## Prerequisites

- **Node.js** 20+ (CI uses 22)
- **pnpm** 9.x (matches root `packageManager`)
- **Docker Desktop** (optional, for containerized API)
- A **DeepSeek** (or OpenAI Chat Completions–compatible) **API key** if you want live Concierge inference

---

## Local development

### 1. Install dependencies and build shared

```bash
pnpm install
pnpm --filter @hk/shared build
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit **`.env`**. **Never commit** real secrets (`.env` is gitignored). See [Environment variables](#environment-variables).

### 3. Run the API

```bash
pnpm dev:server
```

Default base URL: **`http://127.0.0.1:8787`**. Logs may also print a LAN URL for physical devices (`EXPO_PUBLIC_API_BASE_URL`).

### 4. Run the Expo client

```bash
pnpm dev:mobile
```

- **Web**: press `w` in the terminal, or:

  ```bash
  cd apps/mobile
  export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
  pnpm exec expo start --web
  ```

  On **PowerShell**:

  ```powershell
  $env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8787"
  pnpm exec expo start --web
  ```

- **Android emulator**: if `EXPO_PUBLIC_API_BASE_URL` is unset, the app defaults to **`http://10.0.2.2:8787`** (host loopback).
- **Physical device**: set `EXPO_PUBLIC_API_BASE_URL` to **`http://<your-lan-ip>:8787`** and allow the port through the host firewall.

---

## Docker (API only)

The mobile app is usually run with **Expo** on the host. **Only the Fastify API** is built into the image and started with Compose.

1. Place **`.env`** next to **`docker-compose.yml`** (repository root). You **must** set **`JWT_SECRET`** (at least **16** characters). Set **`DEEPSEEK_API_KEY`** when you need live Concierge calls.
2. Build and start in the background:

   ```bash
   docker compose up --build -d
   ```

3. Health: **`GET http://localhost:8787/health`** → `{"ok":true}`.
4. Change the published host port, e.g. **`API_PORT=9888 docker compose up -d`** (container still listens on **8787** internally).

**Data**: `./apps/server/data` is mounted so **SQLite** and **`catalog.json`** persist across restarts.

**After code changes**: run **`docker compose up --build -d`** so the image picks up new server code.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| **`JWT_SECRET`** | **Yes** (API boot) | At least **16** characters; signs and verifies JWTs. Missing value crashes the process (local and Docker). |
| **`DEEPSEEK_API_KEY`** | No (Concierge) | If empty, `POST /assistant/intent` returns **200** with guidance text and **empty `cart_actions`**. |
| `DEEPSEEK_BASE_URL` | No | Default `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | No | Default `deepseek-chat` |
| `SERVER_PORT` | No | Listen port inside the process; default `8787` |
| `API_PORT` | No | **Compose only**: host port mapping; default `8787` |
| `JWT_EXPIRES_DAYS` | No | JWT lifetime; server clamps to a safe range |
| `DATABASE_PATH` | No | SQLite file path (see server `db` module) |

---

## Testing and CI

```bash
pnpm test              # @hk/shared + @hk/server (Vitest)
pnpm test:journey      # API journey only: register → login → catalog → stub assistant → applyCartActions (no live LLM)
pnpm typecheck         # Builds shared, then tsc --noEmit on server + mobile
pnpm smoke:e2e         # Requires a running API; default http://127.0.0.1:8787 (override with SMOKE_API_BASE)
```

Notable tests:

- **`apps/server/src/user-journey.test.ts`** — Full HTTP flow with `buildApp({ assistantE2eStub: true })`; **no** external model.
- **`apps/server/src/build-app.http.test.ts`** — Includes regression: assistant returns **200** when **`DEEPSEEK_API_KEY`** is unset.
- **`scripts/smoke-e2e.mjs`** — Asserts register response includes **`token`** and **`user`**.

GitHub Actions (`.github/workflows/ci.yml`) runs install, shared build, tests, and typecheck on pushes to **`main`**, **`cursor/**`**, and related PRs.

---

## HTTP API summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness |
| `POST` | `/auth/register` | No | Returns `{ token, user }` |
| `POST` | `/auth/login` | No | Returns `{ token, user }` |
| `GET` | `/auth/me` | Bearer | Current user |
| `GET` | `/catalog` | Bearer | Catalog JSON (Zod-validated) |
| `POST` | `/assistant/intent` | Bearer | Body: `userText`, `messages`, `cart`, `catalogVersion`; stale `catalogVersion` returns a refresh hint without cart changes |

---

## Mobile client: Web, emulators, and devices

| Scenario | Suggested API base URL |
|----------|-------------------------|
| **Expo Web (same machine)** | `http://127.0.0.1:8787` or `http://localhost:8787` |
| **Android emulator** | Default `http://10.0.2.2:8787` if `EXPO_PUBLIC_API_BASE_URL` is unset |
| **iOS simulator** | Often `http://127.0.0.1:8787` |
| **Physical phone** | `http://<host-lan-ip>:8787` |

**pnpm + NativeWind on Web**: `apps/mobile` lists **`react-native-css-interop`** so Metro can resolve **`jsx-runtime`** when `babel-preset-expo` uses NativeWind as JSX import source. If Metro reports **`EBUSY`** on Windows, pause aggressive antivirus scanning on the repo, or set **`CHOKIDAR_USEPOLLING=1`** before `expo start`.

**Expo dependency warnings**: If the CLI suggests aligning `expo-image` / `expo-linear-gradient` with the SDK, from `apps/mobile` run:

```bash
pnpm exec expo install expo-image expo-linear-gradient
```

---

## UI and theming

- **NativeWind v4** + Tailwind; palette and radii align with **`apps/mobile/src/theme/tokens.ts`** and **`tailwind.config.ts`**.
- **Cart**: primary checkout control uses the short label **Checkout**, inset with **`shell.pagePadding`**, and caps at about **420px** width centered on large Web viewports.
- **Concierge**: message list uses horizontal padding; bubble max width on Web derives from **`innerWidth`** and gutters to reduce edge hugging and stray horizontal scrollbars.

---

## FAQ

**Q: Docker keeps restarting with `JWT_SECRET is required`?**  
**A:** Set **`JWT_SECRET`** (≥16 chars) in the root **`.env`**, then **`docker compose up -d`** (use **`--force-recreate`** if needed).

**Q: Concierge says the API key is not configured?**  
**A:** Add **`DEEPSEEK_API_KEY`** to **`.env`** and restart the API. Without a key, the server is designed to return **200** with guidance, not **500**.

**Q: Web shows a blank page but the tab title is “Intelligent Bistro”?**  
**A:** Usually a **failed Web bundle**; check the Metro terminal for **`react-native-css-interop`** resolution errors. Run **`pnpm install`** and confirm **`react-native-css-interop`** is present in **`apps/mobile/package.json`**.

**Q: `pnpm smoke:e2e` fails?**  
**A:** Ensure the API is listening (`pnpm dev:server` or Docker) and **`JWT_SECRET`** is set.

---

## Roadmap (non-binding)

Voice input, order history, real PSP integration, Playwright / Detox E2E, static Expo Web export, single-image full-stack deployment, and more.

---

## GitHub repository profile

Use the following on the GitHub repository **About** section (**Description**, **Website**, **Topics**). The **detailed description** and **code structure** blocks are suitable for a submission README, employer-facing profile, or an extended “About” / pinned discussion.

### Short description (GitHub “Description” field — max ~350 characters; keep under limit)

> Expo + Fastify monorepo: JWT auth, SQLite catalog, DeepSeek NL concierge with server-side cart validation, shared Zod contracts, Dockerized API, Vitest and smoke tests.

### Longer blurb (README intro, “About” sidebar if you paste extended text elsewhere)

> **HK Intelligent Bistro** is a demonstration monorepo for a Hong Kong–style café ordering experience. It combines an **Expo** client (React Native and Web) with a **Fastify** API and **SQLite**, **JWT** authentication, a **DeepSeek**-backed natural-language concierge, and a shared **Zod**-typed package for cart operations. The API can run under **Docker Compose**; tests use **Vitest** plus an optional **HTTP smoke** script.

### Detailed repository description (English, for submissions or extended About)

**HK Intelligent Bistro** delivers a polished mobile-first (and Web) restaurant ordering demo. Users authenticate with email and password, browse a seeded catalog with modifiers, manage a cart from both the **menu UI** and a **natural-language Concierge**, and complete a **simulated checkout**. The Concierge calls a hosted **large language model (DeepSeek)** via an OpenAI-compatible API; the server never trusts raw model output blindly—it **parses strict JSON**, validates **`cart_actions`** against the live catalog and cart, and returns safe, typed payloads that the client applies with the same pure functions used by the UI.

### Brief overview of code structure

| Area | Role |
|------|------|
| **`apps/mobile`** | **Expo Router** app: screens under `app/` (login, register, tabs for menu / cart / concierge, dish modal, checkout); **Zustand** stores (`src/store/authStore.ts`, `src/store/bistroStore.ts`); **NativeWind** + Tailwind styling (`tailwind.config.ts`, `app/global.css`); **`apiFetch`** attaches JWT; concierge flow merges assistant JSON into the cart via **`applyCartActions`** from shared. |
| **`apps/server`** | **Fastify** app (`src/build-app.ts`): **JWT** auth routes (`auth-routes.ts`, `auth-jwt.ts`), **`GET /catalog`**, **`POST /assistant/intent`** (`assistant.ts`—system prompt, DeepSeek call, **Zod** parse, **`validateCartActions`**), SQLite persistence (`db.ts`), static `data/catalog.json`. |
| **`packages/shared`** | **Single source of truth** for API contracts: **Zod** schemas for catalog, cart, assistant request/response, and **`CartAction`** variants; pure **`applyCartActions`** and **`formatCartActionSummary`** so server and client stay aligned. |
| **Root** | **pnpm** workspace, **`docker-compose.yml`** for API-only container, **`scripts/smoke-e2e.mjs`** against a running API, **`pnpm test:journey`** for a stubbed end-to-end HTTP journey without calling the live LLM. |

Data flow (concierge): **Mobile** → `POST /assistant/intent` (cart + `catalogVersion` + history) → **Server** validates version → **DeepSeek** returns JSON → **Zod** + **`validateCartActions`** → response → **Client** `applyCartActions` / pending confirmation → **Cart UI** updates.

### AI tools used in development

Most implementation, refactors, tests, Docker wiring, and this documentation were built **AI-assisted inside Cursor** (agent-style edits, multi-file refactors, and terminal-integrated checks). **DeepSeek** is used **at application runtime** as the ordering model behind `POST /assistant/intent`, which is separate from the IDE tooling. For a **Loom** or employer submission, you can say: *“Code structure: monorepo with Expo client, Fastify API, and shared Zod package; development accelerated with Cursor AI editing and review.”*

### Suggested Topics

`expo`, `react-native`, `react-native-web`, `fastify`, `sqlite`, `typescript`, `monorepo`, `pnpm`, `zod`, `deepseek`, `jwt`, `nativewind`, `expo-router`

### GitHub CLI (optional)

With [GitHub CLI](https://cli.github.com/) authenticated:

```bash
gh repo edit OWNER/REPO --description "Expo + Fastify monorepo: JWT, SQLite, DeepSeek NL concierge, Zod shared cart, Docker API, Vitest. AI-assisted development in Cursor; see README for code structure."
```

Replace **`OWNER/REPO`** with your path (for example **`lordrance/HK-Intelligent-Bistro`**).

---

## License and contributing

The root **`package.json`** marks this package as **private**. If you open-source it later, add **LICENSE** and **CONTRIBUTING.md**.

Issues and suggestions are welcome via **GitHub Issues**. Before opening a pull request, run **`pnpm test`** and **`pnpm typecheck`**.

---

## Optional: update `main` from a feature branch

If you develop on a branch such as **`cursor/...`** and want **`main`** to point at the same commit (network to `github.com` required on your machine):

```bash
git checkout your-feature-branch
git pull origin your-feature-branch --rebase
git push origin HEAD:main
```

If **`main`** does not exist on the remote yet, the last command creates it.

If an automated environment cannot reach **`github.com:443`**, run the same commands from your local terminal.
