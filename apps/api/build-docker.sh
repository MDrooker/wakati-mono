#!/bin/bash
# Build and test script for Rockwell API Docker image with conversion support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

IMAGE_NAME="rockwell-api"
IMAGE_TAG="latest"
CONTAINER_NAME="rockwell-api-test"

echo -e "${YELLOW}Building Rockwell API Docker image with conversion support...${NC}"

# Build the Docker image
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi

# Test the image by running health checks
echo -e "${YELLOW}Step 2: Testing conversion tools...${NC}"

# Start a temporary container
docker run -d --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}

# Wait for container to start
sleep 10

# Run health check
echo -e "${YELLOW}Running health check...${NC}"
if docker exec ${CONTAINER_NAME} ./docker-health-check.sh; then
    echo -e "${GREEN}✓ All conversion tools are working correctly${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    docker logs ${CONTAINER_NAME}
    docker rm -f ${CONTAINER_NAME}
    exit 1
fi

# Test individual tools
echo -e "${YELLOW}Step 3: Testing individual tools...${NC}"

# Test FFmpeg
echo -n "Testing FFmpeg... "
if docker exec ${CONTAINER_NAME} ffmpeg -version >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test ImageMagick
echo -n "Testing ImageMagick... "
if docker exec ${CONTAINER_NAME} magick -version >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test HEIC support
echo -n "Testing HEIC support... "
if docker exec ${CONTAINER_NAME} magick identify -list format | grep -i heic >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Limited${NC}"
fi

# Clean up test container
echo -e "${YELLOW}Step 4: Cleaning up...${NC}"
docker rm -f ${CONTAINER_NAME}

echo -e "${GREEN}✓ Docker image is ready for deployment!${NC}"
echo ""
echo -e "${YELLOW}To run the container:${NC}"
echo "docker run -p 8080:8080 ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo -e "${YELLOW}To run with conversion configuration:${NC}"
echo "docker-compose -f docker-compose.conversion.yml up"
echo ""
echo -e "${YELLOW}To push to registry:${NC}"
echo "docker tag ${IMAGE_NAME}:${IMAGE_TAG} your-registry/${IMAGE_NAME}:${IMAGE_TAG}"
echo "docker push your-registry/${IMAGE_NAME}:${IMAGE_TAG}"
