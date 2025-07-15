output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS instance address"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_master_username" {
  description = "RDS master username"
  value       = aws_db_instance.main.username
}

output "rds_secret_arn" {
  description = "ARN of the secret containing RDS credentials"
  value       = aws_secretsmanager_secret.rds_master.arn
}

output "read_replica_endpoint" {
  description = "Read replica endpoint"
  value       = var.create_read_replica ? aws_db_instance.read_replica[0].endpoint : null
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_secret_arn" {
  description = "ARN of the secret containing Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth.arn
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = var.create_documentdb ? aws_docdb_cluster.main[0].endpoint : null
}

output "documentdb_reader_endpoint" {
  description = "DocumentDB reader endpoint"
  value       = var.create_documentdb ? aws_docdb_cluster.main[0].reader_endpoint : null
}

output "documentdb_port" {
  description = "DocumentDB port"
  value       = var.create_documentdb ? aws_docdb_cluster.main[0].port : null
}

output "documentdb_secret_arn" {
  description = "ARN of the secret containing DocumentDB credentials"
  value       = var.create_documentdb ? aws_secretsmanager_secret.documentdb_master[0].arn : null
}

output "database_kms_key_id" {
  description = "KMS key ID used for database encryption"
  value       = aws_kms_key.database.id
}

output "database_kms_key_arn" {
  description = "KMS key ARN used for database encryption"
  value       = aws_kms_key.database.arn
}

output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.main.arn
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = aws_backup_plan.database.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for ElastiCache Redis"
  value       = aws_security_group.elasticache.id
}

output "documentdb_security_group_id" {
  description = "Security group ID for DocumentDB"
  value       = var.create_documentdb ? aws_security_group.documentdb[0].id : null
}