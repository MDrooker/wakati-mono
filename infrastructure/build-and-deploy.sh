#!/bin/bash

# Rockwell API Docker Build and Push Script for ECR
# This script builds the API image for multiple architectures and pushes to ECR

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
ECR_STACK_NAME=${ECR_STACK_NAME:-"RockwellEcrStack"}
PLATFORM=${PLATFORM:-"linux/amd64,linux/arm64"}
TAG=${TAG:-"latest"}

echo -e "${BLUE}🐳 Rockwell API Docker Build & Push${NC}"
echo -e "${BLUE}===================================${NC}"
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "AWS Region: ${GREEN}${AWS_REGION}${NC}"
echo -e "Platform: ${GREEN}${PLATFORM}${NC}"
echo -e "Tag: ${GREEN}${TAG}${NC}"
echo ""

# Function to get ECR repository URI
get_ecr_uri() {
    echo -e "${YELLOW}Getting ECR repository URI...${NC}"
    
    ECR_URI=$(aws cloudformation describe-stacks \
        --stack-name "${ECR_STACK_NAME}" \
        --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "$ECR_URI" ] || [ "$ECR_URI" = "None" ]; then
        echo -e "${RED}❌ Could not find ECR repository URI${NC}"
        echo "Make sure the ECR stack is deployed: cd infrastructure && ./deploy.sh"
        exit 1
    fi
    
    echo -e "${GREEN}✅ ECR URI: ${ECR_URI}${NC}"
}

# Function to login to ECR
ecr_login() {
    echo -e "${YELLOW}Logging into ECR...${NC}"
    
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${ECR_URI}
    
    echo -e "${GREEN}✅ ECR login successful${NC}"
}

# Function to setup Docker buildx
setup_buildx() {
    echo -e "${YELLOW}Setting up Docker buildx...${NC}"
    
    # Create buildx builder if it doesn't exist
    if ! docker buildx inspect rockwell-builder > /dev/null 2>&1; then
        echo -e "${YELLOW}Creating buildx builder...${NC}"
        docker buildx create --name rockwell-builder --platform linux/amd64,linux/arm64
    fi
    
    # Use the builder
    docker buildx use rockwell-builder
    
    # Bootstrap the builder
    docker buildx inspect --bootstrap
    
    echo -e "${GREEN}✅ Docker buildx ready${NC}"
}

# Function to build and push image
build_and_push() {
    echo -e "${YELLOW}Building and pushing Docker image...${NC}"
    
    # Change to API directory
    cd apps/api
    
    # Build arguments for multi-stage builds
    BUILD_ARGS=""
    if [ ! -z "$NPM_TOKEN" ]; then
        BUILD_ARGS="--build-arg NPM_TOKEN=$NPM_TOKEN"
    fi
    
    # Build and push for multiple architectures
    docker buildx build \
        --platform ${PLATFORM} \
        --tag ${ECR_URI}:${TAG} \
        --tag ${ECR_URI}:${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S) \
        ${BUILD_ARGS} \
        --push \
        .
    
    echo -e "${GREEN}✅ Image built and pushed successfully${NC}"
    
    # Return to infrastructure directory
    cd ../../infrastructure
}

# Function to update ECS service
update_service() {
    echo -e "${YELLOW}Updating ECS service...${NC}"
    
    CLUSTER_NAME="rockwell-cluster-${ENVIRONMENT}"
    SERVICE_NAME="rockwell-api-${ENVIRONMENT}"
    
    # Check if ECS service exists
    if aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${SERVICE_NAME} \
        --query 'services[0].serviceName' \
        --output text > /dev/null 2>&1; then
        
        echo -e "${YELLOW}Forcing new deployment...${NC}"
        aws ecs update-service \
            --cluster ${CLUSTER_NAME} \
            --service ${SERVICE_NAME} \
            --force-new-deployment > /dev/null
        
        echo -e "${GREEN}✅ ECS service deployment triggered${NC}"
        echo -e "${BLUE}Monitor deployment: aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME}${NC}"
    else
        echo -e "${YELLOW}⚠️  ECS service not found - it will be created on next Fargate stack deployment${NC}"
    fi
}

