#!/bin/bash

# Load Balancer Optimization Deployment Script
# This script deploys the optimized Fargate stack and monitors the deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_NAME="Rockwell-Fargate-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Deploying Load Balancer Optimizations for ${ENVIRONMENT} environment${NC}"
echo "Stack: ${STACK_NAME}"
echo "Region: ${REGION}"
echo ""

# Check if we're in the right directory
if [ ! -f "cdk.json" ]; then
    echo -e "${RED}❌ Error: cdk.json not found. Please run this script from the Rockwell-Fargate directory.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build the project
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Deploy the stack
echo -e "${BLUE}🚀 Deploying Fargate stack with optimizations...${NC}"
echo "Optimizations included:"
echo "  ✅ Increased task resources (1 vCPU, 2GB RAM for prod)"
echo "  ✅ Enhanced auto-scaling (min 2, max 10 tasks for prod)"
echo "  ✅ Faster scaling triggers (60% CPU, 75% memory)"
echo "  ✅ Request-based scaling (100 req/target)"
echo "  ✅ Optimized health checks (5s timeout, 15s interval)"
echo "  ✅ Load balancer performance attributes"
echo ""

# Deploy with progress monitoring
cdk deploy "${STACK_NAME}" \
    --require-approval never \
    --context environment="${ENVIRONMENT}" \
    --progress events \
    --verbose

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    
    # Get stack outputs
    echo -e "${BLUE}📋 Stack Outputs:${NC}"
    aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --query 'Stacks[0].Outputs' \
        --output table
    
    echo ""
    echo -e "${YELLOW}🔍 Monitoring Deployment Health...${NC}"
    
    # Get load balancer ARN
    ALB_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerArn`].OutputValue' \
        --output text)
    
    if [ ! -z "$ALB_ARN" ]; then
        echo "Load Balancer ARN: ${ALB_ARN}"
        
        # Check load balancer state
        echo -e "${BLUE}Checking load balancer state...${NC}"
        aws elbv2 describe-load-balancers \
            --load-balancer-arns "${ALB_ARN}" \
            --query 'LoadBalancers[0].State'
        
        # Get target group ARN
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
            --load-balancer-arn "${ALB_ARN}" \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)
        
        if [ ! -z "$TARGET_GROUP_ARN" ]; then
            echo -e "${BLUE}Checking target health...${NC}"
            aws elbv2 describe-target-health \
                --target-group-arn "${TARGET_GROUP_ARN}" \
                --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Description]' \
                --output table
        fi
        
        # Check auto-scaling configuration
        echo -e "${BLUE}Checking auto-scaling configuration...${NC}"
        aws application-autoscaling describe-scalable-targets \
            --service-namespace ecs \
            --resource-ids "service/rockwell-cluster-${ENVIRONMENT}/rockwell-api-${ENVIRONMENT}" \
            --query 'ScalableTargets[0].[MinCapacity,MaxCapacity,DesiredCapacity]' \
            --output table 2>/dev/null || echo "Auto-scaling not yet configured"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Deployment and health checks completed!${NC}"
    echo ""
    echo -e "${YELLOW}📊 Recommended next steps:${NC}"
    echo "1. Run load tests to verify 504 timeout fixes"
    echo "2. Monitor CloudWatch metrics for auto-scaling behavior"
    echo "3. Check application logs for any errors"
    echo "4. Set up CloudWatch alarms for key metrics"
    echo ""
    echo "📖 See LOAD_BALANCER_OPTIMIZATION_GUIDE.md for detailed monitoring instructions"
    
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Check the CloudFormation console for details:"
    echo "https://console.aws.amazon.com/cloudformation/home?region=${REGION}#/stacks"
    exit 1
fi
