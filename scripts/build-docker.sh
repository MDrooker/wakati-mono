#!/bin/bash

# =================================================================
# DOCKER BUILD SCRIPT FOR ROCKWELL API
# Optimized multi-stage build with size optimization
# =================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="rockwell/api"
REGISTRY=${DOCKER_REGISTRY:-""}
DOCKERFILE="Dockerfile.optimized"
CONTEXT_DIR="./apps/api"

# Default values
TAG=${1:-"latest"}
PUSH=${2:-"false"}
PLATFORM=${3:-"linux/amd64,linux/arm64"}
BUILD_ARGS=""

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
    echo "Usage: $0 [TAG] [PUSH] [PLATFORM]"
    echo ""
    echo "Parameters:"
    echo "  TAG        Docker image tag (default: latest)"
    echo "  PUSH       Push to registry (true/false, default: false)"
    echo "  PLATFORM   Target platforms (default: linux/amd64,linux/arm64)"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY    Registry URL (e.g., docker.io/myorg)"
    echo "  NODE_ENV          Build environment (default: production)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Build with tag 'latest'"
    echo "  $0 v1.2.3                   # Build with tag 'v1.2.3'"
    echo "  $0 v1.2.3 true              # Build and push to registry"
    echo "  $0 latest false linux/amd64 # Build for single platform"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if buildx is available for multi-platform builds
    if [[ "$PLATFORM" == *","* ]]; then
        if ! docker buildx version &> /dev/null; then
            log_error "Docker buildx is required for multi-platform builds"
            exit 1
        fi
    fi
    
    # Check if Dockerfile exists
    if [[ ! -f "$CONTEXT_DIR/$DOCKERFILE" ]]; then
        log_error "Dockerfile not found: $CONTEXT_DIR/$DOCKERFILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

analyze_context_size() {
    log_info "Analyzing build context size..."
    
    # Calculate context size
    CONTEXT_SIZE=$(du -sh "$CONTEXT_DIR" | cut -f1)
    log_info "Build context size: $CONTEXT_SIZE"
    
    # Check for large files that might increase build time
    LARGE_FILES=$(find "$CONTEXT_DIR" -size +10M -type f 2>/dev/null | head -5)
    if [[ -n "$LARGE_FILES" ]]; then
        log_warning "Found large files in build context:"
        echo "$LARGE_FILES"
        log_warning "Consider adding them to .dockerignore if not needed"
    fi
}

prepare_build_args() {
    log_info "Preparing build arguments..."
    
    # Add environment-specific build args
    BUILD_ARGS="--build-arg NODE_ENV=${NODE_ENV:-production}"
    BUILD_ARGS="$BUILD_ARGS --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    BUILD_ARGS="$BUILD_ARGS --build-arg VERSION=$TAG"
    
    # Add git information if available
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_COMMIT=$(git rev-parse --short HEAD)
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        BUILD_ARGS="$BUILD_ARGS --build-arg GIT_COMMIT=$GIT_COMMIT"
        BUILD_ARGS="$BUILD_ARGS --build-arg GIT_BRANCH=$GIT_BRANCH"
        log_info "Git commit: $GIT_COMMIT"
        log_info "Git branch: $GIT_BRANCH"
    fi
}

