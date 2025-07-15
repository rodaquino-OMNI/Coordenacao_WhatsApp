/**
 * Medical Document Classifier
 * AI-powered classification and medical document type recognition
 */

import {
  TextractBlock,
  MedicalDocumentType,
  DocumentClassificationResult,
  DocumentUrgency,
  QualityAssessment
} from '../types/medical-document.types';
import { MEDICAL_DOCUMENT_PATTERNS, CONFIDENCE_THRESHOLDS } from '../config/textract.config';
import { logger } from '../../../utils/logger';

export class MedicalDocumentClassifierService {
  
  /**
   * Classify medical document type using pattern matching and AI analysis
   */
  async classifyDocument(blocks: TextractBlock[]): Promise<DocumentClassificationResult> {
    const documentText = this.extractFullText(blocks);
    const lowerText = documentText.toLowerCase();
    
    logger.info('Starting document classification', {
      textLength: documentText.length,
      blocksCount: blocks.length
    });

    // Score each document type
    const typeScores: { [key in MedicalDocumentType]: number } = {
      [MedicalDocumentType.LAB_RESULTS]: this.scoreDocumentType(lowerText, MEDICAL_DOCUMENT_PATTERNS.LAB_RESULTS),
      [MedicalDocumentType.PRESCRIPTION]: this.scoreDocumentType(lowerText, MEDICAL_DOCUMENT_PATTERNS.PRESCRIPTION),
      [MedicalDocumentType.MEDICAL_REPORT]: this.scoreDocumentType(lowerText, MEDICAL_DOCUMENT_PATTERNS.MEDICAL_REPORT),
      [MedicalDocumentType.IMAGING_RESULTS]: this.scoreDocumentType(lowerText, MEDICAL_DOCUMENT_PATTERNS.IMAGING_RESULTS),
      [MedicalDocumentType.INSURANCE_CARD]: this.scoreDocumentType(lowerText, MEDICAL_DOCUMENT_PATTERNS.INSURANCE_CARD),
      [MedicalDocumentType.DISCHARGE_SUMMARY]: this.scoreDischargeDocument(lowerText),
      [MedicalDocumentType.CONSULTATION_NOTES]: this.scoreConsultationNotes(lowerText),
      [MedicalDocumentType.VACCINATION_RECORD]: this.scoreVaccinationRecord(lowerText),
      [MedicalDocumentType.AUTHORIZATION_FORM]: this.scoreAuthorizationForm(lowerText),
      [MedicalDocumentType.UNKNOWN]: 0
    };

    // Find the highest scoring type
    const sortedTypes = Object.entries(typeScores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const primaryType = sortedTypes[0]?.[0] as MedicalDocumentType || MedicalDocumentType.UNKNOWN;
    const primaryScore = sortedTypes[0]?.[1] || 0;

    // Generate reasoning
    const reasoning = this.generateClassificationReasoning(primaryType, documentText, blocks);

    // Alternative types
    const alternativeTypes = sortedTypes
      .slice(1, 4)
      .map(([type, confidence]) => ({
        type: type as MedicalDocumentType,
        confidence: confidence
      }));

    const result: DocumentClassificationResult = {
      documentType: primaryType,
      confidence: primaryScore,
      reasoning,
      alternativeTypes
    };

    logger.info('Document classification completed', {
      documentType: primaryType,
      confidence: primaryScore,
      alternativeTypes: alternativeTypes.length
    });

    return result;
  }

  /**
   * Assess document urgency based on content analysis
   */
  assessUrgency(
    documentType: MedicalDocumentType,
    blocks: TextractBlock[],
    medicalEntities: any[]
  ): DocumentUrgency {
    const documentText = this.extractFullText(blocks).toLowerCase();

    // Critical indicators
    const criticalTerms = [
      'emergency', 'urgent', 'stat', 'asap', 'critical', 'life-threatening',
      'cardiac arrest', 'stroke', 'myocardial infarction', 'severe bleeding',
      'respiratory failure', 'anaphylaxis', 'sepsis', 'trauma'
    ];

    const hasCriticalTerms = criticalTerms.some(term => documentText.includes(term));

    // High priority indicators
    const highPriorityTerms = [
      'abnormal', 'elevated', 'low', 'high', 'outside normal limits',
      'follow up immediately', 'requires attention', 'needs review'
    ];

    const hasHighPriorityTerms = highPriorityTerms.some(term => documentText.includes(term));

    // Document type specific urgency
    switch (documentType) {
      case MedicalDocumentType.LAB_RESULTS:
        return this.assessLabUrgency(documentText, medicalEntities);
      
      case MedicalDocumentType.IMAGING_RESULTS:
        return this.assessImagingUrgency(documentText);
      
      case MedicalDocumentType.PRESCRIPTION:
        return this.assessPrescriptionUrgency(documentText);
      
      case MedicalDocumentType.AUTHORIZATION_FORM:
        return DocumentUrgency.HIGH; // Authorization forms typically need quick processing
      
      default:
        if (hasCriticalTerms) return DocumentUrgency.CRITICAL;
        if (hasHighPriorityTerms) return DocumentUrgency.HIGH;
        return DocumentUrgency.MEDIUM;
    }
  }

  /**
   * Perform comprehensive quality assessment
   */
  assessQuality(blocks: TextractBlock[], documentMetadata: any): QualityAssessment {
    const textBlocks = blocks.filter(block => block.blockType === 'WORD' && block.text);
    const lineBlocks = blocks.filter(block => block.blockType === 'LINE');

    // Image quality assessment
    const imageQuality = this.assessImageQuality(blocks, documentMetadata);
    
    // Text clarity assessment
    const textClarity = this.assessTextClarity(textBlocks);
    
    // Completeness assessment
    const completeness = this.assessCompleteness(blocks, lineBlocks);
    
    // Medical relevance assessment
    const medicalRelevance = this.assessMedicalRelevance(blocks);

    const overallScore = (imageQuality + textClarity + completeness + medicalRelevance) / 4;

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Identify issues and recommendations
    if (imageQuality < 0.7) {
      issues.push('Poor image quality detected');
      recommendations.push('Consider rescanning document with higher resolution');
    }

    if (textClarity < 0.7) {
      issues.push('Text readability issues detected');
      recommendations.push('Manual review may be required for unclear text');
    }

    if (completeness < 0.8) {
      issues.push('Document appears incomplete or partially cut off');
      recommendations.push('Verify all pages are included in scan');
    }

    if (medicalRelevance < 0.6) {
      issues.push('Document may not contain relevant medical information');
      recommendations.push('Verify document type and content relevance');
    }

    return {
      overallScore,
      imageQuality,
      textClarity,
      completeness,
      medicalRelevance,
      issues,
      recommendations
    };
  }

  /**
   * Extract full text from blocks
   */
  private extractFullText(blocks: TextractBlock[]): string {
    return blocks
      .filter(block => block.blockType === 'LINE' && block.text)
      .map(block => block.text)
      .join(' ');
  }

  /**
   * Score document type based on pattern matching
   */
  private scoreDocumentType(text: string, pattern: any): number {
    let score = 0;
    
    // Keyword matching
    const keywordMatches = pattern.keywords.filter((keyword: string) => 
      text.includes(keyword.toLowerCase())
    ).length;
    
    score += (keywordMatches / pattern.keywords.length) * 0.5;

    // Pattern matching
    const patternMatches = pattern.patterns.filter((regex: RegExp) => 
      regex.test(text)
    ).length;
    
    score += (patternMatches / pattern.patterns.length) * 0.5;

    return Math.min(score, 1.0);
  }

  /**
   * Score discharge document specific patterns
   */
  private scoreDischargeDocument(text: string): number {
    const dischargeKeywords = [
      'discharge', 'alta', 'summary', 'resumo', 'hospital discharge',
      'discharge instructions', 'follow-up', 'medication list',
      'discharge diagnosis', 'condition on discharge'
    ];

    const dischargePatterns = [
      /\bdischarge\s+(date|diagnosis|instructions|summary)\b/i,
      /\balta\s+(hospitalar|médica)\b/i,
      /\bfollow.?up\s+(appointment|visit|care)\b/i,
      /\bcondition\s+on\s+discharge\b/i
    ];

    return this.scoreDocumentType(text, {
      keywords: dischargeKeywords,
      patterns: dischargePatterns
    });
  }

  /**
   * Score consultation notes specific patterns
   */
  private scoreConsultationNotes(text: string): number {
    const consultationKeywords = [
      'consultation', 'consulta', 'progress note', 'evolução',
      'clinical note', 'nota clínica', 'visit note', 'assessment',
      'plan', 'subjective', 'objective'
    ];

    const consultationPatterns = [
      /\b(subjective|objective|assessment|plan)\b/i,
      /\bsoap\s+note/i,
      /\bchief\s+complaint\b/i,
      /\bhistory\s+of\s+present\s+illness\b/i,
      /\bphysical\s+exam(ination)?\b/i
    ];

    return this.scoreDocumentType(text, {
      keywords: consultationKeywords,
      patterns: consultationPatterns
    });
  }

  /**
   * Score vaccination record patterns
   */
  private scoreVaccinationRecord(text: string): number {
    const vaccinationKeywords = [
      'vaccination', 'vacinação', 'immunization', 'imunização',
      'vaccine', 'vacina', 'shot', 'dose', 'booster',
      'hepatitis', 'influenza', 'covid', 'measles', 'mmr'
    ];

    const vaccinationPatterns = [
      /\b(vaccine|vaccination|immunization)\s+record/i,
      /\b(dose|shot)\s+\d+\b/i,
      /\b(hepatitis|influenza|covid|mmr|dtap|tdap)\b/i,
      /\bbooster\s+(shot|dose)\b/i,
      /\bimmunization\s+(history|schedule)\b/i
    ];

    return this.scoreDocumentType(text, {
      keywords: vaccinationKeywords,
      patterns: vaccinationPatterns
    });
  }

  /**
   * Score authorization form patterns
   */
  private scoreAuthorizationForm(text: string): number {
    const authKeywords = [
      'authorization', 'autorização', 'consent', 'consentimento',
      'prior authorization', 'autorização prévia', 'approval',
      'request', 'solicitação', 'form', 'formulário'
    ];

    const authPatterns = [
      /\bprior\s+authorization\b/i,
      /\bautorização\s+prévia\b/i,
      /\binsurance\s+(authorization|approval)\b/i,
      /\bmedical\s+necessity\b/i,
      /\b(patient|member)\s+(signature|consent)\b/i
    ];

    return this.scoreDocumentType(text, {
      keywords: authKeywords,
      patterns: authPatterns
    });
  }

  /**
   * Generate classification reasoning
   */
  private generateClassificationReasoning(
    documentType: MedicalDocumentType,
    text: string,
    blocks: TextractBlock[]
  ): string[] {
    const reasoning: string[] = [];

    switch (documentType) {
      case MedicalDocumentType.LAB_RESULTS:
        if (text.includes('lab') || text.includes('laboratory')) {
          reasoning.push('Contains laboratory-related terminology');
        }
        if (/\b\d+\.?\d*\s*(mg\/dl|mmol\/l|g\/dl)\b/i.test(text)) {
          reasoning.push('Contains medical measurement units typical of lab results');
        }
        if (text.includes('normal') || text.includes('abnormal')) {
          reasoning.push('Contains result classification terms');
        }
        break;

      case MedicalDocumentType.PRESCRIPTION:
        if (text.includes('prescription') || text.includes('medication')) {
          reasoning.push('Contains prescription-related terminology');
        }
        if (/\b\d+\s*(mg|ml|tablet|capsule)\b/i.test(text)) {
          reasoning.push('Contains dosage information typical of prescriptions');
        }
        if (/\b(once|twice|three times)\s+(daily|a day)\b/i.test(text)) {
          reasoning.push('Contains frequency instructions');
        }
        break;

      case MedicalDocumentType.IMAGING_RESULTS:
        if (text.includes('x-ray') || text.includes('ct') || text.includes('mri')) {
          reasoning.push('Contains imaging modality references');
        }
        if (text.includes('findings') || text.includes('impression')) {
          reasoning.push('Contains typical imaging report sections');
        }
        break;

      case MedicalDocumentType.INSURANCE_CARD:
        if (text.includes('insurance') || text.includes('member')) {
          reasoning.push('Contains insurance-related terminology');
        }
        if (/\bmember\s+id\b/i.test(text)) {
          reasoning.push('Contains member identification information');
        }
        break;

      default:
        reasoning.push('Classification based on pattern matching analysis');
    }

    // Add confidence-based reasoning
    const avgConfidence = blocks
      .filter(b => b.confidence > 0)
      .reduce((sum, b) => sum + b.confidence, 0) / blocks.length;

    if (avgConfidence > 0.9) {
      reasoning.push('High text extraction confidence supports classification');
    } else if (avgConfidence < 0.7) {
      reasoning.push('Lower extraction confidence may affect classification accuracy');
    }

    return reasoning;
  }

  /**
   * Assess lab result urgency
   */
  private assessLabUrgency(text: string, medicalEntities: any[]): DocumentUrgency {
    const criticalLabTerms = [
      'critical', 'panic', 'alert', 'stat', 'emergency',
      'life-threatening', 'immediate attention'
    ];

    const abnormalTerms = [
      'high', 'low', 'elevated', 'decreased', 'abnormal',
      'outside normal limits', 'critical value'
    ];

    if (criticalLabTerms.some(term => text.includes(term))) {
      return DocumentUrgency.CRITICAL;
    }

    if (abnormalTerms.some(term => text.includes(term))) {
      return DocumentUrgency.HIGH;
    }

    return DocumentUrgency.MEDIUM;
  }

  /**
   * Assess imaging urgency
   */
  private assessImagingUrgency(text: string): DocumentUrgency {
    const criticalFindings = [
      'mass', 'tumor', 'fracture', 'hemorrhage', 'stroke',
      'embolism', 'pneumothorax', 'acute', 'urgent'
    ];

    const abnormalFindings = [
      'abnormal', 'suspicious', 'concerning', 'recommend follow-up',
      'needs correlation', 'further evaluation'
    ];

    if (criticalFindings.some(term => text.includes(term))) {
      return DocumentUrgency.CRITICAL;
    }

    if (abnormalFindings.some(term => text.includes(term))) {
      return DocumentUrgency.HIGH;
    }

    return DocumentUrgency.MEDIUM;
  }

  /**
   * Assess prescription urgency
   */
  private assessPrescriptionUrgency(text: string): DocumentUrgency {
    const urgentMedications = [
      'antibiotic', 'insulin', 'epinephrine', 'nitroglycerin',
      'emergency', 'stat', 'prn', 'as needed for pain'
    ];

    if (urgentMedications.some(term => text.includes(term))) {
      return DocumentUrgency.HIGH;
    }

    return DocumentUrgency.MEDIUM;
  }

  /**
   * Assess image quality
   */
  private assessImageQuality(blocks: TextractBlock[], metadata: any): number {
    // Use confidence scores as a proxy for image quality
    const wordBlocks = blocks.filter(block => block.blockType === 'WORD' && block.confidence > 0);
    
    if (wordBlocks.length === 0) return 0;

    const avgConfidence = wordBlocks.reduce((sum, block) => sum + block.confidence, 0) / wordBlocks.length;
    
    // Adjust based on low confidence word count
    const lowConfidenceWords = wordBlocks.filter(block => block.confidence < 0.7).length;
    const lowConfidenceRatio = lowConfidenceWords / wordBlocks.length;
    
    return Math.max(0, avgConfidence - (lowConfidenceRatio * 0.3));
  }

  /**
   * Assess text clarity
   */
  private assessTextClarity(textBlocks: TextractBlock[]): number {
    if (textBlocks.length === 0) return 0;

    const totalWords = textBlocks.length;
    const clearWords = textBlocks.filter(block => block.confidence > 0.8).length;
    
    return clearWords / totalWords;
  }

  /**
   * Assess document completeness
   */
  private assessCompleteness(blocks: TextractBlock[], lineBlocks: TextractBlock[]): number {
    // Check for typical document structure elements
    const hasHeader = lineBlocks.some(block => 
      block.geometry?.boundingBox?.top && block.geometry.boundingBox.top < 0.1
    );
    
    const hasFooter = lineBlocks.some(block => 
      block.geometry?.boundingBox?.top && block.geometry.boundingBox.top > 0.9
    );
    
    const hasBody = lineBlocks.some(block => 
      block.geometry?.boundingBox?.top && 
      block.geometry.boundingBox.top > 0.1 && 
      block.geometry.boundingBox.top < 0.9
    );

    let score = 0;
    if (hasBody) score += 0.6; // Main content is most important
    if (hasHeader) score += 0.2;
    if (hasFooter) score += 0.2;

    // Penalize if very few text blocks (likely incomplete scan)
    if (lineBlocks.length < 5) {
      score *= 0.5;
    }

    return score;
  }

  /**
   * Assess medical relevance
   */
  private assessMedicalRelevance(blocks: TextractBlock[]): number {
    const text = this.extractFullText(blocks).toLowerCase();
    
    const medicalTerms = [
      'patient', 'doctor', 'physician', 'medical', 'health', 'diagnosis',
      'treatment', 'medication', 'prescription', 'lab', 'test', 'result',
      'hospital', 'clinic', 'medicine', 'disease', 'condition', 'symptom'
    ];

    const foundTerms = medicalTerms.filter(term => text.includes(term)).length;
    return Math.min(foundTerms / medicalTerms.length * 2, 1.0); // Scale to max 1.0
  }
}