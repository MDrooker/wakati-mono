# Rockwell Fargate Infrastructure

This CDK stack creates a complete ECS Fargate cluster with Application Load Balancer and API Gateway for the Rockwell API project. It provides auto-scaling, health checks, HTTPS/SSL support, and secure networking for production-ready deployments.

## Features

- 🚀 **ECS Fargate Cluster**: Serverless container orchestration
- ⚖️ **Application Load Balancer**: High availability with health checks
- 🔐 **HTTPS/SSL Support**: Automatic certificate management with Route53
- 🌐 **API Gateway**: External access with CORS and VPC Link integration
- 📊 **Auto Scaling**: CPU and memory-based scaling policies
- 🔒 **Security Groups**: Properly configured network security
- 📝 **CloudWatch Logs**: Centralized logging with retention policies
- 🔍 **Service Discovery**: Internal service communication
- 💾 **Parameter Store**: Secure configuration management
- 🏷️ **Resource Tagging**: Environment-aware resource organization

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  Load Balancer  │    │  ECS Fargate    │
│   (External)    │───▶│   (Public)      │───▶│   (Private)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VPC Link      │    │  Target Group   │    │  Container      │
│                 │    │                 │    │  (Rockwell API) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       ▼
                                │              ┌─────────────────┐
                                │              │  CloudWatch     │
                                │              │  Logs           │
                                │              └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Auto Scaling   │
                       │  Policies       │
                       └─────────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ and pnpm
- AWS CDK v2 installed globally: `npm install -g aws-cdk`
- **ECR Stack deployed first**: This stack depends on the Rockwell-ECR stack

## Quick Start

1. **Deploy ECR stack first:**
   ```bash
   cd ../Rockwell-ECR
   pnpm install
   pnpm run deploy
   ```

2. **Install dependencies:**
   ```bash
   cd ../Rockwell-Fargate
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS account details
   ```

4. **Set up application secrets:**
   ```bash
   # Create parameters in AWS Systems Manager Parameter Store
   aws ssm put-parameter --name "/rockwell/database-url" --value "your-database-url" --type "SecureString"
   aws ssm put-parameter --name "/rockwell/supabase-url" --value "your-supabase-url" --type "SecureString"
   aws ssm put-parameter --name "/rockwell/supabase-anon-key" --value "your-supabase-key" --type "SecureString"
   aws ssm put-parameter --name "/rockwell/jwt-secret" --value "your-jwt-secret" --type "SecureString"
   ```

5. **Deploy the stack:**
   ```bash
   # Basic deployment (HTTP only)
   pnpm run deploy

   # Or with HTTPS support (see HTTPS Configuration Guide)
   cdk deploy RockwellFargateStack-prod \
     --parameters DomainName=api.yourdomain.com \
     --parameters HostedZoneId=Z1234567890ABCDEF \
     --parameters EnableHttpsRedirect=true
   ```

## 🔐 HTTPS Configuration

For production deployments, HTTPS is strongly recommended. See the [HTTPS Configuration Guide](./HTTPS_CONFIGURATION_GUIDE.md) for detailed setup instructions including:

