/**
 * Monitoring Service
 * Performance monitoring and analytics for OCR processing
 */

import { 
  ProcessedDocument,
  MedicalDocumentType,
  ProcessingStatus 
} from '../types/medical-document.types';
import { TextractError } from '../errors/textract.errors';
import { MONITORING_CONFIG } from '../config/textract.config';
import { logger } from '../../../utils/logger';

interface ProcessingMetrics {
  documentId: string;
  documentType: MedicalDocumentType;
  processingTime: number;
  confidence: number;
  qualityScore: number;
  stagesCompleted: number;
  errorsCount: number;
  requiresHumanReview: boolean;
  timestamp: Date;
}

interface ErrorMetrics {
  documentId: string;
  error: TextractError;
  stagesCompleted: string[];
  processingTime: number;
  timestamp: Date;
}

interface PerformanceReport {
  timeframe: string;
  totalDocuments: number;
  successRate: number;
  averageProcessingTime: number;
  averageConfidence: number;
  averageQualityScore: number;
  documentTypes: { [key: string]: number };
  errorDistribution: { [key: string]: number };
  humanReviewRate: number;
  recommendations: string[];
}

export class MonitoringService {
  private metrics: ProcessingMetrics[] = [];
  private errorMetrics: ErrorMetrics[] = [];
  private performanceAlerts: any[] = [];

  constructor() {
    // Start metrics collection interval
    if (MONITORING_CONFIG.enableMetrics) {
      setInterval(() => {
        this.collectSystemMetrics();
      }, MONITORING_CONFIG.metricsInterval);
    }
  }

