# Multi-stage Dockerfile for NexusPanel Web SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./

RUN npm ci

COPY src ./src/

RUN npm run build

# Production static server stage with Nginx reverse proxy
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

CMD ["/docker-entrypoint.sh"]
