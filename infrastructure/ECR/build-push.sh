#!/bin/bash

# Wakati Multi-Platform Docker Build and Push Script for ECR
# This script builds the API Docker image for multiple architectures (Apple Silicon + AMD64)
# and pushes to the ECR repository created by the Wakati-ECR CDK stack

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
ECR_STACK_NAME=${ECR_STACK_NAME:-"WakatiEcrStack"}
PLATFORM=${PLATFORM:-"linux/amd64,linux/arm64"}
TAG=${TAG:-"latest"}
DOCKERFILE=${DOCKERFILE:-"Dockerfile"}

echo -e "${BLUE}🐳 Wakati Multi-Platform Docker Build${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "AWS Region: ${GREEN}${AWS_REGION}${NC}"
echo -e "Platform: ${GREEN}${PLATFORM}${NC}"
echo -e "Tag: ${GREEN}${TAG}${NC}"
echo -e "Dockerfile: ${GREEN}${DOCKERFILE}${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not installed${NC}"
        exit 1
    fi
    
    # Check Docker Buildx
    if ! docker buildx version &> /dev/null; then
        echo -e "${RED}❌ Docker Buildx not available${NC}"
        echo "Please ensure Docker Desktop is installed and Buildx is enabled"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo "Please run 'aws configure' or set your AWS credentials"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ Prerequisites check passed - Account: ${ACCOUNT_ID}${NC}"
}

# Function to get ECR repository URI
get_ecr_uri() {
    echo -e "${YELLOW}Getting ECR repository URI...${NC}"
    echo -e "${BLUE}   Stack Name: ${ECR_STACK_NAME}${NC}"
    ECR_URI=$(aws cloudformation describe-stacks \
        --stack-name "${ECR_STACK_NAME}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
        --output text 2>/dev/null)
    echo -e "${BLUE}   ECR URI: ${ECR_URI}${NC}"
    if [ -z "$ECR_URI" ] || [ "$ECR_URI" = "None" ]; then
        echo -e "${RED}❌ Could not find ECR repository URI${NC}"
        echo "Make sure the ECR stack is deployed:"
        echo "  cd infrastructure/ECR"
        echo "  pnpm run deploy"
        exit 1
    fi
    
    echo -e "${GREEN}✅ ECR URI: ${ECR_URI}${NC}"
}

