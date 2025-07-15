# CDN and DNS Module for AUSTA Care Platform
# Creates CloudFront distributions, Route 53 zones and records

locals {
  domain_name = var.domain_name
  
  common_tags = merge(var.tags, {
    Module = "cdn-dns"
    Terraform = "true"
  })
}

# Route 53 Hosted Zone
resource "aws_route53_zone" "main" {
  count = var.create_hosted_zone ? 1 : 0
  
  name = local.domain_name
  
  tags = merge(local.common_tags, {
    Name = local.domain_name
  })
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1
  
  domain_name               = local.domain_name
  subject_alternative_names = ["*.${local.domain_name}"]
  validation_method         = "DNS"
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-cloudfront-cert"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# ACM Certificate for ALB (in the main region)
resource "aws_acm_certificate" "alb" {
  domain_name               = local.domain_name
  subject_alternative_names = ["*.${local.domain_name}", "api.${local.domain_name}"]
  validation_method         = "DNS"
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-alb-cert"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# DNS Validation Records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
}

resource "aws_route53_record" "cert_validation_alb" {
  for_each = {
    for dvo in aws_acm_certificate.alb.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "cloudfront" {
  provider = aws.us_east_1
  
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_acm_certificate_validation" "alb" {
  certificate_arn         = aws_acm_certificate.alb.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation_alb : record.fqdn]
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${var.project_name}"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-CloudFront-Secret"
      value = random_password.cloudfront_secret.result
    }
  }
  
  origin {
    domain_name = var.s3_bucket_domain_name
    origin_id   = "s3-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CloudFront Distribution"
  default_root_object = "index.html"
  
  aliases = [local.domain_name, "www.${local.domain_name}"]
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "alb-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Accept", "Origin", "Referer"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 31536000
    compress               = true
  }
  
  # Static Assets Cache Behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "s3-origin"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }
  
  # API Cache Behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }
  
  price_class = var.cloudfront_price_class
  
  restrictions {
    geo_restriction {
      restriction_type = length(var.geo_restriction_locations) > 0 ? var.geo_restriction_type : "none"
      locations        = var.geo_restriction_locations
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  web_acl_id = var.waf_web_acl_arn
  
  logging_config {
    include_cookies = false
    bucket          = var.logging_bucket_domain_name
    prefix          = "cloudfront/"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-cf-distribution"
  })
}

# CloudFront Secret for Origin Verification
resource "random_password" "cloudfront_secret" {
  length  = 32
  special = true
}

# Store CloudFront secret in Secrets Manager
resource "aws_secretsmanager_secret" "cloudfront_secret" {
  name_prefix = "${var.project_name}-cf-secret-"
  description = "CloudFront origin verification secret"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "cloudfront_secret" {
  secret_id     = aws_secretsmanager_secret.cloudfront_secret.id
  secret_string = random_password.cloudfront_secret.result
}

# Route 53 Records
resource "aws_route53_record" "main" {
  zone_id = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
  name    = local.domain_name
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
  name    = "www.${local.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.hosted_zone_id
  name    = "api.${local.domain_name}"
  type    = "A"
  
  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Health Check
resource "aws_route53_health_check" "main" {
  fqdn              = "api.${local.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-health-check"
  })
}

# CloudWatch Alarm for Health Check
resource "aws_cloudwatch_metric_alarm" "health_check" {
  alarm_name          = "${var.project_name}-route53-health-check"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "This metric monitors Route 53 health check"
  alarm_actions       = var.sns_topic_arns
  
  dimensions = {
    HealthCheckId = aws_route53_health_check.main.id
  }
  
  tags = local.common_tags
}

# Origin Request Policy
resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.project_name}-api-origin-request-policy"
  comment = "Origin request policy for API endpoints"
  
  cookies_config {
    cookie_behavior = "all"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Charset",
        "Accept-Encoding",
        "Accept-Language",
        "Authorization",
        "Content-Type",
        "Origin",
        "Referer",
        "User-Agent",
        "X-Forwarded-For",
        "X-Forwarded-Host",
        "X-Forwarded-Proto"
      ]
    }
  }
  
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Cache Policy
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets-cache-policy"
  comment     = "Cache policy for static assets"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    
    headers_config {
      header_behavior = "none"
    }
    
    query_strings_config {
      query_string_behavior = "none"
    }
    
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}