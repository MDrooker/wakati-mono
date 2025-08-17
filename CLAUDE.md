# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Development:**
```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps and packages
pnpm lint         # Run linting across all workspaces
pnpm check-types  # Type check all TypeScript code
pnpm format       # Format code with Prettier
```

**Docker Development Environment:**
```bash
# Start core infrastructure services
docker-compose -f docker-compose.dev.yml up -d postgres redis inngest

# Start all services including monitoring
docker-compose -f docker-compose.dev.yml up -d

# Start with specific profiles
docker-compose -f docker-compose.dev.yml --profile supabase up -d  # Include Supabase local
docker-compose -f docker-compose.dev.yml --profile proxy up -d     # Include Nginx proxy

# View logs
docker-compose -f docker-compose.dev.yml logs -f [service_name]

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

**API (NestJS) specific commands:**
```bash
cd apps/api
pnpm dev                    # Start API in watch mode
pnpm start:debug           # Start with debug mode
pnpm build                 # Build the API
pnpm lint                  # Lint API code
pnpm types                 # Generate TypeScript types
pnpm code                  # Run GraphQL code generation
pnpm bundle                # Bundle GraphQL files
```

**Web (Next.js) specific commands:**
```bash
cd apps/web
pnpm dev          # Start web app on port 3000
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint with Next.js ESLint (max-warnings 0)
pnpm check-types  # TypeScript type checking
```

**Testing:**
API uses Jest with configuration in package.json. Test files should match `*.spec.ts` pattern.

## Architecture Overview

**Monorepo Structure:**
- **Turborepo** manages the workspace with pnpm for package management
- **apps/api**: NestJS GraphQL API with TypeORM, Supabase auth, OpenTelemetry monitoring
- **apps/web**: Next.js frontend application with Turbopack
- **packages/**: Shared packages for UI components, styling, and configuration

**API Architecture (NestJS):**
- **GraphQL API** using GraphQL Yoga driver with constraint directives
- **Database**: PostgreSQL with TypeORM for entity management
- **Authentication**: Supabase integration with JWT strategies and guards
- **Observability**: OpenTelemetry with Jaeger tracing and Prometheus metrics
- **Background Jobs**: Inngest integration for event-driven workflows
- **Caching**: Redis-based caching with cache-manager

**Key API Modules:**
- `common/`: Shared services (auth, database, config, utilities)
- `modules/template/`: Hunt system with waypoints and CRUD operations
- `modules/collection/`: Collection management with asset relationships
- `modules/operation/`: Operation handling
- `modules/user/`: User management with Supabase authentication integration
- `modules/asset/`: File upload, content moderation, and tagging system

**Shared Packages:**
- `@repo/ui`: Shadcn/ui components with Radix UI primitives
- `@repo/tailwindcss`: Shared TailwindCSS v4 configuration
- `@repo/eslint-config`: ESLint configurations for different app types
- `@repo/typescript-config`: Shared TypeScript configurations

**Database & ORM:**
- TypeORM entities extend `BaseEntity` from `common/database/entities/base.entity.ts`
- Database module in `common/database/database.module.ts`
- Uses PostgreSQL with connection configuration via environment variables

**GraphQL Schema:**
- Schema files use `.graphql` extension in module directories
- GraphQL Yoga with SSE subscriptions support (currently commented out)
- Custom scalars: JSON, Date, and constraint directives
- Code generation via `@graphql-codegen/cli`

**Environment Requirements:**
- Node.js 18+
- pnpm package manager
- PostgreSQL database
- Redis for caching
- Inngest for background job processing

## Module Details

### User Module (`modules/user/`)
**Purpose**: User management with Supabase authentication integration
**Key Features**:
- User entity with profile fields (email, firstName, lastName, displayName, avatarUrl, bio, etc.)
- Supabase integration via `supabaseUserId` field (no password management)
- User verification system (`isVerified` flag)
- One-to-many relationships with collections and assets
- Full CRUD operations with proper authorization
- GraphQL and REST API endpoints

**Important Files**:
- `entities/user.entity.ts`: User entity with profile fields and relationships
- `user.service.ts`: Business logic for user operations
- `user.controller.ts`: REST endpoints with JWT authentication
- `user.resolver.ts`: GraphQL resolvers
- `user.graphql`: GraphQL schema definitions

### Asset Module (`modules/asset/`)
**Purpose**: File upload system with automated content moderation and tagging
**Key Features**:
- Support for images (JPEG, PNG, GIF, WebP) and videos (MP4, MPEG, QuickTime, WebM)
- Automated content moderation via Inngest workflows
- Tag system for categorizing assets
- CDN integration support
- Collection relationships (many-to-many)
- User ownership and privacy controls

**Asset Types & Content Moderation**:
- Asset types: `IMAGE`, `VIDEO` (enum)
- Moderation statuses: `PENDING`, `PROCESSING`, `APPROVED`, `REJECTED`
- Inngest workflow triggers AI content validation on upload
- Recommended AI services: Google Cloud Vision API, AWS Rekognition

**File Upload Workflow**:
1. File uploaded via `POST /assets/upload` (multipart/form-data)
2. Asset created with `PENDING` status
3. Inngest triggers content moderation workflow
4. AI service validates content (NSFW detection)
5. Asset status updated to `APPROVED` or `REJECTED`
6. User notified if content is rejected

**Important Files**:
- `entities/asset.entity.ts`: Asset entity with file metadata and moderation fields
- `entities/tag.entity.ts`: Tag entity for asset categorization
- `asset.service.ts`: Business logic for asset and tag management
- `asset.controller.ts`: File upload and asset management endpoints
- `functions/content-moderation.function.ts`: Inngest functions for AI moderation
- `asset.graphql`: GraphQL schema with computed fields (fileUrl, isModerated, etc.)

**File Storage**:
- Local storage in `uploads/assets/` directory
- Multer configuration with 100MB limit and file type validation
- Support for CDN URLs (`cdnUrl`, `thumbnailCdnUrl` fields)
- Automatic thumbnail generation for videos (placeholder implementation)

### Collection Module (`modules/collection/`)
**Purpose**: User-created collections that can contain assets
**Key Features**:
- User-owned collections with privacy controls (`isPublic`)
- Many-to-many relationship with assets via `collection_assets` join table
- Collection management with proper authorization
- Public/private collection filtering

**Updated Relationships**:
- Collections can now contain assets (not just packages)
- Users have one-to-many with both collections and assets
- Assets can belong to multiple collections

## Development Patterns

**Entity Relationships**:
- All entities extend `BaseEntity` (id, isActive, createdAt, updatedAt)
- Uses nanoid for generating unique URNs (e.g., `nesting:rockwell.user:abc123`)
- PostgreSQL schema: `rockwell`

**Authentication Flow**:
- Supabase handles authentication
- JWT tokens validated via `JwtAuthGuard`
- User ID extracted from JWT for authorization
- No password storage in local database

**Content Moderation Workflow**:
- Uses Inngest for reliable background processing
- Configurable AI service integration
- Stores moderation results in JSONB field
- Supports retry logic and failure handling

**File Management**:
- S3 signed URL workflow for direct client uploads
- CloudFront CDN for optimized asset delivery
- SNS webhook notifications for upload completion
- File type validation and size limits
- CDN integration with automatic URL generation

## AWS Infrastructure (CDK)

**Infrastructure Directory**: `infrastructure/`
**Purpose**: AWS CDK project for deploying S3, CloudFront, and SNS resources

**Key Components**:
- **S3 Bucket**: Asset storage with CORS configuration and lifecycle rules
- **CloudFront Distribution**: Global CDN with Origin Access Control (OAC)
- **SNS Topic**: Upload notifications that trigger webhook endpoints
- **IAM Policies**: Secure access between services

**Deployment Commands**:
```bash
cd infrastructure
npm install
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
cdk deploy --context environment=dev
```

**Required Environment Variables** (from CDK outputs):
```bash
AWS_S3_BUCKET_NAME=rockwell-assets-dev-123456789012
AWS_CLOUDFRONT_DOMAIN=d1234567890123.cloudfront.net
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## S3 Upload Workflow

