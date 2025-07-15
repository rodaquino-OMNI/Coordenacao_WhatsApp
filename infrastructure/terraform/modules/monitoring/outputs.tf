output "critical_alerts_topic_arn" {
  description = "ARN of the critical alerts SNS topic"
  value       = aws_sns_topic.critical_alerts.arn
}

output "warning_alerts_topic_arn" {
  description = "ARN of the warning alerts SNS topic"
  value       = aws_sns_topic.warning_alerts.arn
}

output "info_alerts_topic_arn" {
  description = "ARN of the info alerts SNS topic"
  value       = aws_sns_topic.info_alerts.arn
}

output "application_log_group_name" {
  description = "Name of the application CloudWatch log group"
  value       = aws_cloudwatch_log_group.application.name
}

output "eks_cluster_log_group_name" {
  description = "Name of the EKS cluster CloudWatch log group"
  value       = aws_cloudwatch_log_group.eks_cluster.name
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "canary_name" {
  description = "Name of the CloudWatch Synthetics canary"
  value       = aws_synthetics_canary.health_check.name
}

output "alarms" {
  description = "Map of all CloudWatch alarms"
  value = {
    eks_node_cpu     = aws_cloudwatch_metric_alarm.eks_node_cpu_high.alarm_name
    eks_node_memory  = aws_cloudwatch_metric_alarm.eks_node_memory_high.alarm_name
    rds_cpu          = aws_cloudwatch_metric_alarm.rds_cpu_high.alarm_name
    rds_connections  = aws_cloudwatch_metric_alarm.rds_connection_high.alarm_name
    rds_storage      = aws_cloudwatch_metric_alarm.rds_storage_low.alarm_name
    alb_response_time = aws_cloudwatch_metric_alarm.alb_response_time_high.alarm_name
    alb_5xx_errors   = aws_cloudwatch_metric_alarm.alb_5xx_high.alarm_name
    redis_cpu        = aws_cloudwatch_metric_alarm.redis_cpu_high.alarm_name
    redis_memory     = aws_cloudwatch_metric_alarm.redis_memory_high.alarm_name
    app_error_rate   = aws_cloudwatch_metric_alarm.application_error_rate_high.alarm_name
  }
}