  /**
   * Record processing metrics for a successful document
   */
  async recordProcessingMetrics(metrics: Omit<ProcessingMetrics, 'timestamp'>): Promise<void> {
    const fullMetrics: ProcessingMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.metrics.push(fullMetrics);

    // Check for performance alerts
    await this.checkPerformanceAlerts(fullMetrics);

    // Log metrics
    logger.info('Processing metrics recorded', {
      documentId: metrics.documentId,
      documentType: metrics.documentType,
      processingTime: metrics.processingTime,
      confidence: metrics.confidence,
      qualityScore: metrics.qualityScore
    });

    // Cleanup old metrics (keep last 1000 entries)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Record error metrics for failed processing
   */
  async recordProcessingError(errorMetrics: Omit<ErrorMetrics, 'timestamp'>): Promise<void> {
    const fullErrorMetrics: ErrorMetrics = {
      ...errorMetrics,
      timestamp: new Date()
    };

    this.errorMetrics.push(fullErrorMetrics);

    // Log error metrics
    logger.error('Processing error recorded', {
      documentId: errorMetrics.documentId,
      errorCode: errorMetrics.error.code,
      errorMessage: errorMetrics.error.message,
      processingTime: errorMetrics.processingTime
    });

    // Check error rate alerts
    await this.checkErrorRateAlerts();

    // Cleanup old error metrics
    if (this.errorMetrics.length > 500) {
      this.errorMetrics = this.errorMetrics.slice(-500);
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeframeHours: number = 24): Promise<PerformanceReport> {
    const cutoffTime = new Date(Date.now() - (timeframeHours * 60 * 60 * 1000));
    
    // Filter metrics by timeframe
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const recentErrors = this.errorMetrics.filter(e => e.timestamp >= cutoffTime);

    const totalDocuments = recentMetrics.length + recentErrors.length;
    const successfulDocuments = recentMetrics.length;

    const report: PerformanceReport = {
      timeframe: `${timeframeHours} hours`,
      totalDocuments,
      successRate: totalDocuments > 0 ? successfulDocuments / totalDocuments : 0,
      averageProcessingTime: this.calculateAverageProcessingTime(recentMetrics),
      averageConfidence: this.calculateAverageConfidence(recentMetrics),
      averageQualityScore: this.calculateAverageQualityScore(recentMetrics),
      documentTypes: this.groupByDocumentType(recentMetrics),
      errorDistribution: this.groupErrorsByType(recentErrors),
      humanReviewRate: this.calculateHumanReviewRate(recentMetrics),
      recommendations: this.generateRecommendations(recentMetrics, recentErrors)
    };

    logger.info('Performance report generated', {
      timeframe: report.timeframe,
      totalDocuments: report.totalDocuments,
      successRate: report.successRate,
      averageProcessingTime: report.averageProcessingTime
    });

    return report;
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<{
    currentLoad: number;
    averageResponseTime: number;
    errorRate: number;
    queueDepth: number;
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  }> {
    const last5Minutes = new Date(Date.now() - (5 * 60 * 1000));
    const recentMetrics = this.metrics.filter(m => m.timestamp >= last5Minutes);
    const recentErrors = this.errorMetrics.filter(e => e.timestamp >= last5Minutes);

    const totalRequests = recentMetrics.length + recentErrors.length;
    const errorRate = totalRequests > 0 ? recentErrors.length / totalRequests : 0;
    const averageResponseTime = this.calculateAverageProcessingTime(recentMetrics);

    // Determine system health
    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    if (errorRate > MONITORING_CONFIG.alertThresholds.errorRate) {
      systemHealth = 'CRITICAL';
    } else if (averageResponseTime > MONITORING_CONFIG.alertThresholds.averageProcessingTime) {
      systemHealth = 'WARNING';
    }

    return {
      currentLoad: totalRequests,
      averageResponseTime,
      errorRate,
      queueDepth: 0, // Would be implemented with actual queue system
      systemHealth
    };
  }

  /**
   * Get document type analytics
   */
  async getDocumentTypeAnalytics(timeframeHours: number = 24): Promise<{
    documentTypes: Array<{
      type: MedicalDocumentType;
      count: number;
      averageConfidence: number;
      averageQualityScore: number;
      successRate: number;
      averageProcessingTime: number;
    }>;
  }> {
    const cutoffTime = new Date(Date.now() - (timeframeHours * 60 * 60 * 1000));
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const recentErrors = this.errorMetrics.filter(e => e.timestamp >= cutoffTime);

    const documentTypes = Object.values(MedicalDocumentType).map(type => {
      const typeMetrics = recentMetrics.filter(m => m.documentType === type);
      const typeErrors = recentErrors.filter(e => 
        e.error.details?.documentType === type
      );

      const totalCount = typeMetrics.length + typeErrors.length;
      
      return {
        type,
        count: totalCount,
        averageConfidence: this.calculateAverageConfidence(typeMetrics),
        averageQualityScore: this.calculateAverageQualityScore(typeMetrics),
        successRate: totalCount > 0 ? typeMetrics.length / totalCount : 0,
        averageProcessingTime: this.calculateAverageProcessingTime(typeMetrics)
      };
    }).filter(t => t.count > 0);

    return { documentTypes };
  }

  /**
   * Check performance alerts
   */
  private async checkPerformanceAlerts(metrics: ProcessingMetrics): Promise<void> {
    const alerts = [];

    // Check processing time alert
    if (metrics.processingTime > MONITORING_CONFIG.alertThresholds.averageProcessingTime) {
      alerts.push({
        type: 'SLOW_PROCESSING',
        message: `Document ${metrics.documentId} took ${metrics.processingTime}ms to process`,
        severity: 'WARNING',
        timestamp: new Date()
      });
    }

    // Check confidence alert
    if (metrics.confidence < MONITORING_CONFIG.alertThresholds.confidenceScore) {
      alerts.push({
        type: 'LOW_CONFIDENCE',
        message: `Document ${metrics.documentId} has low confidence score: ${metrics.confidence}`,
        severity: 'WARNING',
        timestamp: new Date()
      });
    }

    // Store alerts
    this.performanceAlerts.push(...alerts);

    // Log alerts
    for (const alert of alerts) {
      logger.warn('Performance alert triggered', alert);
    }
  }

  /**
   * Check error rate alerts
   */
  private async checkErrorRateAlerts(): Promise<void> {
    const last10Minutes = new Date(Date.now() - (10 * 60 * 1000));
    const recentMetrics = this.metrics.filter(m => m.timestamp >= last10Minutes);
    const recentErrors = this.errorMetrics.filter(e => e.timestamp >= last10Minutes);

    const totalRequests = recentMetrics.length + recentErrors.length;
    const errorRate = totalRequests > 0 ? recentErrors.length / totalRequests : 0;

    if (errorRate > MONITORING_CONFIG.alertThresholds.errorRate) {
      const alert = {
        type: 'HIGH_ERROR_RATE',
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold`,
        severity: 'CRITICAL',
        timestamp: new Date(),
        details: {
          errorRate,
          totalRequests,
          errors: recentErrors.length
        }
      };

      this.performanceAlerts.push(alert);
      logger.error('Error rate alert triggered', alert);
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    if (!MONITORING_CONFIG.enableMetrics) return;

    const systemMetrics = {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      activeDocuments: this.getActiveDocumentCount(),
      queueDepth: 0 // Would be implemented with actual queue system
    };

    logger.debug('System metrics collected', systemMetrics);
  }

  /**
   * Utility methods
   */
  private calculateAverageProcessingTime(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
  }

  private calculateAverageConfidence(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;
  }

  private calculateAverageQualityScore(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
  }

  private calculateHumanReviewRate(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    const humanReviewCount = metrics.filter(m => m.requiresHumanReview).length;
    return humanReviewCount / metrics.length;
  }

  private groupByDocumentType(metrics: ProcessingMetrics[]): { [key: string]: number } {
    return metrics.reduce((acc, m) => {
      acc[m.documentType] = (acc[m.documentType] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private groupErrorsByType(errorMetrics: ErrorMetrics[]): { [key: string]: number } {
    return errorMetrics.reduce((acc, e) => {
      acc[e.error.code] = (acc[e.error.code] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private generateRecommendations(
    metrics: ProcessingMetrics[],
    errors: ErrorMetrics[]
  ): string[] {
    const recommendations = [];

    // Check processing time
    const avgProcessingTime = this.calculateAverageProcessingTime(metrics);
    if (avgProcessingTime > 30000) { // 30 seconds
      recommendations.push('Consider optimizing processing pipeline for better performance');
    }

    // Check confidence scores
    const avgConfidence = this.calculateAverageConfidence(metrics);
    if (avgConfidence < 0.8) {
      recommendations.push('Document quality appears low - consider improving scanning procedures');
    }

    // Check human review rate
    const humanReviewRate = this.calculateHumanReviewRate(metrics);
    if (humanReviewRate > 0.3) { // 30%
      recommendations.push('High human review rate - consider adjusting confidence thresholds');
    }

    // Check error patterns
    const errorTypes = this.groupErrorsByType(errors);
    const mostCommonError = Object.entries(errorTypes).sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonError && mostCommonError[1] > 5) {
      switch (mostCommonError[0]) {
        case 'QUALITY_ERROR':
          recommendations.push('Frequent quality issues - review document scanning guidelines');
          break;
        case 'TEXTRACT_AWS_ERROR':
          recommendations.push('AWS service issues detected - check service limits and configuration');
          break;
        case 'CLASSIFICATION_ERROR':
          recommendations.push('Document classification issues - consider updating classification models');
          break;
      }
    }

    return recommendations;
  }

  private getActiveDocumentCount(): number {
    // In a real implementation, this would check active processing jobs
    return 0;
  }

  /**
   * Export metrics for external analysis
   */
  async exportMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      errors: this.errorMetrics,
      alerts: this.performanceAlerts
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Convert to CSV format
      return this.convertToCSV(exportData);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for metrics
    const headers = ['timestamp', 'documentId', 'documentType', 'processingTime', 'confidence', 'qualityScore'];
    const rows = data.metrics.map((m: ProcessingMetrics) => [
      m.timestamp.toISOString(),
      m.documentId,
      m.documentType,
      m.processingTime,
      m.confidence,
      m.qualityScore
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get health check status
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }> {
    const checks = [];

    // Check recent error rate
    const recentMetrics = await this.getRealTimeMetrics();
    checks.push({
      name: 'error_rate',
      status: recentMetrics.errorRate < 0.05 ? 'pass' : 'fail',
      message: `Current error rate: ${(recentMetrics.errorRate * 100).toFixed(2)}%`
    });

    // Check processing time
    checks.push({
      name: 'processing_time',
      status: recentMetrics.averageResponseTime < 30000 ? 'pass' : 'warn',
      message: `Average processing time: ${recentMetrics.averageResponseTime}ms`
    });

    // Check system health
    checks.push({
      name: 'system_health',
      status: recentMetrics.systemHealth === 'HEALTHY' ? 'pass' : 'warn',
      message: `System health: ${recentMetrics.systemHealth}`
    });

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failedChecks > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks
    };
  }
}