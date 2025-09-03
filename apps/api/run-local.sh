#!/bin/bash
# Script to run Rockwell API locally with .env file injection

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

IMAGE_NAME="rockwell-api"
IMAGE_TAG="latest"
CONTAINER_NAME="rockwell-api-local"

echo -e "${YELLOW}Starting Rockwell API locally with .env file...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in current directory${NC}"
    echo "Please make sure you're running this script from the directory containing your .env file"
    exit 1
fi

# Stop and remove existing container if running
if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
fi

# Check if image exists
if ! docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
    echo -e "${YELLOW}Image ${IMAGE_NAME}:${IMAGE_TAG} not found. Building...${NC}"
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
fi

echo -e "${YELLOW}Starting container with .env file...${NC}"

# Run container with .env file
docker run -d \
    --name ${CONTAINER_NAME} \
    --env-file .env \
    -p 8080:8080 \
    -e INNGEST_BASE_URL=http://host.docker.internal:8288 \
    -v "$(pwd)/uploads:/usr/src/app/uploads" \
    ${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    echo ""
    echo -e "${YELLOW}Container Info:${NC}"
    echo "  Name: ${CONTAINER_NAME}"
    echo "  Port: http://localhost:8080"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  View logs:    docker logs -f ${CONTAINER_NAME}"
    echo "  Stop:         docker stop ${CONTAINER_NAME}"
    echo "  Remove:       docker rm ${CONTAINER_NAME}"
    echo "  Shell access: docker exec -it ${CONTAINER_NAME} sh"
    echo ""
    echo -e "${YELLOW}Checking container health...${NC}"
    sleep 5
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo -e "${GREEN}✓ Container is running healthy${NC}"
        echo -e "${YELLOW}Streaming logs (Ctrl+C to stop):${NC}"
        docker logs -f ${CONTAINER_NAME}
    else
        echo -e "${RED}✗ Container failed to start. Showing logs:${NC}"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi