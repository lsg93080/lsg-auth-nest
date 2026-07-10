# =============================================================================
# Auth Service — Multi-stage Dockerfile
# =============================================================================
# Stage 1 (builder): instala deps, compila TypeScript con NestJS
# Stage 2 (runtime): imagen mínima con solo el código compilado
# =============================================================================

FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copiar manifests primero para aprovechar caché de capas de Docker.
# Si package.json no cambia, npm ci no se re-ejecuta en rebuilds.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Eliminar devDependencies — el runtime solo necesita deps de producción
RUN npm prune --production

# -----------------------------------------------------------------------------

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /usr/src/app/dist        ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

RUN chown -R appuser:appgroup /usr/src/app
USER appuser

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
