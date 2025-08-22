# Load Balancer Optimization Guide for 504 Timeout Prevention

## Overview

This guide covers the optimizations implemented to prevent 504 Gateway Timeout errors under high load in the Rockwell Fargate infrastructure.

## Key Optimizations Implemented

### 1. ECS Task Resource Optimization
- **Production CPU**: Increased to 1024 (1 vCPU)
- **Production Memory**: Increased to 2048 MB (2 GB)
- **Development CPU**: 512 (0.5 vCPU)
- **Development Memory**: 1024 MB (1 GB)

### 2. Auto Scaling Configuration
- **Minimum Capacity**: 2 tasks in production, 1 in development
- **Maximum Capacity**: 10 tasks in production, 3 in development
- **Initial Desired Count**: 3 tasks in production for immediate capacity

#### Scaling Triggers:
- **CPU Scaling**: Target 60% utilization (down from 70% for earlier scaling)
- **Memory Scaling**: Target 75% utilization (down from 80%)
- **Request-based Scaling**: 100 requests per target maximum
- **Scale-out Cooldown**: 1 minute (fast response to load)
- **Scale-in Cooldown**: 5 minutes (prevent thrashing)

### 3. Target Group Optimizations
- **Health Check Timeout**: 5 seconds
- **Health Check Interval**: 15 seconds
- **Healthy Threshold**: 2 checks
- **Unhealthy Threshold**: 3 checks
- **Deregistration Delay**: 15 seconds (faster task replacement)

### 4. Load Balancer Enhancements
- **Idle Timeout**: 60 seconds
- **HTTP/2 Enabled**: Better connection multiplexing
- **Invalid Header Dropping**: Enabled for security and performance
- **TLS Version Tracking**: Enabled for debugging

## Monitoring and Troubleshooting

### Key CloudWatch Metrics to Monitor

#### Load Balancer Metrics:
```bash
# 504 errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_ELB_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/rockwell-alb-{environment}/xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum

# Target response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/rockwell-alb-{environment}/xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average

# Request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/rockwell-alb-{environment}/xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum
```

#### ECS Service Metrics:
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=rockwell-api-{environment} Name=ClusterName,Value=rockwell-cluster-{environment} \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average

# Memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=rockwell-api-{environment} Name=ClusterName,Value=rockwell-cluster-{environment} \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average

# Running task count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name RunningTaskCount \
  --dimensions Name=ServiceName,Value=rockwell-api-{environment} Name=ClusterName,Value=rockwell-cluster-{environment} \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average
```

### Common 504 Timeout Causes and Solutions

#### 1. High Response Times
**Symptom**: TargetResponseTime > 30 seconds
**Solution**: 
- Check application logs for slow database queries
- Optimize database connections and queries
- Consider caching frequently accessed data

#### 2. Insufficient Task Capacity
**Symptom**: High CPU/Memory utilization with few running tasks
**Solution**:
- Auto-scaling should trigger, but if not, manually increase desired count
- Check auto-scaling policies are correctly configured

#### 3. Health Check Failures
**Symptom**: Tasks failing health checks and being cycled
**Solution**:
- Check application startup time
- Verify `/healthz` endpoint responds quickly
- Review application logs for errors

#### 4. Database Connection Limits
**Symptom**: 504 errors with database connection errors in logs
**Solution**:
- Review database connection pool settings
- Consider using connection pooling (PgBouncer for PostgreSQL)
- Scale database if needed

### Load Testing Recommendations

Use tools like Apache Bench or Artillery to test load handling:

```bash
# Apache Bench - 1000 requests, 50 concurrent
ab -n 1000 -c 50 https://your-domain.com/api/health

# Artillery - Progressive load test
artillery quick --count 100 --num 10 https://your-domain.com/api/health
```

Monitor the following during load tests:
- Response times
- Error rates
- Auto-scaling behavior
- Task CPU/Memory utilization
- Load balancer metrics

## Deployment Verification

After deploying these optimizations:

1. **Verify Auto-scaling Configuration**:
   ```bash
   aws application-autoscaling describe-scalable-targets \
     --service-namespace ecs \
     --resource-ids service/rockwell-cluster-{environment}/rockwell-api-{environment}
   ```

2. **Check Load Balancer Attributes**:
   ```bash
   aws elbv2 describe-load-balancer-attributes \
     --load-balancer-arn {load-balancer-arn}
   ```

3. **Verify Target Group Health**:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn {target-group-arn}
   ```

## Performance Tuning Checklist

- [ ] Task resources appropriate for workload
- [ ] Auto-scaling policies configured and tested
- [ ] Health checks optimized for fast detection
- [ ] Load balancer timeouts configured correctly
- [ ] Database connection pooling implemented
- [ ] Application logging includes performance metrics
- [ ] CloudWatch alarms set up for key metrics
- [ ] Load testing performed under expected traffic

## Alert Configuration

Set up CloudWatch alarms for:

1. **High 5XX Error Rate**: > 5% over 5 minutes
2. **High Response Time**: > 10 seconds average over 5 minutes
3. **Low Healthy Target Count**: < 1 healthy target
4. **High CPU Utilization**: > 80% over 10 minutes
5. **High Memory Utilization**: > 85% over 10 minutes

## Emergency Procedures

If experiencing 504 timeouts:

1. **Immediate**: Manually increase desired task count
2. **Short-term**: Check application logs and metrics
3. **Medium-term**: Optimize slow database queries or API calls
4. **Long-term**: Review and adjust auto-scaling policies

## Next Steps

Consider these additional optimizations:
- Implement application-level caching (Redis)
- Database read replicas for read-heavy workloads
- CDN for static content
- Database connection pooling
- Application performance monitoring (APM) tools
