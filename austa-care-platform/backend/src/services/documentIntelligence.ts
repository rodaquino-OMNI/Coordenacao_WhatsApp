import { EventEmitter } from 'events';
import { createWorker } from 'tesseract.js';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { logger } from '../utils/logger';
import { Document, DocumentType } from '../types/authorization';

/**
 * Document Intelligence Service
 * Handles OCR, document validation, and automated document processing
 */
export class DocumentIntelligenceService extends EventEmitter {
  private tesseractWorker: any;
  private googleVisionClient: ImageAnnotatorClient;
  private documentValidators: Map<DocumentType, DocumentValidator>;
  private processingQueue: Map<string, Promise<any>>;

  constructor() {
    super();
    this.processingQueue = new Map();
    this.documentValidators = new Map();
    this.googleVisionClient = new ImageAnnotatorClient();
    this.initializeOCREngines();
    this.initializeValidators();
  }

  /**
   * Initialize OCR engines
   */
  private async initializeOCREngines(): Promise<void> {
    try {
      // Initialize Tesseract.js for basic OCR
      this.tesseractWorker = await createWorker({
        logger: (m: any) => logger.debug('Tesseract:', m)
      });
      
      await this.tesseractWorker.loadLanguage('eng+por');
      await this.tesseractWorker.initialize('eng+por');

      // Google Vision client already initialized in constructor

      logger.info('OCR engines initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OCR engines', { error });
    }
  }

