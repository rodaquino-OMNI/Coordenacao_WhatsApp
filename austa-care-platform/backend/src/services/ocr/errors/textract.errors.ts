/**
 * Textract Error Classes
 * Comprehensive error handling for OCR processing
 */

export class TextractError extends Error {
  public readonly code: string;
  public readonly details: any;
  public readonly timestamp: Date;
  public readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  constructor(
    message: string,
    code: string,
    details: any = {},
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ) {
    super(message);
    this.name = 'TextractError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.severity = severity;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TextractError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      severity: this.severity,
      stack: this.stack
    };
  }
}

export class DocumentProcessingError extends TextractError {
  constructor(message: string, documentId: string, originalError?: Error) {
    super(
      message,
      'DOCUMENT_PROCESSING_ERROR',
      { documentId, originalError: originalError?.message },
      'HIGH'
    );
  }
}

export class ClassificationError extends TextractError {
  constructor(message: string, documentId: string, confidence: number) {
    super(
      message,
      'CLASSIFICATION_ERROR',
      { documentId, confidence },
      confidence < 0.3 ? 'HIGH' : 'MEDIUM'
    );
  }
}

export class ExtractionError extends TextractError {
  constructor(message: string, entityType: string, details: any = {}) {
    super(
      message,
      'EXTRACTION_ERROR',
      { entityType, ...details },
      'MEDIUM'
    );
  }
}

export class ValidationError extends TextractError {
  constructor(message: string, fieldName: string, value: any, expectedFormat?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      { fieldName, value, expectedFormat },
      'MEDIUM'
    );
  }
}

export class QualityError extends TextractError {
  constructor(message: string, qualityScore: number, issues: string[]) {
    super(
      message,
      'QUALITY_ERROR',
      { qualityScore, issues },
      qualityScore < 0.5 ? 'HIGH' : 'MEDIUM'
    );
  }
}

export class FHIRMappingError extends TextractError {
  constructor(message: string, resourceType: string, validationErrors: string[]) {
    super(
      message,
      'FHIR_MAPPING_ERROR',
      { resourceType, validationErrors },
      'MEDIUM'
    );
  }
}

export class S3Error extends TextractError {
  constructor(message: string, s3Key: string, operation: string) {
    super(
      message,
      'S3_ERROR',
      { s3Key, operation },
      'HIGH'
    );
  }
}

export class TextractAWSError extends TextractError {
  constructor(message: string, awsErrorCode: string, jobId?: string) {
    super(
      message,
      'TEXTRACT_AWS_ERROR',
      { awsErrorCode, jobId },
      'HIGH'
    );
  }
}

export class ConfigurationError extends TextractError {
  constructor(message: string, configKey: string) {
    super(
      message,
      'CONFIGURATION_ERROR',
      { configKey },
      'CRITICAL'
    );
  }
}

export class TimeoutError extends TextractError {
  constructor(message: string, timeoutMs: number, operation: string) {
    super(
      message,
      'TIMEOUT_ERROR',
      { timeoutMs, operation },
      'HIGH'
    );
  }
}

export class MedicalSafetyError extends TextractError {
  constructor(message: string, safetyIssue: string, details: any = {}) {
    super(
      message,
      'MEDICAL_SAFETY_ERROR',
      { safetyIssue, ...details },
      'CRITICAL'
    );
  }
}

