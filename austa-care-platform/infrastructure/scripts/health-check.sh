#!/bin/bash
set -euo pipefail

# AUSTA Care Platform - Health Check Script
# This script performs comprehensive health checks on the deployed infrastructure

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-"production"}
NAMESPACE="production"
API_ENDPOINT="https://api.austa.com.br"
EXPECTED_PODS=15
HEALTH_CHECK_TIMEOUT=30

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Infrastructure Health Checks
check_aws_resources() {
    print_header "AWS Infrastructure Health Checks"
    
    # Check VPC
    log_info "Checking VPC status..."
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=austa-$ENVIRONMENT-vpc" --query 'Vpcs[0].VpcId' --output text)
    if [ "$VPC_ID" != "None" ]; then
        log_success "VPC is available: $VPC_ID"
    else
        log_error "VPC not found"
    fi
    
    # Check EKS Cluster
    log_info "Checking EKS cluster status..."
    CLUSTER_STATUS=$(aws eks describe-cluster --name "austa-$ENVIRONMENT" --query 'cluster.status' --output text 2>/dev/null || echo "NOT_FOUND")
    if [ "$CLUSTER_STATUS" == "ACTIVE" ]; then
        log_success "EKS cluster is active"
    else
        log_error "EKS cluster status: $CLUSTER_STATUS"
    fi
    
    # Check RDS
    log_info "Checking RDS instance status..."
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier "austa-$ENVIRONMENT-postgres" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    if [ "$RDS_STATUS" == "available" ]; then
        log_success "RDS instance is available"
    else
        log_error "RDS instance status: $RDS_STATUS"
    fi
    
    # Check ElastiCache
    log_info "Checking ElastiCache cluster status..."
    REDIS_STATUS=$(aws elasticache describe-cache-clusters --cache-cluster-id "austa-$ENVIRONMENT-redis" --query 'CacheClusters[0].CacheClusterStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    if [ "$REDIS_STATUS" == "available" ]; then
        log_success "ElastiCache cluster is available"
    else
        log_error "ElastiCache cluster status: $REDIS_STATUS"
    fi
    
    # Check ALB
    log_info "Checking Application Load Balancer..."
    ALB_STATE=$(aws elbv2 describe-load-balancers --names "austa-$ENVIRONMENT-alb" --query 'LoadBalancers[0].State.Code' --output text 2>/dev/null || echo "NOT_FOUND")
    if [ "$ALB_STATE" == "active" ]; then
        log_success "Application Load Balancer is active"
    else
        log_error "Application Load Balancer state: $ALB_STATE"
    fi
}

# Kubernetes Health Checks
check_kubernetes_resources() {
    print_header "Kubernetes Resources Health Checks"
    
    # Check nodes
    log_info "Checking Kubernetes nodes..."
    READY_NODES=$(kubectl get nodes --no-headers | grep -c " Ready " || echo "0")
    TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l || echo "0")
    if [ "$READY_NODES" -eq "$TOTAL_NODES" ] && [ "$TOTAL_NODES" -gt 0 ]; then
        log_success "All $TOTAL_NODES nodes are ready"
    else
        log_error "Only $READY_NODES of $TOTAL_NODES nodes are ready"
    fi
    
    # Check namespace
    log_info "Checking namespace..."
    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_success "Namespace '$NAMESPACE' exists"
    else
        log_error "Namespace '$NAMESPACE' not found"
    fi
    
    # Check deployments
    log_info "Checking deployments..."
    DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" --no-headers | wc -l || echo "0")
    READY_DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" --no-headers | awk '$2 == $3 {print}' | wc -l || echo "0")
    if [ "$READY_DEPLOYMENTS" -eq "$DEPLOYMENTS" ] && [ "$DEPLOYMENTS" -gt 0 ]; then
        log_success "All $DEPLOYMENTS deployments are ready"
    else
        log_warning "$READY_DEPLOYMENTS of $DEPLOYMENTS deployments are ready"
    fi
    
    # Check pods
    log_info "Checking pods..."
    RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers | wc -l || echo "0")
    if [ "$RUNNING_PODS" -ge "$EXPECTED_PODS" ]; then
        log_success "$RUNNING_PODS pods are running (expected: $EXPECTED_PODS)"
    else
        log_warning "Only $RUNNING_PODS pods are running (expected: $EXPECTED_PODS)"
    fi
    
    # Check services
    log_info "Checking services..."
    SERVICES=$(kubectl get services -n "$NAMESPACE" --no-headers | wc -l || echo "0")
    if [ "$SERVICES" -gt 0 ]; then
        log_success "$SERVICES services are configured"
    else
        log_error "No services found"
    fi
    
    # Check ingress
    log_info "Checking ingress..."
    INGRESS=$(kubectl get ingress -n "$NAMESPACE" --no-headers | wc -l || echo "0")
    if [ "$INGRESS" -gt 0 ]; then
        log_success "$INGRESS ingress configured"
    else
        log_error "No ingress found"
    fi
    
    # Check persistent volumes
    log_info "Checking persistent volumes..."
    PV_BOUND=$(kubectl get pv --no-headers | grep -c "Bound" || echo "0")
    if [ "$PV_BOUND" -gt 0 ]; then
        log_success "$PV_BOUND persistent volumes bound"
    else
        log_warning "No persistent volumes bound"
    fi
}

