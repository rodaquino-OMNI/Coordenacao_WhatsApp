/**
 * AWS Textract Configuration
 * Comprehensive configuration for medical document processing
 */

import { TextractConfiguration, TextractProcessingOptions } from '../types/medical-document.types';

export const TEXTRACT_CONFIG: TextractConfiguration = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucketName: process.env.AWS_S3_BUCKET || 'austa-care-documents',
  maxPages: parseInt(process.env.TEXTRACT_MAX_PAGES || '50'),
  confidenceThreshold: parseFloat(process.env.TEXTRACT_CONFIDENCE_THRESHOLD || '0.85'),
  timeoutMs: parseInt(process.env.TEXTRACT_TIMEOUT_MS || '300000') // 5 minutes
};

export const DEFAULT_PROCESSING_OPTIONS: TextractProcessingOptions = {
  enableForms: true,
  enableTables: true,
  enableQueries: true,
  customQueries: [
    'What is the patient name?',
    'What is the date of service?',
    'What medications are prescribed?',
    'What are the lab results?',
    'What is the diagnosis?',
    'What is the provider name?',
    'What is the insurance information?'
  ],
  confidenceThreshold: TEXTRACT_CONFIG.confidenceThreshold,
  enableMedicalEntityRecognition: true,
  requireHumanReview: false,
  generateFHIR: true,
  performQualityCheck: true
};

export const MEDICAL_DOCUMENT_PATTERNS = {
  LAB_RESULTS: {
    keywords: ['lab', 'laboratory', 'test result', 'blood work', 'analysis', 'specimen'],
    patterns: [
      /\b(CBC|Complete Blood Count)\b/i,
      /\b(glucose|cholesterol|triglycerides)\b/i,
      /\b(hemoglobin|hematocrit|platelet)\b/i,
      /\b(normal|abnormal|high|low|critical)\b/i,
      /\b(\d+\.?\d*)\s*(mg\/dl|mmol\/l|g\/dl|%)\b/i
    ],
    confidence: 0.8
  },
  PRESCRIPTION: {
    keywords: ['prescription', 'medication', 'drug', 'pharmacy', 'dosage', 'refill'],
    patterns: [
      /\b(take|administer|apply)\b/i,
      /\b(\d+)\s*(mg|ml|tablet|capsule|times?\s+daily)\b/i,
      /\b(once|twice|three times)\s+(daily|a day|per day)\b/i,
      /\b(generic|brand|sig:)\b/i,
      /\bRx\s*#?\s*\d+/i
    ],
    confidence: 0.85
  },
  MEDICAL_REPORT: {
    keywords: ['report', 'consultation', 'examination', 'assessment', 'diagnosis'],
    patterns: [
      /\b(diagnosis|impression|assessment)\b/i,
      /\b(chief complaint|history of present illness)\b/i,
      /\b(physical examination|vital signs)\b/i,
      /\b(plan|treatment|follow-up)\b/i,
      /\bICD-?10?\s*:\s*[A-Z]\d{2}\.\d{1,3}/i
    ],
    confidence: 0.75
  },
  IMAGING_RESULTS: {
    keywords: ['imaging', 'radiology', 'x-ray', 'ct scan', 'mri', 'ultrasound'],
    patterns: [
      /\b(x-ray|CT|MRI|ultrasound|mammography)\b/i,
      /\b(findings|impression|conclusion)\b/i,
      /\b(normal|abnormal|unremarkable|significant)\b/i,
      /\b(contrast|without contrast)\b/i,
      /\b(\d+\s*mm|\d+\s*cm)\b/i
    ],
    confidence: 0.8
  },
  INSURANCE_CARD: {
    keywords: ['insurance', 'member', 'policy', 'group', 'copay', 'deductible'],
    patterns: [
      /\b(member\s+id|policy\s+number|group\s+number)\b/i,
      /\b(copay|deductible|out-of-pocket)\b/i,
      /\b(primary|secondary|tertiary)\s+insurance/i,
      /\b(\$\d+\.?\d*)\b/,
      /\b\d{3}-\d{2}-\d{4}\b/ // SSN pattern
    ],
    confidence: 0.9
  }
};

