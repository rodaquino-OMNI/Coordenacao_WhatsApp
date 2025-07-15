# Database Module for AUSTA Care Platform
# Creates RDS PostgreSQL, DocumentDB, ElastiCache Redis, and backup configurations

locals {
  db_identifier = "${var.project_name}-db"
  
  common_tags = merge(var.tags, {
    Module = "database"
    Terraform = "true"
  })
}

# KMS Key for Database Encryption
resource "aws_kms_key" "database" {
  description             = "KMS key for database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-database-kms"
  })
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.project_name}-database"
  target_key_id = aws_kms_key.database.key_id
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.db_identifier}-subnet-group"
  subnet_ids = var.database_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.db_identifier}-subnet-group"
  })
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${local.db_identifier}-rds-"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "PostgreSQL access from application"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.db_identifier}-rds-sg"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "postgresql" {
  name   = "${local.db_identifier}-pg14-params"
  family = "postgres14"
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"
  }
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  parameter {
    name  = "pgaudit.log"
    value = "ALL"
  }
  
  parameter {
    name  = "max_connections"
    value = "500"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.db_identifier}-parameter-group"
  })
}

# RDS Option Group
resource "aws_db_option_group" "postgresql" {
  name                     = "${local.db_identifier}-pg14-options"
  option_group_description = "Option group for PostgreSQL 14"
  engine_name              = "postgres"
  major_engine_version     = "14"
  
  tags = merge(local.common_tags, {
    Name = "${local.db_identifier}-option-group"
  })
}

# RDS Master Password
resource "random_password" "rds_master" {
  length  = 32
  special = true
}

# Store RDS password in Secrets Manager
resource "aws_secretsmanager_secret" "rds_master" {
  name_prefix = "${local.db_identifier}-master-password-"
  description = "Master password for RDS PostgreSQL"
  kms_key_id  = aws_kms_key.database.id
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "rds_master" {
  secret_id     = aws_secretsmanager_secret.rds_master.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.rds_master.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = local.db_identifier
  engine         = "postgres"
  engine_version = var.postgres_version
  
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database.arn
  
  db_name  = var.db_name
  username = var.db_username
  password = random_password.rds_master.result
  port     = 5432
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgresql.name
  option_group_name      = aws_db_option_group.postgresql.name
  
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  multi_az                       = var.multi_az
  auto_minor_version_upgrade     = false
  allow_major_version_upgrade    = false
  apply_immediately              = false
  deletion_protection            = var.deletion_protection
  skip_final_snapshot            = false
  final_snapshot_identifier      = "${local.db_identifier}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  copy_tags_to_snapshot          = true
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id      = aws_kms_key.database.arn
  
  tags = merge(local.common_tags, {
    Name = local.db_identifier
  })
}

# RDS Read Replica
resource "aws_db_instance" "read_replica" {
  count = var.create_read_replica ? 1 : 0
  
  identifier             = "${local.db_identifier}-read-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  
  instance_class         = var.read_replica_instance_class
  
  auto_minor_version_upgrade = false
  backup_retention_period    = 0
  multi_az                  = false
  
  skip_final_snapshot = true
  
  tags = merge(local.common_tags, {
    Name = "${local.db_identifier}-read-replica"
  })
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet-group"
  subnet_ids = var.database_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-cache-subnet-group"
  })
}

# ElastiCache Security Group
resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-elasticache-"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "Redis access from application"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-elasticache-sg"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-redis7-params"
  family = "redis7"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis-parameter-group"
  })
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-redis"
  replication_group_description = "Redis cluster for ${var.project_name}"
  
  engine               = "redis"
  engine_version       = var.redis_version
  node_type            = var.redis_node_type
  number_cache_clusters = var.redis_num_cache_clusters
  port                 = 6379
  
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.elasticache.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = random_password.redis_auth.result
  
  automatic_failover_enabled = var.redis_num_cache_clusters > 1
  multi_az_enabled          = var.redis_num_cache_clusters > 1
  
  snapshot_retention_limit = var.redis_snapshot_retention_limit
  snapshot_window         = var.redis_snapshot_window
  maintenance_window      = var.redis_maintenance_window
  
  notification_topic_arn = aws_sns_topic.database_alerts.arn
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis"
  })
}

