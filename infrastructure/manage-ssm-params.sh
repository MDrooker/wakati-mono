#!/bin/bash

# Script to manage Rockwell environment parameters in AWS Systems Manager Parameter Store
# Provides utilities to list, get, delete, and sync parameters

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PARAMETER_PREFIX="/rockwell"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Help function
show_help() {
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Manage Rockwell environment parameters in AWS Parameter Store"
    echo ""
    echo "COMMANDS:"
    echo "  list                   List all parameters with their values"
    echo "  list-names             List only parameter names"
    echo "  get NAME               Get a specific parameter value"
    echo "  delete NAME            Delete a specific parameter"
    echo "  delete-all             Delete all parameters (with confirmation)"
    echo "  sync                   Upload current .env to Parameter Store"
    echo "  export                 Export parameters to .env format"
    echo ""
    echo "OPTIONS:"
    echo "  -p, --prefix PREFIX    Parameter Store prefix (default: /rockwell)"
    echo "  -r, --region REGION    AWS region (default: us-east-1)"
    echo "  -e, --environment ENV  Environment suffix for parameters"
    echo "  -f, --format FORMAT    Output format: table, json, or env (default: table)"
    echo "  -o, --output FILE      Output file for export command"
    echo "  --decrypt              Decrypt SecureString parameters when listing"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list                           # List all parameters"
    echo "  $0 list -e dev --decrypt          # List dev parameters with decrypted values"
    echo "  $0 get database-url               # Get specific parameter"
    echo "  $0 delete supabase-anon-key       # Delete specific parameter"
    echo "  $0 export -o .env.aws             # Export to file"
    echo "  $0 sync -e prod                   # Upload .env to prod environment"
    echo ""
}

# Default values
COMMAND=""
ENVIRONMENT=""
FORMAT="table"
OUTPUT_FILE=""
DECRYPT=false

# Parse command line arguments
if [[ $# -eq 0 ]]; then
    show_help
    exit 1
fi

COMMAND="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
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
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --decrypt)
            DECRYPT=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            # For get/delete commands, treat as parameter name
            if [[ "$COMMAND" == "get" || "$COMMAND" == "delete" ]]; then
                PARAM_NAME="$1"
                shift
            else
                echo -e "${RED}Unknown option: $1${NC}"
                show_help
                exit 1
            fi
            ;;
    esac
done

# Adjust parameter prefix with environment
if [[ -n "$ENVIRONMENT" ]]; then
    PARAMETER_PREFIX="$PARAMETER_PREFIX/$ENVIRONMENT"
fi

# Function to log messages
log() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity --region "$AWS_REGION" &>/dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
}

# Function to list parameters
list_parameters() {
    local decrypt_flag=""
    if [[ "$DECRYPT" == "true" ]]; then
        decrypt_flag="--with-decryption"
    fi
    
    local parameters
    parameters=$(aws ssm get-parameters-by-path \
        --path "$PARAMETER_PREFIX" \
        --recursive \
        --region "$AWS_REGION" \
        $decrypt_flag \
        --output json 2>/dev/null)
    
    if [[ -z "$parameters" ]] || [[ "$(echo "$parameters" | jq '.Parameters | length')" == "0" ]]; then
        log_warning "No parameters found with prefix: $PARAMETER_PREFIX"
        return
    fi
    
    case "$FORMAT" in
        "json")
            echo "$parameters" | jq '.'
            ;;
        "env")
            echo "$parameters" | jq -r '.Parameters[] | "\(.Name | split("/")[-1])=\(.Value)"' | \
                while IFS='=' read -r name value; do
                    echo "$(echo "$name" | tr '[:lower:]' '[:upper:]')=$value"
                done
            ;;
        "table"|*)
            echo "$parameters" | jq -r '
                .Parameters[] | 
                [
                    (.Name | split("/")[-1]), 
                    .Type,
                    (if .Type == "SecureString" and (.Value | length) > 20 then 
                        (.Value[:20] + "...") 
                     else 
                        .Value 
                     end)
                ] | 
                @tsv
            ' | column -t -s $'\t' -N "NAME,TYPE,VALUE"
            ;;
    esac
}

# Function to list parameter names only
list_parameter_names() {
    aws ssm get-parameters-by-path \
        --path "$PARAMETER_PREFIX" \
        --recursive \
        --region "$AWS_REGION" \
        --query 'Parameters[].Name' \
        --output text 2>/dev/null | tr '\t' '\n' | sed "s|^$PARAMETER_PREFIX/||"
}

