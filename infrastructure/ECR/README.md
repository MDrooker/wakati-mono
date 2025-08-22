# Rockwell ECR Infrastructure

This CDK stack creates an Elastic Container Registry (ECR) repository for the Rockwell API project, supporting multi-architecture builds (ARM64 and AMD64) for Apple Silicon and AWS Fargate compatibility.

## Features

- 🐳 **Multi-Architecture Support**: Builds and stores both ARM64 and AMD64 images
- 🔄 **Lifecycle Management**: Automatic cleanup of old images with environment-specific retention
- 🔐 **IAM Integration**: Pre-configured role for Fargate tasks
- 🏷️ **Smart Tagging**: Environment-aware resource tagging
- 📊 **Security Scanning**: Automatic vulnerability scanning on image push
- 🛠️ **Build Script**: Automated multi-platform Docker build and push

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Apple Silicon  │    │   Build Script  │    │   AWS Fargate   │
│  Local Build    │───▶│   Multi-arch    │───▶│   Tasks         │
│                 │    │   Docker Build  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐               │
         └─────────────▶│   ECR Repository │◀──────────────┘
                        │   Multi-arch     │
                        │   Images         │
                        └─────────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ and pnpm
- AWS CDK v2 installed globally: `npm install -g aws-cdk`

## Quick Start

1. **Install dependencies:**
   ```bash
   cd infrastructure/Rockwell-ECR
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS account details
   ```

3. **Bootstrap CDK (first time only):**
   ```bash
   cdk bootstrap
   ```

4. **Deploy the stack:**
   ```bash
   pnpm run deploy
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_ACCOUNT_ID` | Your AWS account ID | Required |
| `AWS_REGION` | AWS region for deployment | `us-east-1` |
| `ENVIRONMENT` | Environment name (dev/staging/prod) | `dev` |
| `STACK_NAME` | CDK stack name | `RockwellEcrStack` |

### Image Lifecycle Policies

The repository automatically manages image lifecycle:

- **Production images** (`prod`, `release` tags): Keep last 10
- **Staging images** (`staging`, `stage` tags): Keep last 5  
- **Development images** (`dev`, `latest` tags): Keep last 3
- **Untagged images**: Delete after 1 day

## Usage

### Using the Build Script (Recommended)

The simplest way to build and push multi-architecture images:

```bash
# Build and push for development
./build-push.sh

# Build for production with specific tag
./build-push.sh -e prod -t v1.2.3

# Build only for Fargate (AMD64)
./build-push.sh -p linux/amd64

# Build only for Apple Silicon (ARM64)
./build-push.sh -p linux/arm64
```

### Manual Docker Commands

For advanced users who want full control:

```bash
# First, get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

# Build for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag your-account.dkr.ecr.us-east-1.amazonaws.com/rockwell-api-dev:latest \
  --push .
```

### Build Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --environment` | Environment (dev/staging/prod) | `dev` |
| `-r, --region` | AWS region | `us-east-1` |
| `-t, --tag` | Docker image tag | `latest` |
| `-p, --platform` | Build platform | `linux/amd64,linux/arm64` |
| `-f, --dockerfile` | Dockerfile to use | `Dockerfile` |
| `--ecr-stack` | ECR stack name | `RockwellEcrStack` |
| `--skip-verify` | Skip image verification | `false` |

### GitHub Actions Integration

When you're ready to set up CI/CD, you can create GitHub Actions workflows:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2

- name: Build and push
  run: |
    cd infrastructure/Rockwell-ECR
    ./build-push.sh -e prod -t ${{ github.sha }}
```

## Stack Outputs

After deployment, the stack provides these outputs:

- `RepositoryUri`: ECR repository URI for Docker pulls/pushes
- `RepositoryArn`: ECR repository ARN for cross-stack references
- `FargateTaskRoleArn`: IAM role ARN for Fargate tasks

## Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Deploy stack
pnpm run deploy

# View differences
pnpm run diff

# Destroy stack
pnpm run destroy

# Synthesize CloudFormation
pnpm run synth
```

## Security

- ECR repositories use encryption at rest
- Automatic vulnerability scanning on image push
- IAM roles follow least-privilege principles
- Build script supports secure credential handling

## Monitoring

- CloudWatch metrics for repository usage
- Cost tracking via resource tags
- Image scan results in ECR console

## Troubleshooting

### Common Issues

1. **Build platform mismatch**
   - Solution: Use `--platform linux/amd64,linux/arm64` for multi-arch builds

2. **ECR authentication**
   - Solution: Run `aws ecr get-login-password | docker login --username AWS --password-stdin <repository-uri>`

3. **GitHub Actions permissions**
   - Solution: Use AWS access keys or configure OIDC provider manually

4. **Build script fails**
   - Solution: Ensure you're running from `infrastructure/Rockwell-ECR/` directory
   - Check that Docker buildx is enabled and supports multi-platform builds

## Related Stacks

- [Rockwell-Fargate](../Rockwell-Fargate/README.md): ECS Fargate cluster for running containers
- [Rockwell-S3](../Rockwell-S3/README.md): S3 storage for video assets
