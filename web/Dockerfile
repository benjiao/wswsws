FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set build-time API URL
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the app
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
