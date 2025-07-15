/**
 * OCR Validators
 * Validation utilities for document uploads and OCR processing
 */

import { ValidationError } from '../types/medical-document.types';

export interface DocumentUploadValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    mimeType: string;
    estimatedPages: number;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

/**
 * Validate document before OCR processing
 */
export async function validateDocumentUpload(
  file: Buffer | string,
  filename: string,
  options: {
    maxFileSize?: number; // in bytes
    allowedTypes?: string[];
    maxPages?: number;
    requireHighQuality?: boolean;
  } = {}
): Promise<DocumentUploadValidation> {
  const defaults = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
    maxPages: 50,
    requireHighQuality: false
  };

  const config = { ...defaults, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Determine file type
  const mimeType = getMimeType(filename, file);
  const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.from(file, 'base64').length;

  // Validate file size
  if (fileSize > config.maxFileSize) {
    errors.push(`File size ${formatBytes(fileSize)} exceeds maximum allowed size ${formatBytes(config.maxFileSize)}`);
  }

  // Validate file type
  if (!config.allowedTypes.includes(mimeType)) {
    errors.push(`File type ${mimeType} is not supported. Allowed types: ${config.allowedTypes.join(', ')}`);
  }

  // Estimate pages and quality
  const estimatedPages = await estimatePageCount(file, mimeType);
  const quality = await assessImageQuality(file, mimeType);

  // Validate page count
  if (estimatedPages > config.maxPages) {
    errors.push(`Estimated ${estimatedPages} pages exceeds maximum allowed ${config.maxPages} pages`);
  }

  // Quality checks
  if (config.requireHighQuality && quality === 'LOW') {
    errors.push('Document quality is too low for processing. Please rescan with higher resolution.');
  }

  if (quality === 'LOW') {
    warnings.push('Low document quality detected. OCR accuracy may be reduced.');
  }

  // File-specific validations
  if (mimeType === 'application/pdf') {
    const pdfValidation = await validatePDF(file);
    errors.push(...pdfValidation.errors);
    warnings.push(...pdfValidation.warnings);
  }

  if (mimeType.startsWith('image/')) {
    const imageValidation = await validateImage(file, mimeType);
    errors.push(...imageValidation.errors);
    warnings.push(...imageValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize,
      mimeType,
      estimatedPages,
      quality
    }
  };
}

/**
 * Validate OCR processing results
 */
export function validateOCRResults(
  blocks: any[],
  confidence: number,
  options: {
    minConfidence?: number;
    minTextCoverage?: number;
    requireStructuredData?: boolean;
  } = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const defaults = {
    minConfidence: 0.7,
    minTextCoverage: 0.5,
    requireStructuredData: false
  };

  const config = { ...defaults, ...options };

  // Validate confidence
  if (confidence < config.minConfidence) {
    errors.push({
      type: 'CONFIDENCE_LOW',
      field: 'overallConfidence',
      message: `OCR confidence ${confidence.toFixed(2)} below minimum threshold ${config.minConfidence}`,
      severity: 'WARNING',
      confidence
    });
  }

  // Validate text coverage
  const textBlocks = blocks.filter(block => block.blockType === 'WORD' && block.text);
  const textCoverage = textBlocks.length / blocks.length;

  if (textCoverage < config.minTextCoverage) {
    errors.push({
      type: 'INVALID_FORMAT',
      field: 'textCoverage',
      message: `Text coverage ${textCoverage.toFixed(2)} below minimum threshold ${config.minTextCoverage}`,
      severity: 'ERROR',
      confidence: textCoverage
    });
  }

  // Validate structured data if required
  if (config.requireStructuredData) {
    const hasStructuredData = blocks.some(block => 
      block.blockType === 'TABLE' || block.blockType === 'KEY_VALUE_SET'
    );

    if (!hasStructuredData) {
      errors.push({
        type: 'MISSING_REQUIRED_FIELD',
        field: 'structuredData',
        message: 'No structured data (tables or forms) found in document',
        severity: 'WARNING',
        confidence: 0.9
      });
    }
  }

  return errors;
}

/**
 * Validate medical entity extraction results
 */
