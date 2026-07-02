# syntax=docker/dockerfile:1
# Imagen multi-stage: target `runner` = app web (Next standalone),
# target `worker` = proceso BullMQ. Ambos desde el mismo árbol de build.

# ─────────────────────────── Base ───────────────────────────
# Node 22 (LTS): pnpm 11 requiere builtins recientes (node:sqlite). Debian
# bookworm mantiene el target del motor Prisma (debian-openssl-3.0.x).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
# openssl/ca-certificates: requeridos por el motor de Prisma y TLS saliente.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ──────────────────── Dependencias (todas) ────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ──────────── Build: cliente Prisma + Next standalone ────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN BUILD_STANDALONE=1 pnpm build

# ──────────────── Runner: app web (standalone) ────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# El cliente Prisma y su motor los incluye el trazado de Next (output standalone)
# desde el store virtual de pnpm; no se copian por separado.
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# ─────────────── Worker: colas BullMQ (tsx) ───────────────
FROM base AS worker
ENV NODE_ENV=production
# node_modules completos (incl. tsx y cliente Prisma generado) + fuente TS.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/worker ./worker
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json /app/tsconfig.json /app/pnpm-workspace.yaml ./
USER node
CMD ["node_modules/.bin/tsx", "worker/index.ts"]
