#!/bin/bash
# Utility functions for AWS setup script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$SETUP_LOG"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$SETUP_LOG"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$SETUP_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$SETUP_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Some features may not work correctly."
        log_warning "Install with: sudo apt-get install jq (Linux) or brew install jq (Mac)"
    fi
    
    # Verify AWS credentials
    if ! $AWS_CMD sts get-caller-identity &> /dev/null; then
        log_error "Failed to authenticate with AWS. Please check your credentials."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get AWS account ID
get_account_id() {
    AWS_ACCOUNT_ID=$($AWS_CMD sts get-caller-identity --query Account --output text)
    echo "$AWS_ACCOUNT_ID"
}

# Convert path to Windows format if on Windows (for AWS CLI compatibility)
convert_path_for_aws() {
    local file_path="$1"
    
    # Get absolute path first
    if command -v realpath &> /dev/null; then
        file_path=$(realpath "$file_path")
    elif command -v readlink &> /dev/null; then
        file_path=$(readlink -f "$file_path" 2>/dev/null || echo "$file_path")
    fi
    
    # Check if we're on Windows (Git Bash or MSYS)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Try cygpath if available (most reliable)
        if command -v cygpath &> /dev/null; then
            cygpath -w "$file_path" | sed 's|\\|/|g'
            return
        fi
        # Convert Unix-style path to Windows path
        # /d/codes/... -> D:/codes/...
        if [[ "$file_path" =~ ^/([a-z])/(.*)$ ]]; then
            local drive="${BASH_REMATCH[1]}"
            local rest="${BASH_REMATCH[2]}"
            echo "${drive^}:/${rest}"
            return
        fi
    fi
    
    # Return as-is for Linux/Mac or if conversion not needed
    echo "$file_path"
}

# Disable path conversion for Git Bash (prevents /path from being converted to C:/Program Files/Git/path)
# Use this wrapper for AWS CLI commands that use paths starting with / that are NOT file paths
# (e.g., log group names, health check paths, etc.)
disable_pathconv() {
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        export MSYS_NO_PATHCONV=1
    fi
}

# Re-enable path conversion
enable_pathconv() {
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        unset MSYS_NO_PATHCONV
    fi
}