export function validateMedicalEntities(
  entities: any[],
  documentType: string,
  options: {
    requirePatientInfo?: boolean;
    requireProviderInfo?: boolean;
    minEntityCount?: number;
  } = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const defaults = {
    requirePatientInfo: true,
    requireProviderInfo: false,
    minEntityCount: 1
  };

  const config = { ...defaults, ...options };

  // Check minimum entity count
  if (entities.length < config.minEntityCount) {
    errors.push({
      type: 'MISSING_REQUIRED_FIELD',
      field: 'medicalEntities',
      message: `Only ${entities.length} medical entities found, minimum ${config.minEntityCount} required`,
      severity: 'ERROR',
      confidence: 0.9
    });
  }

  // Check for patient information
  if (config.requirePatientInfo) {
    const hasPatientInfo = entities.some(e => e.category === 'PATIENT_INFO');
    if (!hasPatientInfo) {
      errors.push({
        type: 'MISSING_REQUIRED_FIELD',
        field: 'patientInfo',
        message: 'No patient information found in document',
        severity: 'ERROR',
        confidence: 0.9
      });
    }
  }

  // Check for provider information
  if (config.requireProviderInfo) {
    const hasProviderInfo = entities.some(e => e.category === 'PROVIDER_INFO');
    if (!hasProviderInfo) {
      errors.push({
        type: 'MISSING_REQUIRED_FIELD',
        field: 'providerInfo',
        message: 'No provider information found in document',
        severity: 'WARNING',
        confidence: 0.8
      });
    }
  }

  // Document type specific validations
  switch (documentType) {
    case 'LAB_RESULTS':
      const hasLabValues = entities.some(e => e.category === 'LAB_VALUE');
      if (!hasLabValues) {
        errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          field: 'labValues',
          message: 'No lab values found in lab results document',
          severity: 'ERROR',
          confidence: 0.9
        });
      }
      break;

    case 'PRESCRIPTION':
      const hasMedications = entities.some(e => e.category === 'MEDICATION');
      if (!hasMedications) {
        errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          field: 'medications',
          message: 'No medications found in prescription document',
          severity: 'ERROR',
          confidence: 0.9
        });
      }
      break;

    case 'MEDICAL_REPORT':
      const hasDiagnosis = entities.some(e => e.category === 'DIAGNOSIS');
      if (!hasDiagnosis) {
        errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          field: 'diagnosis',
          message: 'No diagnosis information found in medical report',
          severity: 'WARNING',
          confidence: 0.8
        });
      }
      break;
  }

  return errors;
}

/**
 * Helper functions
 */
function getMimeType(filename: string, file: Buffer | string): string {
  const extension = filename.toLowerCase().split('.').pop();
  
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'tiff': 'image/tiff',
    'tif': 'image/tiff'
  };

  if (extension && mimeTypes[extension]) {
    return mimeTypes[extension];
  }

  // Try to detect from file content
  if (Buffer.isBuffer(file)) {
    if (file.subarray(0, 4).toString() === '%PDF') {
      return 'application/pdf';
    }
    if (file.subarray(0, 2).toString('hex') === 'ffd8') {
      return 'image/jpeg';
    }
    if (file.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
      return 'image/png';
    }
  }

  return 'application/octet-stream';
}

async function estimatePageCount(file: Buffer | string, mimeType: string): Promise<number> {
  // Simplified page estimation
  if (mimeType === 'application/pdf') {
    // For PDF, we would use a PDF library to count pages
    // For now, estimate based on file size
    const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.from(file, 'base64').length;
    return Math.max(1, Math.floor(fileSize / (100 * 1024))); // Estimate 100KB per page
  }

  // For images, assume single page
  return 1;
}

