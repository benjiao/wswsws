FROM node:18-alpine

WORKDIR /app

# Configure yarn for better network reliability
# RUN yarn config set network-timeout 300000 -g && \
#     yarn config set network-concurrency 1 -g

# Copy package files
COPY package.json yarn.lock ./
RUN yarn cache clean \
  && yarn install --frozen-lockfile --network-timeout 300000

# Copy source code
COPY . .

# Set build-time API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}

# Build the app
RUN yarn build

# Expose port
EXPOSE 3000

# Runtime environment variables (can be overridden at container startup)
# Set DEPLOYMENT_ENV=development for dev server, DEPLOYMENT_ENV=production for prod
# If not set, defaults to production
# Note: This default can be overridden by environment variables set in docker-compose or Portainer
ENV DEPLOYMENT_ENV=production
ENV API_URL=/api

# Start the application
CMD ["yarn", "start"]
