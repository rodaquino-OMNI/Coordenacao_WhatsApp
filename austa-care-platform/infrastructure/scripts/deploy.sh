#!/bin/bash
set -euo pipefail

# AUSTA Care Platform - Deployment Script
# This script handles the complete deployment process for all environments

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
K8S_DIR="$PROJECT_ROOT/k8s"

# Default values
ENVIRONMENT=${1:-"development"}
ACTION=${2:-"plan"}
AUTO_APPROVE=${3:-"false"}

# Functions
log_info() {
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
    exit 1
}

print_usage() {
    echo "Usage: $0 [environment] [action] [auto-approve]"
    echo ""
    echo "Environments:"
    echo "  development  - Development environment (default)"
    echo "  staging      - Staging environment"
    echo "  production   - Production environment"
    echo ""
    echo "Actions:"
    echo "  plan         - Show deployment plan (default)"
    echo "  apply        - Apply changes"
    echo "  destroy      - Destroy infrastructure"
    echo "  validate     - Validate configuration"
    echo "  init         - Initialize Terraform"
    echo ""
    echo "Auto-approve:"
    echo "  true/false   - Auto approve changes (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 development plan"
    echo "  $0 production apply false"
    echo "  $0 staging destroy true"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform not found. Please install Terraform."
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
    fi
    
    log_success "All prerequisites met!"
}

validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            print_usage
            exit 1
            ;;
    esac
}

validate_action() {
    case $ACTION in
        plan|apply|destroy|validate|init)
            log_info "Action: $ACTION"
            ;;
        *)
            log_error "Invalid action: $ACTION"
            print_usage
            exit 1
            ;;
    esac
}

# Terraform functions
terraform_init() {
    log_info "Initializing Terraform for $ENVIRONMENT environment..."
    cd "$TERRAFORM_DIR/environments/$ENVIRONMENT"
    
    # Initialize with backend config
    terraform init \
        -backend-config="bucket=austa-terraform-state-$ENVIRONMENT" \
        -backend-config="key=$ENVIRONMENT/terraform.tfstate" \
        -backend-config="region=us-east-1" \
        -backend-config="dynamodb_table=terraform-state-lock" \
        -backend-config="encrypt=true"
    
    log_success "Terraform initialized successfully!"
}

terraform_validate() {
    log_info "Validating Terraform configuration..."
    cd "$TERRAFORM_DIR/environments/$ENVIRONMENT"
    
    terraform fmt -check -recursive ../.
    terraform validate
    
    log_success "Terraform configuration is valid!"
}

terraform_plan() {
    log_info "Creating Terraform plan for $ENVIRONMENT environment..."
    cd "$TERRAFORM_DIR/environments/$ENVIRONMENT"
    
    # Check if tfvars file exists
    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Please create it from terraform.tfvars.example"
    fi
    
    terraform plan -out="$ENVIRONMENT.tfplan"
    
    log_success "Terraform plan created successfully!"
}

terraform_apply() {
    log_info "Applying Terraform changes for $ENVIRONMENT environment..."
    cd "$TERRAFORM_DIR/environments/$ENVIRONMENT"
    
    if [ "$AUTO_APPROVE" == "true" ]; then
        terraform apply -auto-approve "$ENVIRONMENT.tfplan"
    else
        terraform apply "$ENVIRONMENT.tfplan"
    fi
    
    log_success "Terraform changes applied successfully!"
    
    # Update kubeconfig
    update_kubeconfig
}

terraform_destroy() {
    log_warning "Destroying infrastructure for $ENVIRONMENT environment..."
    
    if [ "$ENVIRONMENT" == "production" ] && [ "$AUTO_APPROVE" != "true" ]; then
        log_warning "You are about to destroy PRODUCTION infrastructure!"
        read -p "Type 'yes' to confirm: " confirmation
        if [ "$confirmation" != "yes" ]; then
            log_info "Destruction cancelled."
            exit 0
        fi
    fi
    
    cd "$TERRAFORM_DIR/environments/$ENVIRONMENT"
    
    if [ "$AUTO_APPROVE" == "true" ]; then
        terraform destroy -auto-approve
    else
        terraform destroy
    fi
    
    log_success "Infrastructure destroyed successfully!"
}

# Kubernetes functions
update_kubeconfig() {
    log_info "Updating kubeconfig for EKS cluster..."
    
    CLUSTER_NAME="austa-$ENVIRONMENT"
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region us-east-1
    
    log_success "Kubeconfig updated successfully!"
}

deploy_kubernetes_resources() {
    log_info "Deploying Kubernetes resources for $ENVIRONMENT environment..."
    
    # Apply base configurations
    kubectl apply -k "$K8S_DIR/base"
    
    # Apply environment-specific overlays
    kubectl apply -k "$K8S_DIR/overlays/$ENVIRONMENT"
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available --timeout=300s deployment --all -n production
    
    log_success "Kubernetes resources deployed successfully!"
}

# Health check functions
health_check() {
    log_info "Running health checks..."
    
    # Check cluster nodes
    log_info "Checking cluster nodes..."
    kubectl get nodes
    
    # Check pods
    log_info "Checking pods..."
    kubectl get pods -n production
    
    # Check services
    log_info "Checking services..."
    kubectl get svc -n production
    
    # Check ingress
    log_info "Checking ingress..."
    kubectl get ingress -n production
    
    log_success "Health checks completed!"
}

# Database migration function
run_database_migrations() {
    log_info "Running database migrations..."
    
    # Port-forward to database through bastion
    kubectl port-forward -n production svc/postgres-proxy 5432:5432 &
    PF_PID=$!
    sleep 5
    
    # Run migrations
    cd "$PROJECT_ROOT/backend"
    npm run db:migrate
    
    # Kill port-forward
    kill $PF_PID
    
    log_success "Database migrations completed!"
}

# Main execution
main() {
    echo "======================================"
    echo "AUSTA Care Platform Deployment Script"
    echo "======================================"
    echo ""
    
    # Parse arguments
    if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
        print_usage
        exit 0
    fi
    
    # Validate inputs
    validate_environment
    validate_action
    check_prerequisites
    
    # Execute action
    case $ACTION in
        init)
            terraform_init
            ;;
        validate)
            terraform_validate
            ;;
        plan)
            terraform_init
            terraform_validate
            terraform_plan
            ;;
        apply)
            terraform_init
            terraform_validate
            terraform_plan
            terraform_apply
            deploy_kubernetes_resources
            health_check
            
            if [ "$ENVIRONMENT" != "development" ]; then
                run_database_migrations
            fi
            ;;
        destroy)
            terraform_destroy
            ;;
    esac
    
    log_success "Deployment script completed successfully!"
}

# Run main function
main "$@"