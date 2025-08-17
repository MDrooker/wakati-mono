#!/bin/bash

# Deploy script for Wakati Fargate infrastructure
# This script ensures parameters are uploaded before deploying the CDK stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="../apps/api"
ENV_FILE="$API_DIR/.env"

# Help function
show_help() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Deploy Rockwell Fargate infrastructure with parameter management"
    echo ""
    echo "ARGUMENTS:"
    echo "  ENVIRONMENT    Target environment (dev, staging, prod) - default: dev"
    echo ""
    echo "OPTIONS:"
    echo "  --skip-params  Skip parameter upload (assumes they already exist)"
    echo "  --dry-run      Show what would be deployed without actually doing it"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                # Deploy to dev environment"
    echo "  $0 prod --skip-params # Deploy to prod without uploading params"
    echo "  $0 staging --dry-run  # Show what would be deployed to staging"
    echo ""
}

# Function to log messages
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
SKIP_PARAMS=false
DRY_RUN=false

while [[ $# -gt 1 ]]; do
    case $2 in
        --skip-params)
            SKIP_PARAMS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $2${NC}"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

log "Deploying Rockwell Fargate infrastructure to $ENVIRONMENT environment"

# Check if .env file exists for parameter upload
if [[ "$SKIP_PARAMS" == "false" ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found at $ENV_FILE"
        log_error "Please create this file with your environment variables or use --skip-params"
        log_error "You can copy from $API_DIR/.env.example as a starting point"
        exit 1
    fi

    log "Uploading environment parameters to AWS Parameter Store..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        ./upload-env-to-ssm.sh -e "$ENVIRONMENT" -d
    else
        ./upload-env-to-ssm.sh -e "$ENVIRONMENT" --overwrite
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Parameters uploaded successfully"
    else
        log_error "Failed to upload parameters"
        exit 1
    fi
else
    log_warning "Skipping parameter upload (--skip-params specified)"
fi

# Deploy CDK stack
log "Deploying CDK stack..."

cd Rockwell-Fargate

if [[ "$DRY_RUN" == "true" ]]; then
    log "This would deploy the following stack:"
    npx cdk diff "RockwellFargateStack-$ENVIRONMENT"
else
    # Check if ECR stack exists
    ECR_STACK_NAME="RockwellECRStack-$ENVIRONMENT"
    if ! aws cloudformation describe-stacks --stack-name "$ECR_STACK_NAME" --region us-east-1 &>/dev/null; then
        log_error "ECR stack $ECR_STACK_NAME not found. Please deploy the ECR stack first."
        exit 1
    fi

    # Deploy the stack
    npx cdk deploy "RockwellFargateStack-$ENVIRONMENT" \
        --context ecrStackName="$ECR_STACK_NAME" \
        --require-approval never
    
    if [[ $? -eq 0 ]]; then
        log_success "CDK stack deployed successfully"
        
        # Get outputs
        log "Getting stack outputs..."
        aws cloudformation describe-stacks \
            --stack-name "RockwellFargateStack-$ENVIRONMENT" \
            --region us-east-1 \
            --query 'Stacks[0].Outputs' \
            --output table
    else
        log_error "Failed to deploy CDK stack"
        exit 1
    fi
fi

log_success "Deployment process completed for $ENVIRONMENT environment"
