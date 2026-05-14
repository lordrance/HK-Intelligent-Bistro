# syntax=docker/dockerfile:1

# --- API image: Fastify + shared package (monorepo slice) ---
FROM node:22-alpine AS api

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @hk/shared build \
  && pnpm --filter @hk/server build

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV SERVER_PORT=8787

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.SERVER_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