# Application Health Checks
check_application_health() {
    print_header "Application Health Checks"
    
    # Check API health endpoint
    log_info "Checking API health endpoint..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$API_ENDPOINT/health" || echo "000")
    if [ "$HTTP_STATUS" == "200" ]; then
        log_success "API health endpoint returned 200 OK"
    else
        log_error "API health endpoint returned $HTTP_STATUS"
    fi
    
    # Check detailed health
    log_info "Checking detailed health status..."
    HEALTH_RESPONSE=$(curl -s --max-time "$HEALTH_CHECK_TIMEOUT" "$API_ENDPOINT/health/detailed" || echo "{}")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        log_success "Detailed health check passed"
    else
        log_error "Detailed health check failed"
    fi
    
    # Check database connectivity
    log_info "Checking database connectivity..."
    DB_HEALTH=$(echo "$HEALTH_RESPONSE" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    if [ "$DB_HEALTH" == "healthy" ]; then
        log_success "Database connectivity is healthy"
    else
        log_error "Database connectivity status: $DB_HEALTH"
    fi
    
    # Check Redis connectivity
    log_info "Checking Redis connectivity..."
    REDIS_HEALTH=$(echo "$HEALTH_RESPONSE" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)
    if [ "$REDIS_HEALTH" == "healthy" ]; then
        log_success "Redis connectivity is healthy"
    else
        log_error "Redis connectivity status: $REDIS_HEALTH"
    fi
    
    # Check WhatsApp integration
    log_info "Checking WhatsApp integration..."
    WHATSAPP_HEALTH=$(echo "$HEALTH_RESPONSE" | grep -o '"whatsapp":"[^"]*"' | cut -d'"' -f4)
    if [ "$WHATSAPP_HEALTH" == "healthy" ]; then
        log_success "WhatsApp integration is healthy"
    else
        log_warning "WhatsApp integration status: $WHATSAPP_HEALTH"
    fi
}

# Security Health Checks
check_security_health() {
    print_header "Security Health Checks"
    
    # Check SSL certificate
    log_info "Checking SSL certificate..."
    SSL_EXPIRY=$(echo | openssl s_client -servername api.austa.com.br -connect api.austa.com.br:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    if [ -n "$SSL_EXPIRY" ]; then
        log_success "SSL certificate valid until: $SSL_EXPIRY"
    else
        log_error "Unable to verify SSL certificate"
    fi
    
    # Check WAF status
    log_info "Checking WAF status..."
    WAF_ENABLED=$(aws wafv2 list-web-acls --scope REGIONAL --query 'WebACLs[?Name==`austa-production-waf`].ARN' --output text)
    if [ -n "$WAF_ENABLED" ] && [ "$WAF_ENABLED" != "None" ]; then
        log_success "WAF is enabled"
    else
        log_error "WAF is not enabled"
    fi
    
    # Check secrets in Secrets Manager
    log_info "Checking secrets configuration..."
    SECRETS_COUNT=$(aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `austa/`)].Name' --output text | wc -w || echo "0")
    if [ "$SECRETS_COUNT" -gt 0 ]; then
        log_success "$SECRETS_COUNT secrets configured in Secrets Manager"
    else
        log_error "No secrets found in Secrets Manager"
    fi
    
    # Check network policies
    log_info "Checking network policies..."
    NETWORK_POLICIES=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers | wc -l || echo "0")
    if [ "$NETWORK_POLICIES" -gt 0 ]; then
        log_success "$NETWORK_POLICIES network policies configured"
    else
        log_warning "No network policies configured"
    fi
}