# Function to login to ECR
ecr_login() {
    echo -e "${YELLOW}Logging into ECR...${NC}"
    
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${ECR_URI%/*}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ECR login successful${NC}"
    else
        echo -e "${RED}❌ ECR login failed${NC}"
        exit 1
    fi
}

# Function to setup Docker buildx
setup_buildx() {
    echo -e "${YELLOW}Setting up Docker buildx...${NC}"
    
    # Create buildx builder if it doesn't exist
    BUILDER_NAME="multiarch-builder"
    if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
        echo -e "${YELLOW}Creating buildx builder: ${BUILDER_NAME}${NC}"
        docker buildx create \
            --name $BUILDER_NAME \
            --platform $PLATFORM \
            --driver docker-container \
            --bootstrap
    fi
    
    # Use the builder
    docker buildx use $BUILDER_NAME
    
    # Verify builder supports required platforms
    echo -e "${YELLOW}Verifying platform support...${NC}"
    SUPPORTED_PLATFORMS=$(docker buildx inspect --bootstrap | grep "Platforms:" | cut -d' ' -f2-)
    echo -e "${BLUE}Supported platforms: ${SUPPORTED_PLATFORMS}${NC}"
    
    echo -e "${GREEN}✅ Docker buildx ready${NC}"
}

# Function to build and push image
build_and_push() {
    echo -e "${YELLOW}Building and pushing Docker image...${NC}"
    
    # Change to API directory
    if [ ! -d "../../apps/api" ]; then
        echo -e "${RED}❌ API directory not found at ../../apps/api${NC}"
        echo "Please run this script from infrastructure/ECR/"
        exit 1
    fi
    
    cd ../../apps/api
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        echo -e "${RED}❌ Dockerfile not found: ${DOCKERFILE}${NC}"
        exit 1
    fi
    
    # Build arguments for multi-stage builds
    BUILD_ARGS=""
    if [ ! -z "$NPM_TOKEN" ]; then
        BUILD_ARGS="--build-arg NPM_TOKEN=$NPM_TOKEN"
        echo -e "${BLUE}Using NPM_TOKEN for private packages${NC}"
    fi
    
    # Generate additional tags
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Build and push for multiple architectures
    echo -e "${BLUE}Building for platforms: ${PLATFORM}${NC}"
    docker buildx build \
        --platform ${PLATFORM} \
        --file ${DOCKERFILE} \
        --tag ${ECR_URI}:${TAG} \
        --tag ${ECR_URI}:${ENVIRONMENT}-${TIMESTAMP} \
        --tag ${ECR_URI}:${ENVIRONMENT}-${GIT_COMMIT} \
        ${BUILD_ARGS} \
        --push \
        --progress=plain \
        .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Image built and pushed successfully${NC}"
        echo -e "${BLUE}Tags pushed:${NC}"
        echo -e "  ${ECR_URI}:${TAG}"
        echo -e "  ${ECR_URI}:${ENVIRONMENT}-${TIMESTAMP}"
        echo -e "  ${ECR_URI}:${ENVIRONMENT}-${GIT_COMMIT}"
    else
        echo -e "${RED}❌ Build and push failed${NC}"
        exit 1
    fi
    
    # Return to original directory
    cd - > /dev/null
}

# Function to verify pushed images
verify_images() {
    echo -e "${YELLOW}Verifying pushed images...${NC}"
    
    # List recent images in the repository
    REPO_NAME=$(echo $ECR_URI | cut -d'/' -f2)
    
    echo -e "${BLUE}Recent images in repository:${NC}"
    aws ecr describe-images \
        --repository-name $REPO_NAME \
        --region $AWS_REGION \
        --query 'imageDetails[?imageManifestMediaType==`application/vnd.docker.distribution.manifest.list.v2+json`].[imageTags[0],imagePushedAt,imageSizeInBytes]' \
        --output table || \
    aws ecr describe-images \
        --repository-name $REPO_NAME \
        --region $AWS_REGION \
        --query 'imageDetails[0:5].[imageTags[0],imagePushedAt,imageSizeInBytes]' \
        --output table
    
    echo -e "${GREEN}✅ Image verification complete${NC}"
}

# Function to show image inspection commands
show_next_steps() {
    echo -e "${BLUE}🎉 Multi-platform image build complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "1. ${BLUE}Inspect the multi-architecture manifest:${NC}"
    echo -e "   docker buildx imagetools inspect ${ECR_URI}:${TAG}"
    echo ""
    echo -e "2. ${BLUE}Deploy to ECS Fargate:${NC}"
    echo -e "   cd ../Fargate"
    echo -e "   pnpm run deploy"
    echo ""
    echo -e "3. ${BLUE}Update existing ECS service:${NC}"
    echo -e "   aws ecs update-service \\"
    echo -e "     --cluster wakati-cluster-${ENVIRONMENT} \\"
    echo -e "     --service wakati-api-${ENVIRONMENT} \\"
    echo -e "     --force-new-deployment"
    echo ""
    echo -e "4. ${BLUE}Test the deployed API:${NC}"
    echo -e "   # Get API Gateway URL from Fargate stack outputs"
    echo -e "   curl \$(aws cloudformation describe-stacks --stack-name WakatiFargateStack --query 'Stacks[0].Outputs[?OutputKey==\`ApiGatewayUrl\`].OutputValue' --output text)/health"
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
    echo "  -f, --dockerfile FILE   Dockerfile to use [default: Dockerfile]"
    echo "  --ecr-stack NAME        ECR stack name [default: WakatiEcrStack]"
    echo "  --skip-verify           Skip image verification step"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  NPM_TOKEN              NPM token for private packages"
    echo "  AWS_PROFILE            AWS profile to use"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build for dev with default settings"
    echo "  $0 -e prod -t v1.2.3                # Build for production with specific tag"
    echo "  $0 -p linux/amd64                   # Build only for AMD64 (Fargate)"
    echo "  $0 -p linux/arm64                   # Build only for ARM64 (Apple Silicon)"
    echo ""
    echo "Platform Notes:"
    echo "  - linux/amd64,linux/arm64: Full multi-arch (recommended)"
    echo "  - linux/amd64: AWS Fargate compatible only"
    echo "  - linux/arm64: Apple Silicon compatible only"
}

# Parse command line arguments
SKIP_VERIFY=false

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
        -f|--dockerfile)
            DOCKERFILE="$2"
            shift 2
            ;;
        --ecr-stack)
            ECR_STACK_NAME="$2"
            shift 2
            ;;
        --skip-verify)
            SKIP_VERIFY=true
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
    # Warn if building on Apple Silicon for different platform
    if [[ $(uname -m) == "arm64" ]] && [[ "$PLATFORM" == *"linux/amd64"* ]]; then
        echo -e "${YELLOW}⚠️  Building AMD64 image on Apple Silicon (ARM64)${NC}"
        echo -e "${BLUE}Using Docker buildx for cross-platform build${NC}"
        echo ""
    fi
    
    # Execute build steps
    check_prerequisites
    get_ecr_uri
    ecr_login
    setup_buildx
    build_and_push
    
    if [ "$SKIP_VERIFY" = false ]; then
        verify_images
    fi
    
    show_next_steps
}

# Run main function
main "$@"
