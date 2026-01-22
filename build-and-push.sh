#!/bin/bash

# Build and push script for wswsws Docker images
# Usage: ./build-and-push.sh [tag] [platform] [api_url]
# If no tag is provided, uses 'latest'
# If no platform is provided, uses 'linux/amd64'
# If no api_url is provided, uses 'https://api.wswsws.benjiao.net'

set -e  # Exit on error

REGISTRY="registry.benjiao.net"
TAG="${1:-latest}"
PLATFORM="${2:-linux/amd64}"
NEXT_PUBLIC_API_URL="${3:-https://api.wswsws.benjiao.net}"
API_IMAGE="${REGISTRY}/wswsws/api:${TAG}"
WEB_IMAGE="${REGISTRY}/wswsws/web:${TAG}"

echo "Building and pushing images with tag: ${TAG}"
echo "Platform: ${PLATFORM}"
echo "API URL: ${NEXT_PUBLIC_API_URL}"
echo "Registry: ${REGISTRY}"
echo ""

# Ensure buildx is available
if ! docker buildx version &> /dev/null; then
    echo "Docker Buildx not found. Using regular docker build..."
    USE_BUILDX=false
else
    USE_BUILDX=true
    # Create and use a builder instance if needed
    docker buildx create --use --name wswsws-builder 2>/dev/null || docker buildx use wswsws-builder
fi

# Build and push API image
echo "Building API image for ${PLATFORM}..."
if [ "$USE_BUILDX" = true ]; then
    docker buildx build \
      --platform ${PLATFORM} \
      --tag ${API_IMAGE} \
      --push \
      ./api/
else
    docker build \
      --platform ${PLATFORM} \
      -t ${API_IMAGE} \
      ./api/
    docker push ${API_IMAGE}
fi

echo ""

# Build and push Web image
echo "Building Web image for ${PLATFORM}..."
if [ "$USE_BUILDX" = true ]; then
    docker buildx build \
      --platform ${PLATFORM} \
      --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
      --tag ${WEB_IMAGE} \
      --push \
      ./web/
else
    docker build \
      --platform ${PLATFORM} \
      --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
      -t ${WEB_IMAGE} \
      ./web/
    docker push ${WEB_IMAGE}
fi

echo ""
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images:"
echo "  - ${API_IMAGE}"
echo "  - ${WEB_IMAGE}"
