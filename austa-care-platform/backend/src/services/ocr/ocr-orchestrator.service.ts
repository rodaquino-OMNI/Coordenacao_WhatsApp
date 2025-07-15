/**
 * OCR Orchestrator Service
 * Main service that coordinates all OCR processing components
 */

import { v4 as uuidv4 } from 'uuid';
import { TextractService } from './textract/textract.service';
import { MedicalDocumentClassifierService } from './medical/document-classifier.service';
import { MedicalEntityExtractorService } from './medical/medical-entity-extractor.service';
import { FHIRMapperService } from './processors/fhir-mapper.service';
import { MonitoringService } from './monitoring/monitoring.service';
import {
  ProcessedDocument,
  TextractProcessingOptions,
  ProcessingStatus,
  MedicalDocumentType,
  DocumentUrgency,
  ValidationError
} from './types/medical-document.types';
import { 
  TextractError,
  TextractErrorHandler,
  MedicalSafetyError,
  ComplianceError 
} from './errors/textract.errors';
import { 
  DEFAULT_PROCESSING_OPTIONS,
  CONFIDENCE_THRESHOLDS,
  LGPD_COMPLIANCE_CONFIG,
  ERROR_HANDLING_CONFIG 
} from './config/textract.config';
import { logger } from '../../utils/logger';

export interface OCRProcessingResult {
  document: ProcessedDocument;
  fhirResources?: any[];
  validationResults: {
    passed: boolean;
    errors: ValidationError[];
    warnings: string[];
  };
  processingMetrics: {
    totalTime: number;
    confidence: number;
    qualityScore: number;
    stagesCompleted: string[];
    errors: any[];
  };
}

export class OCROrchestrator {
  private textractService: TextractService;
  private classifierService: MedicalDocumentClassifierService;
  private entityExtractor: MedicalEntityExtractorService;
  private fhirMapper: FHIRMapperService;
  private monitoring: MonitoringService;

  constructor() {
    this.textractService = new TextractService();
    this.classifierService = new MedicalDocumentClassifierService();
    this.entityExtractor = new MedicalEntityExtractorService();
    this.fhirMapper = new FHIRMapperService();
    this.monitoring = new MonitoringService();
  }

