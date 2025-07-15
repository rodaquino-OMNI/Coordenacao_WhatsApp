output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.compute.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.compute.cluster_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.rds_endpoint
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.database.redis_primary_endpoint
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cdn_dns.cloudfront_distribution_domain_name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "name_servers" {
  description = "Name servers for the Route 53 hosted zone"
  value       = module.cdn_dns.name_servers
}

output "ecr_repositories" {
  description = "Map of ECR repository URLs"
  value = {
    api     = aws_ecr_repository.api.repository_url
    web     = aws_ecr_repository.web.repository_url
    worker  = aws_ecr_repository.worker.repository_url
  }
}

output "s3_buckets" {
  description = "Map of S3 bucket names"
  value = {
    assets  = module.storage.assets_bucket_id
    uploads = module.storage.uploads_bucket_id
    backups = module.storage.backups_bucket_id
    logs    = module.storage.logs_bucket_id
  }
}

output "monitoring_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.monitoring.dashboard_url
}

output "app_service_account_role_arn" {
  description = "ARN of the IAM role for the application service account"
  value       = module.security.app_service_account_role_arn
}