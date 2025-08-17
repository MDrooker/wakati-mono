# Wakati Infrastructure

Complete AWS infrastructure for the Wakati video processing platform using AWS CDK (Cloud Development Kit). This infrastructure supports multi-architecture Docker builds (Apple Silicon + AMD64) and provides a production-ready Fargate deployment with API Gateway integration.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   ECR           │    │   ECS Fargate   │
│   Actions       │───▶│   Repository    │───▶│   Cluster       │
│   (CI/CD)       │    │   (Multi-arch)  │    │   (Auto-scale)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │  Load Balancer  │
         │                       │              │  (Health Check) │
         │                       │              └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │  API Gateway    │
         │                       │              │  (External)     │
         │                       │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Apple Silicon │    │   CloudWatch    │
│   Local Build   │    │   Logs/Metrics  │
└─────────────────┘    └─────────────────┘
```

## 📁 Structure

```
infrastructure/
├── Rockwell-ECR/           # ECR repository for container images
│   ├── lib/
│   │   └── rockwell-ecr-stack.ts
│   ├── bin/
│   │   └── rockwell-ecr.ts
│   ├── package.json
│   ├── cdk.json
│   ├── .env.example
│   └── README.md
├── Rockwell-Fargate/       # ECS Fargate cluster and API Gateway
│   ├── lib/
│   │   └── rockwell-fargate-stack.ts
│   ├── bin/
│   │   └── rockwell-fargate.ts
│   ├── package.json
│   ├── cdk.json
│   ├── .env.example
│   └── README.md
├── Rockwell-S3/           # S3 storage (existing)
├── StormRadar-S3/         # StormRadar S3 (existing)
├── deploy.sh              # Complete infrastructure deployment
├── build-and-deploy.sh    # Docker build and container deployment
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Install required tools:**
   ```bash
   # Install Node.js and pnpm
   npm install -g pnpm
   
   # Install AWS CDK
   npm install -g aws-cdk
   
   # Configure AWS CLI
   aws configure
   ```

2. **Verify Docker and buildx:**
   ```bash
   docker --version
   docker buildx version
   ```

### Option 1: Complete Infrastructure Deployment

Deploy both ECR and Fargate stacks with one command:

```bash
cd infrastructure
./deploy.sh
```

This will:
- ✅ Check prerequisites
- 🏗️ Deploy ECR repository
- 🐳 Deploy Fargate cluster
- 📊 Show deployment outputs

### Option 2: Manual Step-by-Step

```bash
# 1. Deploy ECR repository
cd infrastructure/Rockwell-ECR
cp .env.example .env
# Edit .env with your AWS account details
pnpm install
pnpm run deploy

# 2. Set up application secrets
aws ssm put-parameter --name "/rockwell/database-url" --value "your-db-url" --type "SecureString"
aws ssm put-parameter --name "/rockwell/supabase-url" --value "your-supabase-url" --type "SecureString"
aws ssm put-parameter --name "/rockwell/supabase-anon-key" --value "your-key" --type "SecureString"
aws ssm put-parameter --name "/rockwell/jwt-secret" --value "your-secret" --type "SecureString"

# 3. Deploy Fargate cluster
cd ../Rockwell-Fargate
cp .env.example .env
# Edit .env with your AWS account details
pnpm install
pnpm run deploy
```

## 🐳 Container Deployment

### Build and Deploy Container

Use the ECR build script for multi-platform Docker builds:

```bash
cd infrastructure/Rockwell-ECR

# Deploy to development
./build-push.sh

# Deploy to production with specific tag
./build-push.sh -e prod -t v1.2.3

# Build only for Fargate (AMD64)
./build-push.sh -p linux/amd64
```

Or use the comprehensive deployment script:

```bash
cd infrastructure

# Deploy to development
./build-and-deploy.sh

# Deploy to production with specific tag
./build-and-deploy.sh -e prod -t v1.2.3

# Build only (skip ECS update)
./build-and-deploy.sh --skip-update
```

### Manual Docker Commands

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# Build multi-architecture image
cd apps/api
docker buildx build --platform linux/amd64,linux/arm64 -t YOUR_ECR_URI:latest --push .

# Update ECS service
aws ecs update-service --cluster rockwell-cluster-dev --service rockwell-api-dev --force-new-deployment
```

## 🌍 Multi-Environment Support

### Environment Configuration

| Environment | Stack Suffix | Container Count | Auto-Scale Max |
|-------------|--------------|----------------|----------------|
| **dev** | `-dev` | 1 | 3 |
| **staging** | `-staging` | 1 | 5 |
| **prod** | `-prod` | 2 | 10 |

### Deploy to Different Environments

```bash
# Development (default)
ENVIRONMENT=dev ./deploy.sh

# Staging
ENVIRONMENT=staging STACK_NAME=RockwellFargateStackStaging ./deploy.sh