  /**
   * Process a document through the complete OCR pipeline
   */
  async processDocument(
    s3Key: string,
    options: Partial<TextractProcessingOptions> = {}
  ): Promise<OCRProcessingResult> {
    const processingOptions = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
    const startTime = Date.now();
    const documentId = uuidv4();

    logger.info('Starting OCR processing pipeline', {
      documentId,
      s3Key,
      options: processingOptions
    });

    const stagesCompleted: string[] = [];
    const errors: any[] = [];
    let document: ProcessedDocument;

    try {
      // Stage 1: AWS Textract Processing
      logger.info('Stage 1: AWS Textract extraction', { documentId });
      document = await this.textractService.processDocument(s3Key, processingOptions);
      stagesCompleted.push('textract_extraction');

      // Stage 2: Document Classification
      logger.info('Stage 2: Document classification', { documentId });
      const classificationResult = await this.classifierService.classifyDocument(document.blocks);
      document.documentType = classificationResult.documentType;
      document.processingHistory.push({
        timestamp: new Date(),
        event: 'DOCUMENT_CLASSIFIED',
        details: classificationResult
      });
      stagesCompleted.push('document_classification');

      // Stage 3: Urgency Assessment
      logger.info('Stage 3: Urgency assessment', { documentId });
      document.urgency = this.classifierService.assessUrgency(
        document.documentType,
        document.blocks,
        document.medicalEntities
      );
      stagesCompleted.push('urgency_assessment');

      // Stage 4: Quality Assessment
      logger.info('Stage 4: Quality assessment', { documentId });
      const qualityAssessment = this.classifierService.assessQuality(
        document.blocks,
        { pages: document.pages }
      );
      document.qualityScore = qualityAssessment.overallScore;
      
      if (qualityAssessment.overallScore < CONFIDENCE_THRESHOLDS.QUALITY_ASSESSMENT) {
        document.requiresHumanReview = true;
        document.reviewNotes = `Quality issues: ${qualityAssessment.issues.join(', ')}`;
      }
      stagesCompleted.push('quality_assessment');

      // Stage 5: Medical Entity Extraction
      logger.info('Stage 5: Medical entity extraction', { documentId });
      document.medicalEntities = await this.entityExtractor.extractMedicalEntities(
        document.blocks,
        document.documentType
      );
      stagesCompleted.push('medical_entity_extraction');

      // Stage 6: Structured Data Extraction (Lab Results, Prescriptions)
      logger.info('Stage 6: Structured data extraction', { documentId });
      if (document.documentType === MedicalDocumentType.LAB_RESULTS) {
        document.labResults = await this.entityExtractor.extractLabResults(document.blocks);
      }
      if (document.documentType === MedicalDocumentType.PRESCRIPTION) {
        document.prescriptions = await this.entityExtractor.extractPrescriptions(document.blocks);
      }
      stagesCompleted.push('structured_data_extraction');

      // Stage 7: Medical Safety Validation
      logger.info('Stage 7: Medical safety validation', { documentId });
      const safetyValidation = await this.performMedicalSafetyValidation(document);
      document.validationErrors.push(...safetyValidation.errors);
      if (safetyValidation.requiresReview) {
        document.requiresHumanReview = true;
      }
      stagesCompleted.push('medical_safety_validation');

      // Stage 8: LGPD Compliance Check
      logger.info('Stage 8: LGPD compliance check', { documentId });
      const complianceCheck = await this.performLGPDComplianceCheck(document);
      if (!complianceCheck.compliant) {
        document.validationErrors.push(...complianceCheck.violations);
      }
      stagesCompleted.push('lgpd_compliance_check');

      // Stage 9: FHIR Mapping (if enabled)
      let fhirResources: any[] = [];
      if (processingOptions.generateFHIR) {
        logger.info('Stage 9: FHIR mapping', { documentId });
        fhirResources = await this.fhirMapper.mapDocumentToFHIR(document);
        document.fhirResources = fhirResources;
        stagesCompleted.push('fhir_mapping');
      }

      // Stage 10: Final Validation
      logger.info('Stage 10: Final validation', { documentId });
      const finalValidation = await this.performFinalValidation(document);
      document.validationErrors.push(...finalValidation.errors);
      stagesCompleted.push('final_validation');

      // Update final status
      document.status = this.determineFinalStatus(document);
      document.processingEndTime = new Date();

      // Record metrics
      await this.monitoring.recordProcessingMetrics({
        documentId: document.id,
        documentType: document.documentType,
        processingTime: Date.now() - startTime,
        confidence: document.overallConfidence,
        qualityScore: document.qualityScore,
        stagesCompleted: stagesCompleted.length,
        errorsCount: errors.length,
        requiresHumanReview: document.requiresHumanReview
      });

      const processingResult: OCRProcessingResult = {
        document,
        fhirResources: processingOptions.generateFHIR ? fhirResources : undefined,
        validationResults: {
          passed: document.validationErrors.length === 0,
          errors: document.validationErrors,
          warnings: qualityAssessment.issues
        },
        processingMetrics: {
          totalTime: Date.now() - startTime,
          confidence: document.overallConfidence,
          qualityScore: document.qualityScore,
          stagesCompleted,
          errors
        }
      };

      logger.info('OCR processing pipeline completed successfully', {
        documentId,
        status: document.status,
        confidence: document.overallConfidence,
        qualityScore: document.qualityScore,
        processingTime: Date.now() - startTime
      });

      return processingResult;

    } catch (error) {
      const textractError = TextractErrorHandler.handle(error, {
        documentId,
        s3Key,
        operation: 'ocr_processing'
      });

      errors.push(textractError);

      // Record failure metrics
      await this.monitoring.recordProcessingError({
        documentId,
        error: textractError,
        stagesCompleted,
        processingTime: Date.now() - startTime
      });

      logger.error('OCR processing pipeline failed', {
        documentId,
        error: textractError.message,
        stagesCompleted,
        processingTime: Date.now() - startTime
      });

      throw textractError;
    }
  }

