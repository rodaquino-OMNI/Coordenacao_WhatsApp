variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
}

variable "create_hosted_zone" {
  description = "Create a new Route 53 hosted zone"
  type        = bool
  default     = true
}

variable "hosted_zone_id" {
  description = "ID of existing Route 53 hosted zone (if not creating new)"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket for static assets"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
  
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "Invalid CloudFront price class"
  }
}

variable "geo_restriction_type" {
  description = "Type of geo restriction (whitelist or blacklist)"
  type        = string
  default     = "none"
  
  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restriction_type)
    error_message = "Geo restriction type must be none, whitelist, or blacklist"
  }
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with CloudFront"
  type        = string
  default     = ""
}

variable "logging_bucket_domain_name" {
  description = "Domain name of the S3 bucket for CloudFront logs"
  type        = string
}

variable "sns_topic_arns" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}