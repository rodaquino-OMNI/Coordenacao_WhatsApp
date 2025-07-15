/**
 * OCR Service Module
 * Main export for AWS Textract medical document processing
 */

// Core Services
export { OCROrchestrator } from './ocr-orchestrator.service';
export { TextractService } from './textract/textract.service';

// Medical Intelligence
export { MedicalDocumentClassifierService } from './medical/document-classifier.service';
export { MedicalEntityExtractorService } from './medical/medical-entity-extractor.service';

// Processing
export { FHIRMapperService } from './processors/fhir-mapper.service';

// Monitoring
export { MonitoringService } from './monitoring/monitoring.service';

// Types
export * from './types/medical-document.types';

// Errors
export * from './errors/textract.errors';

// Configuration
export * from './config/textract.config';

// Convenience exports for common use cases
export { createOCRService } from './utils/factory';
export { validateDocumentUpload } from './utils/validators';
export { formatOCRResults } from './utils/formatters';