/**
 * Medical Entity Extractor
 * Advanced medical entity recognition and extraction from OCR results
 */

import {
  TextractBlock,
  MedicalEntity,
  LabResult,
  Prescription,
  MedicalDocumentType
} from '../types/medical-document.types';
import { MEDICAL_ENTITIES_CONFIG, BRAZILIAN_MEDICAL_CONFIG } from '../config/textract.config';
import { logger } from '../../../utils/logger';

export class MedicalEntityExtractorService {

  /**
   * Extract all medical entities from document blocks
   */
  async extractMedicalEntities(
    blocks: TextractBlock[],
    documentType: MedicalDocumentType
  ): Promise<MedicalEntity[]> {
    const fullText = this.extractFullText(blocks);
    const entities: MedicalEntity[] = [];

    logger.info('Starting medical entity extraction', {
      documentType,
      textLength: fullText.length,
      blocksCount: blocks.length
    });

    // Extract different types of entities based on document type
    switch (documentType) {
      case MedicalDocumentType.LAB_RESULTS:
        entities.push(...await this.extractLabEntities(fullText, blocks));
        break;
      
      case MedicalDocumentType.PRESCRIPTION:
        entities.push(...await this.extractMedicationEntities(fullText, blocks));
        break;
      
      case MedicalDocumentType.MEDICAL_REPORT:
        entities.push(...await this.extractDiagnosisEntities(fullText, blocks));
        entities.push(...await this.extractProviderEntities(fullText, blocks));
        break;
      
      case MedicalDocumentType.IMAGING_RESULTS:
        entities.push(...await this.extractImagingEntities(fullText, blocks));
        break;
      
      default:
        // Extract all types for unknown documents
        entities.push(...await this.extractGeneralMedicalEntities(fullText, blocks));
    }

    // Extract patient information (common to all document types)
    entities.push(...await this.extractPatientEntities(fullText, blocks));

    // Validate and normalize entities
    const validatedEntities = this.validateAndNormalizeEntities(entities);

    logger.info('Medical entity extraction completed', {
      entitiesFound: validatedEntities.length,
      byCategory: this.groupEntitiesByCategory(validatedEntities)
    });

    return validatedEntities;
  }

  /**
   * Extract structured lab results
   */
  async extractLabResults(blocks: TextractBlock[]): Promise<LabResult[]> {
    const fullText = this.extractFullText(blocks);
    const labResults: LabResult[] = [];

    // Common lab test patterns
    const labPatterns = [
      // Glucose
      {
        pattern: /glucose[\s:]*(\d+\.?\d*)\s*(mg\/dl|mmol\/l)?/gi,
        testName: 'Glucose',
        unit: 'mg/dl',
        referenceRange: { min: 70, max: 99, unit: 'mg/dl' }
      },
      // Cholesterol
      {
        pattern: /cholesterol[\s:]*(\d+\.?\d*)\s*(mg\/dl)?/gi,
        testName: 'Total Cholesterol',
        unit: 'mg/dl',
        referenceRange: { min: 0, max: 200, unit: 'mg/dl' }
      },
      // Hemoglobin
      {
        pattern: /hemoglobin[\s:]*(\d+\.?\d*)\s*(g\/dl)?/gi,
        testName: 'Hemoglobin',
        unit: 'g/dl',
        referenceRange: { min: 12.0, max: 16.0, unit: 'g/dl' }
      },
      // White Blood Cell Count
      {
        pattern: /(?:wbc|white blood cell)[\s:]*(\d+\.?\d*)\s*(k\/ul|\/ul)?/gi,
        testName: 'White Blood Cell Count',
        unit: 'K/uL',
        referenceRange: { min: 4.5, max: 11.0, unit: 'K/uL' }
      },
      // Creatinine
      {
        pattern: /creatinine[\s:]*(\d+\.?\d*)\s*(mg\/dl)?/gi,
        testName: 'Creatinine',
        unit: 'mg/dl',
        referenceRange: { min: 0.6, max: 1.2, unit: 'mg/dl' }
      }
    ];

    for (const labPattern of labPatterns) {
      let match;
      while ((match = labPattern.pattern.exec(fullText)) !== null) {
        const value = parseFloat(match[1]);
        const extractedUnit = match[2] || labPattern.unit;

        // Determine flag based on reference range
        let flag: 'HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL' = 'NORMAL';
        if (labPattern.referenceRange) {
          if (value < labPattern.referenceRange.min) {
            flag = 'LOW';
          } else if (value > labPattern.referenceRange.max) {
            flag = 'HIGH';
          }
          
          // Check for critical values
          if (labPattern.testName === 'Glucose' && (value < 50 || value > 400)) {
            flag = 'CRITICAL';
          }
        }

        labResults.push({
          testName: labPattern.testName,
          value: value,
          unit: extractedUnit,
          referenceRange: labPattern.referenceRange,
          flag: flag,
          confidence: 0.85, // Default confidence, should be calculated from OCR
          dateCollected: this.extractDate(fullText),
          laboratory: this.extractLaboratory(fullText)
        });
      }
    }

    return labResults;
  }