# Production
ENVIRONMENT=prod STACK_NAME=RockwellFargateStackProd ./deploy.sh
```

## 🔧 Configuration

### Required AWS Permissions

Your AWS user/role needs these permissions:
- CloudFormation (full access)
- ECR (full access)
- ECS (full access)
- EC2 (VPC, Security Groups, Load Balancers)
- IAM (role creation)
- API Gateway (full access)
- CloudWatch Logs
- Systems Manager Parameter Store

### Environment Variables

Create `.env` files in each stack directory:

**Rockwell-ECR/.env:**
```bash
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=dev
STACK_NAME=RockwellEcrStack
```

**Rockwell-Fargate/.env:**
```bash
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=dev
STACK_NAME=RockwellFargateStack
ECR_STACK_NAME=RockwellEcrStack
```

### Application Secrets

Store sensitive configuration in AWS Systems Manager Parameter Store:

```bash
# Database connection
aws ssm put-parameter --name "/rockwell/database-url" --value "postgresql://..." --type "SecureString"

# Supabase configuration
aws ssm put-parameter --name "/rockwell/supabase-url" --value "https://..." --type "SecureString"
aws ssm put-parameter --name "/rockwell/supabase-anon-key" --value "ey..." --type "SecureString"

# JWT secret for authentication
aws ssm put-parameter --name "/rockwell/jwt-secret" --value "your-secret" --type "SecureString"
```

## 📊 Monitoring & Observability

### CloudWatch Dashboards

- **ECS Metrics**: CPU, Memory, Task count
- **ALB Metrics**: Request count, Response times, HTTP errors
- **API Gateway**: Request count, Latency, Error rates

### Logging

```bash
# View container logs
aws logs describe-log-streams --log-group-name /ecs/rockwell-api-dev

# Real-time log streaming
aws logs tail /ecs/rockwell-api-dev --follow
```

### Health Checks

- **Container**: `GET /health` every 30s
- **Load Balancer**: `GET /health` every 30s
- **API Gateway**: Integrated with ALB health

## 🔒 Security Features

- **Network Isolation**: Private subnets for containers
- **IAM Roles**: Least-privilege access for all resources
- **Secrets Management**: AWS Parameter Store with encryption
- **Security Groups**: Restrictive ingress/egress rules
- **VPC Endpoints**: Optional for enhanced security
- **HTTPS Ready**: Certificate Manager integration available

## 💰 Cost Optimization

### Development Environment
- Single NAT Gateway ($45/month)
- Fargate Spot instances (when available)
- Minimal auto-scaling (1-3 tasks)
- 1-week log retention

### Production Environment
- Multi-AZ NAT Gateways for high availability
- Reserved Fargate capacity (for predictable workloads)
- Extended log retention (30 days)
- Enhanced monitoring and alarms

### Cost Estimation

| Component | Dev/Month | Prod/Month |
|-----------|-----------|------------|
| **Fargate** | $25-50 | $100-300 |
| **ALB** | $18 | $18 |
| **NAT Gateway** | $45 | $90 |
| **API Gateway** | $3.50/million | $3.50/million |
| **ECR** | $0.10/GB | $0.10/GB |
| **CloudWatch** | $5-10 | $20-50 |

## 🛠️ Operational Commands

### Infrastructure Management

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name RockwellEcrStack
aws cloudformation describe-stacks --stack-name RockwellFargateStack

# View stack outputs
aws cloudformation describe-stacks --stack-name RockwellFargateStack --query 'Stacks[0].Outputs'

# Update stack
cd Rockwell-Fargate
pnpm run deploy

# Delete stacks (be careful!)
cd Rockwell-Fargate && pnpm run destroy
cd Rockwell-ECR && pnpm run destroy
```

### Container Management

```bash
# Force new deployment
aws ecs update-service --cluster rockwell-cluster-dev --service rockwell-api-dev --force-new-deployment

# Scale service
aws ecs update-service --cluster rockwell-cluster-dev --service rockwell-api-dev --desired-count 3

# Execute commands in container
aws ecs execute-command --cluster rockwell-cluster-dev --task TASK_ID --container rockwell-api --interactive --command "/bin/sh"

# View service status
aws ecs describe-services --cluster rockwell-cluster-dev --services rockwell-api-dev
```

### Troubleshooting

```bash
# Check ECS events
aws ecs describe-services --cluster rockwell-cluster-dev --services rockwell-api-dev --query 'services[0].events'

# View task definition
aws ecs describe-task-definition --task-definition rockwell-api-dev

# Check security group rules
aws ec2 describe-security-groups --group-names rockwell-service-sg-dev

# Test load balancer
curl -I http://rockwell-alb-dev-123456789.us-east-1.elb.amazonaws.com/health
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        run: |
          cd infrastructure
          ./build-and-deploy.sh -e prod -t ${{ github.sha }}
```

## 📚 Additional Resources

- [Rockwell-ECR README](./Rockwell-ECR/README.md) - ECR repository details
- [Rockwell-Fargate README](./Rockwell-Fargate/README.md) - Fargate cluster details
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/)

## 🆘 Support

For issues or questions:

1. Check the individual README files in each stack directory
2. Review CloudWatch logs for runtime issues
3. Check AWS CloudFormation events for deployment issues
4. Verify IAM permissions and AWS CLI configuration

---

**🎯 Ready to deploy?** Run `./deploy.sh` to get started!
