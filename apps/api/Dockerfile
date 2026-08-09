# Doloyal API — production container image
# Build: docker build -t doloyal-api -f apps/api/Dockerfile .
# Run:   docker run -p 4000:4000 --env-file .env doloyal-api

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/landing/package.json apps/landing/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm --filter @doloyal/api... run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]