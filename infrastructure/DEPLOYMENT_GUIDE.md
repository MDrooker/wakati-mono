# Wakati Infrastructure Deployment Guide

This guide walks you through deploying the Wakati infrastructure, including uploading environment variables to Parameter Store and deploying the CDK stacks.

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker installed** for building container images
3. **Node.js and pnpm** for CDK deployment
4. **API .env file created** with your actual values

## Quick Start

```bash
# 1. Clone and setup
cd infrastructure

# 2. Upload environment variables
./upload-env-to-ssm.sh -e dev

# 3. Deploy ECR stack
cd Wakati-ECR && cdk deploy

# 4. Build and push Docker image
./build-push.sh

# 5. Deploy Fargate stack
cd ../Wakati-Fargate && cdk deploy
```

## Detailed Steps

### Step 1: Prepare Environment Variables

Create your API environment file:
```bash
# Copy example and edit with real values
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

### Step 2: Upload to Parameter Store

Upload development environment:
```bash
cd infrastructure
./upload-env-to-ssm.sh -e dev
```

For production:
```bash
# Create production env file
cp ../apps/api/.env ../apps/api/.env.prod
# Edit with production values
nano ../apps/api/.env.prod

# Upload production parameters
./upload-env-to-ssm.sh -f ../apps/api/.env.prod -e prod -o
```

Verify upload:
```bash
./manage-ssm-params.sh list -e dev
```

### Step 3: Deploy ECR Stack

```bash
cd Wakati-ECR
npm install
cdk bootstrap  # Only needed once per account/region
cdk deploy
```

This creates:
- ECR repository for container images
- IAM roles for Fargate tasks
- Lifecycle policies for image cleanup

### Step 4: Build and Push Container

```bash
# Still in Wakati-ECR directory
./build-push.sh
```

This script:
- Builds multi-platform Docker image (ARM64/AMD64)
- Authenticates with ECR
- Pushes image with `latest` tag

For custom tags:
```bash
./build-push.sh -t v1.0.0
```

### Step 5: Deploy Fargate Stack

```bash
cd ../Wakati-Fargate
npm install
cdk deploy
```

This creates:
- VPC with public/private subnets
- ECS Fargate cluster and service
- Application Load Balancer
- API Gateway with proxy integration
- Auto-scaling configuration
- Security groups and IAM roles

### Step 6: Verify Deployment

Check stack outputs:
```bash
cdk ls
aws cloudformation describe-stacks --stack-name RockwellFargateStack
```

Test API Gateway endpoint:
```bash
# Get API Gateway URL from stack outputs
GATEWAY_URL=$(aws cloudformation describe-stacks \
  --stack-name RockwellFargateStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# Test health endpoint
curl "$GATEWAY_URL/health"
```

## Environment-Specific Deployments

### Development Environment
```bash
# Upload dev parameters
./upload-env-to-ssm.sh -e dev

# Deploy dev infrastructure
cd Rockwell-Fargate && cdk deploy RockwellFargateStack
```

### Production Environment
```bash
# Upload prod parameters
./upload-env-to-ssm.sh -f ../apps/api/.env.prod -e prod -o

# Deploy prod infrastructure with different stack name
cd Rockwell-Fargate && cdk deploy RockwellFargateStackProd --context environment=prod
```

## Troubleshooting

### Parameter Store Issues
```bash
# Check if parameters exist
./manage-ssm-params.sh list-names -e dev

# Get specific parameter value
./manage-ssm-params.sh get database_url -e dev

# Re-upload parameters
./upload-env-to-ssm.sh -e dev -o
```

### CDK Deployment Issues
```bash
# Check CDK version
cdk --version

# Validate template
cdk synth

# Check AWS credentials
aws sts get-caller-identity

# Force re-deploy
cdk deploy --force
```

### Container Issues
```bash
# Check ECR repository
aws ecr describe-repositories --repository-names rockwell-api

# List images
aws ecr list-images --repository-name rockwell-api

# Re-build and push
cd Rockwell-ECR && ./build-push.sh --force
```

### ECS Service Issues
```bash
# Check service status
aws ecs describe-services \
  --cluster rockwell-cluster-dev \
  --services rockwell-api-dev

# Check task logs
aws logs describe-log-groups --log-group-name-prefix /ecs/rockwell-api

# View recent logs
aws logs tail /ecs/rockwell-api-dev --follow
```

## API Gateway Proxy Configuration

The stack creates an API Gateway with proxy integration to the ALB:

- **Root path** (`/`) → Load Balancer root
- **Proxy path** (`/{proxy+}`) → Load Balancer `/{proxy}`
- **CORS enabled** for all origins
- **Binary media types** supported

### Testing Proxy Integration

```bash
# Direct ALB access
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name RockwellFargateStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
  --output text)

curl "http://$ALB_DNS/health"

# Via API Gateway
curl "$GATEWAY_URL/health"
```

## Security Considerations

1. **Parameter Store**: Sensitive values are encrypted as SecureString
2. **IAM Roles**: Least privilege access for ECS tasks
3. **Security Groups**: Restricted ingress/egress rules
4. **Private Subnets**: Container tasks run in private subnets
5. **API Gateway**: CORS configured for your domain

## Cost Optimization

- **Single NAT Gateway**: Reduces costs in non-production
- **Auto Scaling**: Scales down to 1 task minimum
- **Log Retention**: 1 week retention for CloudWatch logs
- **ECR Lifecycle**: Automatic cleanup of old images

## Monitoring and Logs

### CloudWatch Logs
```bash
# View ECS logs
aws logs tail /ecs/rockwell-api-dev --follow

# View specific log stream
aws logs get-log-events \
  --log-group-name /ecs/rockwell-api-dev \
  --log-stream-name ecs/rockwell-api/TASK-ID
```

### Container Insights
- Enabled on ECS cluster
- Provides CPU, memory, network metrics
- Available in CloudWatch console

### Health Checks
- **ECS Health Check**: `curl -f http://localhost:3000/health`
- **ALB Health Check**: `/health` endpoint
- **API Gateway**: Proxies health checks

## Updates and Maintenance

### Update Application Code
```bash
# 1. Build new image
cd Rockwell-ECR && ./build-push.sh -t v1.1.0

# 2. Update service to use new image
aws ecs update-service \
  --cluster rockwell-cluster-dev \
  --service rockwell-api-dev \
  --force-new-deployment
```

### Update Environment Variables
```bash
# 1. Update .env file
nano ../apps/api/.env

# 2. Upload updated parameters
./upload-env-to-ssm.sh -e dev -o

# 3. Restart service to pick up changes
aws ecs update-service \
  --cluster rockwell-cluster-dev \
  --service rockwell-api-dev \
  --force-new-deployment
```

### Update Infrastructure
```bash
# 1. Update CDK code
nano Rockwell-Fargate/lib/rockwell-fargate-stack.ts

# 2. Deploy changes
cd Rockwell-Fargate && cdk deploy
```

## Cleanup

### Remove Infrastructure
```bash
# Delete Fargate stack
cd Rockwell-Fargate && cdk destroy

# Delete ECR stack (this will delete the repository and images)
cd ../Rockwell-ECR && cdk destroy
```

### Remove Parameter Store Values
```bash
# Delete all parameters for environment
./manage-ssm-params.sh delete-all -e dev
```

This guide provides a complete workflow for deploying and managing the Rockwell infrastructure with proper parameter management and monitoring.