  /**
   * Initialize document validators
   */
  private initializeValidators(): void {
    // Medical Report Validator
    this.documentValidators.set(DocumentType.MEDICAL_REPORT, {
      requiredFields: [
        'patient_name',
        'doctor_name',
        'date',
        'diagnosis',
        'treatment_recommendation'
      ],
      patterns: {
        patient_name: /(?:paciente|patient):\s*([^\n]+)/i,
        doctor_name: /(?:médico|doctor|dr\.):\s*([^\n]+)/i,
        date: /\d{1,2}\/\d{1,2}\/\d{4}/,
        diagnosis: /(?:diagnóstico|diagnosis):\s*([^\n]+)/i,
        treatment_recommendation: /(?:tratamento|treatment|recomenda):\s*([^\n]+)/i
      },
      validate: this.validateMedicalReport.bind(this)
    });

    // Prescription Validator
    this.documentValidators.set(DocumentType.PRESCRIPTION, {
      requiredFields: [
        'patient_name',
        'doctor_name',
        'medication',
        'dosage',
        'date'
      ],
      patterns: {
        patient_name: /(?:paciente|patient):\s*([^\n]+)/i,
        doctor_name: /(?:médico|doctor|dr\.):\s*([^\n]+)/i,
        medication: /(?:medicamento|medication):\s*([^\n]+)/i,
        dosage: /(?:dosagem|dosage|dose):\s*([^\n]+)/i,
        date: /\d{1,2}\/\d{1,2}\/\d{4}/
      },
      validate: this.validatePrescription.bind(this)
    });

    // Exam Results Validator
    this.documentValidators.set(DocumentType.EXAM_RESULTS, {
      requiredFields: [
        'patient_name',
        'exam_type',
        'result',
        'date',
        'lab_name'
      ],
      patterns: {
        patient_name: /(?:paciente|patient):\s*([^\n]+)/i,
        exam_type: /(?:exame|exam|test):\s*([^\n]+)/i,
        result: /(?:resultado|result):\s*([^\n]+)/i,
        date: /\d{1,2}\/\d{1,2}\/\d{4}/,
        lab_name: /(?:laboratório|laboratory|lab):\s*([^\n]+)/i
      },
      validate: this.validateExamResults.bind(this)
    });

    // Insurance Card Validator
    this.documentValidators.set(DocumentType.INSURANCE_CARD, {
      requiredFields: [
        'cardholder_name',
        'card_number',
        'plan_name',
        'validity_date'
      ],
      patterns: {
        cardholder_name: /(?:titular|cardholder):\s*([^\n]+)/i,
        card_number: /(?:cartão|card).*?(\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/i,
        plan_name: /(?:plano|plan):\s*([^\n]+)/i,
        validity_date: /(?:válido até|valid until):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      },
      validate: this.validateInsuranceCard.bind(this)
    });

    // ID Document Validator
    this.documentValidators.set(DocumentType.ID_DOCUMENT, {
      requiredFields: [
        'full_name',
        'document_number',
        'birth_date',
        'issue_date'
      ],
      patterns: {
        full_name: /(?:nome|name):\s*([^\n]+)/i,
        document_number: /(?:cpf|rg|id).*?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
        birth_date: /(?:nascimento|birth).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
        issue_date: /(?:emissão|issue).*?(\d{1,2}\/\d{1,2}\/\d{4})/i
      },
      validate: this.validateIdDocument.bind(this)
    });

    logger.info('Document validators initialized');
  }

  /**
   * Extract text from document using multiple OCR engines
   */
  async extractText(document: Document): Promise<any> {
    const cacheKey = `ocr-${document.id}`;
    
    // Check if already processing
    if (this.processingQueue.has(cacheKey)) {
      return this.processingQueue.get(cacheKey);
    }

    const processingPromise = this.performOCR(document);
    this.processingQueue.set(cacheKey, processingPromise);

    try {
      const result = await processingPromise;
      this.processingQueue.delete(cacheKey);
      
      this.emit('documentProcessed', {
        documentId: document.id,
        type: document.type,
        success: true,
        extractedData: result
      });

      return result;
    } catch (error) {
      this.processingQueue.delete(cacheKey);
      
      this.emit('documentProcessed', {
        documentId: document.id,
        type: document.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Perform OCR using multiple engines
   */
  private async performOCR(document: Document): Promise<any> {
    logger.info(`Performing OCR on document ${document.id}`, {
      type: document.type,
      fileName: document.fileName
    });

    try {
      // Try Google Cloud Vision first (better accuracy)
      const googleResult = await this.extractWithGoogleVision(document);
      if (googleResult.confidence > 0.8) {
        return googleResult;
      }

      // Fallback to Tesseract
      const tesseractResult = await this.extractWithTesseract(document);
      
      // Combine results for better accuracy
      return this.combineOCRResults(googleResult, tesseractResult);
    } catch (error) {
      logger.error(`OCR failed for document ${document.id}`, { error });
      throw error;
    }
  }

  /**
   * Extract text using Google Cloud Vision
   */
  private async extractWithGoogleVision(document: Document): Promise<any> {
    try {
      const [result] = await this.googleVisionClient.textDetection({
        image: { source: { filename: document.filePath } }
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        return { text: '', confidence: 0, fields: {} };
      }

      const fullText = detections[0].description || '';
      const confidence = this.calculateGoogleVisionConfidence(detections);

      // Extract structured data based on document type
      const fields = this.extractStructuredData(fullText, document.type);

      return {
        text: fullText,
        confidence,
        fields,
        engine: 'google-vision',
        detections: detections.slice(1) // Skip the full text detection
      };
    } catch (error) {
      logger.error('Google Vision OCR failed', { error });
      return { text: '', confidence: 0, fields: {}, error };
    }
  }

  /**
   * Extract text using Tesseract
   */
  private async extractWithTesseract(document: Document): Promise<any> {
    try {
      const { data } = await this.tesseractWorker.recognize(document.filePath);
      
      const confidence = data.confidence / 100;
      const fields = this.extractStructuredData(data.text, document.type);

      return {
        text: data.text,
        confidence,
        fields,
        engine: 'tesseract',
        words: data.words,
        lines: data.lines
      };
    } catch (error) {
      logger.error('Tesseract OCR failed', { error });
      return { text: '', confidence: 0, fields: {}, error };
    }
  }

  /**
   * Calculate confidence score for Google Vision results
   */
  private calculateGoogleVisionConfidence(detections: any[]): number {
    if (!detections || detections.length < 2) return 0;

    // Calculate average confidence from individual word detections
    const wordDetections = detections.slice(1);
    let totalConfidence = 0;
    let wordCount = 0;

    wordDetections.forEach(detection => {
      if (detection.boundingPoly && detection.boundingPoly.vertices) {
        // Google Vision doesn't provide confidence per word,
        // so we estimate based on bounding box quality
        totalConfidence += 0.9; // Assume high confidence for Google Vision
        wordCount++;
      }
    });

    return wordCount > 0 ? totalConfidence / wordCount : 0;
  }

  /**
   * Combine OCR results from multiple engines
   */
  private combineOCRResults(googleResult: any, tesseractResult: any): any {
    // Prefer Google Vision if confidence is higher
    if (googleResult.confidence > tesseractResult.confidence) {
      return {
        ...googleResult,
        backup: tesseractResult,
        combined: true
      };
    }

    // Use Tesseract but include Google Vision data
    return {
      ...tesseractResult,
      backup: googleResult,
      combined: true
    };
  }

  /**
   * Extract structured data based on document type
   */
  private extractStructuredData(text: string, documentType: DocumentType): Record<string, string> {
    const validator = this.documentValidators.get(documentType);
    if (!validator) return {};

    const fields: Record<string, string> = {};

    Object.entries(validator.patterns).forEach(([fieldName, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        fields[fieldName] = match[1] ? match[1].trim() : match[0].trim();
      }
    });

    return fields;
  }

  /**
   * Validate document using type-specific validator
   */
  async validateDocument(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    logger.info(`Validating document ${document.id}`, { type: document.type });

    const validator = this.documentValidators.get(document.type);
    if (!validator) {
      return {
        isValid: false,
        notes: 'No validator available for document type',
        missingFields: []
      };
    }

    try {
      const validationResult = await validator.validate(document, ocrResult);
      
      this.emit('validationComplete', {
        documentId: document.id,
        type: document.type,
        isValid: validationResult.isValid,
        missingFields: validationResult.missingFields
      });

      return validationResult;
    } catch (error) {
      logger.error(`Document validation failed for ${document.id}`, { error });
      
      return {
        isValid: false,
        notes: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        missingFields: validator.requiredFields
      };
    }
  }

  /**
   * Validate medical report
   */
  private async validateMedicalReport(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    const validator = this.documentValidators.get(DocumentType.MEDICAL_REPORT)!;
    const missingFields: string[] = [];
    const notes: string[] = [];

    // Check required fields
    validator.requiredFields.forEach(field => {
      if (!ocrResult.fields[field] || ocrResult.fields[field].length < 3) {
        missingFields.push(field);
      }
    });

    // Validate medical report specific requirements
    if (ocrResult.fields.diagnosis && ocrResult.fields.diagnosis.length < 10) {
      notes.push('Diagnosis appears too brief or unclear');
    }

    if (ocrResult.fields.date) {
      const reportDate = this.parseDate(ocrResult.fields.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (reportDate && reportDate < thirtyDaysAgo) {
        notes.push('Medical report is older than 30 days');
      }
    }

    // Check for medical terms to validate authenticity
    const medicalTerms = [
      'diagnóstico', 'diagnosis', 'sintomas', 'symptoms',
      'tratamento', 'treatment', 'medicação', 'medication',
      'exame', 'examination', 'avaliação', 'assessment'
    ];

    const hasmedicalTerms = medicalTerms.some(term => 
      ocrResult.text.toLowerCase().includes(term.toLowerCase())
    );

    if (!hasmedicalTerms) {
      notes.push('Document may not be a valid medical report');
    }

    const isValid = missingFields.length === 0 && notes.length === 0;

    return {
      isValid,
      notes: notes.join('; '),
      missingFields
    };
  }

  /**
   * Validate prescription
   */
  private async validatePrescription(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    const validator = this.documentValidators.get(DocumentType.PRESCRIPTION)!;
    const missingFields: string[] = [];
    const notes: string[] = [];

    // Check required fields
    validator.requiredFields.forEach(field => {
      if (!ocrResult.fields[field]) {
        missingFields.push(field);
      }
    });

    // Validate prescription specific requirements
    if (ocrResult.fields.medication) {
      // Check if medication name is reasonable length
      if (ocrResult.fields.medication.length < 3) {
        notes.push('Medication name appears incomplete');
      }
    }

    // Check for prescription terms
    const prescriptionTerms = [
      'receita', 'prescription', 'medicamento', 'medication',
      'dosagem', 'dosage', 'posologia', 'administração'
    ];

    const hasPrescriptionTerms = prescriptionTerms.some(term => 
      ocrResult.text.toLowerCase().includes(term.toLowerCase())
    );

    if (!hasPrescriptionTerms) {
      notes.push('Document may not be a valid prescription');
    }

    const isValid = missingFields.length === 0 && notes.length === 0;

    return {
      isValid,
      notes: notes.join('; '),
      missingFields
    };
  }

  /**
   * Validate exam results
   */
  private async validateExamResults(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    const validator = this.documentValidators.get(DocumentType.EXAM_RESULTS)!;
    const missingFields: string[] = [];
    const notes: string[] = [];

    // Check required fields
    validator.requiredFields.forEach(field => {
      if (!ocrResult.fields[field]) {
        missingFields.push(field);
      }
    });

    // Check for exam result terms
    const examTerms = [
      'resultado', 'result', 'exame', 'exam', 'teste', 'test',
      'análise', 'analysis', 'laboratório', 'laboratory'
    ];

    const hasExamTerms = examTerms.some(term => 
      ocrResult.text.toLowerCase().includes(term.toLowerCase())
    );

    if (!hasExamTerms) {
      notes.push('Document may not be valid exam results');
    }

    const isValid = missingFields.length === 0 && notes.length === 0;

    return {
      isValid,
      notes: notes.join('; '),
      missingFields
    };
  }

  /**
   * Validate insurance card
   */
  private async validateInsuranceCard(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    const validator = this.documentValidators.get(DocumentType.INSURANCE_CARD)!;
    const missingFields: string[] = [];
    const notes: string[] = [];

    // Check required fields
    validator.requiredFields.forEach(field => {
      if (!ocrResult.fields[field]) {
        missingFields.push(field);
      }
    });

    // Validate card number format
    if (ocrResult.fields.card_number) {
      const cleanCardNumber = ocrResult.fields.card_number.replace(/\s/g, '');
      if (cleanCardNumber.length !== 16) {
        notes.push('Invalid card number format');
      }
    }

    // Check validity date
    if (ocrResult.fields.validity_date) {
      const validityDate = this.parseDate(ocrResult.fields.validity_date);
      if (validityDate && validityDate < new Date()) {
        notes.push('Insurance card has expired');
      }
    }

    const isValid = missingFields.length === 0 && notes.length === 0;

    return {
      isValid,
      notes: notes.join('; '),
      missingFields
    };
  }

  /**
   * Validate ID document
   */
  private async validateIdDocument(
    document: Document, 
    ocrResult: any
  ): Promise<{ isValid: boolean; notes: string; missingFields: string[] }> {
    const validator = this.documentValidators.get(DocumentType.ID_DOCUMENT)!;
    const missingFields: string[] = [];
    const notes: string[] = [];

    // Check required fields
    validator.requiredFields.forEach(field => {
      if (!ocrResult.fields[field]) {
        missingFields.push(field);
      }
    });

    // Validate CPF format (Brazilian tax ID)
    if (ocrResult.fields.document_number) {
      const cpf = ocrResult.fields.document_number.replace(/\D/g, '');
      if (cpf.length === 11 && !this.isValidCPF(cpf)) {
        notes.push('Invalid CPF number');
      }
    }

    const isValid = missingFields.length === 0 && notes.length === 0;

    return {
      isValid,
      notes: notes.join('; '),
      missingFields
    };
  }

  /**
   * Parse date from string
   */
  private parseDate(dateString: string): Date | null {
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match = dateString.match(dateRegex);
    
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  }

  /**
   * Validate Brazilian CPF
   */
  private isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    
    // Check for repeated digits
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = sum % 11;
    let checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(cpf[9]) !== checkDigit1) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = sum % 11;
    let checkDigit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(cpf[10]) === checkDigit2;
  }

  /**
   * Get document processing status
   */
  getProcessingStatus(documentId: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const cacheKey = `ocr-${documentId}`;
    if (this.processingQueue.has(cacheKey)) {
      return 'processing';
    }
    // In production, check database status
    return 'completed';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
    }
    this.processingQueue.clear();
    logger.info('Document intelligence service cleaned up');
  }
}

// Document validator interface
interface DocumentValidator {
  requiredFields: string[];
  patterns: Record<string, RegExp>;
  validate: (document: Document, ocrResult: any) => Promise<{
    isValid: boolean;
    notes: string;
    missingFields: string[];
  }>;
}