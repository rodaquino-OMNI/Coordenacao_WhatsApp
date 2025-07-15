output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_oai_id" {
  description = "ID of the CloudFront Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.main.id
}

output "cloudfront_oai_arn" {
  description = "ARN of the CloudFront Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.main.iam_arn
}

output "hosted_zone_id" {
  description = "ID of the Route 53 hosted zone"
  value       = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
}

output "name_servers" {
  description = "Name servers for the hosted zone"
  value       = var.create_hosted_zone ? aws_route53_zone.main[0].name_servers : []
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate for CloudFront"
  value       = aws_acm_certificate.cloudfront.arn
}

output "alb_certificate_arn" {
  description = "ARN of the ACM certificate for ALB"
  value       = aws_acm_certificate.alb.arn
}

output "health_check_id" {
  description = "ID of the Route 53 health check"
  value       = aws_route53_health_check.main.id
}

output "cloudfront_secret_arn" {
  description = "ARN of the secret containing CloudFront origin verification header"
  value       = aws_secretsmanager_secret.cloudfront_secret.arn
}

output "dns_records" {
  description = "Map of DNS records"
  value = {
    main = aws_route53_record.main.fqdn
    www  = aws_route53_record.www.fqdn
    api  = aws_route53_record.api.fqdn
  }
}

output "origin_request_policy_id" {
  description = "ID of the CloudFront origin request policy"
  value       = aws_cloudfront_origin_request_policy.api.id
}

output "cache_policy_id" {
  description = "ID of the CloudFront cache policy for static assets"
  value       = aws_cloudfront_cache_policy.static_assets.id
}