export const CONFIDENCE_THRESHOLDS = {
  MEDICAL_ENTITY_EXTRACTION: 0.85,
  FORM_FIELD_EXTRACTION: 0.8,
  TABLE_EXTRACTION: 0.75,
  DOCUMENT_CLASSIFICATION: 0.7,
  QUALITY_ASSESSMENT: 0.8,
  HUMAN_REVIEW_REQUIRED: 0.6
};

export const QUALITY_METRICS = {
  IMAGE_QUALITY: {
    MIN_RESOLUTION: 150, // DPI
    MIN_CONTRAST: 0.5,
    MAX_BLUR: 0.3,
    MAX_SKEW: 5 // degrees
  },
  TEXT_CLARITY: {
    MIN_CONFIDENCE: 0.7,
    MAX_UNCERTAIN_WORDS: 0.1, // 10% of words can be uncertain
    MIN_READABLE_AREA: 0.8 // 80% of text area should be readable
  },
  COMPLETENESS: {
    REQUIRED_FIELDS_THRESHOLD: 0.8, // 80% of required fields must be present
    MIN_CONTENT_COVERAGE: 0.9 // 90% of document should have extractable content
  }
};

export const MEDICAL_ENTITIES_CONFIG = {
  MEDICATION: {
    confidence: 0.85,
    requireDosage: true,
    validateAgainstDatabase: true,
    checkInteractions: true
  },
  DIAGNOSIS: {
    confidence: 0.8,
    requireICD10: false,
    validateMedicalTerms: true,
    flagCritical: true
  },
  LAB_VALUE: {
    confidence: 0.9,
    requireUnits: true,
    validateRanges: true,
    flagAbnormal: true
  },
  PROVIDER: {
    confidence: 0.75,
    validateLicense: false,
    extractSpecialty: true,
    verifyCredentials: false
  }
};

export const FHIR_MAPPING_CONFIG = {
  baseUrl: process.env.FHIR_BASE_URL || 'http://localhost:8080/fhir',
  version: '4.0.1',
  generateIds: true,
  validateResources: true,
  includeProvenance: true,
  resourceTypes: {
    LAB_RESULTS: 'Observation',
    PRESCRIPTION: 'MedicationRequest',
    DIAGNOSIS: 'Condition',
    PATIENT_INFO: 'Patient',
    PROVIDER_INFO: 'Practitioner',
    IMAGING: 'ImagingStudy'
  }
};

export const ERROR_HANDLING_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: TEXTRACT_CONFIG.timeoutMs,
  enableFallback: true,
  fallbackToOCR: true,
  preserveOriginal: true,
  logLevel: process.env.LOG_LEVEL || 'info'
};

export const MONITORING_CONFIG = {
  enableMetrics: true,
  enableTracing: true,
  metricsInterval: 60000, // 1 minute
  auditLevel: 'DETAILED',
  retentionDays: 90,
  alertThresholds: {
    errorRate: 0.05, // 5%
    averageProcessingTime: 30000, // 30 seconds
    queueDepth: 100,
    confidenceScore: 0.7
  }
};

export const BRAZILIAN_MEDICAL_CONFIG = {
  cns: {
    pattern: /\b\d{15}\b/, // Cartão Nacional de Saúde
    validate: true
  },
  cpf: {
    pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    validate: true
  },
  cid10: {
    pattern: /\b[A-Z]\d{2}\.\d{1,3}\b/,
    validateDatabase: true
  },
  crm: {
    pattern: /\bCRM\s*[A-Z]{2}\s*\d+/i,
    validateState: true
  },
  anvisa: {
    validateMedications: true,
    checkRegulations: true
  }
};

export const LGPD_COMPLIANCE_CONFIG = {
  enableDataMinimization: true,
  enablePurposeLimitation: true,
  enableStorageLimitation: true,
  retentionPeriods: {
    'LAB_RESULTS': 5 * 365, // 5 years
    'PRESCRIPTION': 2 * 365, // 2 years
    'MEDICAL_REPORT': 10 * 365, // 10 years
    'IMAGING_RESULTS': 10 * 365, // 10 years
    'INSURANCE_CARD': 7 * 365 // 7 years
  },
  anonymization: {
    enableAutoRedaction: true,
    redactPatientNames: false, // Keep for medical necessity
    redactSSN: true,
    redactAddresses: true,
    redactPhoneNumbers: true
  },
  auditTrail: {
    logAccess: true,
    logModifications: true,
    logDeletion: true,
    includeUserContext: true
  }
};