**Client Upload Process**:
1. `POST /assets/generate-upload-url` - Request signed URL with asset metadata
2. Client uploads file directly to S3 using signed URL (bypasses API server)
3. S3 triggers SNS notification on successful upload
4. SNS calls `POST /assets/webhook/s3-upload` webhook
5. API updates asset record and triggers Inngest content moderation
6. Content moderation runs via AI service (Google Vision/AWS Rekognition)
7. Asset status updated to APPROVED/REJECTED

**Key Benefits**:
- Direct S3 uploads (no server bandwidth usage)
- Automatic CDN distribution via CloudFront
- Reliable webhook notifications via SNS
- Scalable architecture for large file uploads

**Asset Entity S3 Fields**:
- `s3Key`: Object key in S3 bucket
- `s3Bucket`: Bucket name
- `s3Region`: AWS region
- `isUploaded`: Upload completion status
- `uploadedAt`: Timestamp of successful upload
- `cdnUrl`: CloudFront distribution URL

**Content Moderation Integration**:
- Inngest workflow triggered after S3 upload completion
- Configurable AI service (Google Cloud Vision API recommended)
- Moderation results stored in `moderationResults` JSONB field
- User notifications for rejected content via Inngest

**Security Features**:
- S3 bucket blocks all public access
- CloudFront OAC prevents direct bucket access
- Signed URLs with expiration (1 hour default)
- CORS configuration for web uploads
- File type validation before signed URL generation