export class ComplianceError extends TextractError {
  constructor(message: string, complianceType: 'HIPAA' | 'LGPD' | 'FDA', details: any = {}) {
    super(
      message,
      'COMPLIANCE_ERROR',
      { complianceType, ...details },
      'CRITICAL'
    );
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class TextractErrorFactory {
  static createDocumentError(
    error: any,
    context: { documentId?: string; s3Key?: string; operation?: string } = {}
  ): TextractError {
    if (error instanceof TextractError) {
      return error;
    }

    // AWS specific errors
    if (error.code) {
      switch (error.code) {
        case 'InvalidS3ObjectException':
          return new S3Error(
            `Invalid S3 object: ${error.message}`,
            context.s3Key || 'unknown',
            context.operation || 'read'
          );
        
        case 'UnsupportedDocumentException':
          return new DocumentProcessingError(
            `Unsupported document format: ${error.message}`,
            context.documentId || 'unknown',
            error
          );
        
        case 'ProvisionedThroughputExceededException':
          return new TextractAWSError(
            'AWS Textract throughput exceeded',
            error.code
          );
        
        case 'ThrottlingException':
          return new TextractAWSError(
            'AWS Textract throttling detected',
            error.code
          );
        
        case 'InternalServerError':
          return new TextractAWSError(
            'AWS Textract internal server error',
            error.code
          );
        
        default:
          return new TextractAWSError(
            error.message || 'Unknown AWS error',
            error.code
          );
      }
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
      return new TimeoutError(
        error.message || 'Operation timed out',
        30000, // Default timeout
        context.operation || 'unknown'
      );
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new TextractError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        { originalError: error.code },
        'HIGH'
      );
    }

    // Generic processing error
    return new DocumentProcessingError(
      error.message || 'Unknown processing error',
      context.documentId || 'unknown',
      error
    );
  }

  static createValidationError(
    fieldName: string,
    value: any,
    reason: string,
    expectedFormat?: string
  ): ValidationError {
    return new ValidationError(
      `Validation failed for ${fieldName}: ${reason}`,
      fieldName,
      value,
      expectedFormat
    );
  }

  static createQualityError(
    qualityScore: number,
    issues: string[],
    documentId?: string
  ): QualityError {
    return new QualityError(
      `Document quality below threshold (${qualityScore}): ${issues.join(', ')}`,
      qualityScore,
      issues
    );
  }

  static createMedicalSafetyError(
    issue: string,
    details: any = {},
    documentId?: string
  ): MedicalSafetyError {
    return new MedicalSafetyError(
      `Medical safety concern detected: ${issue}`,
      issue,
      { documentId, ...details }
    );
  }

  static createComplianceError(
    complianceType: 'HIPAA' | 'LGPD' | 'FDA',
    violation: string,
    details: any = {}
  ): ComplianceError {
    return new ComplianceError(
      `${complianceType} compliance violation: ${violation}`,
      complianceType,
      details
    );
  }
}

/**
 * Error handler utility
 */
export class TextractErrorHandler {
  static handle(error: any, context: any = {}): TextractError {
    const textractError = TextractErrorFactory.createDocumentError(error, context);
    
    // Log error based on severity
    switch (textractError.severity) {
      case 'CRITICAL':
        console.error('CRITICAL Textract Error:', textractError.toJSON());
        break;
      case 'HIGH':
        console.error('HIGH Textract Error:', textractError.toJSON());
        break;
      case 'MEDIUM':
        console.warn('MEDIUM Textract Error:', textractError.toJSON());
        break;
      case 'LOW':
        console.info('LOW Textract Error:', textractError.toJSON());
        break;
    }

    return textractError;
  }

  static isRetryable(error: TextractError): boolean {
    const retryableCodes = [
      'TIMEOUT_ERROR',
      'NETWORK_ERROR',
      'TEXTRACT_AWS_ERROR',
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'InternalServerError'
    ];

    return retryableCodes.includes(error.code) && error.severity !== 'CRITICAL';
  }

  static getRetryDelay(error: TextractError, attemptNumber: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    let delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;
    
    return Math.max(delay, 1000); // Minimum 1 second
  }

  static shouldEscalateToHuman(error: TextractError): boolean {
    const humanEscalationCodes = [
      'MEDICAL_SAFETY_ERROR',
      'COMPLIANCE_ERROR',
      'QUALITY_ERROR'
    ];

    return humanEscalationCodes.includes(error.code) || error.severity === 'CRITICAL';
  }

  static generateErrorReport(errors: TextractError[]): any {
    const report = {
      totalErrors: errors.length,
      bySeverity: {
        CRITICAL: errors.filter(e => e.severity === 'CRITICAL').length,
        HIGH: errors.filter(e => e.severity === 'HIGH').length,
        MEDIUM: errors.filter(e => e.severity === 'MEDIUM').length,
        LOW: errors.filter(e => e.severity === 'LOW').length
      },
      byCode: {} as { [key: string]: number },
      topErrors: errors
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(e => ({
          code: e.code,
          message: e.message,
          severity: e.severity,
          timestamp: e.timestamp
        })),
      recommendedActions: this.generateRecommendations(errors)
    };

    // Count by error code
    errors.forEach(error => {
      report.byCode[error.code] = (report.byCode[error.code] || 0) + 1;
    });

    return report;
  }

  private static generateRecommendations(errors: TextractError[]): string[] {
    const recommendations = new Set<string>();

    errors.forEach(error => {
      switch (error.code) {
        case 'QUALITY_ERROR':
          recommendations.add('Improve document scanning quality and resolution');
          break;
        case 'TEXTRACT_AWS_ERROR':
          recommendations.add('Review AWS service limits and configuration');
          break;
        case 'MEDICAL_SAFETY_ERROR':
          recommendations.add('Implement additional medical safety validation');
          break;
        case 'COMPLIANCE_ERROR':
          recommendations.add('Review compliance procedures and data handling');
          break;
        case 'TIMEOUT_ERROR':
          recommendations.add('Optimize processing pipeline and consider async processing');
          break;
        case 'VALIDATION_ERROR':
          recommendations.add('Enhance data validation rules and user guidance');
          break;
      }
    });

    return Array.from(recommendations);
  }
}