# Redis Auth Token
resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name_prefix = "${var.project_name}-redis-auth-token-"
  description = "Auth token for ElastiCache Redis"
  kms_key_id  = aws_kms_key.database.id
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}/redis/slow-log"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.database.arn
  
  tags = local.common_tags
}

# DocumentDB Cluster (MongoDB-compatible)
resource "aws_docdb_cluster" "main" {
  count = var.create_documentdb ? 1 : 0
  
  cluster_identifier      = "${var.project_name}-docdb"
  engine                  = "docdb"
  engine_version          = var.documentdb_engine_version
  master_username         = var.documentdb_username
  master_password         = random_password.documentdb_master[0].result
  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.backup_window
  preferred_maintenance_window = var.maintenance_window
  
  db_subnet_group_name   = aws_docdb_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.documentdb[0].id]
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database.arn
  
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]
  
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-docdb-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-docdb"
  })
}

# DocumentDB Instances
resource "aws_docdb_cluster_instance" "main" {
  count = var.create_documentdb ? var.documentdb_instance_count : 0
  
  identifier         = "${var.project_name}-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main[0].id
  instance_class     = var.documentdb_instance_class
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-docdb-${count.index + 1}"
  })
}

# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  count = var.create_documentdb ? 1 : 0
  
  name       = "${var.project_name}-docdb-subnet-group"
  subnet_ids = var.database_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-docdb-subnet-group"
  })
}

# DocumentDB Security Group
resource "aws_security_group" "documentdb" {
  count = var.create_documentdb ? 1 : 0
  
  name_prefix = "${var.project_name}-docdb-"
  description = "Security group for DocumentDB"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "DocumentDB access from application"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-docdb-sg"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# DocumentDB Password
resource "random_password" "documentdb_master" {
  count   = var.create_documentdb ? 1 : 0
  length  = 32
  special = false
}

# Store DocumentDB password in Secrets Manager
resource "aws_secretsmanager_secret" "documentdb_master" {
  count = var.create_documentdb ? 1 : 0
  
  name_prefix = "${var.project_name}-docdb-master-password-"
  description = "Master password for DocumentDB"
  kms_key_id  = aws_kms_key.database.id
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "documentdb_master" {
  count = var.create_documentdb ? 1 : 0
  
  secret_id     = aws_secretsmanager_secret.documentdb_master[0].id
  secret_string = jsonencode({
    username = var.documentdb_username
    password = random_password.documentdb_master[0].result
    engine   = "docdb"
    host     = aws_docdb_cluster.main[0].endpoint
    port     = aws_docdb_cluster.main[0].port
  })
}

# SNS Topic for Database Alerts
resource "aws_sns_topic" "database_alerts" {
  name              = "${var.project_name}-database-alerts"
  kms_master_key_id = aws_kms_key.database.id
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-database-alerts"
  })
}

# RDS Event Subscription
resource "aws_db_event_subscription" "rds" {
  name      = "${local.db_identifier}-events"
  sns_topic = aws_sns_topic.database_alerts.arn
  
  source_type = "db-instance"
  source_ids  = [aws_db_instance.main.id]
  
  event_categories = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "low storage",
    "maintenance",
    "notification",
    "read replica",
    "recovery",
    "restoration",
  ]
  
  tags = local.common_tags
}

# Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-backup-vault"
  kms_key_arn = aws_kms_key.database.arn
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-backup-vault"
  })
}

# Backup Plan
resource "aws_backup_plan" "database" {
  name = "${var.project_name}-database-backup-plan"
  
  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"
    start_window      = 60
    completion_window = 120
    
    lifecycle {
      delete_after = 30
    }
    
    recovery_point_tags = local.common_tags
  }
  
  rule {
    rule_name         = "monthly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 1 * ? *)"
    start_window      = 60
    completion_window = 120
    
    lifecycle {
      delete_after = 365
    }
    
    recovery_point_tags = merge(local.common_tags, {
      Type = "monthly"
    })
  }
  
  tags = local.common_tags
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "backup.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

# Backup Selection
resource "aws_backup_selection" "database" {
  name         = "${var.project_name}-database-selection"
  plan_id      = aws_backup_plan.database.id
  iam_role_arn = aws_iam_role.backup.arn
  
  resources = compact([
    aws_db_instance.main.arn,
    var.create_documentdb ? aws_docdb_cluster.main[0].arn : "",
  ])
  
  tags = local.common_tags
}