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

# Log again after export to verify
echo "After export - DEPLOYMENT_ENV: ${DEPLOYMENT_ENV}"

# Verify the environment variable is in the environment
echo "Checking environment variables:"
env | grep -E "(DEPLOYMENT|NODE_ENV|API)" || echo "WARNING: Environment variables not found!"

# List all environment variables for debugging
echo "All environment variables containing 'DEPLOYMENT':"
env | grep -i deployment || echo "No DEPLOYMENT variables found"

# For standalone mode, the server.js is in the root after copying
# The Dockerfile copies .next/standalone to /app/, so server.js is at /app/server.js
# Pass environment variables explicitly to node - this ensures they're available
# Use exec to replace the shell process with node, preserving environment
exec env DEPLOYMENT_ENV="${DEPLOYMENT_ENV}" \
         NODE_ENV="${NODE_ENV:-production}" \
         API_URL="${API_URL}" \
         NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}" \
         node server.js
