/**
 * OCR Service Factory
 * Factory methods for creating configured OCR service instances
 */

import { OCROrchestrator } from '../ocr-orchestrator.service';
import { TextractConfiguration, TextractProcessingOptions } from '../types/medical-document.types';
import { TEXTRACT_CONFIG, DEFAULT_PROCESSING_OPTIONS } from '../config/textract.config';

export interface OCRServiceConfig {
  textract?: Partial<TextractConfiguration>;
  processing?: Partial<TextractProcessingOptions>;
  enableMonitoring?: boolean;
  enableFHIR?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

/**
 * Create a configured OCR service instance
 */
export function createOCRService(config: OCRServiceConfig = {}): OCROrchestrator {
  // Validate configuration
  validateOCRConfig(config);

  // Apply environment-specific defaults
  const environmentConfig = getEnvironmentDefaults(config.environment || 'development');
  
  // Merge configurations
  const finalConfig = {
    ...environmentConfig,
    ...config
  };

  // Create and return orchestrator
  return new OCROrchestrator();
}

/**
 * Create OCR service optimized for medical documents
 */
export function createMedicalOCRService(config: OCRServiceConfig = {}): OCROrchestrator {
  const medicalConfig: OCRServiceConfig = {
    ...config,
    processing: {
      ...DEFAULT_PROCESSING_OPTIONS,
      enableMedicalEntityRecognition: true,
      generateFHIR: true,
      performQualityCheck: true,
      confidenceThreshold: 0.85,
      requireHumanReview: false,
      ...config.processing
    },
    enableMonitoring: true,
    enableFHIR: true
  };

  return createOCRService(medicalConfig);
}

/**
 * Create OCR service for high-throughput batch processing
 */
export function createBatchOCRService(config: OCRServiceConfig = {}): OCROrchestrator {
  const batchConfig: OCRServiceConfig = {
    ...config,
    processing: {
      ...DEFAULT_PROCESSING_OPTIONS,
      confidenceThreshold: 0.7, // Lower threshold for batch processing
      requireHumanReview: false,
      enableMedicalEntityRecognition: true,
      generateFHIR: false, // Disable FHIR for faster processing
      performQualityCheck: false,
      ...config.processing
    },
    enableMonitoring: true
  };

  return createOCRService(batchConfig);
}

/**
 * Create OCR service for high-accuracy critical documents
 */
export function createCriticalOCRService(config: OCRServiceConfig = {}): OCROrchestrator {
  const criticalConfig: OCRServiceConfig = {
    ...config,
    processing: {
      ...DEFAULT_PROCESSING_OPTIONS,
      confidenceThreshold: 0.95, // High threshold for critical documents
      requireHumanReview: true,
      enableMedicalEntityRecognition: true,
      generateFHIR: true,
      performQualityCheck: true,
      enableForms: true,
      enableTables: true,
      enableQueries: true,
      ...config.processing
    },
    enableMonitoring: true,
    enableFHIR: true
  };

  return createOCRService(criticalConfig);
}

/**
 * Validate OCR configuration
 */
function validateOCRConfig(config: OCRServiceConfig): void {
  // Validate Textract configuration
  if (config.textract) {
    if (config.textract.confidenceThreshold !== undefined) {
      if (config.textract.confidenceThreshold < 0 || config.textract.confidenceThreshold > 1) {
        throw new Error('Confidence threshold must be between 0 and 1');
      }
    }

    if (config.textract.maxPages !== undefined) {
      if (config.textract.maxPages < 1 || config.textract.maxPages > 3000) {
        throw new Error('Max pages must be between 1 and 3000');
      }
    }

    if (config.textract.timeoutMs !== undefined) {
      if (config.textract.timeoutMs < 1000 || config.textract.timeoutMs > 600000) {
        throw new Error('Timeout must be between 1 second and 10 minutes');
      }
    }
  }

  // Validate processing options
  if (config.processing) {
    if (config.processing.confidenceThreshold !== undefined) {
      if (config.processing.confidenceThreshold < 0 || config.processing.confidenceThreshold > 1) {
        throw new Error('Processing confidence threshold must be between 0 and 1');
      }
    }

    if (config.processing.customQueries && config.processing.customQueries.length > 15) {
      throw new Error('Maximum 15 custom queries allowed');
    }
  }
}

/**
 * Get environment-specific configuration defaults
 */
function getEnvironmentDefaults(environment: 'development' | 'staging' | 'production'): OCRServiceConfig {
  const configs = {
    development: {
      enableMonitoring: true,
      enableFHIR: true,
      processing: {
        confidenceThreshold: 0.7,
        requireHumanReview: false,
        generateFHIR: true,
        performQualityCheck: true
      },
      textract: {
        timeoutMs: 120000 // 2 minutes for development
      }
    },

    staging: {
      enableMonitoring: true,
      enableFHIR: true,
      processing: {
        confidenceThreshold: 0.8,
        requireHumanReview: true,
        generateFHIR: true,
        performQualityCheck: true
      },
      textract: {
        timeoutMs: 180000 // 3 minutes for staging
      }
    },

    production: {
      enableMonitoring: true,
      enableFHIR: true,
      processing: {
        confidenceThreshold: 0.85,
        requireHumanReview: true,
        generateFHIR: true,
        performQualityCheck: true
      },
      textract: {
        timeoutMs: 300000 // 5 minutes for production
      }
    }
  };

  return configs[environment];
}

/**
 * Create OCR service for specific document types
 */
export function createDocumentTypeOCRService(
  documentType: 'lab_results' | 'prescriptions' | 'medical_reports' | 'imaging' | 'insurance',
  config: OCRServiceConfig = {}
): OCROrchestrator {
  const documentTypeConfigs = {
    lab_results: {
      processing: {
        enableForms: true,
        enableTables: true,
        enableQueries: true,
        customQueries: [
          'What are the lab test names?',
          'What are the test results?',
          'What are the reference ranges?',
          'What is the patient name?',
          'What is the collection date?'
        ],
        confidenceThreshold: 0.9
      }
    },

    prescriptions: {
      processing: {
        enableForms: true,
        enableTables: false,
        enableQueries: true,
        customQueries: [
          'What medications are prescribed?',
          'What are the dosages?',
          'What are the frequencies?',
          'Who is the prescribing doctor?',
          'What is the patient name?'
        ],
        confidenceThreshold: 0.95
      }
    },

    medical_reports: {
      processing: {
        enableForms: true,
        enableTables: true,
        enableQueries: true,
        customQueries: [
          'What is the diagnosis?',
          'What are the symptoms?',
          'What is the treatment plan?',
          'Who is the attending physician?',
          'What is the patient name?'
        ],
        confidenceThreshold: 0.8
      }
    },

    imaging: {
      processing: {
        enableForms: true,
        enableTables: false,
        enableQueries: true,
        customQueries: [
          'What type of imaging was performed?',
          'What are the findings?',
          'What is the impression?',
          'Who is the radiologist?',
          'What is the patient name?'
        ],
        confidenceThreshold: 0.85
      }
    },

    insurance: {
      processing: {
        enableForms: true,
        enableTables: false,
        enableQueries: true,
        customQueries: [
          'What is the member ID?',
          'What is the group number?',
          'What is the policy number?',
          'What are the copay amounts?',
          'What is the member name?'
        ],
        confidenceThreshold: 0.9
      }
    }
  };

  const documentConfig = documentTypeConfigs[documentType];
  const mergedConfig: OCRServiceConfig = {
    ...config,
    processing: {
      ...config.processing,
      ...documentConfig.processing
    }
  };

  return createOCRService(mergedConfig);
}

/**
 * Create OCR service with custom AWS configuration
 */
export function createCustomAWSOCRService(
  awsConfig: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
  },
  config: OCRServiceConfig = {}
): OCROrchestrator {
  const customConfig: OCRServiceConfig = {
    ...config,
    textract: {
      ...TEXTRACT_CONFIG,
      ...awsConfig,
      ...config.textract
    }
  };

  return createOCRService(customConfig);
}

