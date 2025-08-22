# Health Check Debugging Guide

This guide helps you troubleshoot health check failures in your Rockwell Fargate deployment.

## 🏥 Available Health Endpoints

Your application now provides multiple health check endpoints:

### Simple Health Endpoints (Recommended)
- **`/healthz`** - Basic health check (no dependencies)
- **`/healthz/ready`** - Readiness check
- **`/healthz/live`** - Liveness check

### Standard Health Endpoint
- **`/health`** - Terminus health check (may require dependencies)

## 🔍 Debugging Health Check Failures

### 1. Check ECS Task Health
```bash
# Get cluster and service names from stack outputs
CLUSTER_NAME=$(aws cloudformation describe-stacks --stack-name RockwellFargateStack-dev --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text)
SERVICE_NAME=$(aws cloudformation describe-stacks --stack-name RockwellFargateStack-dev --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' --output text)

# List tasks in the service
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME

# Get task details (replace TASK_ARN with actual task ARN)
aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks TASK_ARN
```

### 2. Check Container Logs
```bash
# View container logs
aws logs tail /ecs/rockwell-api-dev --follow

# Or check specific log stream
aws logs describe-log-streams --log-group-name /ecs/rockwell-api-dev
```

### 3. Test Health Endpoints Manually
```bash
# Get load balancer DNS
LB_DNS=$(aws cloudformation describe-stacks --stack-name RockwellFargateStack-dev --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' --output text)

# Test health endpoints
curl -v "http://$LB_DNS/healthz"
curl -v "http://$LB_DNS/health"
curl -v "http://$LB_DNS/healthz/ready"
curl -v "http://$LB_DNS/healthz/live"
```

### 4. Connect to Running Container (Debug Mode)
```bash
# Enable ECS Exec to connect to container
aws ecs execute-command \
    --cluster $CLUSTER_NAME \
    --task TASK_ARN \
    --container rockwell-api \
    --interactive \
    --command "/bin/sh"

# Inside container, test health endpoints
wget -qO- http://localhost:8080/healthz
wget -qO- http://localhost:8080/health
```

### 5. Check Target Group Health
```bash
# Get target group ARN from load balancer
ALB_ARN=$(aws elbv2 describe-load-balancers --names rockwell-alb-dev --query 'LoadBalancers[0].LoadBalancerArn' --output text)
TG_ARN=$(aws elbv2 describe-target-groups --load-balancer-arn $ALB_ARN --query 'TargetGroups[0].TargetGroupArn' --output text)

# Check target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

## 🛠️ Common Health Check Issues & Solutions

### Issue 1: Container Health Check Failing
**Symptoms:** Container status shows unhealthy, restarts frequently
**Causes:**
- Missing `wget` or `nc` in container image
- Wrong port configuration
- Application not responding on expected port

**Solutions:**
```dockerfile
# Add to your Dockerfile
RUN apt-get update && apt-get install -y wget netcat-openbsd
```

### Issue 2: Load Balancer Health Check Failing
**Symptoms:** Target group shows unhealthy targets
**Causes:**
- Security group blocking traffic
- Health check path doesn't exist
- Wrong port configuration
- Application takes too long to start

**Solutions:**
1. Verify security group allows traffic on container port
2. Check health endpoint returns HTTP 200
3. Increase health check timeout/interval
4. Reduce unhealthy threshold count

### Issue 3: Application Starts But Health Checks Fail
**Symptoms:** Container logs show app running, but health checks fail
**Causes:**
- Application binding to `127.0.0.1` instead of `0.0.0.0`
- Wrong health endpoint path
- Application dependencies not ready

**Solutions:**
1. **Check Application Binding:**
   ```typescript
   // In main.ts, ensure app listens on all interfaces
   await app.listen(port, '0.0.0.0');
   ```

2. **Update Health Controller:**
   ```typescript
   // Ensure health endpoint doesn't require authentication
   @Public()
   @Get()
   getHealth() {
     return { status: 'healthy' };
   }
   ```

### Issue 4: Health Checks Pass But Service Unstable
**Symptoms:** Intermittent health failures, service scaling issues
**Causes:**
- Resource constraints (CPU/Memory)
- Database connection issues
- External dependency failures

**Solutions:**
1. Increase task CPU/Memory allocation
2. Add database connection health checks
3. Implement graceful shutdown handling

## 📊 Health Check Configuration Best Practices

### Container Health Check
- **Use simple commands**: `wget`, `nc`, or basic HTTP requests
- **Short timeouts**: 5-10 seconds
- **Reasonable start period**: 60-90 seconds for application startup
- **Multiple retries**: 3-5 attempts before marking unhealthy

### Load Balancer Health Check
- **Dedicated health endpoint**: `/healthz` without dependencies
- **Appropriate thresholds**: 2 healthy, 3-5 unhealthy
- **Realistic timeouts**: 10-30 seconds
- **Frequent intervals**: 15-30 seconds

### Application Health Endpoint
```typescript
@Controller('healthz')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  async getReady() {
    // Check if app is ready to receive traffic
    // (database connected, cache warmed, etc.)
    return { status: 'ready' };
  }

  @Get('live')
  getLive() {
    // Simple liveness check
    return { status: 'alive' };
  }
}
```

## 🚨 Emergency Debugging Commands

If your service is completely failing:

```bash
# 1. Check if any tasks are running
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME

# 2. Check service events for errors
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].events[0:5]'

# 3. Check recent task failures
aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --desired-status STOPPED --query 'taskArns[0]' --output text)

# 4. Check CloudWatch logs for errors
aws logs filter-log-events --log-group-name /ecs/rockwell-api-dev --start-time $(date -d '1 hour ago' +%s)000

# 5. Force new deployment
aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment
```

## 📈 Monitoring Health Check Metrics

Set up CloudWatch alarms for:
- **UnHealthyHostCount**: Target group unhealthy targets
- **HealthyHostCount**: Target group healthy targets  
- **TargetResponseTime**: Application response time
- **HTTPCode_Target_5XX_Count**: Application errors

This will help you proactively identify and resolve health check issues.
