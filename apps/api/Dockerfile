# Multi-stage Docker build for Rockwell API - Optimized for size
# Includes FFmpeg for video conversion and ImageMagick for HEIC image conversion

# Build stage
FROM node:20-alpine AS build
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install system dependencies for build (combined in single layer)
RUN apk update && apk add --no-cache \
    # Core build dependencies
    build-base \
    python3 \
    make \
    g++ && \
    # Install Node.js dependencies in same layer
    npm install --global pnpm @nestjs/cli && \
    # Install dependencies
    pnpm install --frozen-lockfile

# Copy source code after dependencies are installed
COPY . .

# Build the application and clean up build artifacts
RUN pnpm build && \
    # Remove source maps and other build artifacts
    find dist -name "*.map" -delete && \
    # Remove dev dependencies
    rm -rf node_modules && \
    # Install production dependencies only
    pnpm install --prod --frozen-lockfile && \
    # Clean up pnpm cache
    pnpm store prune && \
    # Remove unnecessary files from node_modules
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.txt" -delete && \
    find node_modules -name "LICENSE*" -delete && \
    find node_modules -name "CHANGELOG*" -delete && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "*.d.ts" -delete && \
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true

# Production stage - minimal runtime image
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install only essential runtime dependencies (combined in single layer)
RUN apk update && apk add --no-cache \
    # Essential process management
    dumb-init \
    # Image processing runtime libraries (minimal)
    # Clean up package cache in same layer
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Set up application directory permissions
RUN mkdir -p /usr/src/app && \
    chown -R nestjs:nodejs /usr/src/app

# Copy only essential files from build stage
COPY --chown=nestjs:nodejs --from=build /usr/src/app/package.json ./
COPY --chown=nestjs:nodejs --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=build /usr/src/app/dist ./dist


# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]