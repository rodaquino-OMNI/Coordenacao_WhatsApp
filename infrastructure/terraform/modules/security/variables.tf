variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
}

variable "eks_oidc_issuer_url" {
  description = "URL of the EKS OIDC issuer"
  type        = string
}

variable "app_namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "default"
}

variable "app_service_account_name" {
  description = "Name of the Kubernetes service account"
  type        = string
  default     = "app-service-account"
}

variable "s3_bucket_arns" {
  description = "ARNs of S3 buckets the application needs access to"
  type        = list(string)
  default     = []
}

variable "s3_kms_key_arn" {
  description = "ARN of the KMS key used for S3 encryption"
  type        = string
}

variable "secrets_arns" {
  description = "ARNs of secrets the application needs access to"
  type        = list(string)
  default     = []
}

variable "sns_topic_arns" {
  description = "ARNs of SNS topics the application needs access to"
  type        = list(string)
  default     = []
}

variable "sqs_queue_arns" {
  description = "ARNs of SQS queues the application needs access to"
  type        = list(string)
  default     = []
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF rule (requests per 5 minutes)"
  type        = number
  default     = 2000
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "waf_log_retention_days" {
  description = "Retention period for WAF logs"
  type        = number
  default     = 30
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config"
  type        = bool
  default     = true
}

variable "config_s3_bucket_name" {
  description = "S3 bucket name for AWS Config"
  type        = string
  default     = ""
}

variable "public_nacl_id" {
  description = "ID of the public subnet NACL"
  type        = string
  default     = ""
}

variable "enable_iam_password_policy" {
  description = "Enable strict IAM password policy"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}