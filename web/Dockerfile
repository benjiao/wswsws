# ---- deps ----
  FROM node:18-alpine AS deps
  WORKDIR /app
  COPY package.json yarn.lock ./
  RUN yarn install --frozen-lockfile --network-timeout 300000
  
  # ---- builder ----
  FROM node:18-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  ARG NEXT_PUBLIC_API_URL
  ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}
  
  RUN yarn build
  
  # ---- runner ----
  FROM node:18-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  
  # (optional) if your start.sh does extra stuff; otherwise you can run server.js directly
  COPY scripts/start.sh /app/scripts/start.sh
  RUN chmod +x /app/scripts/start.sh
  
  # Copy only the minimal standalone server output + static assets
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  COPY --from=builder /app/public ./public
  
  EXPOSE 3000
  CMD ["/app/scripts/start.sh"]