  /**
   * Process document with retry logic
   */
  async processDocumentWithRetry(
    s3Key: string,
    options: Partial<TextractProcessingOptions> = {},
    maxRetries: number = ERROR_HANDLING_CONFIG.maxRetries
  ): Promise<OCRProcessingResult> {
    let lastError: TextractError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Processing attempt ${attempt}/${maxRetries}`, { s3Key });
        return await this.processDocument(s3Key, options);
        
      } catch (error) {
        lastError = error instanceof TextractError ? error : TextractErrorHandler.handle(error);
        
        if (attempt === maxRetries || !TextractErrorHandler.isRetryable(lastError)) {
          logger.error(`Final processing attempt failed`, {
            s3Key,
            attempt,
            error: lastError.message
          });
          break;
        }

        const retryDelay = TextractErrorHandler.getRetryDelay(lastError, attempt);
        logger.warn(`Processing attempt ${attempt} failed, retrying in ${retryDelay}ms`, {
          s3Key,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw lastError!;
  }

  /**
   * Batch process multiple documents
   */
  async batchProcessDocuments(
    s3Keys: string[],
    options: Partial<TextractProcessingOptions> = {}
  ): Promise<{ results: OCRProcessingResult[]; errors: any[] }> {
    const results: OCRProcessingResult[] = [];
    const errors: any[] = [];

    logger.info('Starting batch OCR processing', {
      documentCount: s3Keys.length,
      options
    });

    const promises = s3Keys.map(async (s3Key) => {
      try {
        const result = await this.processDocumentWithRetry(s3Key, options);
        results.push(result);
      } catch (error) {
        errors.push({
          s3Key,
          error: error instanceof TextractError ? error.toJSON() : error.message
        });
      }
    });

    await Promise.allSettled(promises);

    logger.info('Batch OCR processing completed', {
      totalDocuments: s3Keys.length,
      successful: results.length,
      failed: errors.length
    });

    return { results, errors };
  }

  /**
   * Perform medical safety validation
   */
  private async performMedicalSafetyValidation(document: ProcessedDocument): Promise<{
    errors: ValidationError[];
    requiresReview: boolean;
  }> {
    const errors: ValidationError[] = [];
    let requiresReview = false;

    // Check for critical lab values
    if (document.labResults) {
      for (const labResult of document.labResults) {
        if (labResult.flag === 'CRITICAL') {
          errors.push({
            type: 'MEDICAL_SAFETY',
            field: 'labResult',
            message: `Critical lab value detected: ${labResult.testName} = ${labResult.value}`,
            severity: 'ERROR',
            confidence: labResult.confidence
          });
          requiresReview = true;
        }
      }
    }

    // Check for drug interactions in prescriptions
    if (document.prescriptions && document.prescriptions.length > 1) {
      const drugInteractionCheck = await this.checkDrugInteractions(document.prescriptions);
      if (drugInteractionCheck.hasInteractions) {
        errors.push({
          type: 'MEDICAL_SAFETY',
          field: 'prescriptions',
          message: `Potential drug interactions detected: ${drugInteractionCheck.interactions.join(', ')}`,
          severity: 'WARNING',
          confidence: 0.8
        });
        requiresReview = true;
      }
    }

    // Check for suspicious patterns
    const medicalEntities = document.medicalEntities;
    const suspiciousPatterns = this.detectSuspiciousPatterns(medicalEntities);
    if (suspiciousPatterns.length > 0) {
      errors.push({
        type: 'MEDICAL_SAFETY',
        field: 'medicalEntities',
        message: `Suspicious medical patterns detected: ${suspiciousPatterns.join(', ')}`,
        severity: 'WARNING',
        confidence: 0.7
      });
    }

    return { errors, requiresReview };
  }

  /**
   * Perform LGPD compliance check
   */
  private async performLGPDComplianceCheck(document: ProcessedDocument): Promise<{
    compliant: boolean;
    violations: ValidationError[];
  }> {
    const violations: ValidationError[] = [];

    // Check data minimization
    if (LGPD_COMPLIANCE_CONFIG.enableDataMinimization) {
      const unnecessaryData = this.identifyUnnecessaryData(document);
      if (unnecessaryData.length > 0) {
        violations.push({
          type: 'COMPLIANCE',
          field: 'dataMinimization',
          message: `Unnecessary personal data detected: ${unnecessaryData.join(', ')}`,
          severity: 'WARNING',
          confidence: 0.8
        });
      }
    }

    // Check retention period
    const documentType = document.documentType;
    const retentionPeriod = LGPD_COMPLIANCE_CONFIG.retentionPeriods[documentType];
    if (retentionPeriod) {
      document.processingHistory.push({
        timestamp: new Date(),
        event: 'RETENTION_PERIOD_SET',
        details: { retentionDays: retentionPeriod }
      });
    }

    // Check for automatic redaction needs
    if (LGPD_COMPLIANCE_CONFIG.anonymization.enableAutoRedaction) {
      const redactionNeeded = this.identifyRedactionNeeds(document);
      if (redactionNeeded.length > 0) {
        violations.push({
          type: 'COMPLIANCE',
          field: 'anonymization',
          message: `Data requiring redaction detected: ${redactionNeeded.join(', ')}`,
          severity: 'INFO',
          confidence: 0.9
        });
      }
    }

    return {
      compliant: violations.filter(v => v.severity === 'ERROR').length === 0,
      violations
    };
  }

  /**
   * Perform final validation
   */
  private async performFinalValidation(document: ProcessedDocument): Promise<{
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];

    // Validate confidence thresholds
    if (document.overallConfidence < CONFIDENCE_THRESHOLDS.HUMAN_REVIEW_REQUIRED) {
      errors.push({
        type: 'CONFIDENCE_LOW',
        field: 'overallConfidence',
        message: `Overall confidence ${document.overallConfidence} below threshold ${CONFIDENCE_THRESHOLDS.HUMAN_REVIEW_REQUIRED}`,
        severity: 'WARNING',
        confidence: document.overallConfidence
      });
    }

    // Validate required fields based on document type
    const requiredFields = this.getRequiredFieldsForDocumentType(document.documentType);
    for (const field of requiredFields) {
      if (!this.hasRequiredField(document, field)) {
        errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          field: field,
          message: `Required field ${field} not found in document`,
          severity: 'ERROR',
          confidence: 0.9
        });
      }
    }

    // Validate FHIR resources if generated
    if (document.fhirResources) {
      const fhirValidation = await this.fhirMapper.validateResources(document.fhirResources);
      if (!fhirValidation.valid) {
        errors.push({
          type: 'INVALID_FORMAT',
          field: 'fhirResources',
          message: `FHIR validation errors: ${fhirValidation.errors.join(', ')}`,
          severity: 'ERROR',
          confidence: 0.9
        });
      }
    }

    return { errors };
  }

  /**
   * Determine final processing status
   */
  private determineFinalStatus(document: ProcessedDocument): ProcessingStatus {
    const criticalErrors = document.validationErrors.filter(e => e.severity === 'ERROR');
    
    if (criticalErrors.length > 0) {
      return ProcessingStatus.FAILED;
    }
    
    if (document.requiresHumanReview) {
      return ProcessingStatus.HUMAN_REVIEW;
    }
    
    if (document.validationErrors.length > 0) {
      return ProcessingStatus.VALIDATED; // Has warnings but no critical errors
    }
    
    return ProcessingStatus.COMPLETED;
  }

  /**
   * Utility methods
   */
  private async checkDrugInteractions(prescriptions: any[]): Promise<{
    hasInteractions: boolean;
    interactions: string[];
  }> {
    // Simplified drug interaction check
    // In production, this would integrate with a comprehensive drug database
    const interactions: string[] = [];
    
    // Common interaction patterns
    const interactionPairs = [
      ['warfarin', 'aspirin'],
      ['digoxin', 'amiodarone'],
      ['statins', 'gemfibrozil']
    ];
    
    const medicationNames = prescriptions.map(p => p.medicationName.toLowerCase());
    
    for (const pair of interactionPairs) {
      if (pair.every(drug => medicationNames.some(med => med.includes(drug)))) {
        interactions.push(`${pair[0]} + ${pair[1]}`);
      }
    }
    
    return {
      hasInteractions: interactions.length > 0,
      interactions
    };
  }

  private detectSuspiciousPatterns(medicalEntities: any[]): string[] {
    const suspicious: string[] = [];
    
    // Check for unusually high medication dosages
    const dosageEntities = medicalEntities.filter(e => e.category === 'DOSAGE');
    for (const entity of dosageEntities) {
      if (entity.normalizedValue && parseFloat(entity.normalizedValue) > 1000) {
        suspicious.push(`High dosage: ${entity.text}`);
      }
    }
    
    // Check for conflicting information
    const diagnosisEntities = medicalEntities.filter(e => e.category === 'DIAGNOSIS');
    if (diagnosisEntities.length > 5) {
      suspicious.push('Unusually high number of diagnoses');
    }
    
    return suspicious;
  }

  private identifyUnnecessaryData(document: ProcessedDocument): string[] {
    const unnecessary: string[] = [];
    
    // Check for non-medical personal information
    const patientEntities = document.medicalEntities.filter(e => e.category === 'PATIENT_INFO');
    
    for (const entity of patientEntities) {
      if (entity.type === 'PATIENT_ADDRESS' && document.documentType !== MedicalDocumentType.INSURANCE_CARD) {
        unnecessary.push('Patient address');
      }
      if (entity.type === 'PATIENT_PHONE' && document.documentType === MedicalDocumentType.LAB_RESULTS) {
        unnecessary.push('Patient phone number');
      }
    }
    
    return unnecessary;
  }

  private identifyRedactionNeeds(document: ProcessedDocument): string[] {
    const redactionNeeded: string[] = [];
    
    if (LGPD_COMPLIANCE_CONFIG.anonymization.redactSSN) {
      const cpfEntities = document.medicalEntities.filter(e => e.type === 'PATIENT_CPF');
      if (cpfEntities.length > 0) {
        redactionNeeded.push('CPF numbers');
      }
    }
    
    if (LGPD_COMPLIANCE_CONFIG.anonymization.redactPhoneNumbers) {
      // Check for phone number patterns in text
      const hasPhoneNumbers = document.blocks.some(block => 
        /\(\d{2}\)\s?\d{4,5}-?\d{4}/.test(block.text || '')
      );
      if (hasPhoneNumbers) {
        redactionNeeded.push('Phone numbers');
      }
    }
    
    return redactionNeeded;
  }

  private getRequiredFieldsForDocumentType(documentType: MedicalDocumentType): string[] {
    const requiredFields: { [key in MedicalDocumentType]: string[] } = {
      [MedicalDocumentType.LAB_RESULTS]: ['patientInfo', 'labResults', 'dateCollected'],
      [MedicalDocumentType.PRESCRIPTION]: ['patientInfo', 'prescriptions', 'prescriber'],
      [MedicalDocumentType.MEDICAL_REPORT]: ['patientInfo', 'diagnosis', 'provider'],
      [MedicalDocumentType.IMAGING_RESULTS]: ['patientInfo', 'imagingFindings', 'radiologist'],
      [MedicalDocumentType.INSURANCE_CARD]: ['memberInfo', 'policyInfo', 'coverageDetails'],
      [MedicalDocumentType.DISCHARGE_SUMMARY]: ['patientInfo', 'dischargeDiagnosis', 'instructions'],
      [MedicalDocumentType.CONSULTATION_NOTES]: ['patientInfo', 'chiefComplaint', 'assessment'],
      [MedicalDocumentType.VACCINATION_RECORD]: ['patientInfo', 'vaccinations', 'administrationDate'],
      [MedicalDocumentType.AUTHORIZATION_FORM]: ['patientInfo', 'requestedService', 'authorization'],
      [MedicalDocumentType.UNKNOWN]: []
    };
    
    return requiredFields[documentType] || [];
  }

  private hasRequiredField(document: ProcessedDocument, field: string): boolean {
    // Simplified field existence check
    // In production, this would be more sophisticated
    switch (field) {
      case 'patientInfo':
        return document.medicalEntities.some(e => e.category === 'PATIENT_INFO');
      case 'labResults':
        return document.labResults && document.labResults.length > 0;
      case 'prescriptions':
        return document.prescriptions && document.prescriptions.length > 0;
      default:
        return true; // Assume field exists for now
    }
  }

  /**
   * Get processing status for a document
   */
  async getProcessingStatus(documentId: string): Promise<{
    status: ProcessingStatus;
    progress: number;
    currentStage: string;
  }> {
    // This would typically query a database or cache
    // For now, return a mock response
    return {
      status: ProcessingStatus.PROCESSING,
      progress: 50,
      currentStage: 'medical_entity_extraction'
    };
  }

  /**
   * Cancel processing for a document
   */
  async cancelProcessing(documentId: string): Promise<boolean> {
    logger.info('Cancelling OCR processing', { documentId });
    
    // Implementation would depend on the actual processing state management
    // For now, return success
    return true;
  }
}