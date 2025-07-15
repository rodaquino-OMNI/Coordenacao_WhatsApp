/**
 * OCR Result Formatters
 * Utilities for formatting OCR results for different consumers
 */

import { 
  ProcessedDocument, 
  LabResult, 
  Prescription, 
  MedicalEntity,
  ProcessingStatus,
  MedicalDocumentType 
} from '../types/medical-document.types';
import { OCRProcessingResult } from '../ocr-orchestrator.service';

export interface FormattedOCRResult {
  id: string;
  status: ProcessingStatus;
  documentType: MedicalDocumentType;
  confidence: number;
  qualityScore: number;
  processingTime: number;
  extractedData: any;
  validation: {
    passed: boolean;
    errors: number;
    warnings: number;
  };
  metadata: {
    pages: number;
    fileSize: number;
    originalFileName: string;
    processingDate: string;
  };
}

export interface MedicalSummary {
  patientInfo: {
    name?: string;
    cpf?: string;
    cns?: string;
  };
  providerInfo: {
    name?: string;
    crm?: string;
    specialty?: string;
  };
  clinicalData: {
    diagnoses: string[];
    medications: string[];
    labValues: Array<{
      test: string;
      value: string;
      flag?: string;
    }>;
    procedures: string[];
  };
  documentMetadata: {
    type: string;
    date?: string;
    urgency: string;
    confidence: number;
  };
}

/**
 * Format OCR results for API response
 */
export function formatOCRResults(
  result: OCRProcessingResult,
  format: 'summary' | 'detailed' | 'fhir' = 'summary'
): FormattedOCRResult {
  const document = result.document;

  const baseResult: FormattedOCRResult = {
    id: document.id,
    status: document.status,
    documentType: document.documentType,
    confidence: document.overallConfidence,
    qualityScore: document.qualityScore,
    processingTime: result.processingMetrics.totalTime,
    extractedData: {},
    validation: {
      passed: result.validationResults.passed,
      errors: result.validationResults.errors.filter(e => e.severity === 'ERROR').length,
      warnings: result.validationResults.errors.filter(e => e.severity === 'WARNING').length
    },
    metadata: {
      pages: document.pages,
      fileSize: 0, // Would be populated from actual file metadata
      originalFileName: document.originalFileName,
      processingDate: document.processingStartTime.toISOString()
    }
  };

  switch (format) {
    case 'summary':
      baseResult.extractedData = formatSummaryData(document);
      break;
    
    case 'detailed':
      baseResult.extractedData = formatDetailedData(document);
      break;
    
    case 'fhir':
      baseResult.extractedData = {
        fhirResources: result.fhirResources || [],
        resourceCount: result.fhirResources?.length || 0
      };
      break;
  }

  return baseResult;
}

/**
 * Format medical summary for clinical review
 */
export function formatMedicalSummary(document: ProcessedDocument): MedicalSummary {
  const patientEntities = document.medicalEntities.filter(e => e.category === 'PATIENT_INFO');
  const providerEntities = document.medicalEntities.filter(e => e.category === 'PROVIDER_INFO');
  const diagnosisEntities = document.medicalEntities.filter(e => e.category === 'DIAGNOSIS');
  const medicationEntities = document.medicalEntities.filter(e => e.category === 'MEDICATION');

  return {
    patientInfo: {
      name: patientEntities.find(e => e.type === 'PATIENT_NAME')?.normalizedValue,
      cpf: patientEntities.find(e => e.type === 'PATIENT_CPF')?.normalizedValue,
      cns: patientEntities.find(e => e.type === 'PATIENT_CNS')?.normalizedValue
    },
    providerInfo: {
      name: providerEntities.find(e => e.type === 'PROVIDER_NAME')?.normalizedValue,
      crm: providerEntities.find(e => e.type === 'PROVIDER_LICENSE')?.normalizedValue,
      specialty: providerEntities.find(e => e.type === 'PROVIDER_SPECIALTY')?.normalizedValue
    },
    clinicalData: {
      diagnoses: diagnosisEntities.map(e => e.text),
      medications: medicationEntities.map(e => e.text),
      labValues: (document.labResults || []).map(lab => ({
        test: lab.testName,
        value: `${lab.value} ${lab.unit || ''}`.trim(),
        flag: lab.flag !== 'NORMAL' ? lab.flag : undefined
      })),
      procedures: document.medicalEntities
        .filter(e => e.type === 'PROCEDURE')
        .map(e => e.text)
    },
    documentMetadata: {
      type: document.documentType,
      date: document.processingStartTime.toISOString().split('T')[0],
      urgency: document.urgency || 'MEDIUM',
      confidence: document.overallConfidence
    }
  };
}