build_image() {
    log_info "Building Docker image..."
    
    # Construct full image name
    FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
    if [[ -n "$REGISTRY" ]]; then
        FULL_IMAGE_NAME="$REGISTRY/$FULL_IMAGE_NAME"
    fi
    
    log_info "Image name: $FULL_IMAGE_NAME"
    log_info "Platform(s): $PLATFORM"
    
    # Build command
    if [[ "$PLATFORM" == *","* ]]; then
        # Multi-platform build using buildx
        BUILDER_NAME="rockwell-builder"
        
        # Create builder if it doesn't exist
        if ! docker buildx inspect "$BUILDER_NAME" &> /dev/null; then
            log_info "Creating buildx builder: $BUILDER_NAME"
            docker buildx create --name "$BUILDER_NAME" --use
        else
            docker buildx use "$BUILDER_NAME"
        fi
        
        # Build command for multi-platform
        BUILD_CMD="docker buildx build"
        BUILD_CMD="$BUILD_CMD --platform $PLATFORM"
        BUILD_CMD="$BUILD_CMD --file $DOCKERFILE"
        BUILD_CMD="$BUILD_CMD --tag $FULL_IMAGE_NAME"
        BUILD_CMD="$BUILD_CMD $BUILD_ARGS"
        BUILD_CMD="$BUILD_CMD --progress=plain"
        
        if [[ "$PUSH" == "true" ]]; then
            BUILD_CMD="$BUILD_CMD --push"
        else
            BUILD_CMD="$BUILD_CMD --load"
        fi
        
        BUILD_CMD="$BUILD_CMD $CONTEXT_DIR"
        
    else
        # Single platform build
        BUILD_CMD="docker build"
        BUILD_CMD="$BUILD_CMD --platform $PLATFORM"
        BUILD_CMD="$BUILD_CMD --file $CONTEXT_DIR/$DOCKERFILE"
        BUILD_CMD="$BUILD_CMD --tag $FULL_IMAGE_NAME"
        BUILD_CMD="$BUILD_CMD $BUILD_ARGS"
        BUILD_CMD="$BUILD_CMD --progress=plain"
        BUILD_CMD="$BUILD_CMD $CONTEXT_DIR"
    fi
    
    log_info "Build command: $BUILD_CMD"
    
    # Execute build
    if eval "$BUILD_CMD"; then
        log_success "Image built successfully: $FULL_IMAGE_NAME"
    else
        log_error "Build failed"
        exit 1
    fi
}

analyze_image_size() {
    log_info "Analyzing image size..."
    
    FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
    if [[ -n "$REGISTRY" ]]; then
        FULL_IMAGE_NAME="$REGISTRY/$FULL_IMAGE_NAME"
    fi
    
    # Only analyze if image exists locally (not for multi-platform pushed images)
    if docker image inspect "$FULL_IMAGE_NAME" &> /dev/null; then
        IMAGE_SIZE=$(docker image inspect "$FULL_IMAGE_NAME" --format='{{.Size}}' | numfmt --to=iec-i --suffix=B)
        log_info "Final image size: $IMAGE_SIZE"
        
        # Show layer information
        log_info "Image layers:"
        docker history --human --format "table {{.CreatedBy}}\t{{.Size}}" "$FULL_IMAGE_NAME" | head -10
    else
        log_info "Image analysis skipped (multi-platform build or pushed to registry)"
    fi
}

push_image() {
    if [[ "$PUSH" == "true" && "$PLATFORM" != *","* ]]; then
        log_info "Pushing image to registry..."
        
        FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
        if [[ -n "$REGISTRY" ]]; then
            FULL_IMAGE_NAME="$REGISTRY/$FULL_IMAGE_NAME"
        fi
        
        if docker push "$FULL_IMAGE_NAME"; then
            log_success "Image pushed successfully: $FULL_IMAGE_NAME"
        else
            log_error "Push failed"
            exit 1
        fi
    elif [[ "$PUSH" == "true" ]]; then
        log_info "Image was pushed during multi-platform build"
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove dangling images
    DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
    if [[ -n "$DANGLING_IMAGES" ]]; then
        log_info "Removing dangling images..."
        docker rmi $DANGLING_IMAGES || true
    fi
    
    # Prune build cache (keep recent builds)
    log_info "Pruning build cache..."
    docker builder prune --filter="until=24h" -f || true
}

print_summary() {
    log_success "=== BUILD SUMMARY ==="
    echo "Image: $IMAGE_NAME:$TAG"
    echo "Registry: ${REGISTRY:-"local"}"
    echo "Platform(s): $PLATFORM"
    echo "Pushed: $PUSH"
    echo "Build completed at: $(date)"
    log_success "====================="
}

# Main execution
main() {
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        print_usage
        exit 0
    fi
    
    log_info "Starting Docker build process..."
    log_info "Build configuration:"
    log_info "  Image: $IMAGE_NAME:$TAG"
    log_info "  Registry: ${REGISTRY:-"local"}"
    log_info "  Platform: $PLATFORM"
    log_info "  Push: $PUSH"
    
    check_prerequisites
    analyze_context_size
    prepare_build_args
    build_image
    analyze_image_size
    push_image
    cleanup
    print_summary
    
    log_success "Build process completed successfully!"
}

# Execute main function
main "$@"