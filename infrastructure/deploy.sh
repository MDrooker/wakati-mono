#!/bin/bash

# Wakati Infrastructure Deployment Script
# This script deploys both ECR and Fargate stacks for the Wakati project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo -e "${BLUE}🚀 Wakati Infrastructure Deployment${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "AWS Region: ${GREEN}${AWS_REGION}${NC}"
echo ""

# Function to check if AWS CLI is configured
check_aws_config() {
    echo -e "${YELLOW}Checking AWS configuration...${NC}"
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured or credentials invalid${NC}"
        echo "Please run 'aws configure' or set your AWS credentials"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS configured - Account: ${ACCOUNT_ID}${NC}"
}

# Function to check if CDK is installed
check_cdk() {
    echo -e "${YELLOW}Checking CDK installation...${NC}"
    if ! command -v cdk &> /dev/null; then
        echo -e "${RED}❌ AWS CDK not installed${NC}"
        echo "Please install CDK: npm install -g aws-cdk"
        exit 1
    fi
    
    CDK_VERSION=$(cdk --version)
    echo -e "${GREEN}✅ CDK installed - ${CDK_VERSION}${NC}"
}

# Function to deploy ECR stack
deploy_ecr() {
    echo -e "${YELLOW}📦 Deploying ECR Stack...${NC}"
    cd Rockwell-ECR
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found, copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${RED}❗ Please update .env file with your AWS account details${NC}"
        echo "Press Enter to continue after updating .env file..."
        read
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        pnpm install
    fi
    
    # Build the project
    echo -e "${YELLOW}Building TypeScript...${NC}"
    pnpm run build
    
    # Deploy
    echo -e "${YELLOW}Deploying ECR stack...${NC}"
    ENVIRONMENT=${ENVIRONMENT} pnpm run deploy
    
    echo -e "${GREEN}✅ ECR Stack deployed successfully${NC}"
    cd ..
}

# Function to deploy Fargate stack
deploy_fargate() {
    echo -e "${YELLOW}🐳 Deploying Fargate Stack...${NC}"
    cd Rockwell-Fargate
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found, copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${RED}❗ Please update .env file with your AWS account details${NC}"
        echo "Press Enter to continue after updating .env file..."
        read
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        pnpm install
    fi
    
    # Build the project
    echo -e "${YELLOW}Building TypeScript...${NC}"
    pnpm run build
    
    # Check if required parameters exist
    echo -e "${YELLOW}Checking required parameters...${NC}"
    REQUIRED_PARAMS=(
        "/rockwell/database-url"
        "/rockwell/supabase-url"
        "/rockwell/supabase-anon-key"
        "/rockwell/jwt-secret"
    )
    
    MISSING_PARAMS=()
    for param in "${REQUIRED_PARAMS[@]}"; do
        if ! aws ssm get-parameter --name "$param" > /dev/null 2>&1; then
            MISSING_PARAMS+=("$param")
        fi
    done
    
    if [ ${#MISSING_PARAMS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required parameters in AWS Systems Manager:${NC}"
        for param in "${MISSING_PARAMS[@]}"; do
            echo -e "${RED}   - $param${NC}"
        done
        echo ""
        echo -e "${YELLOW}Create these parameters using:${NC}"
        echo -e "${BLUE}aws ssm put-parameter --name \"/rockwell/database-url\" --value \"your-value\" --type \"SecureString\"${NC}"
        echo ""
        echo "Press Enter to continue after creating parameters..."
        read
    else
        echo -e "${GREEN}✅ All required parameters found${NC}"
    fi
    
    # Deploy
    echo -e "${YELLOW}Deploying Fargate stack...${NC}"
    ENVIRONMENT=${ENVIRONMENT} pnpm run deploy
    
    echo -e "${GREEN}✅ Fargate Stack deployed successfully${NC}"
    cd ..
}

# Function to show deployment outputs
show_outputs() {
    echo -e "${BLUE}📋 Deployment Complete!${NC}"
    echo -e "${BLUE}===================${NC}"
    echo ""
    
    echo -e "${YELLOW}ECR Repository:${NC}"
    ECR_URI=$(aws cloudformation describe-stacks \
        --stack-name "RockwellEcrStack" \
        --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
        --output text 2>/dev/null || echo "Not found")
    echo -e "  ${GREEN}${ECR_URI}${NC}"
    
    echo ""
    echo -e "${YELLOW}API Gateway URL:${NC}"
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "RockwellFargateStack" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not found")
    echo -e "  ${GREEN}${API_URL}${NC}"
    
    echo ""
    echo -e "${YELLOW}Load Balancer DNS:${NC}"
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name "RockwellFargateStack" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
        --output text 2>/dev/null || echo "Not found")
    echo -e "  ${GREEN}http://${ALB_DNS}${NC}"
    
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "1. Build and push your Docker image to ECR:"
    echo -e "   ${BLUE}docker build --platform linux/amd64,linux/arm64 -t ${ECR_URI}:latest .${NC}"
    echo -e "   ${BLUE}docker push ${ECR_URI}:latest${NC}"
    echo ""
    echo -e "2. Update ECS service to deploy new image:"
    echo -e "   ${BLUE}aws ecs update-service --cluster rockwell-cluster-${ENVIRONMENT} --service rockwell-api-${ENVIRONMENT} --force-new-deployment${NC}"
    echo ""
    echo -e "3. Test your API:"
    echo -e "   ${BLUE}curl ${API_URL}/health${NC}"
}

# Main execution
main() {
    # Change to infrastructure directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Pre-flight checks
    check_aws_config
    check_cdk
    
    # Check if this is the first CDK deployment
    echo -e "${YELLOW}Checking CDK bootstrap...${NC}"
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1; then
        echo -e "${YELLOW}CDK not bootstrapped. Bootstrapping now...${NC}"
        cdk bootstrap
        echo -e "${GREEN}✅ CDK bootstrap complete${NC}"
    else
        echo -e "${GREEN}✅ CDK already bootstrapped${NC}"
    fi
    
    # Deploy stacks
    echo ""
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""
    
    deploy_ecr
    echo ""
    deploy_fargate
    echo ""
    show_outputs
}

# Run main function
main "$@"
