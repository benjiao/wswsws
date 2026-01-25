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

# Copy and make startup script executable (before build so it's included)
COPY scripts/start.sh /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh

# Set build-time API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}

# Build the app
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application using the script
CMD ["/app/scripts/start.sh"]
