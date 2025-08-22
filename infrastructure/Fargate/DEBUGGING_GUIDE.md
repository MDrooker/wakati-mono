# Debugging CloudFormation Hanging Issues

This guide helps you identify and resolve CloudFormation deployment hangs in the Rockwell Fargate stack.

## 🔍 Quick Diagnosis

Run the debugging script first:
```bash
./debug-deployment.sh [STACK_NAME] [ECR_STACK_NAME]
```

Example:
```bash
./debug-deployment.sh RockwellFargateStack-dev RockwellEcrStack
```

## 🧪 Incremental Testing Strategy

If the full stack hangs, use the minimal stack to test incrementally:

### Step 1: Test Basic Infrastructure
```bash
# Deploy minimal stack (VPC + ECS Cluster only)
cdk deploy RockwellFargateMinimalStack-dev --require-approval never
```

### Step 2: Add Components Gradually
Edit `rockwell-fargate-minimal-stack.ts` and uncomment sections one by one:
1. ✅ VPC + ECS Cluster (Step 1-3)
2. ✅ IAM Roles (Step 4) 
3. ✅ CloudWatch Logs (Step 5)
4. ✅ Task Definition (Step 6)
5. ✅ Security Groups (Step 7) 
6. ✅ ECS Service (Step 8)

Deploy after each step to identify the problematic resource.

## 🚨 Common Hanging Causes

### 1. ECR Dependency Issues
**Symptoms:** Hangs at task definition creation
**Check:**
```bash
aws cloudformation describe-stacks --stack-name RockwellEcrStack --query 'Stacks[0].StackStatus'
```
**Fix:** Ensure ECR stack is deployed and has exported the RepositoryUri

### 2. Missing SSM Parameters
**Symptoms:** Hangs at service creation when using secrets
**Check:** Run the debug script or manually check parameters:
```bash
aws ssm get-parameter --name "/rockwell/dev/database_url"
```
**Fix:** Upload missing parameters using the SSM upload script

### 3. VPC Limits Exceeded
**Symptoms:** Hangs at VPC creation
**Check:**
```bash
aws ec2 describe-vpcs --query 'length(Vpcs)'
aws service-quotas get-service-quota --service-code ec2 --quota-code L-F678F1CE
```
**Fix:** Delete unused VPCs or request limit increase

### 4. Service Discovery Issues
**Symptoms:** Hangs at ECS service creation with cloud map
**Check:** Look for service discovery namespace conflicts
**Fix:** Use unique namespace names or cleanup existing ones

### 5. Target Group Health Check Issues
**Symptoms:** Service creates but never becomes healthy
**Check:** ECS service events and target group health
**Fix:** Ensure health endpoints exist and are accessible
**Guide:** See `HEALTH_CHECK_DEBUGGING.md` for comprehensive health check troubleshooting

## 🛠️ Advanced Debugging

### Monitor CloudFormation Events
```bash
# Watch events in real-time
aws cloudformation describe-stack-events --stack-name [STACK_NAME] \
  --query 'StackEvents[0:5].{Time:Timestamp,Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
  --output table

# Check for failed resources
aws cloudformation describe-stack-resources --stack-name [STACK_NAME] \
  --query 'StackResources[?ResourceStatus!=`CREATE_COMPLETE` && ResourceStatus!=`UPDATE_COMPLETE`]'
```

### Cancel Hanging Deployment
```bash
# If deployment has been hanging for >30 minutes
aws cloudformation cancel-update-stack --stack-name [STACK_NAME]
```

### Check CloudWatch Logs
```bash
# Check ECS service logs if service is created
aws logs describe-log-groups --log-group-name-prefix "/ecs/rockwell"
```

## 🔧 Stack Improvements Made

The main stack now includes:

1. **Health Checks:** Container and ALB health checks for faster failure detection
2. **Circuit Breaker:** ECS service circuit breaker for automatic rollback
3. **Debug Outputs:** Additional outputs to verify resource creation
4. **Flexible Image Tag:** Parameter for specifying image tag instead of hardcoded 'latest'
5. **Configurable Container Port:** Parameter for specifying container port instead of hardcoded 8080
6. **HTTPS Support:** SSL/TLS certificate management with automatic DNS validation
7. **Custom Domain:** Route53 integration for custom domain names
8. **HTTP to HTTPS Redirect:** Automatic redirection from HTTP to HTTPS
9. **Improved Target Group:** Better health check configuration with faster deregistration

## 📋 Deployment Checklist

Before deploying the full stack:

- [ ] ECR stack is deployed and healthy
- [ ] ECR repository contains at least one image
- [ ] All required SSM parameters are uploaded
- [ ] AWS account has sufficient VPC/ECS limits
- [ ] No existing resources with conflicting names
- [ ] Application has `/healthz` or `/health` endpoint for health checks
- [ ] Application listens on `0.0.0.0` (not just `127.0.0.1`)

## 🚀 Recommended Deployment Commands

### For Development
```bash
# Deploy with verbose output and no approval prompts
cdk deploy RockwellFargateStack-dev --verbose --require-approval never

# Deploy with specific timeout (30 minutes)
cdk deploy RockwellFargateStack-dev --timeout 1800

# Deploy with custom container port
cdk deploy RockwellFargateStack-dev --parameters ContainerPort=3000

# Deploy with HTTPS (requires domain and hosted zone)
cdk deploy RockwellFargateStack-dev \
  --parameters DomainName=api-dev.yourdomain.com \
  --parameters HostedZoneId=Z1234567890 \
  --parameters EnableHttpsRedirect=true
```

### For Production
```bash
# Deploy with approval and changeset review
cdk deploy RockwellFargateStack-prod --require-approval broadening

# Deploy with custom domain and HTTPS
cdk deploy RockwellFargateStack-prod \
  --parameters ImageTag=v1.2.3 \
  --parameters ContainerPort=8080 \
  --parameters DomainName=api.yourdomain.com \
  --parameters HostedZoneId=Z1234567890 \
  --parameters EnableHttpsRedirect=true

# Deploy with existing certificate
cdk deploy RockwellFargateStack-prod \
  --parameters DomainName=api.yourdomain.com \
  --parameters CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abcd-1234
```

## 🔄 Rollback Strategy

If deployment fails:
```bash
# 1. Cancel the deployment
aws cloudformation cancel-update-stack --stack-name [STACK_NAME]

# 2. Wait for cancellation
aws cloudformation wait stack-update-complete --stack-name [STACK_NAME]

# 3. Check stack status
aws cloudformation describe-stacks --stack-name [STACK_NAME] --query 'Stacks[0].StackStatus'

# 4. If needed, rollback to previous version
aws cloudformation continue-update-rollback --stack-name [STACK_NAME]
```
