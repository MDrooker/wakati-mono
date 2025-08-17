#!/bin/bash

# =================================================================
# DOCKER IMAGE SIZE ANALYSIS SCRIPT
# Analyzes and optimizes Docker image layers for size reduction
# =================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
IMAGE_NAME=${1:-"rockwell/api:latest"}

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_usage() {
    echo "Usage: $0 [IMAGE_NAME]"
    echo ""
    echo "Analyzes Docker image size and provides optimization recommendations"
    echo ""
    echo "Example:"
    echo "  $0 rockwell/api:latest"
}

check_image_exists() {
    if ! docker image inspect "$IMAGE_NAME" &> /dev/null; then
        log_error "Image '$IMAGE_NAME' not found locally"
        exit 1
    fi
}

analyze_image_size() {
    log_info "Analyzing image: $IMAGE_NAME"
    echo ""
    
    # Basic image information
    log_info "=== IMAGE INFORMATION ==="
    IMAGE_SIZE=$(docker image inspect "$IMAGE_NAME" --format='{{.Size}}' | numfmt --to=iec-i --suffix=B)
    CREATED=$(docker image inspect "$IMAGE_NAME" --format='{{.Created}}' | head -c 19)
    ARCH=$(docker image inspect "$IMAGE_NAME" --format='{{.Architecture}}')
    OS=$(docker image inspect "$IMAGE_NAME" --format='{{.Os}}')
    
    echo "Size: $IMAGE_SIZE"
    echo "Created: $CREATED"
    echo "Architecture: $ARCH"
    echo "OS: $OS"
    echo ""
    
    # Layer analysis
    log_info "=== LAYER ANALYSIS ==="
    echo "Largest layers (top 10):"
    docker history --human --format "table {{.Size}}\t{{.CreatedBy}}" "$IMAGE_NAME" | \
        head -11 | \
        tail -10 | \
        sort -hr
    echo ""
    
    # Detailed layer breakdown
    log_info "=== DETAILED LAYER BREAKDOWN ==="
    docker history --human --no-trunc "$IMAGE_NAME"
    echo ""
}

analyze_image_content() {
    log_info "=== IMAGE CONTENT ANALYSIS ==="
    
    # Create temporary container to analyze contents
    TEMP_CONTAINER=$(docker create "$IMAGE_NAME")
    
    # Analyze largest directories
    log_info "Largest directories in the image:"
    docker exec "$TEMP_CONTAINER" sh -c '
        find / -type d -exec du -sh {} + 2>/dev/null | 
        sort -hr | 
        head -20
    ' 2>/dev/null || log_warning "Could not analyze directory sizes"
    
    # Analyze node_modules if present
    log_info "Node.js modules analysis:"
    docker exec "$TEMP_CONTAINER" sh -c '
        if [ -d "/app/node_modules" ]; then
            echo "node_modules size:"
            du -sh /app/node_modules
            echo ""
            echo "Largest packages:"
            du -sh /app/node_modules/* 2>/dev/null | sort -hr | head -10
        else
            echo "No node_modules directory found"
        fi
    ' 2>/dev/null || log_warning "Could not analyze node_modules"
    
    # Clean up
    docker rm "$TEMP_CONTAINER" > /dev/null
    echo ""
}

generate_recommendations() {
    log_info "=== OPTIMIZATION RECOMMENDATIONS ==="
    
    # Get image layers info
    LAYER_COUNT=$(docker history "$IMAGE_NAME" --quiet | wc -l)
    HAS_DEV_DEPS=$(docker run --rm "$IMAGE_NAME" sh -c 'ls /app/node_modules 2>/dev/null | grep -E "(test|spec|@types)" | wc -l' 2>/dev/null || echo "0")
    
    echo "Based on the analysis, here are optimization recommendations:"
    echo ""
    
    echo "1. LAYER OPTIMIZATION:"
    if [[ $LAYER_COUNT -gt 20 ]]; then
        log_warning "   • High layer count ($LAYER_COUNT). Consider combining RUN commands"
    else
        log_success "   • Layer count looks good ($LAYER_COUNT)"
    fi
    
    echo ""
    echo "2. DEPENDENCY OPTIMIZATION:"
    if [[ $HAS_DEV_DEPS -gt 0 ]]; then
        log_warning "   • Found potential dev dependencies. Use multi-stage builds to exclude them"
    else
        log_success "   • No obvious dev dependencies found"
    fi
    
    echo ""
    echo "3. GENERAL RECOMMENDATIONS:"
    echo "   • Use .dockerignore to exclude unnecessary files"
    echo "   • Remove package manager cache: npm cache clean --force"
    echo "   • Remove development dependencies in production builds"
    echo "   • Use alpine-based images for smaller base size"
    echo "   • Remove source maps and .d.ts files in production"
    echo "   • Clean up temporary files and build artifacts"
    echo ""
    
    echo "4. ADVANCED OPTIMIZATIONS:"
    echo "   • Use multi-stage builds to separate build and runtime"
    echo "   • Use BuildKit for better caching and optimization"
    echo "   • Consider using distroless images for smaller attack surface"
    echo "   • Use Docker image compression tools like dive or docker-slim"
    echo ""
}

compare_with_base_images() {
    log_info "=== BASE IMAGE COMPARISON ==="
    
    BASE_IMAGES=("node:20-alpine" "node:20-slim" "node:20")
    
    echo "Comparing with common Node.js base images:"
    for base in "${BASE_IMAGES[@]}"; do
        if docker image inspect "$base" &> /dev/null; then
            SIZE=$(docker image inspect "$base" --format='{{.Size}}' | numfmt --to=iec-i --suffix=B)
            echo "  $base: $SIZE"
        else
            echo "  $base: not available locally"
        fi
    done
    echo ""
}

suggest_dockerfile_improvements() {
    log_info "=== DOCKERFILE IMPROVEMENT SUGGESTIONS ==="
    
    echo "Consider these Dockerfile optimizations:"
    echo ""
    
    echo "1. Multi-stage build structure:"
    cat << 'EOF'
   FROM node:20-alpine AS base
   # ... base setup
   
   FROM base AS deps
   # Install dependencies only
   
   FROM base AS builder
   # Build application
   
   FROM base AS runtime
   # Runtime image with minimal dependencies
EOF
    
    echo ""
    echo "2. Optimize RUN commands:"
    cat << 'EOF'
   # BAD: Multiple layers
   RUN apk add --no-cache curl
   RUN apk add --no-cache git
   RUN rm -rf /var/cache/apk/*
   
   # GOOD: Single layer
   RUN apk add --no-cache curl git && \
       rm -rf /var/cache/apk/*
EOF
    
    echo ""
    echo "3. Clean up in the same layer:"
    cat << 'EOF'
   RUN npm install && \
       npm cache clean --force && \
       rm -rf /tmp/* /var/tmp/*
EOF
    
    echo ""
}

main() {
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        print_usage
        exit 0
    fi
    
    if [[ -z "$IMAGE_NAME" ]]; then
        log_error "Please provide an image name"
        print_usage
        exit 1
    fi
    
    log_info "Starting Docker image size analysis..."
    
    check_image_exists
    analyze_image_size
    analyze_image_content
    compare_with_base_images
    generate_recommendations
    suggest_dockerfile_improvements
    
    log_success "Analysis completed!"
}

main "$@"