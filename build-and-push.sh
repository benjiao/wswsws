#!/bin/bash

# Build and push script for wswsws Docker images
# Usage: ./build-and-push.sh [tag] [platform]
# If no tag is provided, uses 'latest'
# If no platform is provided, uses 'linux/amd64'

set -e  # Exit on error

REGISTRY="registry.benjiao.net"
TAG="${1:-latest}"
PLATFORM="${2:-linux/amd64}"
API_IMAGE="${REGISTRY}/wswsws/api:${TAG}"
WEB_IMAGE="${REGISTRY}/wswsws/web:${TAG}"

# Default API URL for build (can be overridden with environment variable)
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"

echo "Building and pushing images with tag: ${TAG}"
echo "Platform: ${PLATFORM}"
echo "Registry: ${REGISTRY}"
echo ""

# Build and push API image
echo "Building API image for ${PLATFORM}..."
docker build \
  --platform ${PLATFORM} \
  -t ${API_IMAGE} \
  ./api/

echo "Pushing API image to registry..."
docker push ${API_IMAGE}

echo ""

# Build and push Web image
echo "Building Web image for ${PLATFORM}..."
docker build \
  --platform ${PLATFORM} \
  --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
  -t ${WEB_IMAGE} \
  ./web/

echo "Pushing Web image to registry..."
docker push ${WEB_IMAGE}

echo ""
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images:"
echo "  - ${API_IMAGE}"
echo "  - ${WEB_IMAGE}"
