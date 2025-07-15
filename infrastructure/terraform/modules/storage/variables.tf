variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets for EFS mount targets"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access EFS"
  type        = list(string)
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for uploads bucket"
  type        = list(string)
  default     = ["*"]
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 365
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 90
}

variable "efs_performance_mode" {
  description = "EFS performance mode"
  type        = string
  default     = "generalPurpose"
  
  validation {
    condition     = contains(["generalPurpose", "maxIO"], var.efs_performance_mode)
    error_message = "EFS performance mode must be either generalPurpose or maxIO"
  }
}

variable "efs_throughput_mode" {
  description = "EFS throughput mode"
  type        = string
  default     = "bursting"
  
  validation {
    condition     = contains(["bursting", "provisioned"], var.efs_throughput_mode)
    error_message = "EFS throughput mode must be either bursting or provisioned"
  }
}

variable "enable_efs_lifecycle_policy" {
  description = "Enable lifecycle policy to transition files to IA storage"
  type        = bool
  default     = true
}

variable "cloudfront_oai_arn" {
  description = "ARN of CloudFront Origin Access Identity for assets bucket"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}