/**
 * Get recommended configuration for different use cases
 */
export function getRecommendedConfig(
  useCase: 'high_accuracy' | 'high_throughput' | 'cost_optimized' | 'regulatory_compliance'
): OCRServiceConfig {
  const configs = {
    high_accuracy: {
      processing: {
        confidenceThreshold: 0.95,
        requireHumanReview: true,
        enableMedicalEntityRecognition: true,
        generateFHIR: true,
        performQualityCheck: true,
        enableForms: true,
        enableTables: true,
        enableQueries: true
      },
      enableMonitoring: true,
      enableFHIR: true
    },

    high_throughput: {
      processing: {
        confidenceThreshold: 0.7,
        requireHumanReview: false,
        enableMedicalEntityRecognition: true,
        generateFHIR: false,
        performQualityCheck: false,
        enableForms: true,
        enableTables: false,
        enableQueries: false
      },
      enableMonitoring: true,
      enableFHIR: false
    },

    cost_optimized: {
      processing: {
        confidenceThreshold: 0.75,
        requireHumanReview: false,
        enableMedicalEntityRecognition: false,
        generateFHIR: false,
        performQualityCheck: false,
        enableForms: false,
        enableTables: false,
        enableQueries: false
      },
      enableMonitoring: false,
      enableFHIR: false
    },

    regulatory_compliance: {
      processing: {
        confidenceThreshold: 0.9,
        requireHumanReview: true,
        enableMedicalEntityRecognition: true,
        generateFHIR: true,
        performQualityCheck: true,
        enableForms: true,
        enableTables: true,
        enableQueries: true
      },
      enableMonitoring: true,
      enableFHIR: true
    }
  };

  return configs[useCase];
}