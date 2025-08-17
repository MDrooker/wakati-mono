# Local Docker Development Guide

This guide explains how to run the Rockwell API locally with your `.env` file properly injected.

## The Problem (Fixed)

The `.env` file wasn't being injected because:
1. **`.dockerignore` excluded `.env` files** - preventing them from being copied into the Docker image
2. **Docker run commands didn't use `--env-file`** - environment variables weren't passed to the container
3. **Quoted environment variables** - some values had quotes causing parsing errors

## Solutions Provided

### Option 1: Using the `run-local.sh` Script (Recommended)

```bash
# Make sure you're in the apps/api directory
./run-local.sh
```

**What it does:**
- ✅ Validates `.env` file exists
- ✅ Uses `--env-file .env` to inject all environment variables
- ✅ Mounts upload volumes for local development
- ✅ Provides helpful container management commands
- ✅ Shows logs automatically

### Option 2: Using Docker Compose

```bash
# Start with docker-compose
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop
docker-compose -f docker-compose.local.yml down
```

### Option 3: Manual Docker Run

```bash
# Build the image
docker build -t rockwell-api .

# Run with .env file
docker run -d \\
  --name rockwell-api-local \\
  --env-file .env \\
  -p 8080:8080 \\
  -v "$(pwd)/uploads:/usr/src/app/uploads" \\
  rockwell-api
```

## Environment File Fixes Applied

### Fixed Redis URL Quotes
```bash
# ❌ Before (caused parsing errors)
REDIS_URL="redis://user:pass@host:port"

# ✅ After (works correctly)
REDIS_URL=redis://user:pass@host:port
```

### Environment File Template
- Created `.env.example` with all required variables
- Documents what each variable is for
- Safe to commit to version control

## Access Points

Once running, the API is available at:
- **Main API**: http://localhost:8080
- **GraphQL Playground**: http://localhost:8080/graphql
- **Health Check**: http://localhost:8080/health (if configured)

## Container Management

```bash
# View logs
docker logs -f rockwell-api-local

# Access container shell
docker exec -it rockwell-api-local sh

# Stop container
docker stop rockwell-api-local

# Remove container
docker rm rockwell-api-local

# View environment variables inside container
docker exec rockwell-api-local env | grep -E "(DATABASE|SUPABASE|REDIS)"
```

## Troubleshooting

### Container Won't Start
1. **Check logs**: `docker logs rockwell-api-local`
2. **Verify .env file**: Ensure no quoted values where not expected
3. **Database connection**: Make sure DATABASE_URL is accessible

### Environment Variables Not Working
1. **Verify .env format**: No spaces around `=`, no quotes unless needed
2. **Check file location**: `.env` must be in the same directory as docker run command
3. **Restart container**: Changes to `.env` require container restart

### Build Issues
1. **Clean build**: `docker build --no-cache -t rockwell-api .`
2. **Check Dockerfile**: Make sure you're using the correct one
3. **Free up space**: `docker system prune -f`

## File Structure

```
apps/api/
├── .env                     # Your environment variables
├── .env.example            # Template with all variables
├── run-local.sh            # Easy run script
├── docker-compose.local.yml # Docker compose for local dev
├── Dockerfile              # Standard Docker image
├── Dockerfile.slim         # Optimized image (878MB)
└── Dockerfile.ultra-slim   # Minimal image (721MB)
```

## Security Notes

- ✅ `.env` files are excluded from Docker images (via `.dockerignore`)
- ✅ Environment variables are only injected at runtime
- ✅ Container runs as non-root user (`nestjs`)
- ✅ Secrets are not baked into the image