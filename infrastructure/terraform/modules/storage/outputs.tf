output "assets_bucket_id" {
  description = "ID of the assets bucket"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "ARN of the assets bucket"
  value       = aws_s3_bucket.assets.arn
}

output "assets_bucket_domain_name" {
  description = "Domain name of the assets bucket"
  value       = aws_s3_bucket.assets.bucket_domain_name
}

output "uploads_bucket_id" {
  description = "ID of the uploads bucket"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "ARN of the uploads bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "backups_bucket_id" {
  description = "ID of the backups bucket"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "ARN of the backups bucket"
  value       = aws_s3_bucket.backups.arn
}

output "logs_bucket_id" {
  description = "ID of the logs bucket"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "ARN of the logs bucket"
  value       = aws_s3_bucket.logs.arn
}

output "s3_kms_key_id" {
  description = "KMS key ID for S3 encryption"
  value       = aws_kms_key.s3.id
}

output "s3_kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  value       = aws_kms_key.s3.arn
}

output "s3_access_policy_arn" {
  description = "ARN of the IAM policy for S3 access"
  value       = aws_iam_policy.s3_access.arn
}

output "efs_file_system_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.main.id
}

output "efs_file_system_arn" {
  description = "ARN of the EFS file system"
  value       = aws_efs_file_system.main.arn
}

output "efs_file_system_dns_name" {
  description = "DNS name of the EFS file system"
  value       = aws_efs_file_system.main.dns_name
}

output "efs_mount_target_ids" {
  description = "IDs of the EFS mount targets"
  value       = aws_efs_mount_target.main[*].id
}

output "efs_security_group_id" {
  description = "Security group ID for EFS"
  value       = aws_security_group.efs.id
}

output "efs_access_points" {
  description = "Map of EFS access points"
  value = {
    app_data = {
      id  = aws_efs_access_point.app_data.id
      arn = aws_efs_access_point.app_data.arn
    }
    shared_storage = {
      id  = aws_efs_access_point.shared_storage.id
      arn = aws_efs_access_point.shared_storage.arn
    }
  }
}

output "efs_kms_key_id" {
  description = "KMS key ID for EFS encryption"
  value       = aws_kms_key.efs.id
}

output "buckets" {
  description = "Map of all S3 buckets"
  value = {
    assets = {
      id          = aws_s3_bucket.assets.id
      arn         = aws_s3_bucket.assets.arn
      domain_name = aws_s3_bucket.assets.bucket_domain_name
    }
    uploads = {
      id          = aws_s3_bucket.uploads.id
      arn         = aws_s3_bucket.uploads.arn
      domain_name = aws_s3_bucket.uploads.bucket_domain_name
    }
    backups = {
      id          = aws_s3_bucket.backups.id
      arn         = aws_s3_bucket.backups.arn
      domain_name = aws_s3_bucket.backups.bucket_domain_name
    }
    logs = {
      id          = aws_s3_bucket.logs.id
      arn         = aws_s3_bucket.logs.arn
      domain_name = aws_s3_bucket.logs.bucket_domain_name
    }
  }
}