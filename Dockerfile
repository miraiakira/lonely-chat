# syntax=docker/dockerfile:1

# 1. Base stage for installing dependencies
FROM node:20-alpine AS base
WORKDIR /app

# 2. Install dependencies
FROM base AS deps
COPY package.json package-lock.json* turbo.json ./
COPY packages/backend/package.json ./packages/backend/


RUN npm install --frozen-lockfile

# 3. Build the application
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx turbo run build --filter=backend

# 4. Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/package.json ./packages/backend/

CMD ["node", "packages/backend/dist/main"]