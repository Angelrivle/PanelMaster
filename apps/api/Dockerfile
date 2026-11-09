# Production multi-stage Dockerfile for NexusPanel Core API
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl zip unzip tar gzip python3 make g++

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src/

RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl zip unzip tar gzip

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000 2022

CMD ["./docker-entrypoint.sh"]
