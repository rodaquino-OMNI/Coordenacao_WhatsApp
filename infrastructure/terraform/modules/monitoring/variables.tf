variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets"
  type        = list(string)
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "alert_email_addresses" {
  description = "Email addresses to receive alerts"
  type        = list(string)
  default     = []
}

variable "enable_warning_emails" {
  description = "Enable email alerts for warnings"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Alarm Thresholds
variable "eks_node_cpu_threshold" {
  description = "CPU utilization threshold for EKS nodes (%)"
  type        = number
  default     = 80
}

variable "eks_node_memory_threshold" {
  description = "Memory utilization threshold for EKS nodes (%)"
  type        = number
  default     = 80
}

variable "rds_cpu_threshold" {
  description = "CPU utilization threshold for RDS (%)"
  type        = number
  default     = 80
}

variable "rds_connection_threshold" {
  description = "Connection count threshold for RDS"
  type        = number
  default     = 80
}

variable "rds_storage_threshold_bytes" {
  description = "Free storage threshold for RDS (bytes)"
  type        = number
  default     = 10737418240 # 10GB
}

variable "alb_response_time_threshold" {
  description = "Response time threshold for ALB (seconds)"
  type        = number
  default     = 1
}

variable "alb_5xx_threshold" {
  description = "5XX error count threshold for ALB"
  type        = number
  default     = 10
}

variable "redis_cpu_threshold" {
  description = "CPU utilization threshold for Redis (%)"
  type        = number
  default     = 80
}

variable "redis_memory_threshold" {
  description = "Memory utilization threshold for Redis (%)"
  type        = number
  default     = 80
}

variable "app_error_rate_threshold" {
  description = "Application error rate threshold (%)"
  type        = number
  default     = 5
}

# Resource Identifiers
variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "rds_instance_id" {
  description = "ID of the RDS instance"
  type        = string
}

variable "redis_cluster_id" {
  description = "ID of the Redis cluster"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket for monitoring artifacts"
  type        = string
}

variable "health_check_endpoint" {
  description = "Endpoint URL for health checks"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}