async function assessImageQuality(file: Buffer | string, mimeType: string): Promise<'HIGH' | 'MEDIUM' | 'LOW'> {
  // Simplified quality assessment
  // In production, this would analyze image properties like resolution, contrast, etc.
  
  const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.from(file, 'base64').length;
  
  if (mimeType.startsWith('image/')) {
    // Estimate quality based on file size (very rough approximation)
    if (fileSize > 1024 * 1024) { // > 1MB
      return 'HIGH';
    } else if (fileSize > 256 * 1024) { // > 256KB
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // For PDFs, assume medium quality
  return 'MEDIUM';
}

async function validatePDF(file: Buffer | string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file, 'base64');

  // Check PDF header
  if (!buffer.subarray(0, 4).toString().startsWith('%PDF')) {
    errors.push('Invalid PDF file format');
    return { errors, warnings };
  }

  // Check if PDF is encrypted (simplified check)
  const content = buffer.toString('binary');
  if (content.includes('/Encrypt')) {
    errors.push('PDF is encrypted and cannot be processed');
  }

  // Check for scanned vs text PDF
  if (content.includes('/Type/Font') && content.includes('/Subtype/Type1')) {
    warnings.push('PDF contains text elements - OCR may extract duplicate content');
  }

  return { errors, warnings };
}

async function validateImage(file: Buffer | string, mimeType: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file, 'base64');

  // Basic image validation based on headers
  switch (mimeType) {
    case 'image/jpeg':
      if (!buffer.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
        errors.push('Invalid JPEG file format');
      }
      break;

    case 'image/png':
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      if (!buffer.subarray(0, 8).equals(pngHeader)) {
        errors.push('Invalid PNG file format');
      }
      break;

    case 'image/tiff':
      const tiffHeaderLE = Buffer.from([0x49, 0x49, 0x2A, 0x00]); // Little endian
      const tiffHeaderBE = Buffer.from([0x4D, 0x4D, 0x00, 0x2A]); // Big endian
      if (!buffer.subarray(0, 4).equals(tiffHeaderLE) && !buffer.subarray(0, 4).equals(tiffHeaderBE)) {
        errors.push('Invalid TIFF file format');
      }
      break;
  }

  // Estimate image dimensions (very basic)
  if (buffer.length < 10 * 1024) { // < 10KB
    warnings.push('Image file is very small - may result in poor OCR quality');
  }

  return { errors, warnings };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate Brazilian medical document formats
 */
export function validateBrazilianMedicalDocument(
  entities: any[],
  documentType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate CPF format
  const cpfEntities = entities.filter(e => e.type === 'PATIENT_CPF');
  for (const cpfEntity of cpfEntities) {
    if (!isValidCPF(cpfEntity.normalizedValue)) {
      errors.push({
        type: 'INVALID_FORMAT',
        field: 'cpf',
        message: `Invalid CPF format: ${cpfEntity.text}`,
        severity: 'ERROR',
        confidence: cpfEntity.confidence
      });
    }
  }

  // Validate CRM format
  const crmEntities = entities.filter(e => e.type === 'PROVIDER_LICENSE');
  for (const crmEntity of crmEntities) {
    if (!isValidCRM(crmEntity.normalizedValue)) {
      errors.push({
        type: 'INVALID_FORMAT',
        field: 'crm',
        message: `Invalid CRM format: ${crmEntity.text}`,
        severity: 'WARNING',
        confidence: crmEntity.confidence
      });
    }
  }

  // Validate ICD-10 codes
  const icdEntities = entities.filter(e => e.type === 'ICD10_CODE');
  for (const icdEntity of icdEntities) {
    if (!isValidICD10(icdEntity.normalizedValue)) {
      errors.push({
        type: 'INVALID_FORMAT',
        field: 'icd10',
        message: `Invalid ICD-10 code format: ${icdEntity.text}`,
        severity: 'WARNING',
        confidence: icdEntity.confidence
      });
    }
  }

  return errors;
}

function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // All same digits

  // Calculate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let checkDigit1 = (sum * 10) % 11;
  if (checkDigit1 === 10) checkDigit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let checkDigit2 = (sum * 10) % 11;
  if (checkDigit2 === 10) checkDigit2 = 0;

  return parseInt(cleanCPF[9]) === checkDigit1 && parseInt(cleanCPF[10]) === checkDigit2;
}

function isValidCRM(crm: string): boolean {
  if (!crm) return false;
  
  // Basic CRM format: CRM + state + number
  return /^CRM\s*[A-Z]{2}\s*\d+$/i.test(crm.trim());
}

function isValidICD10(icd10: string): boolean {
  if (!icd10) return false;
  
  // ICD-10 format: Letter + 2 digits + optional decimal + up to 3 more digits
  return /^[A-Z]\d{2}(\.\d{1,3})?$/i.test(icd10.trim());
}