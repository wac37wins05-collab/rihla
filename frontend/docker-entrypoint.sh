#!/bin/sh
# docker-entrypoint.sh
# Injects BACKEND_URL env var into nginx config at container startup.
# Default: https://stours-api.fly.dev (overridable via Fly.io env)

set -e

BACKEND_URL="${BACKEND_URL:-https://stours-api.fly.dev}"

echo "[entrypoint] BACKEND_URL = $BACKEND_URL"

# Replace $BACKEND_URL in the template and write to active nginx config
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx config written — starting nginx..."
exec nginx -g "daemon off;"