# Function to get specific parameter
get_parameter() {
    local param_name="$1"
    local full_param_name="$PARAMETER_PREFIX/$param_name"
    
    local value
    value=$(aws ssm get-parameter \
        --name "$full_param_name" \
        --with-decryption \
        --region "$AWS_REGION" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        echo "$value"
    else
        log_error "Parameter not found: $param_name"
        return 1
    fi
}

# Function to delete specific parameter
delete_parameter() {
    local param_name="$1"
    local full_param_name="$PARAMETER_PREFIX/$param_name"
    
    if aws ssm delete-parameter \
        --name "$full_param_name" \
        --region "$AWS_REGION" \
        &>/dev/null; then
        log_success "Deleted parameter: $param_name"
    else
        log_error "Failed to delete parameter: $param_name"
        return 1
    fi
}

# Function to delete all parameters
delete_all_parameters() {
    local param_names
    param_names=$(aws ssm get-parameters-by-path \
        --path "$PARAMETER_PREFIX" \
        --recursive \
        --region "$AWS_REGION" \
        --query 'Parameters[].Name' \
        --output text 2>/dev/null)
    
    if [[ -z "$param_names" ]]; then
        log_warning "No parameters found to delete"
        return
    fi
    
    local count
    count=$(echo "$param_names" | wc -w)
    
    echo -e "${YELLOW}This will delete $count parameters with prefix: $PARAMETER_PREFIX${NC}"
    echo "Parameters to delete:"
    echo "$param_names" | tr '\t' '\n' | sed 's/^/  - /'
    echo
    read -p "Are you sure? (type 'DELETE' to confirm): " confirmation
    
    if [[ "$confirmation" == "DELETE" ]]; then
        echo "$param_names" | tr '\t' '\n' | while read -r param_name; do
            if [[ -n "$param_name" ]]; then
                if aws ssm delete-parameter --name "$param_name" --region "$AWS_REGION" &>/dev/null; then
                    log_success "Deleted: $param_name"
                else
                    log_error "Failed to delete: $param_name"
                fi
            fi
        done
        log_success "Deletion completed"
    else
        log "Deletion cancelled"
    fi
}

# Function to export parameters
export_parameters() {
    local output=""
    
    # Generate header
    output+="# Rockwell environment variables exported from AWS Parameter Store\n"
    output+="# Generated on $(date)\n"
    output+="# Region: $AWS_REGION\n"
    output+="# Prefix: $PARAMETER_PREFIX\n\n"
    
    # Get parameters and format as .env
    local env_vars
    env_vars=$(aws ssm get-parameters-by-path \
        --path "$PARAMETER_PREFIX" \
        --recursive \
        --with-decryption \
        --region "$AWS_REGION" \
        --output json 2>/dev/null | \
        jq -r '.Parameters[] | "\(.Name | split("/")[-1])=\(.Value)"' | \
        while IFS='=' read -r name value; do
            echo "$(echo "$name" | tr '[:lower:]' '[:upper:]')=$value"
        done)
    
    if [[ -n "$env_vars" ]]; then
        output+="$env_vars"
    else
        log_warning "No parameters found to export"
        return
    fi
    
    if [[ -n "$OUTPUT_FILE" ]]; then
        echo -e "$output" > "$OUTPUT_FILE"
        log_success "Exported to: $OUTPUT_FILE"
    else
        echo -e "$output"
    fi
}

# Function to sync (upload) parameters
sync_parameters() {
    local script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local upload_script="$script_dir/upload-env-to-ssm.sh"
    
    if [[ ! -f "$upload_script" ]]; then
        log_error "Upload script not found: $upload_script"
        return 1
    fi
    
    local args=()
    if [[ -n "$ENVIRONMENT" ]]; then
        args+=("-e" "$ENVIRONMENT")
    fi
    args+=("-r" "$AWS_REGION")
    args+=("--overwrite")
    
    log "Syncing environment variables to Parameter Store..."
    "$upload_script" "${args[@]}"
}

# Main execution
main() {
    check_aws_credentials
    
    case "$COMMAND" in
        "list")
            list_parameters
            ;;
        "list-names")
            list_parameter_names
            ;;
        "get")
            if [[ -z "$PARAM_NAME" ]]; then
                log_error "Parameter name required for get command"
                exit 1
            fi
            get_parameter "$PARAM_NAME"
            ;;
        "delete")
            if [[ -z "$PARAM_NAME" ]]; then
                log_error "Parameter name required for delete command"
                exit 1
            fi
            delete_parameter "$PARAM_NAME"
            ;;
        "delete-all")
            delete_all_parameters
            ;;
        "export")
            export_parameters
            ;;
        "sync")
            sync_parameters
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