/**
 * Format results for authorization workflow integration
 */
export function formatForAuthorizationWorkflow(document: ProcessedDocument): {
  documentId: string;
  documentType: string;
  extractedData: any;
  requiredFields: string[];
  missingFields: string[];
  confidence: number;
  requiresManualReview: boolean;
  validationStatus: 'APPROVED' | 'REJECTED' | 'REQUIRES_REVIEW';
} {
  const requiredFields = getRequiredFieldsForAuthorization(document.documentType);
  const extractedFields = getExtractedFields(document);
  const missingFields = requiredFields.filter(field => !extractedFields.includes(field));

  let validationStatus: 'APPROVED' | 'REJECTED' | 'REQUIRES_REVIEW' = 'APPROVED';
  
  if (missingFields.length > 0 || document.overallConfidence < 0.8) {
    validationStatus = 'REQUIRES_REVIEW';
  }
  
  if (document.validationErrors.some(e => e.severity === 'ERROR')) {
    validationStatus = 'REJECTED';
  }

  return {
    documentId: document.id,
    documentType: document.documentType,
    extractedData: formatDetailedData(document),
    requiredFields,
    missingFields,
    confidence: document.overallConfidence,
    requiresManualReview: document.requiresHumanReview,
    validationStatus
  };
}

/**
 * Format results for FHIR export
 */
export function formatForFHIRExport(
  document: ProcessedDocument,
  fhirResources: any[]
): {
  bundle: any;
  metadata: any;
} {
  const bundle = {
    resourceType: 'Bundle',
    id: `bundle-${document.id}`,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle']
    },
    type: 'document',
    timestamp: document.processingStartTime.toISOString(),
    entry: fhirResources.map((resource, index) => ({
      fullUrl: `urn:uuid:${resource.id}`,
      resource: resource
    }))
  };

  const metadata = {
    documentId: document.id,
    originalFileName: document.originalFileName,
    processingDate: document.processingStartTime.toISOString(),
    confidence: document.overallConfidence,
    qualityScore: document.qualityScore,
    resourceCount: fhirResources.length,
    resourceTypes: [...new Set(fhirResources.map(r => r.resourceType))]
  };

  return { bundle, metadata };
}

/**
 * Format results for quality assurance review
 */
export function formatForQualityReview(document: ProcessedDocument): {
  documentSummary: any;
  qualityMetrics: any;
  extractionResults: any;
  reviewRecommendations: string[];
} {
  const qualityMetrics = {
    overallConfidence: document.overallConfidence,
    qualityScore: document.qualityScore,
    textCoverage: calculateTextCoverage(document.blocks),
    structuredDataFound: hasStructuredData(document.blocks),
    medicalEntitiesCount: document.medicalEntities.length,
    validationErrors: document.validationErrors.length
  };

  const reviewRecommendations = generateQualityRecommendations(document);

  return {
    documentSummary: {
      id: document.id,
      type: document.documentType,
      pages: document.pages,
      processingTime: document.processingEndTime 
        ? document.processingEndTime.getTime() - document.processingStartTime.getTime()
        : null,
      status: document.status
    },
    qualityMetrics,
    extractionResults: formatDetailedData(document),
    reviewRecommendations
  };
}

/**
 * Format results for analytics and reporting
 */
