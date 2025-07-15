# Monitoring Module for AUSTA Care Platform
# Creates CloudWatch dashboards, alarms, SNS topics, and log aggregation

locals {
  alarm_prefix = var.project_name
  
  common_tags = merge(var.tags, {
    Module = "monitoring"
    Terraform = "true"
  })
}

# SNS Topic for Critical Alerts
resource "aws_sns_topic" "critical_alerts" {
  name              = "${var.project_name}-critical-alerts"
  kms_master_key_id = var.kms_key_id
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-critical-alerts"
    AlertLevel = "critical"
  })
}

# SNS Topic for Warning Alerts
resource "aws_sns_topic" "warning_alerts" {
  name              = "${var.project_name}-warning-alerts"
  kms_master_key_id = var.kms_key_id
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-warning-alerts"
    AlertLevel = "warning"
  })
}

# SNS Topic for Info Alerts
resource "aws_sns_topic" "info_alerts" {
  name              = "${var.project_name}-info-alerts"
  kms_master_key_id = var.kms_key_id
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-info-alerts"
    AlertLevel = "info"
  })
}

# SNS Email Subscriptions
resource "aws_sns_topic_subscription" "critical_email" {
  for_each = toset(var.alert_email_addresses)
  
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "warning_email" {
  for_each = var.enable_warning_emails ? toset(var.alert_email_addresses) : toset([])
  
  topic_arn = aws_sns_topic.warning_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# CloudWatch Log Groups for Application
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/eks/${var.project_name}/application"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.project_name}/cluster"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id
  
  tags = local.common_tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-overview"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/EKS", "cluster_node_count", "ClusterName", var.eks_cluster_name],
            [".", "cluster_failed_node_count", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "EKS Cluster Nodes"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", ".", { stat = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "RDS Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix],
            [".", "RequestCount", ".", ".", { stat = "Sum" }],
            [".", "HTTPCode_Target_4XX_Count", ".", ".", { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", ".", ".", { stat = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Application Load Balancer"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.redis_cluster_id],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "ElastiCache Redis"
          period  = 300
        }
      }
    ]
  })
}

# EKS Node CPU Alarm
resource "aws_cloudwatch_metric_alarm" "eks_node_cpu_high" {
  alarm_name          = "${local.alarm_prefix}-eks-node-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = var.eks_node_cpu_threshold
  alarm_description   = "This metric monitors EKS node CPU utilization"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    ClusterName = var.eks_cluster_name
  }
  
  tags = local.common_tags
}

# EKS Node Memory Alarm
resource "aws_cloudwatch_metric_alarm" "eks_node_memory_high" {
  alarm_name          = "${local.alarm_prefix}-eks-node-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = var.eks_node_memory_threshold
  alarm_description   = "This metric monitors EKS node memory utilization"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    ClusterName = var.eks_cluster_name
  }
  
  tags = local.common_tags
}

# RDS CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.alarm_prefix}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_cpu_threshold
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  
  tags = local.common_tags
}

# RDS Connection Count Alarm
resource "aws_cloudwatch_metric_alarm" "rds_connection_high" {
  alarm_name          = "${local.alarm_prefix}-rds-connection-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_connection_threshold
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  
  tags = local.common_tags
}

# RDS Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${local.alarm_prefix}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_storage_threshold_bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  
  tags = local.common_tags
}

# ALB Target Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time_high" {
  alarm_name          = "${local.alarm_prefix}-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alb_response_time_threshold
  alarm_description   = "This metric monitors ALB target response time"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  
  tags = local.common_tags
}

# ALB 5XX Errors Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_high" {
  alarm_name          = "${local.alarm_prefix}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.alb_5xx_threshold
  alarm_description   = "This metric monitors ALB 5XX errors"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  
  tags = local.common_tags
}

# Redis CPU Alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${local.alarm_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.redis_cpu_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }
  
  tags = local.common_tags
}

# Redis Memory Alarm
resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${local.alarm_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.redis_memory_threshold
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }
  
  tags = local.common_tags
}

# CloudWatch Logs Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.project_name}-error-count"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[ERROR]"
  
  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.project_name}/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "warning_count" {
  name           = "${var.project_name}-warning-count"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[WARN]"
  
  metric_transformation {
    name      = "WarningCount"
    namespace = "${var.project_name}/Application"
    value     = "1"
  }
}

# Application Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "application_error_rate_high" {
  alarm_name          = "${local.alarm_prefix}-app-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = var.app_error_rate_threshold
  alarm_description   = "This metric monitors application error rate"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  treat_missing_data  = "notBreaching"
  
  metric_query {
    id          = "error_rate"
    expression  = "m1/m2*100"
    label       = "Error Rate"
    return_data = true
  }
  
  metric_query {
    id = "m1"
    metric {
      metric_name = "ErrorCount"
      namespace   = "${var.project_name}/Application"
      period      = 300
      stat        = "Sum"
    }
  }
  
  metric_query {
    id = "m2"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }
  
  tags = local.common_tags
}

# CloudWatch Synthetics Canary
resource "aws_synthetics_canary" "health_check" {
  name                 = "${var.project_name}-health-check"
  artifact_s3_location = "s3://${var.s3_bucket_name}/canary-artifacts"
  execution_role_arn   = aws_iam_role.canary.arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file            = data.archive_file.canary_script.output_path
  runtime_version      = "syn-nodejs-puppeteer-3.8"
  
  schedule {
    expression = "rate(5 minutes)"
  }
  
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.canary.id]
  }
  
  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
    active_tracing     = true
  }
  
  success_retention_period = 2
  failure_retention_period = 14
  
  tags = local.common_tags
}

# IAM Role for Canary
resource "aws_iam_role" "canary" {
  name = "${var.project_name}-canary-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "canary_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.canary.name
}

resource "aws_iam_role_policy_attachment" "canary_vpc" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  role       = aws_iam_role.canary.name
}

resource "aws_iam_role_policy" "canary_s3" {
  name = "${var.project_name}-canary-s3-policy"
  role = aws_iam_role.canary.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject"
      ]
      Resource = "arn:aws:s3:::${var.s3_bucket_name}/canary-artifacts/*"
    }]
  })
}

# Security Group for Canary
resource "aws_security_group" "canary" {
  name_prefix = "${var.project_name}-canary-"
  description = "Security group for CloudWatch Synthetics Canary"
  vpc_id      = var.vpc_id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-canary-sg"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# Canary Script Archive
data "archive_file" "canary_script" {
  type        = "zip"
  output_path = "${path.module}/canary-script.zip"
  
  source {
    content  = templatefile("${path.module}/canary-script.js", {
      endpoint_url = var.health_check_endpoint
    })
    filename = "nodejs/node_modules/apiCanaryBlueprint.js"
  }
}

# CloudWatch Events Rule for Automated Responses
resource "aws_cloudwatch_event_rule" "high_error_rate" {
  name        = "${var.project_name}-high-error-rate-response"
  description = "Trigger automated response for high error rate"
  
  event_pattern = jsonencode({
    source      = ["aws.cloudwatch"]
    detail-type = ["CloudWatch Alarm State Change"]
    detail = {
      alarmName = [aws_cloudwatch_metric_alarm.application_error_rate_high.alarm_name]
      state = {
        value = ["ALARM"]
      }
    }
  })
  
  tags = local.common_tags
}

data "aws_region" "current" {}