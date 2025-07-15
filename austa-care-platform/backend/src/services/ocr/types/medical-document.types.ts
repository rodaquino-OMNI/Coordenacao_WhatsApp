/**
 * Medical Document Processing Types
 * Comprehensive type definitions for AWS Textract medical document processing
 */

export interface TextractConfiguration {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  maxPages: number;
  confidenceThreshold: number;
  timeoutMs: number;
}

export enum MedicalDocumentType {
  LAB_RESULTS = 'LAB_RESULTS',
  PRESCRIPTION = 'PRESCRIPTION',
  MEDICAL_REPORT = 'MEDICAL_REPORT',
  IMAGING_RESULTS = 'IMAGING_RESULTS',
  INSURANCE_CARD = 'INSURANCE_CARD',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  CONSULTATION_NOTES = 'CONSULTATION_NOTES',
  VACCINATION_RECORD = 'VACCINATION_RECORD',
  AUTHORIZATION_FORM = 'AUTHORIZATION_FORM',
  UNKNOWN = 'UNKNOWN'
}

export enum DocumentUrgency {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  ROUTINE = 'ROUTINE'
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  EXTRACTED = 'EXTRACTED',
  VALIDATED = 'VALIDATED',
  FAILED = 'FAILED',
  HUMAN_REVIEW = 'HUMAN_REVIEW',
  COMPLETED = 'COMPLETED'
}

export interface TextractBlock {
  id: string;
  blockType: string;
  confidence: number;
  text?: string;
  geometry?: {
    boundingBox: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
    polygon: Array<{ x: number; y: number }>;
  };
  relationships?: Array<{
    type: string;
    ids: string[];
  }>;
  entityTypes?: string[];
  page?: number;
}

export interface TextractFormField {
  key: {
    text: string;
    confidence: number;
    boundingBox: any;
  };
  value: {
    text: string;
    confidence: number;
    boundingBox: any;
  };
}

export interface TextractTable {
  id: string;
  headers: string[];
  rows: string[][];
  confidence: number;
  page: number;
  boundingBox: any;
}

export interface MedicalEntity {
  type: string;
  text: string;
  confidence: number;
  category: 'MEDICATION' | 'DIAGNOSIS' | 'LAB_VALUE' | 'DOSAGE' | 'FREQUENCY' | 'PROVIDER' | 'PATIENT_INFO';
  normalizedValue?: string;
  unit?: string;
  referenceRange?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  icd10Code?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
}

export interface LabResult {
  testName: string;
  value: string | number;
  unit?: string;
  referenceRange?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  flag?: 'HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL';
  confidence: number;
  dateCollected?: Date;
  laboratory?: string;
}

export interface Prescription {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  prescriber: string;
  dateIssued: Date;
  daysSupply?: number;
  refills?: number;
  confidence: number;
}

export interface ProcessedDocument {
  id: string;
  documentType: MedicalDocumentType;
  urgency: DocumentUrgency;
  status: ProcessingStatus;
  originalFileName: string;
  s3Key: string;
  pages: number;
  
  // Raw Textract data
  blocks: TextractBlock[];
  forms: TextractFormField[];
  tables: TextractTable[];
  
  // Processed medical data
  medicalEntities: MedicalEntity[];
  labResults?: LabResult[];
  prescriptions?: Prescription[];
  
  // Metadata
  processingStartTime: Date;
  processingEndTime?: Date;
  overallConfidence: number;
  qualityScore: number;
  
  // Validation
  validationErrors: ValidationError[];
  requiresHumanReview: boolean;
  reviewNotes?: string;
  
  // FHIR mapping
  fhirResources?: any[];
  
  // Audit trail
  processingHistory: ProcessingEvent[];
}

export interface ValidationError {
  type: 'CONFIDENCE_LOW' | 'MISSING_REQUIRED_FIELD' | 'INVALID_FORMAT' | 'MEDICAL_SAFETY' | 'COMPLIANCE';
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  confidence: number;
  suggestedValue?: string;
}

export interface ProcessingEvent {
  timestamp: Date;
  event: string;
  details: any;
  userId?: string;
  confidence?: number;
}

export interface DocumentClassificationResult {
  documentType: MedicalDocumentType;
  confidence: number;
  reasoning: string[];
  alternativeTypes: Array<{
    type: MedicalDocumentType;
    confidence: number;
  }>;
}

export interface QualityAssessment {
  overallScore: number;
  imageQuality: number;
  textClarity: number;
  completeness: number;
  medicalRelevance: number;
  issues: string[];
  recommendations: string[];
}

export interface MedicalDocumentProcessor {
  labResults: LabResultExtractor;
  prescriptions: PrescriptionAnalyzer;
  medicalReports: ReportProcessor;
  imagingResults: ImagingAnalyzer;
  insuranceCards: InsuranceCardProcessor;
}

export interface LabResultExtractor {
  extractLabValues(blocks: TextractBlock[]): LabResult[];
  validateResults(results: LabResult[]): ValidationError[];
  mapToFHIR(results: LabResult[]): any[];
}

export interface PrescriptionAnalyzer {
  extractMedications(blocks: TextractBlock[]): Prescription[];
  validatePrescription(prescription: Prescription): ValidationError[];
  checkDrugInteractions(medications: Prescription[]): any[];
}

export interface ReportProcessor {
  extractDiagnoses(blocks: TextractBlock[]): MedicalEntity[];
  extractProcedures(blocks: TextractBlock[]): MedicalEntity[];
  mapICD10Codes(entities: MedicalEntity[]): MedicalEntity[];
}

export interface ImagingAnalyzer {
  extractFindings(blocks: TextractBlock[]): MedicalEntity[];
  extractMeasurements(blocks: TextractBlock[]): any[];
  identifyAbnormalities(findings: MedicalEntity[]): any[];
}

export interface InsuranceCardProcessor {
  extractMemberInfo(blocks: TextractBlock[]): any;
  extractCoverageDetails(blocks: TextractBlock[]): any;
  validateInsurance(info: any): ValidationError[];
}

export interface TextractProcessingOptions {
  enableForms: boolean;
  enableTables: boolean;
  enableQueries: boolean;
  customQueries?: string[];
  confidenceThreshold: number;
  enableMedicalEntityRecognition: boolean;
  requireHumanReview: boolean;
  generateFHIR: boolean;
  performQualityCheck: boolean;
}

export interface TextractResponse {
  jobId?: string;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL_SUCCESS';
  blocks: TextractBlock[];
  warnings?: string[];
  metadata: {
    pages: number;
    processingTime: number;
    documentMetadata?: any;
  };
}