  /**
   * Extract structured prescriptions
   */
  async extractPrescriptions(blocks: TextractBlock[]): Promise<Prescription[]> {
    const fullText = this.extractFullText(blocks);
    const prescriptions: Prescription[] = [];

    // Medication extraction patterns
    const medicationPatterns = [
      // Standard format: Drug name + dosage + frequency
      /(\w+(?:\s+\w+)?)\s+(\d+\.?\d*\s*(?:mg|ml|g|mcg|units?))\s+(?:take\s+)?(\d+\s+times?\s+(?:daily|per day|a day)|once\s+daily|twice\s+daily|every\s+\d+\s+hours?)/gi,
      
      // Prescription format: Rx
      /rx[\s#]*\d*[\s:]*([^,\n]+),?\s*(\d+\.?\d*\s*(?:mg|ml|g|mcg|units?))[,\s]*([^,\n]*(?:daily|times|hours)[^,\n]*)/gi,
      
      // Simple format
      /(\w+(?:\s+\w+)?)\s*[-:]\s*(\d+\.?\d*\s*(?:mg|ml|g|mcg|units?))/gi
    ];

    for (const pattern of medicationPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const medicationName = this.cleanMedicationName(match[1]);
        const dosage = match[2] || '';
        const frequency = match[3] || '';

        if (this.isValidMedicationName(medicationName)) {
          prescriptions.push({
            medicationName: medicationName,
            dosage: dosage.trim(),
            frequency: frequency.trim(),
            duration: this.extractDuration(fullText, medicationName),
            instructions: this.extractInstructions(fullText, medicationName),
            prescriber: this.extractPrescriber(fullText),
            dateIssued: this.extractDate(fullText) || new Date(),
            daysSupply: this.extractDaysSupply(fullText, medicationName),
            refills: this.extractRefills(fullText, medicationName),
            confidence: 0.8
          });
        }
      }
    }

    return prescriptions;
  }

  /**
   * Extract lab-specific entities
   */
  private async extractLabEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Extract numeric lab values with units
    const labValuePattern = /(\w+(?:\s+\w+)*)\s*[:=]\s*(\d+\.?\d*)\s*(mg\/dl|mmol\/l|g\/dl|%|k\/ul|\/ul)/gi;
    let match;

    while ((match = labValuePattern.exec(text)) !== null) {
      entities.push({
        type: 'LAB_VALUE',
        text: match[0],
        confidence: 0.85,
        category: 'LAB_VALUE',
        normalizedValue: match[2],
        unit: match[3]
      });
    }

    // Extract reference ranges
    const rangePattern = /(normal|reference)\s+range\s*[:=]\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*(\w+)/gi;
    while ((match = rangePattern.exec(text)) !== null) {
      entities.push({
        type: 'REFERENCE_RANGE',
        text: match[0],
        confidence: 0.8,
        category: 'LAB_VALUE',
        referenceRange: {
          min: parseFloat(match[2]),
          max: parseFloat(match[3]),
          unit: match[4]
        }
      });
    }

