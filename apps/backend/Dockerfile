# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.18.0

# ─── Base image with pnpm ──────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# ─── Dependencies ──────────────────────────────────────────────────────────
# Monorepo context: every workspace manifest is copied so the frozen/lockfile
# install can resolve, but only this app's graph is installed.
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/prisma ./apps/backend/prisma
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile=false --prod=false --filter @atlas/backend...

# ─── Build ─────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
WORKDIR /app/apps/backend
RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod

# ─── Runtime ───────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat tini
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Build identity surfaced by GET /api/v1/version. Empty by default so a local
# `docker build` without these args still produces a working image.
ARG GIT_SHA=""
ARG BUILD_TIME=""
ENV GIT_SHA=$GIT_SHA
ENV BUILD_TIME=$BUILD_TIME

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/package.json ./package.json

# Run migrations before booting the server. Idempotent on subsequent boots.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health > /dev/null || exit 1
