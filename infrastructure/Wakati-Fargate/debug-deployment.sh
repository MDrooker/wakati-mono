#!/bin/bash

# Rockwell Fargate Stack Debugging Script
# This script helps identify what's causing CloudFormation to hang

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="${1:-RockwellFargateStack-dev}"
ECR_STACK_NAME="${2:-RockwellEcrStack}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

echo -e "${BLUE}🔍 Debugging CloudFormation Deployment for Stack: $STACK_NAME${NC}"
echo "========================================================"

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 could not be found. Please install it.${NC}"
        exit 1
    fi
}

# Check required tools
echo -e "${BLUE}📋 Checking required tools...${NC}"
check_command aws
check_command jq
echo -e "${GREEN}✅ All required tools are available${NC}"

# Check AWS credentials
echo -e "\n${BLUE}🔐 Checking AWS credentials...${NC}"
if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS credentials are valid for account: $ACCOUNT_ID${NC}"
else
    echo -e "${RED}❌ AWS credentials are not configured or invalid${NC}"
    exit 1
fi

# Check ECR stack dependency
echo -e "\n${BLUE}🏗️  Checking ECR stack dependency...${NC}"
ECR_STATUS=$(aws cloudformation describe-stacks --stack-name $ECR_STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
if [[ "$ECR_STATUS" == "CREATE_COMPLETE" || "$ECR_STATUS" == "UPDATE_COMPLETE" ]]; then
    echo -e "${GREEN}✅ ECR stack ($ECR_STACK_NAME) is in good state: $ECR_STATUS${NC}"
    
    # Get ECR repository URI
    ECR_URI=$(aws cloudformation describe-stacks --stack-name $ECR_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' --output text 2>/dev/null || echo "")
    if [[ -n "$ECR_URI" ]]; then
        echo -e "${GREEN}✅ ECR Repository URI: $ECR_URI${NC}"
        
        # Check if repository has images
        REPO_NAME=$(echo $ECR_URI | cut -d'/' -f2)
        IMAGE_COUNT=$(aws ecr describe-images --repository-name $REPO_NAME --query 'length(imageDetails)' --output text 2>/dev/null || echo "0")
        echo -e "${BLUE}📦 Repository has $IMAGE_COUNT images${NC}"
        
        if [[ "$IMAGE_COUNT" == "0" ]]; then
            echo -e "${YELLOW}⚠️  Warning: ECR repository is empty. Make sure to push an image before deploying.${NC}"
        fi
    else
        echo -e "${RED}❌ Could not retrieve ECR Repository URI from stack outputs${NC}"
    fi
else
    echo -e "${RED}❌ ECR stack ($ECR_STACK_NAME) is not ready: $ECR_STATUS${NC}"
    if [[ "$ECR_STATUS" == "NOT_FOUND" ]]; then
        echo -e "${YELLOW}💡 You need to deploy the ECR stack first${NC}"
    fi
fi

# Check current stack status
echo -e "\n${BLUE}📊 Checking current stack status...${NC}"
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
echo -e "${BLUE}Current stack status: $STACK_STATUS${NC}"

if [[ "$STACK_STATUS" != "NOT_FOUND" ]]; then
    # Check for any failed resources
    echo -e "\n${BLUE}🔍 Checking for failed resources...${NC}"
    FAILED_RESOURCES=$(aws cloudformation describe-stack-events --stack-name $STACK_NAME \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].{Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
        --output table 2>/dev/null || echo "")
    
    if [[ -n "$FAILED_RESOURCES" && "$FAILED_RESOURCES" != "[]" ]]; then
        echo -e "${RED}❌ Found failed resources:${NC}"
        echo "$FAILED_RESOURCES"
    else
        echo -e "${GREEN}✅ No failed resources found${NC}"
    fi
    
    # Show recent events
    echo -e "\n${BLUE}📝 Recent stack events (last 10):${NC}"
    aws cloudformation describe-stack-events --stack-name $STACK_NAME \
        --query 'StackEvents[:10].{Time:Timestamp,Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
        --output table 2>/dev/null || echo "Could not retrieve events"
fi

# Check for hanging operations
if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
    echo -e "\n${YELLOW}⏳ Stack is currently in progress. Checking for hanging resources...${NC}"
    
    # Find resources that have been in progress for a long time
    echo -e "${BLUE}🕒 Resources currently in progress:${NC}"
    aws cloudformation describe-stack-events --stack-name $STACK_NAME \
        --query 'StackEvents[?ResourceStatus==`CREATE_IN_PROGRESS` || ResourceStatus==`UPDATE_IN_PROGRESS`].{Time:Timestamp,Resource:LogicalResourceId,Status:ResourceStatus}' \
        --output table 2>/dev/null || echo "Could not retrieve in-progress resources"
fi

# Check parameter store parameters
echo -e "\n${BLUE}🔧 Checking SSM parameters...${NC}"
MISSING_PARAMS=()
PARAM_PREFIX="/rockwell/$(echo $STACK_NAME | grep -o 'dev\|staging\|prod' || echo 'dev')"

REQUIRED_PARAMS=(
    "database_url"
    "supabase_url"
    "supabase_anon_key"
    "supabase_jwt_secret"
    "supabase_service_role_key"
    "aws_s3_bucket_name"
    "aws_cloudfront_domain"
    "aws_account_id"
    "aws_region"
)

for param in "${REQUIRED_PARAMS[@]}"; do
    if ! aws ssm get-parameter --name "$PARAM_PREFIX/$param" --query 'Parameter.Value' --output text > /dev/null 2>&1; then
        MISSING_PARAMS+=("$PARAM_PREFIX/$param")
    fi
done

if [[ ${#MISSING_PARAMS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing required SSM parameters:${NC}"
    for param in "${MISSING_PARAMS[@]}"; do
        echo -e "${RED}  - $param${NC}"
    done
    echo -e "${YELLOW}💡 Run the parameter upload script to add missing parameters${NC}"
else
    echo -e "${GREEN}✅ All required SSM parameters are present${NC}"
fi

# Check VPC limits
echo -e "\n${BLUE}🌐 Checking VPC limits...${NC}"
VPC_COUNT=$(aws ec2 describe-vpcs --query 'length(Vpcs)' --output text)
VPC_LIMIT=$(aws service-quotas get-service-quota --service-code ec2 --quota-code L-F678F1CE --query 'Quota.Value' --output text 2>/dev/null || echo "5")
echo -e "${BLUE}VPCs in use: $VPC_COUNT / $VPC_LIMIT${NC}"

if [[ "$VPC_COUNT" -ge "$VPC_LIMIT" ]]; then
    echo -e "${RED}❌ VPC limit reached. You may need to delete unused VPCs or request a limit increase.${NC}"
fi

# Check ECS service limits
echo -e "\n${BLUE}🐳 Checking ECS limits...${NC}"
ECS_CLUSTERS=$(aws ecs list-clusters --query 'length(clusterArns)' --output text)
echo -e "${BLUE}ECS clusters: $ECS_CLUSTERS${NC}"

# Provide deployment recommendations
echo -e "\n${BLUE}💡 Deployment Recommendations:${NC}"
echo "================================"

if [[ "$ECR_STATUS" != "CREATE_COMPLETE" && "$ECR_STATUS" != "UPDATE_COMPLETE" ]]; then
    echo -e "${YELLOW}1. Deploy ECR stack first: cdk deploy RockwellEcrStack${NC}"
fi

if [[ ${#MISSING_PARAMS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}2. Upload missing SSM parameters before deployment${NC}"
fi

if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
    echo -e "${YELLOW}3. Consider canceling the current deployment if it's been running for >30 minutes${NC}"
    echo -e "${BLUE}   Command: aws cloudformation cancel-update-stack --stack-name $STACK_NAME${NC}"
fi

echo -e "${YELLOW}4. Use verbose CDK deploy for better debugging:${NC}"
echo -e "${BLUE}   cdk deploy --verbose --require-approval never${NC}"

echo -e "${YELLOW}5. Deploy with specific timeout:${NC}"
echo -e "${BLUE}   cdk deploy --timeout 1800 # 30 minutes${NC}"

echo -e "\n${GREEN}🎯 Debugging complete!${NC}"
