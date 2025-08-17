#!/bin/bash

# Script to upload environment variables from API .env file to AWS Systems Manager Parameter Store
# This script reads the .env file and uploads each variable as a secure parameter

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_DIR="../apps/api"
ENV_FILE="$API_DIR/.env"
PARAMETER_PREFIX="/rockwell"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Upload environment variables from API .env file to AWS Parameter Store"
    echo ""
    echo "OPTIONS:"
    echo "  -f, --file FILE        Specify custom .env file path (default: ../apps/api/.env)"
    echo "  -p, --prefix PREFIX    Parameter Store prefix (default: /rockwell)"
    echo "  -r, --region REGION    AWS region (default: us-east-1)"
    echo "  -e, --environment ENV  Environment suffix for parameters (default: none)"
    echo "  -d, --dry-run          Show what would be uploaded without actually doing it"
    echo "  -o, --overwrite        Overwrite existing parameters"
    echo "  --secure               Upload as SecureString (encrypted) - default for sensitive values"
    echo "  --string               Upload as String (unencrypted) - for non-sensitive values"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Upload with defaults"
    echo "  $0 -e dev                            # Upload with /rockwell/dev prefix"
    echo "  $0 -f ../apps/api/.env.prod -e prod  # Upload production config"
    echo "  $0 -d                                # Dry run to see what would be uploaded"
    echo ""
}

# Default values
DRY_RUN=false
OVERWRITE=false
ENVIRONMENT=""
PARAMETER_TYPE="auto" # auto, string, or secure

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            ENV_FILE="$2"
            shift 2
            ;;
        -p|--prefix)
            PARAMETER_PREFIX="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -o|--overwrite)
            OVERWRITE=true
            shift
            ;;
        --secure)
            PARAMETER_TYPE="secure"
            shift
            ;;
        --string)
            PARAMETER_TYPE="string"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Adjust parameter prefix with environment
if [[ -n "$ENVIRONMENT" ]]; then
    PARAMETER_PREFIX="$PARAMETER_PREFIX/$ENVIRONMENT"
fi

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

# Function to check if parameter exists
parameter_exists() {
    local param_name="$1"
    aws ssm get-parameter --name "$param_name" --region "$AWS_REGION" &>/dev/null
}

# Function to determine parameter type based on variable name
get_parameter_type() {
    local var_name="$1"
    
    if [[ "$PARAMETER_TYPE" == "string" ]]; then
        echo "String"
        return
    elif [[ "$PARAMETER_TYPE" == "secure" ]]; then
        echo "SecureString"
        return
    fi
    
    # Auto-detect based on variable name (sensitive variables get SecureString)
    case "$var_name" in
        *PASSWORD*|*SECRET*|*KEY*|*TOKEN*|DATABASE_URL|*PRIVATE*)
            echo "SecureString"
            ;;
        *)
            echo "String"
            ;;
    esac
}

# Function to upload parameter to SSM
upload_parameter() {
    local var_name="$1"
    local var_value="$2"
    local param_name="$PARAMETER_PREFIX/$(echo "$var_name" | tr '[:upper:]' '[:lower:]')" # Convert to lowercase
    local param_type="$(get_parameter_type "$var_name")"
    
    # Skip empty values
    if [[ -z "$var_value" ]]; then
        log_warning "Skipping empty value for $var_name"
        return
    fi
    
    # Check if parameter exists
    if parameter_exists "$param_name" && [[ "$OVERWRITE" == "false" ]]; then
        log_warning "Parameter $param_name already exists (use --overwrite to replace)"
        return
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would upload: $param_name = $var_value (Type: $param_type)"
        return
    fi
    
    # Upload parameter
    local overwrite_flag=""
    if [[ "$OVERWRITE" == "true" ]]; then
        overwrite_flag="--overwrite"
    fi
    
    if aws ssm put-parameter \
        --name "$param_name" \
        --value "$var_value" \
        --type "$param_type" \
        --region "$AWS_REGION" \
        $overwrite_flag \
        --description "Rockwell API environment variable: $var_name" \
        &>/dev/null; then
        
        # Mask sensitive values in output
        local display_value="$var_value"
        if [[ "$param_type" == "SecureString" ]]; then
            display_value="[REDACTED]"
        fi
        
        log_success "Uploaded $param_name = $display_value (Type: $param_type)"
    else
        log_error "Failed to upload parameter $param_name"
        return 1
    fi
}

# Main execution
main() {
    log "Starting environment variable upload to AWS Parameter Store"
    log "Region: $AWS_REGION"
    log "Parameter prefix: $PARAMETER_PREFIX"
    log "Environment file: $ENV_FILE"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        log "Please create the file or specify a different path with -f option"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --region "$AWS_REGION" &>/dev/null; then
        log_error "AWS credentials not configured or invalid"
        log "Please run 'aws configure' or set AWS environment variables"
        exit 1
    fi
    
    log "AWS credentials verified"
    
    # Parse .env file and upload parameters
    local upload_count=0
    local error_count=0
    
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ "$line" =~ ^[[:space:]]*$ ]]; then
            continue
        fi
        
        # Parse variable=value format
        if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            var_name="${BASH_REMATCH[1]}"
            var_value="${BASH_REMATCH[2]}"
            
            # Remove quotes if present
            var_value=$(echo "$var_value" | sed "s/^['\"]//;s/['\"]$//")
            
            if upload_parameter "$var_name" "$var_value"; then
                ((upload_count++))
            else
                ((error_count++))
            fi
        fi
    done < "$ENV_FILE"
    
    # Summary
    echo ""
    log_success "Upload completed!"
    log "Total parameters processed: $upload_count"
    if [[ $error_count -gt 0 ]]; then
        log_warning "Parameters with errors: $error_count"
    fi
    
    if [[ "$DRY_RUN" == "false" ]]; then
        echo ""
        log "You can view the uploaded parameters with:"
        echo "  aws ssm get-parameters-by-path --path '$PARAMETER_PREFIX' --region '$AWS_REGION'"
        echo ""
        log "To delete all parameters (if needed):"
        echo "  aws ssm get-parameters-by-path --path '$PARAMETER_PREFIX' --region '$AWS_REGION' --query 'Parameters[].Name' --output text | xargs -I {} aws ssm delete-parameter --name '{}' --region '$AWS_REGION'"
    fi
}

# Run main function
main "$@"
