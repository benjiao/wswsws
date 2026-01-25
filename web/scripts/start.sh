#!/bin/sh

# Log environment variables before starting Next.js
echo "═══════════════════════════════════════════════════════"
echo "🚀 WSWSWS - Starting Next.js Server"
echo "═══════════════════════════════════════════════════════"
echo "DEPLOYMENT_ENV: ${DEPLOYMENT_ENV:-NOT SET}"
echo "NODE_ENV: ${NODE_ENV:-NOT SET}"
echo "API_URL: ${API_URL:-NOT SET}"
echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-NOT SET}"
echo "═══════════════════════════════════════════════════════"

# Export environment variables explicitly to ensure they're available
export DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"
export NODE_ENV="${NODE_ENV:-production}"
export API_URL="${API_URL}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}"

# Start Next.js - environment variables will be inherited
exec node_modules/.bin/next start