# Function to wait for deployment
wait_for_deployment() {
    echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
    
    CLUSTER_NAME="rockwell-cluster-${ENVIRONMENT}"
    SERVICE_NAME="rockwell-api-${ENVIRONMENT}"
    
    # Wait for service to be stable (timeout after 10 minutes)
    echo -e "${BLUE}This may take a few minutes...${NC}"
    
    if aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${SERVICE_NAME} \
        --cli-read-timeout 600 \
        --cli-connect-timeout 60; then
        echo -e "${GREEN}✅ Deployment completed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Deployment is taking longer than expected${NC}"
        echo -e "${BLUE}Check ECS console for deployment status${NC}"
    fi
}

# Function to test the deployment
test_deployment() {
    echo -e "${YELLOW}Testing deployment...${NC}"
    
    # Try to get the API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "RockwellFargateStack" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ ! -z "$API_URL" ] && [ "$API_URL" != "None" ]; then
        echo -e "${BLUE}Testing API Gateway endpoint...${NC}"
        if curl -sf "${API_URL}/health" > /dev/null; then
            echo -e "${GREEN}✅ API Gateway health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  API Gateway health check failed (service may still be starting)${NC}"
        fi
    fi
    
    # Try to get the Load Balancer URL
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name "RockwellFargateStack" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ ! -z "$ALB_DNS" ] && [ "$ALB_DNS" != "None" ]; then
        echo -e "${BLUE}Testing Load Balancer endpoint...${NC}"
        if curl -sf "http://${ALB_DNS}/health" > /dev/null; then
            echo -e "${GREEN}✅ Load Balancer health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Load Balancer health check failed (service may still be starting)${NC}"
        fi
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (dev/staging/prod) [default: dev]"
    echo "  -r, --region REGION      AWS region [default: us-east-1]"
    echo "  -t, --tag TAG           Docker image tag [default: latest]"
    echo "  -p, --platform PLATFORM Platform for build [default: linux/amd64,linux/arm64]"
    echo "  --skip-update           Skip ECS service update"
    echo "  --skip-wait            Skip waiting for deployment"
    echo "  --skip-test            Skip deployment testing"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  NPM_TOKEN              NPM token for private packages"
    echo "  AWS_PROFILE           AWS profile to use"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build and push for dev environment"
    echo "  $0 -e prod -t v1.2.3                # Build for production with specific tag"
    echo "  $0 -p linux/amd64 --skip-update     # Build only for AMD64, don't update service"
}

# Parse command line arguments
SKIP_UPDATE=false
SKIP_WAIT=false
SKIP_TEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        --skip-update)
            SKIP_UPDATE=true
            shift
            ;;
        --skip-wait)
            SKIP_WAIT=true
            shift
            ;;
        --skip-test)
            SKIP_TEST=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Change to project root directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR/.."
    
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not installed${NC}"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not installed${NC}"
        exit 1
    fi
    
    # Check if running on Apple Silicon and warn about platform
    if [[ $(uname -m) == "arm64" ]] && [[ "$PLATFORM" == *"linux/amd64"* ]]; then
        echo -e "${YELLOW}⚠️  Building AMD64 image on Apple Silicon (ARM64)${NC}"
        echo -e "${BLUE}Using Docker buildx for cross-platform build${NC}"
    fi
    
    # Execute build steps
    get_ecr_uri
    ecr_login
    setup_buildx
    build_and_push
    
    if [ "$SKIP_UPDATE" = false ]; then
        update_service
        
        if [ "$SKIP_WAIT" = false ]; then
            wait_for_deployment
        fi
        
        if [ "$SKIP_TEST" = false ]; then
            test_deployment
        fi
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Build and deployment process completed!${NC}"
    echo ""
    echo -e "${BLUE}Image pushed: ${ECR_URI}:${TAG}${NC}"
    
    if [ "$SKIP_UPDATE" = false ]; then
        echo -e "${BLUE}ECS service updated for environment: ${ENVIRONMENT}${NC}"
    fi
}

# Run main function
main "$@"