# Monitoring Health Checks
check_monitoring_health() {
    print_header "Monitoring Health Checks"
    
    # Check Prometheus
    log_info "Checking Prometheus..."
    PROMETHEUS_POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --field-selector=status.phase=Running --no-headers | wc -l || echo "0")
    if [ "$PROMETHEUS_POD" -gt 0 ]; then
        log_success "Prometheus is running"
    else
        log_error "Prometheus is not running"
    fi
    
    # Check Grafana
    log_info "Checking Grafana..."
    GRAFANA_POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --field-selector=status.phase=Running --no-headers | wc -l || echo "0")
    if [ "$GRAFANA_POD" -gt 0 ]; then
        log_success "Grafana is running"
    else
        log_error "Grafana is not running"
    fi
    
    # Check CloudWatch alarms
    log_info "Checking CloudWatch alarms..."
    ALARMS_IN_ALARM=$(aws cloudwatch describe-alarms --state-value ALARM --query 'MetricAlarms[?starts_with(AlarmName, `austa-`)].AlarmName' --output text | wc -w || echo "0")
    if [ "$ALARMS_IN_ALARM" -eq 0 ]; then
        log_success "No CloudWatch alarms in ALARM state"
    else
        log_warning "$ALARMS_IN_ALARM CloudWatch alarms in ALARM state"
    fi
}

# Performance checks
check_performance() {
    print_header "Performance Health Checks"
    
    # Check API response time
    log_info "Checking API response time..."
    RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$API_ENDPOINT/health" || echo "999")
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
    if [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
        log_success "API response time: ${RESPONSE_TIME_MS}ms (< 3000ms target)"
    else
        log_error "API response time: ${RESPONSE_TIME_MS}ms (> 3000ms target)"
    fi
    
    # Check CPU usage
    log_info "Checking pod CPU usage..."
    HIGH_CPU_PODS=$(kubectl top pods -n "$NAMESPACE" --no-headers | awk '$2 > 800' | wc -l || echo "0")
    if [ "$HIGH_CPU_PODS" -eq 0 ]; then
        log_success "No pods with high CPU usage (>80%)"
    else
        log_warning "$HIGH_CPU_PODS pods with high CPU usage (>80%)"
    fi
    
    # Check memory usage
    log_info "Checking pod memory usage..."
    HIGH_MEM_PODS=$(kubectl top pods -n "$NAMESPACE" --no-headers | awk '$3 > 800' | wc -l || echo "0")
    if [ "$HIGH_MEM_PODS" -eq 0 ]; then
        log_success "No pods with high memory usage (>80%)"
    else
        log_warning "$HIGH_MEM_PODS pods with high memory usage (>80%)"
    fi
}

# Generate summary report
generate_summary() {
    print_header "Health Check Summary"
    
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Date: $(date)"
    echo ""
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo ""
    
    # Calculate health score
    if [ "$TOTAL_CHECKS" -gt 0 ]; then
        HEALTH_SCORE=$(echo "scale=2; ($PASSED_CHECKS * 100) / $TOTAL_CHECKS" | bc)
        echo "Health Score: ${HEALTH_SCORE}%"
        echo ""
        
        if [ "$FAILED_CHECKS" -eq 0 ]; then
            echo -e "${GREEN}✓ System is healthy!${NC}"
            exit 0
        elif [ "$FAILED_CHECKS" -lt 3 ]; then
            echo -e "${YELLOW}! System has minor issues${NC}"
            exit 1
        else
            echo -e "${RED}✗ System has critical issues${NC}"
            exit 2
        fi
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "AUSTA Care Platform Health Check"
    echo "========================================="
    
    # Update kubeconfig
    aws eks update-kubeconfig --name "austa-$ENVIRONMENT" --region us-east-1 2>/dev/null || true
    
    # Run all health checks
    check_aws_resources
    check_kubernetes_resources
    check_application_health
    check_security_health
    check_monitoring_health
    check_performance
    
    # Generate summary
    generate_summary
}

# Run main function
main