    return entities;
  }

  /**
   * Extract medication entities
   */
  private async extractMedicationEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Common Brazilian medications
    const brazilianMeds = [
      'dipirona', 'paracetamol', 'ibuprofeno', 'aspirina', 'amoxicilina',
      'azitromicina', 'omeprazol', 'losartana', 'sinvastatina', 'metformina',
      'enalapril', 'captopril', 'furosemida', 'hidroclorotiazida', 'anlodipino'
    ];

    // Extract medication names
    const medPattern = new RegExp(`\\b(${brazilianMeds.join('|')})\\b`, 'gi');
    let match;

    while ((match = medPattern.exec(text)) !== null) {
      entities.push({
        type: 'MEDICATION',
        text: match[0],
        confidence: 0.9,
        category: 'MEDICATION',
        normalizedValue: match[0].toLowerCase()
      });
    }

    // Extract dosages
    const dosagePattern = /(\d+\.?\d*)\s*(mg|ml|g|mcg|units?|comprimidos?|cápsulas?)/gi;
    while ((match = dosagePattern.exec(text)) !== null) {
      entities.push({
        type: 'DOSAGE',
        text: match[0],
        confidence: 0.85,
        category: 'DOSAGE',
        normalizedValue: match[1],
        unit: match[2]
      });
    }

    // Extract frequencies
    const frequencyPattern = /(\d+\s+(?:vez|vezes)\s+(?:ao\s+dia|por\s+dia)|(?:uma|duas|três)\s+vezes\s+ao\s+dia|de\s+\d+\s+em\s+\d+\s+horas)/gi;
    while ((match = frequencyPattern.exec(text)) !== null) {
      entities.push({
        type: 'FREQUENCY',
        text: match[0],
        confidence: 0.8,
        category: 'FREQUENCY',
        normalizedValue: match[0]
      });
    }

    return entities;
  }

  /**
   * Extract diagnosis entities
   */
  private async extractDiagnosisEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Extract ICD-10 codes
    const icd10Pattern = new RegExp(BRAZILIAN_MEDICAL_CONFIG.cid10.pattern, 'gi');
    let match;

    while ((match = icd10Pattern.exec(text)) !== null) {
      entities.push({
        type: 'ICD10_CODE',
        text: match[0],
        confidence: 0.95,
        category: 'DIAGNOSIS',
        icd10Code: match[0],
        normalizedValue: match[0]
      });
    }

    // Common medical conditions in Portuguese
    const conditions = [
      'hipertensão', 'diabetes', 'pneumonia', 'bronquite', 'sinusite',
      'gastrite', 'úlcera', 'artrite', 'osteoporose', 'depressão',
      'ansiedade', 'cefaleia', 'enxaqueca', 'asma', 'rinite'
    ];

    const conditionPattern = new RegExp(`\\b(${conditions.join('|')})\\b`, 'gi');
    while ((match = conditionPattern.exec(text)) !== null) {
      entities.push({
        type: 'CONDITION',
        text: match[0],
        confidence: 0.8,
        category: 'DIAGNOSIS',
        normalizedValue: match[0].toLowerCase()
      });
    }

    return entities;
  }

  /**
   * Extract provider entities
   */
  private async extractProviderEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Extract CRM (Brazilian medical license)
    const crmPattern = new RegExp(BRAZILIAN_MEDICAL_CONFIG.crm.pattern, 'gi');
    let match;

    while ((match = crmPattern.exec(text)) !== null) {
      entities.push({
        type: 'PROVIDER_LICENSE',
        text: match[0],
        confidence: 0.9,
        category: 'PROVIDER_INFO',
        normalizedValue: match[0]
      });
    }

    // Extract doctor names (Dr./Dra. followed by name)
    const doctorPattern = /(?:dr|dra|doutor|doutora)\.?\s+([a-záàâãéêíóôõúç\s]{2,30})/gi;
    while ((match = doctorPattern.exec(text)) !== null) {
      entities.push({
        type: 'PROVIDER_NAME',
        text: match[0],
        confidence: 0.75,
        category: 'PROVIDER_INFO',
        normalizedValue: match[1].trim()
      });
    }

    return entities;
  }

  /**
   * Extract imaging entities
   */
  private async extractImagingEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Imaging modalities
    const modalityPattern = /\b(raio-?x|tomografia|ressonância|ultrassom|mamografia|densitometria|cintilografia)\b/gi;
    let match;

    while ((match = modalityPattern.exec(text)) !== null) {
      entities.push({
        type: 'IMAGING_MODALITY',
        text: match[0],
        confidence: 0.9,
        category: 'IMAGING',
        normalizedValue: match[0].toLowerCase()
      });
    }

    // Findings
    const findingsPattern = /\b(normal|anormal|suspeito|alterado|aumentado|diminuído|massa|nódulo|lesão|fratura)\b/gi;
    while ((match = findingsPattern.exec(text)) !== null) {
      entities.push({
        type: 'FINDING',
        text: match[0],
        confidence: 0.8,
        category: 'IMAGING',
        normalizedValue: match[0].toLowerCase()
      });
    }

    // Measurements
    const measurementPattern = /(\d+\.?\d*)\s*(mm|cm|metros?)/gi;
    while ((match = measurementPattern.exec(text)) !== null) {
      entities.push({
        type: 'MEASUREMENT',
        text: match[0],
        confidence: 0.85,
        category: 'IMAGING',
        normalizedValue: match[1],
        unit: match[2]
      });
    }

    return entities;
  }

  /**
   * Extract patient entities
   */
  private async extractPatientEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Extract CPF
    const cpfPattern = new RegExp(BRAZILIAN_MEDICAL_CONFIG.cpf.pattern, 'g');
    let match;

    while ((match = cpfPattern.exec(text)) !== null) {
      if (this.isValidCPF(match[0])) {
        entities.push({
          type: 'PATIENT_CPF',
          text: match[0],
          confidence: 0.95,
          category: 'PATIENT_INFO',
          normalizedValue: match[0].replace(/\D/g, '')
        });
      }
    }

    // Extract CNS (Cartão Nacional de Saúde)
    const cnsPattern = new RegExp(BRAZILIAN_MEDICAL_CONFIG.cns.pattern, 'g');
    while ((match = cnsPattern.exec(text)) !== null) {
      entities.push({
        type: 'PATIENT_CNS',
        text: match[0],
        confidence: 0.9,
        category: 'PATIENT_INFO',
        normalizedValue: match[0]
      });
    }

    // Extract patient names (basic pattern)
    const namePattern = /(?:paciente|nome):?\s*([a-záàâãéêíóôõúç\s]{2,50})/gi;
    while ((match = namePattern.exec(text)) !== null) {
      entities.push({
        type: 'PATIENT_NAME',
        text: match[0],
        confidence: 0.7,
        category: 'PATIENT_INFO',
        normalizedValue: match[1].trim()
      });
    }

    return entities;
  }

  /**
   * Extract general medical entities
   */
  private async extractGeneralMedicalEntities(text: string, blocks: TextractBlock[]): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Combine all extraction methods for unknown documents
    entities.push(...await this.extractLabEntities(text, blocks));
    entities.push(...await this.extractMedicationEntities(text, blocks));
    entities.push(...await this.extractDiagnosisEntities(text, blocks));
    entities.push(...await this.extractProviderEntities(text, blocks));

    return entities;
  }

  /**
   * Utility methods
   */
  private extractFullText(blocks: TextractBlock[]): string {
    return blocks
      .filter(block => block.blockType === 'LINE' && block.text)
      .map(block => block.text)
      .join(' ');
  }

  private validateAndNormalizeEntities(entities: MedicalEntity[]): MedicalEntity[] {
    return entities
      .filter(entity => entity.confidence >= MEDICAL_ENTITIES_CONFIG[entity.category]?.confidence || 0.7)
      .map(entity => ({
        ...entity,
        normalizedValue: entity.normalizedValue?.toLowerCase().trim()
      }));
  }

  private groupEntitiesByCategory(entities: MedicalEntity[]): { [key: string]: number } {
    return entities.reduce((acc, entity) => {
      acc[entity.category] = (acc[entity.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private cleanMedicationName(name: string): string {
    return name.trim().replace(/[^\w\s]/g, '').toLowerCase();
  }

  private isValidMedicationName(name: string): boolean {
    return name.length > 2 && /^[a-z\s]+$/i.test(name);
  }

  private extractDate(text: string): Date | undefined {
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const match = text.match(datePattern);
    
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(match[3]);
      
      return new Date(year < 100 ? 2000 + year : year, month, day);
    }
    
    return undefined;
  }

  private extractLaboratory(text: string): string | undefined {
    const labPattern = /(?:laboratório|lab):?\s*([a-záàâãéêíóôõúç\s]{2,30})/gi;
    const match = text.match(labPattern);
    return match ? match[0].split(':')[1]?.trim() : undefined;
  }

  private extractDuration(text: string, medicationName: string): string | undefined {
    const durationPattern = /(?:por|durante)\s+(\d+\s+(?:dias?|semanas?|meses?))/gi;
    const match = text.match(durationPattern);
    return match ? match[0] : undefined;
  }

  private extractInstructions(text: string, medicationName: string): string | undefined {
    const instructionPattern = /(?:tomar|usar|aplicar|administrar):?\s*([^.!?]*)/gi;
    const match = text.match(instructionPattern);
    return match ? match[0] : undefined;
  }

  private extractPrescriber(text: string): string {
    const prescriberPattern = /(?:dr|dra|doutor|doutora)\.?\s+([a-záàâãéêíóôõúç\s]{2,30})/gi;
    const match = text.match(prescriberPattern);
    return match ? match[0] : 'Unknown';
  }

  private extractDaysSupply(text: string, medicationName: string): number | undefined {
    const supplyPattern = /(\d+)\s+dias?\s+de\s+(?:tratamento|suprimento|fornecimento)/gi;
    const match = text.match(supplyPattern);
    return match ? parseInt(match[0]) : undefined;
  }

  private extractRefills(text: string, medicationName: string): number | undefined {
    const refillPattern = /(\d+)\s+(?:refil|renovação|reposição)/gi;
    const match = text.match(refillPattern);
    return match ? parseInt(match[0]) : undefined;
  }

  private isValidCPF(cpf: string): boolean {
    // Basic CPF validation (simplified)
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11 && !/^(\d)\1{10}$/.test(cleanCPF);
  }
}