export function formatForAnalytics(document: ProcessedDocument): {
  documentId: string;
  timestamp: string;
  documentType: string;
  processingMetrics: any;
  extractionMetrics: any;
  qualityMetrics: any;
  errorMetrics: any;
} {
  return {
    documentId: document.id,
    timestamp: document.processingStartTime.toISOString(),
    documentType: document.documentType,
    processingMetrics: {
      totalTime: document.processingEndTime 
        ? document.processingEndTime.getTime() - document.processingStartTime.getTime()
        : null,
      stagesCompleted: document.processingHistory.length,
      requiresHumanReview: document.requiresHumanReview
    },
    extractionMetrics: {
      blocksExtracted: document.blocks.length,
      formsExtracted: document.forms.length,
      tablesExtracted: document.tables.length,
      medicalEntities: document.medicalEntities.length,
      labResults: document.labResults?.length || 0,
      prescriptions: document.prescriptions?.length || 0
    },
    qualityMetrics: {
      overallConfidence: document.overallConfidence,
      qualityScore: document.qualityScore,
      textCoverage: calculateTextCoverage(document.blocks)
    },
    errorMetrics: {
      totalErrors: document.validationErrors.length,
      errorsByType: document.validationErrors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      errorsBySeverity: document.validationErrors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    }
  };
}

/**
 * Format summary data
 */
function formatSummaryData(document: ProcessedDocument): any {
  const summary: any = {
    documentType: document.documentType,
    urgency: document.urgency,
    confidence: document.overallConfidence,
    qualityScore: document.qualityScore
  };

  // Add type-specific summary data
  switch (document.documentType) {
    case MedicalDocumentType.LAB_RESULTS:
      summary.labResults = (document.labResults || []).map(lab => ({
        test: lab.testName,
        value: lab.value,
        unit: lab.unit,
        flag: lab.flag,
        confidence: lab.confidence
      }));
      break;

    case MedicalDocumentType.PRESCRIPTION:
      summary.prescriptions = (document.prescriptions || []).map(rx => ({
        medication: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        prescriber: rx.prescriber,
        confidence: rx.confidence
      }));
      break;

    case MedicalDocumentType.MEDICAL_REPORT:
    case MedicalDocumentType.CONSULTATION_NOTES:
      summary.medicalEntities = document.medicalEntities.map(entity => ({
        type: entity.type,
        category: entity.category,
        text: entity.text,
        confidence: entity.confidence
      }));
      break;

    default:
      summary.extractedText = document.blocks
        .filter(block => block.blockType === 'LINE')
        .map(block => block.text)
        .join(' ')
        .substring(0, 500) + '...'; // Truncate for summary
  }

  // Add patient and provider info if available
  const patientEntity = document.medicalEntities.find(e => e.category === 'PATIENT_INFO');
  const providerEntity = document.medicalEntities.find(e => e.category === 'PROVIDER_INFO');

  if (patientEntity) {
    summary.patientFound = true;
  }

  if (providerEntity) {
    summary.providerFound = true;
  }

  return summary;
}

/**
 * Format detailed data
 */
function formatDetailedData(document: ProcessedDocument): any {
  return {
    textBlocks: document.blocks,
    forms: document.forms,
    tables: document.tables,
    medicalEntities: document.medicalEntities,
    labResults: document.labResults,
    prescriptions: document.prescriptions,
    processingHistory: document.processingHistory,
    validationErrors: document.validationErrors
  };
}

/**
 * Helper functions
 */
function getRequiredFieldsForAuthorization(documentType: MedicalDocumentType): string[] {
  const requiredFields: { [key in MedicalDocumentType]: string[] } = {
    [MedicalDocumentType.LAB_RESULTS]: ['patientInfo', 'labValues', 'laboratoryInfo', 'dateCollected'],
    [MedicalDocumentType.PRESCRIPTION]: ['patientInfo', 'medications', 'prescriber', 'dateIssued'],
    [MedicalDocumentType.MEDICAL_REPORT]: ['patientInfo', 'diagnosis', 'provider', 'dateOfService'],
    [MedicalDocumentType.IMAGING_RESULTS]: ['patientInfo', 'imagingModality', 'findings', 'radiologist'],
    [MedicalDocumentType.INSURANCE_CARD]: ['memberInfo', 'policyNumber', 'groupNumber', 'coverageInfo'],
    [MedicalDocumentType.DISCHARGE_SUMMARY]: ['patientInfo', 'dischargeDiagnosis', 'attendingPhysician'],
    [MedicalDocumentType.CONSULTATION_NOTES]: ['patientInfo', 'chiefComplaint', 'assessment', 'plan'],
    [MedicalDocumentType.VACCINATION_RECORD]: ['patientInfo', 'vaccineInfo', 'administrationDate'],
    [MedicalDocumentType.AUTHORIZATION_FORM]: ['patientInfo', 'requestedService', 'providerInfo'],
    [MedicalDocumentType.UNKNOWN]: []
  };

  return requiredFields[documentType] || [];
}