- Automatic SSL certificate creation
- Custom domain configuration
- Route53 DNS integration
- Certificate validation troubleshooting

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_ACCOUNT_ID` | Your AWS account ID | Required |
| `AWS_REGION` | AWS region for deployment | `us-east-1` |
| `ENVIRONMENT` | Environment name (dev/staging/prod) | `dev` |
| `STACK_NAME` | CDK stack name | `RockwellFargateStack` |
| `ECR_STACK_NAME` | Name of the ECR stack | `RockwellEcrStack` |

### Resource Scaling

#### Environment-based Configuration

| Environment | Task Count | Max Capacity | vCPU | Memory |
|-------------|------------|--------------|------|--------|
| **dev** | 1 | 3 | 0.5 | 1GB |
| **staging** | 1 | 5 | 0.5 | 1GB |
| **prod** | 2 | 10 | 0.5 | 1GB |

#### Auto Scaling Policies

- **CPU Scaling**: Target 70% utilization
- **Memory Scaling**: Target 80% utilization
- **Scale Out**: 2-minute cooldown
- **Scale In**: 5-minute cooldown

### Networking

#### VPC Configuration
- **Public Subnets**: 2 AZs for load balancer
- **Private Subnets**: 2 AZs for ECS tasks
- **NAT Gateways**: 1 (cost-optimized)

#### Security Groups
- **Load Balancer**: HTTP (80) and HTTPS (443) from anywhere
- **ECS Service**: Port 3000 from load balancer only

### Health Checks

#### Container Health Check
```bash
curl -f http://localhost:3000/health || exit 1
```

#### Load Balancer Health Check
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Healthy Threshold**: 2
- **Unhealthy Threshold**: 5

## API Access

### Internal Access (within VPC)
```
http://api.rockwell.dev.local:3000
```

### External Access (via API Gateway)
```
https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
```

### Load Balancer Access (direct)
```
http://rockwell-alb-dev-123456789.us-east-1.elb.amazonaws.com
```

## Deployment

### Development Environment
```bash
ENVIRONMENT=dev pnpm run deploy
```

### Staging Environment
```bash
ENVIRONMENT=staging STACK_NAME=RockwellFargateStackStaging pnpm run deploy
```

### Production Environment
```bash
ENVIRONMENT=prod STACK_NAME=RockwellFargateStackProd pnpm run deploy
```

## Container Management

### Update Container Image
```bash
# Update ECS service to use new image
aws ecs update-service \
  --cluster rockwell-cluster-dev \
  --service rockwell-api-dev \
  --force-new-deployment
```

### View Container Logs
```bash
# Get log stream names
aws logs describe-log-streams \
  --log-group-name /ecs/rockwell-api-dev

# View logs
aws logs get-log-events \
  --log-group-name /ecs/rockwell-api-dev \
  --log-stream-name ecs/rockwell-api/task-id
```

### Execute Commands in Container
```bash
# Enable execute command access
aws ecs execute-command \
  --cluster rockwell-cluster-dev \
  --task task-id \
  --container rockwell-api \
  --interactive \
  --command "/bin/sh"
```

## Monitoring

### CloudWatch Metrics
- CPU utilization
- Memory utilization  
- Request count
- Response times
- Error rates

### Available Dashboards
- ECS Service metrics
- Application Load Balancer metrics
- API Gateway metrics
- Auto Scaling activities

### Alarms
Configure CloudWatch alarms for:
- High CPU/Memory usage
- HTTP 5xx errors
- Unhealthy targets
- Failed deployments

## Secrets Management

All sensitive configuration is stored in AWS Systems Manager Parameter Store:

```bash
# View parameters
aws ssm get-parameters-by-path --path "/rockwell/" --recursive --with-decryption

# Update a parameter
aws ssm put-parameter --name "/rockwell/database-url" --value "new-value" --type "SecureString" --overwrite
```

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

## Stack Outputs

After deployment, the stack provides these outputs:

- `LoadBalancerDnsName`: DNS name for direct ALB access
- `ApiGatewayUrl`: URL for API Gateway access
- `ClusterName`: ECS cluster name
- `ServiceName`: ECS service name
- `VpcId`: VPC ID for cross-stack references

## Security

- ECS tasks run in private subnets with no direct internet access
- All secrets stored in Parameter Store with encryption
- IAM roles follow least-privilege principles
- Security groups restrict traffic to necessary ports only
- VPC endpoints can be added for enhanced security

## Cost Optimization

- Single NAT Gateway for development environments
- Auto-scaling to minimize idle resources
- CloudWatch log retention set to 1 week
- Fargate Spot instances can be enabled for non-production

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check CloudWatch logs for container errors
   - Verify ECR image exists and is accessible
   - Confirm all required parameters exist in Parameter Store

2. **Health checks failing**
   - Ensure `/health` endpoint exists in your API
   - Check container port mapping (3000)
   - Verify security group allows traffic

3. **API Gateway timeouts**
   - Check VPC Link configuration
   - Verify load balancer target group health
   - Review integration timeout settings

4. **Auto-scaling not working**
   - Confirm CloudWatch metrics are being published
   - Check scaling policy thresholds
   - Verify service has capacity to scale

## Related Stacks

- [Rockwell-ECR](../Rockwell-ECR/README.md): Container registry (required dependency)
- [Rockwell-S3](../Rockwell-S3/README.md): S3 storage for video assets
