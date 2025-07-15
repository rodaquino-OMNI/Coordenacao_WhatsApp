output "secrets_kms_key_id" {
  description = "KMS key ID for Secrets Manager"
  value       = aws_kms_key.secrets.id
}

output "secrets_kms_key_arn" {
  description = "KMS key ARN for Secrets Manager"
  value       = aws_kms_key.secrets.arn
}

output "app_service_account_role_arn" {
  description = "ARN of the IAM role for the application service account"
  value       = aws_iam_role.app_service_account.arn
}

output "app_service_account_role_name" {
  description = "Name of the IAM role for the application service account"
  value       = aws_iam_role.app_service_account.name
}

output "alb_security_group_id" {
  description = "Security group ID for the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "api_keys_secret_arn" {
  description = "ARN of the secret containing API keys"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "security_hub_enabled" {
  description = "Whether Security Hub is enabled"
  value       = var.enable_security_hub
}

output "guardduty_detector_id" {
  description = "ID of the GuardDuty detector"
  value       = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null
}

output "config_recorder_name" {
  description = "Name of the Config recorder"
  value       = var.enable_config ? aws_config_configuration_recorder.main[0].name : null
}