function getExtractedFields(document: ProcessedDocument): string[] {
  const extractedFields: string[] = [];

  if (document.medicalEntities.some(e => e.category === 'PATIENT_INFO')) {
    extractedFields.push('patientInfo');
  }

  if (document.medicalEntities.some(e => e.category === 'PROVIDER_INFO')) {
    extractedFields.push('provider', 'providerInfo');
  }

  if (document.labResults && document.labResults.length > 0) {
    extractedFields.push('labValues', 'laboratoryInfo');
  }

  if (document.prescriptions && document.prescriptions.length > 0) {
    extractedFields.push('medications', 'prescriber');
  }

  if (document.medicalEntities.some(e => e.category === 'DIAGNOSIS')) {
    extractedFields.push('diagnosis');
  }

  // Add more field detection logic as needed

  return extractedFields;
}

function calculateTextCoverage(blocks: any[]): number {
  const totalBlocks = blocks.length;
  const textBlocks = blocks.filter(block => block.blockType === 'WORD' && block.text).length;
  
  return totalBlocks > 0 ? textBlocks / totalBlocks : 0;
}

function hasStructuredData(blocks: any[]): boolean {
  return blocks.some(block => 
    block.blockType === 'TABLE' || 
    block.blockType === 'KEY_VALUE_SET' ||
    block.blockType === 'SELECTION_ELEMENT'
  );
}

function generateQualityRecommendations(document: ProcessedDocument): string[] {
  const recommendations: string[] = [];

  if (document.overallConfidence < 0.8) {
    recommendations.push('Low overall confidence - consider manual review');
  }

  if (document.qualityScore < 0.7) {
    recommendations.push('Poor image quality detected - consider rescanning document');
  }

  if (document.medicalEntities.length < 5) {
    recommendations.push('Few medical entities extracted - verify document content relevance');
  }

  if (document.validationErrors.length > 3) {
    recommendations.push('Multiple validation errors - requires careful review');
  }

  const textCoverage = calculateTextCoverage(document.blocks);
  if (textCoverage < 0.5) {
    recommendations.push('Low text coverage - document may be incomplete or corrupted');
  }

  return recommendations;
}

/**
 * Export formatted results to different formats
 */
export function exportToCSV(documents: ProcessedDocument[]): string {
  const headers = [
    'Document ID',
    'Document Type',
    'Processing Date',
    'Confidence',
    'Quality Score',
    'Status',
    'Patient Found',
    'Provider Found',
    'Lab Results Count',
    'Prescriptions Count',
    'Validation Errors'
  ];

  const rows = documents.map(doc => [
    doc.id,
    doc.documentType,
    doc.processingStartTime.toISOString(),
    doc.overallConfidence.toFixed(3),
    doc.qualityScore.toFixed(3),
    doc.status,
    doc.medicalEntities.some(e => e.category === 'PATIENT_INFO') ? 'Yes' : 'No',
    doc.medicalEntities.some(e => e.category === 'PROVIDER_INFO') ? 'Yes' : 'No',
    doc.labResults?.length || 0,
    doc.prescriptions?.length || 0,
    doc.validationErrors.length
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export function exportToExcel(documents: ProcessedDocument[]): any {
  // Would integrate with a library like exceljs for Excel export
  return {
    message: 'Excel export functionality would be implemented with exceljs library',
    documentCount: documents.length
  };
}