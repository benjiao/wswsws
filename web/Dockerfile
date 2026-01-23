FROM node:18-alpine

WORKDIR /app

# Configure yarn for better network reliability
# RUN yarn config set network-timeout 300000 -g && \
#     yarn config set network-concurrency 1 -g

# Copy package files
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

# Copy source code
COPY . .

# Set build-time API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}

# Build the app
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
