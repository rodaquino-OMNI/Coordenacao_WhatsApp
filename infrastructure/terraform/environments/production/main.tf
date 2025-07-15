# Production Environment Configuration for AUSTA Care Platform

locals {
  project_name = "austacare"
  environment  = "production"
  region       = "us-west-2"
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}

# Configure Terraform Backend
terraform {
  backend "s3" {
    bucket         = "austacare-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "austacare-terraform-lock"
  }
}

# Configure AWS Provider
provider "aws" {
  region = local.region
  
  default_tags {
    tags = local.common_tags
  }
}

# Provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = local.common_tags
  }
}

# Networking Module
module "networking" {
  source = "../../modules/networking"
  
  project_name             = local.project_name
  vpc_cidr                 = "10.0.0.0/16"
  enable_nat_gateway       = true
  single_nat_gateway       = false
  enable_vpc_flow_logs     = true
  flow_log_retention_days  = 30
  
  tags = local.common_tags
}

# Compute Module
module "compute" {
  source = "../../modules/compute"
  
  project_name        = local.project_name
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  public_subnet_ids   = module.networking.public_subnet_ids
  kubernetes_version  = "1.28"
  enable_public_access = false
  node_volume_size    = 100
  
  node_groups = {
    general = {
      desired_size   = 3
      max_size       = 10
      min_size       = 2
      instance_types = ["m6i.large", "m6a.large"]
      capacity_type  = "ON_DEMAND"
      labels = {
        workload = "general"
      }
      taints = []
      tags   = {}
    }
    spot = {
      desired_size   = 2
      max_size       = 20
      min_size       = 0
      instance_types = ["m6i.large", "m6a.large", "m5.large", "m5a.large"]
      capacity_type  = "SPOT"
      labels = {
        workload = "spot"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NoSchedule"
      }]
      tags = {}
    }
  }
  
  tags = local.common_tags
}

# Database Module
module "database" {
  source = "../../modules/database"
  
  project_name            = local.project_name
  vpc_id                  = module.networking.vpc_id
  database_subnet_ids     = module.networking.database_subnet_ids
  allowed_security_groups = [module.compute.node_security_group_id]
  
  # RDS Configuration
  db_instance_class           = "db.r6i.xlarge"
  db_allocated_storage        = 500
  postgres_version            = "14.9"
  multi_az                    = true
  backup_retention_period     = 30
  deletion_protection         = true
  create_read_replica         = true
  read_replica_instance_class = "db.r6i.large"
  
  # Redis Configuration
  redis_node_type                = "cache.r6g.large"
  redis_num_cache_clusters       = 3
  redis_snapshot_retention_limit = 7
  
  # DocumentDB Configuration
  create_documentdb         = true
  documentdb_instance_class = "db.r6g.large"
  documentdb_instance_count = 3
  
  tags = local.common_tags
}

# Storage Module
module "storage" {
  source = "../../modules/storage"
  
  project_name                = local.project_name
  vpc_id                      = module.networking.vpc_id
  private_subnet_ids          = module.networking.private_subnet_ids
  allowed_security_groups     = [module.compute.node_security_group_id]
  cors_allowed_origins        = ["https://austacare.com", "https://www.austacare.com"]
  backup_retention_days       = 365
  log_retention_days          = 90
  efs_performance_mode        = "generalPurpose"
  efs_throughput_mode         = "bursting"
  enable_efs_lifecycle_policy = true
  cloudfront_oai_arn          = module.cdn_dns.cloudfront_oai_arn
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "../../modules/security"
  
  project_name              = local.project_name
  vpc_id                    = module.networking.vpc_id
  eks_oidc_provider_arn     = module.compute.oidc_provider_arn
  eks_oidc_issuer_url       = module.compute.cluster_oidc_issuer_url
  app_namespace             = "production"
  app_service_account_name  = "austacare-app"
  s3_bucket_arns            = [
    module.storage.assets_bucket_arn,
    module.storage.uploads_bucket_arn
  ]
  s3_kms_key_arn            = module.storage.s3_kms_key_arn
  secrets_arns              = [
    module.database.rds_secret_arn,
    module.database.redis_secret_arn
  ]
  sns_topic_arns            = [module.monitoring.critical_alerts_topic_arn]
  waf_rate_limit            = 2000
  blocked_countries         = []
  waf_log_retention_days    = 30
  enable_security_hub       = true
  enable_guardduty          = true
  enable_config             = true
  config_s3_bucket_name     = module.storage.logs_bucket_id
  enable_iam_password_policy = true
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"
  
  project_name              = local.project_name
  vpc_id                    = module.networking.vpc_id
  private_subnet_ids        = module.networking.private_subnet_ids
  kms_key_id                = module.security.secrets_kms_key_id
  alert_email_addresses     = ["ops@austacare.com", "security@austacare.com"]
  enable_warning_emails     = true
  log_retention_days        = 30
  eks_cluster_name          = module.compute.cluster_id
  rds_instance_id           = module.database.rds_endpoint
  redis_cluster_id          = module.database.redis_primary_endpoint
  alb_arn_suffix            = aws_lb.main.arn_suffix
  s3_bucket_name            = module.storage.logs_bucket_id
  health_check_endpoint     = "api.austacare.com"
  
  # Alarm thresholds
  eks_node_cpu_threshold       = 80
  eks_node_memory_threshold    = 80
  rds_cpu_threshold            = 75
  rds_connection_threshold     = 400
  rds_storage_threshold_bytes  = 53687091200  # 50GB
  alb_response_time_threshold  = 1
  alb_5xx_threshold            = 10
  redis_cpu_threshold          = 75
  redis_memory_threshold       = 80
  app_error_rate_threshold     = 5
  
  tags = local.common_tags
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.security.alb_security_group_id]
  subnets            = module.networking.public_subnet_ids
  
  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  access_logs {
    bucket  = module.storage.logs_bucket_id
    prefix  = "alb"
    enabled = true
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.project_name}-alb"
  })
}

# ALB Target Group
resource "aws_lb_target_group" "main" {
  name        = "${local.project_name}-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = module.networking.vpc_id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  deregistration_delay = 30
  
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.project_name}-tg"
  })
}

# ALB Listener (HTTPS)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = module.cdn_dns.alb_certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
  
  depends_on = [module.cdn_dns]
}

# ALB Listener (HTTP redirect)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# CDN and DNS Module
module "cdn_dns" {
  source = "../../modules/cdn-dns"
  
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
  
  project_name               = local.project_name
  domain_name                = "austacare.com"
  create_hosted_zone         = true
  alb_dns_name               = aws_lb.main.dns_name
  alb_zone_id                = aws_lb.main.zone_id
  s3_bucket_domain_name      = module.storage.assets_bucket_domain_name
  cloudfront_price_class     = "PriceClass_100"
  geo_restriction_type       = "none"
  geo_restriction_locations  = []
  waf_web_acl_arn           = module.security.waf_web_acl_arn
  logging_bucket_domain_name = module.storage.logs_bucket_domain_name
  sns_topic_arns            = [module.monitoring.critical_alerts_topic_arn]
  
  tags = local.common_tags
}

# WAF Association with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = module.security.waf_web_acl_arn
}