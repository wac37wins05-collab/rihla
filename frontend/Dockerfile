# ─────────────────────────────────────────────────────────
# Stage 1: Build the React/Vite app
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build arg — baked into the Vite bundle (used when frontend calls API directly)
ARG VITE_API_URL=https://stours-api.fly.dev
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copy source and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────
# Stage 2: Serve with Nginx + runtime BACKEND_URL injection
# ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Install envsubst (part of gettext)
RUN apk add --no-cache gettext

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template (BACKEND_URL substituted at startup via entrypoint)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy and register entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
