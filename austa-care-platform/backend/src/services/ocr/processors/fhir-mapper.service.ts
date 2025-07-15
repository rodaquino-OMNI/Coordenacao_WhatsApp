/**
 * FHIR Mapper Service
 * Convert extracted medical data to FHIR R4 resources
 */

import {
  ProcessedDocument,
  LabResult,
  Prescription,
  MedicalEntity,
  MedicalDocumentType
} from '../types/medical-document.types';
import { FHIR_MAPPING_CONFIG } from '../config/textract.config';
import { logger } from '../../../utils/logger';

interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: any;
  identifier?: any[];
  subject?: any;
  effectiveDateTime?: string;
  [key: string]: any;
}

export class FHIRMapperService {
  private baseUrl: string;
  private version: string;

  constructor() {
    this.baseUrl = FHIR_MAPPING_CONFIG.baseUrl;
    this.version = FHIR_MAPPING_CONFIG.version;
  }

  /**
   * Convert processed document to FHIR resources
   */
  async mapDocumentToFHIR(document: ProcessedDocument): Promise<FHIRResource[]> {
    const resources: FHIRResource[] = [];

    logger.info('Starting FHIR mapping for document', {
      documentId: document.id,
      documentType: document.documentType
    });

    try {
      // Create Patient resource from extracted patient information
      const patientResource = this.createPatientResource(document);
      if (patientResource) {
        resources.push(patientResource);
      }

      // Create Practitioner resource from provider information
      const practitionerResource = this.createPractitionerResource(document);
      if (practitionerResource) {
        resources.push(practitionerResource);
      }

      // Map based on document type
      switch (document.documentType) {
        case MedicalDocumentType.LAB_RESULTS:
          resources.push(...this.mapLabResults(document));
          break;
        
        case MedicalDocumentType.PRESCRIPTION:
          resources.push(...this.mapPrescriptions(document));
          break;
        
        case MedicalDocumentType.MEDICAL_REPORT:
          resources.push(...this.mapMedicalReport(document));
          break;
        
        case MedicalDocumentType.IMAGING_RESULTS:
          resources.push(...this.mapImagingResults(document));
          break;
        
        default:
          resources.push(...this.mapGenericDocument(document));
      }

      // Create DocumentReference for the original document
      const documentReference = this.createDocumentReference(document);
      resources.push(documentReference);

      // Add Provenance resource for audit trail
      if (FHIR_MAPPING_CONFIG.includeProvenance) {
        const provenanceResource = this.createProvenanceResource(document, resources);
        resources.push(provenanceResource);
      }

      logger.info('FHIR mapping completed', {
        documentId: document.id,
        resourcesCreated: resources.length,
        resourceTypes: resources.map(r => r.resourceType)
      });

      return resources;

    } catch (error) {
      logger.error('FHIR mapping failed', {
        documentId: document.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create Patient resource from extracted entities
   */
  private createPatientResource(document: ProcessedDocument): FHIRResource | null {
    const patientEntities = document.medicalEntities.filter(e => e.category === 'PATIENT_INFO');
    
    if (patientEntities.length === 0) return null;

    const nameEntity = patientEntities.find(e => e.type === 'PATIENT_NAME');
    const cpfEntity = patientEntities.find(e => e.type === 'PATIENT_CPF');
    const cnsEntity = patientEntities.find(e => e.type === 'PATIENT_CNS');

    const patient: FHIRResource = {
      resourceType: 'Patient',
      id: this.generateId('Patient'),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
      },
      identifier: []
    };

    // Add identifiers
    if (cpfEntity) {
      patient.identifier!.push({
        use: 'official',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'TAX',
            display: 'Tax ID number'
          }]
        },
        system: 'http://www.receita.fazenda.gov.br/cpf',
        value: cpfEntity.normalizedValue
      });
    }

    if (cnsEntity) {
      patient.identifier!.push({
        use: 'official',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'SB',
            display: 'Social Beneficiary Identifier'
          }]
        },
        system: 'http://cns.datasus.gov.br',
        value: cnsEntity.normalizedValue
      });
    }

    // Add name
    if (nameEntity) {
      const nameParts = nameEntity.normalizedValue?.split(' ') || [];
      patient.name = [{
        use: 'official',
        family: nameParts.pop() || '',
        given: nameParts
      }];
    }

    return patient;
  }

  /**
   * Create Practitioner resource from provider entities
   */
  private createPractitionerResource(document: ProcessedDocument): FHIRResource | null {
    const providerEntities = document.medicalEntities.filter(e => e.category === 'PROVIDER_INFO');
    
    if (providerEntities.length === 0) return null;

    const nameEntity = providerEntities.find(e => e.type === 'PROVIDER_NAME');
    const licenseEntity = providerEntities.find(e => e.type === 'PROVIDER_LICENSE');

    const practitioner: FHIRResource = {
      resourceType: 'Practitioner',
      id: this.generateId('Practitioner'),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Practitioner']
      },
      identifier: []
    };

    // Add CRM license
    if (licenseEntity) {
      practitioner.identifier!.push({
        use: 'official',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'PRN',
            display: 'Provider number'
          }]
        },
        system: 'http://www.cfm.org.br/crm',
        value: licenseEntity.normalizedValue
      });
    }

    // Add name
    if (nameEntity) {
      const nameParts = nameEntity.normalizedValue?.split(' ') || [];
      practitioner.name = [{
        use: 'official',
        family: nameParts.pop() || '',
        given: nameParts,
        prefix: ['Dr.']
      }];
    }

    return practitioner;
  }

  /**
   * Map lab results to FHIR Observation resources
   */
  private mapLabResults(document: ProcessedDocument): FHIRResource[] {
    const observations: FHIRResource[] = [];

    if (!document.labResults) return observations;

    for (const labResult of document.labResults) {
      const observation: FHIRResource = {
        resourceType: 'Observation',
        id: this.generateId('Observation'),
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }]
        }],
        code: {
          text: labResult.testName
        },
        subject: {
          reference: `Patient/${this.getPatientId(document)}`
        },
        effectiveDateTime: labResult.dateCollected?.toISOString() || new Date().toISOString(),
        valueQuantity: {
          value: typeof labResult.value === 'number' ? labResult.value : parseFloat(labResult.value as string),
          unit: labResult.unit,
          system: 'http://unitsofmeasure.org',
          code: this.mapUnitToUCUM(labResult.unit)
        }
      };

      // Add reference range
      if (labResult.referenceRange) {
        observation.referenceRange = [{
          low: {
            value: labResult.referenceRange.min,
            unit: labResult.referenceRange.unit,
            system: 'http://unitsofmeasure.org',
            code: this.mapUnitToUCUM(labResult.referenceRange.unit)
          },
          high: {
            value: labResult.referenceRange.max,
            unit: labResult.referenceRange.unit,
            system: 'http://unitsofmeasure.org',
            code: this.mapUnitToUCUM(labResult.referenceRange.unit)
          }
        }];
      }

      // Add interpretation
      if (labResult.flag && labResult.flag !== 'NORMAL') {
        observation.interpretation = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: labResult.flag === 'HIGH' ? 'H' : labResult.flag === 'LOW' ? 'L' : 'A',
            display: labResult.flag
          }]
        }];
      }

      // Add performer (laboratory)
      if (labResult.laboratory) {
        observation.performer = [{
          display: labResult.laboratory
        }];
      }

      observations.push(observation);
    }

    return observations;
  }

  /**
   * Map prescriptions to FHIR MedicationRequest resources
   */
  private mapPrescriptions(document: ProcessedDocument): FHIRResource[] {
    const medicationRequests: FHIRResource[] = [];

    if (!document.prescriptions) return medicationRequests;

    for (const prescription of document.prescriptions) {
      const medicationRequest: FHIRResource = {
        resourceType: 'MedicationRequest',
        id: this.generateId('MedicationRequest'),
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest']
        },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          text: prescription.medicationName
        },
        subject: {
          reference: `Patient/${this.getPatientId(document)}`
        },
        authoredOn: prescription.dateIssued.toISOString(),
        requester: {
          reference: `Practitioner/${this.getPractitionerId(document)}`,
          display: prescription.prescriber
        }
      };

      // Add dosage instruction
      medicationRequest.dosageInstruction = [{
        text: `${prescription.dosage} ${prescription.frequency}`,
        timing: {
          repeat: this.parseFrequency(prescription.frequency)
        },
        doseAndRate: [{
          doseQuantity: this.parseDosage(prescription.dosage)
        }]
      }];

      // Add duration
      if (prescription.duration) {
        medicationRequest.dosageInstruction[0].timing.repeat.boundsDuration = 
          this.parseDuration(prescription.duration);
      }

      // Add dispense request
      if (prescription.daysSupply || prescription.refills) {
        medicationRequest.dispenseRequest = {};
        
        if (prescription.daysSupply) {
          medicationRequest.dispenseRequest.expectedSupplyDuration = {
            value: prescription.daysSupply,
            unit: 'days',
            system: 'http://unitsofmeasure.org',
            code: 'd'
          };
        }
        
        if (prescription.refills) {
          medicationRequest.dispenseRequest.numberOfRepeatsAllowed = prescription.refills;
        }
      }

      medicationRequests.push(medicationRequest);
    }

    return medicationRequests;
  }

  /**
   * Map medical report to FHIR Condition resources
   */
  private mapMedicalReport(document: ProcessedDocument): FHIRResource[] {
    const conditions: FHIRResource[] = [];

    const diagnosisEntities = document.medicalEntities.filter(e => e.category === 'DIAGNOSIS');

    for (const diagnosis of diagnosisEntities) {
      const condition: FHIRResource = {
        resourceType: 'Condition',
        id: this.generateId('Condition'),
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/Condition']
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed'
          }]
        },
        code: {
          text: diagnosis.text
        },
        subject: {
          reference: `Patient/${this.getPatientId(document)}`
        },
        recordedDate: new Date().toISOString()
      };

      // Add ICD-10 code if available
      if (diagnosis.icd10Code) {
        condition.code.coding = [{
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: diagnosis.icd10Code,
          display: diagnosis.text
        }];
      }

      // Add severity if available
      if (diagnosis.severity) {
        condition.severity = {
          coding: [{
            system: 'http://snomed.info/sct',
            code: diagnosis.severity === 'MILD' ? '255604002' : 
                  diagnosis.severity === 'MODERATE' ? '6736007' : '24484000',
            display: diagnosis.severity
          }]
        };
      }

      conditions.push(condition);
    }

    return conditions;
  }

  /**
   * Map imaging results to FHIR ImagingStudy resources
   */
  private mapImagingResults(document: ProcessedDocument): FHIRResource[] {
    const imagingStudies: FHIRResource[] = [];

    const imagingEntities = document.medicalEntities.filter(e => e.category === 'IMAGING');
    const modalityEntities = imagingEntities.filter(e => e.type === 'IMAGING_MODALITY');

    if (modalityEntities.length > 0) {
      const imagingStudy: FHIRResource = {
        resourceType: 'ImagingStudy',
        id: this.generateId('ImagingStudy'),
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/ImagingStudy']
        },
        status: 'available',
        subject: {
          reference: `Patient/${this.getPatientId(document)}`
        },
        started: new Date().toISOString(),
        numberOfSeries: 1,
        numberOfInstances: 1
      };

      // Add modality
      const modality = modalityEntities[0];
      imagingStudy.modality = [{
        system: 'http://dicom.nema.org/resources/ontology/DCM',
        code: this.mapModalityToDICOM(modality.normalizedValue || modality.text),
        display: modality.text
      }];

      // Add series
      imagingStudy.series = [{
        uid: this.generateUid(),
        number: 1,
        modality: imagingStudy.modality[0],
        numberOfInstances: 1,
        bodySite: {
          text: 'Not specified'
        },
        instance: [{
          uid: this.generateUid(),
          sopClass: {
            system: 'urn:ietf:rfc:3986',
            code: 'urn:oid:1.2.840.10008.5.1.4.1.1.1'
          },
          number: 1
        }]
      }];

      imagingStudies.push(imagingStudy);
    }

    return imagingStudies;
  }

  /**
   * Map generic document entities
   */
  private mapGenericDocument(document: ProcessedDocument): FHIRResource[] {
    const resources: FHIRResource[] = [];

    // Create basic Composition resource for structured documents
    const composition: FHIRResource = {
      resourceType: 'Composition',
      id: this.generateId('Composition'),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Composition']
      },
      status: 'final',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '18842-5',
          display: 'Discharge summary'
        }]
      },
      subject: {
        reference: `Patient/${this.getPatientId(document)}`
      },
      date: new Date().toISOString(),
      author: [{
        reference: `Practitioner/${this.getPractitionerId(document)}`
      }],
      title: document.originalFileName,
      section: [{
        title: 'Extracted Content',
        text: {
          status: 'additional',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${this.formatExtractedText(document)}</div>`
        }
      }]
    };

    resources.push(composition);
    return resources;
  }

  /**
   * Create DocumentReference for the original document
   */
  private createDocumentReference(document: ProcessedDocument): FHIRResource {
    return {
      resourceType: 'DocumentReference',
      id: this.generateId('DocumentReference'),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/DocumentReference']
      },
      status: 'current',
      type: {
        text: document.documentType
      },
      subject: {
        reference: `Patient/${this.getPatientId(document)}`
      },
      date: document.processingStartTime.toISOString(),
      description: `OCR processed document: ${document.originalFileName}`,
      content: [{
        attachment: {
          contentType: 'application/pdf',
          url: `s3://${document.s3Key}`,
          title: document.originalFileName,
          creation: document.processingStartTime.toISOString()
        }
      }],
      context: {
        period: {
          start: document.processingStartTime.toISOString(),
          end: document.processingEndTime?.toISOString()
        }
      }
    };
  }

  /**
   * Create Provenance resource for audit trail
   */
  private createProvenanceResource(document: ProcessedDocument, resources: FHIRResource[]): FHIRResource {
    return {
      resourceType: 'Provenance',
      id: this.generateId('Provenance'),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Provenance']
      },
      target: resources.map(r => ({ reference: `${r.resourceType}/${r.id}` })),
      occurredDateTime: document.processingStartTime.toISOString(),
      recorded: new Date().toISOString(),
      activity: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
          code: 'CREATE',
          display: 'Created'
        }]
      },
      agent: [{
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
            code: 'performer',
            display: 'Performer'
          }]
        },
        who: {
          display: 'AWS Textract OCR Service'
        }
      }],
      signature: [{
        type: [{
          system: 'urn:iso-astm:E1762-95:2013',
          code: '1.2.840.10065.1.12.1.1',
          display: 'Author\'s Signature'
        }],
        when: new Date().toISOString(),
        who: {
          display: 'Austa Care Platform'
        },
        data: Buffer.from(JSON.stringify({
          documentId: document.id,
          confidence: document.overallConfidence,
          qualityScore: document.qualityScore
        })).toString('base64')
      }]
    };
  }

  /**
   * Utility methods
   */
  private generateId(resourceType: string): string {
    return `${resourceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUid(): string {
    return `2.25.${Date.now()}${Math.floor(Math.random() * 1000000)}`;
  }

  private getPatientId(document: ProcessedDocument): string {
    return `Patient-${document.id}`;
  }

  private getPractitionerId(document: ProcessedDocument): string {
    return `Practitioner-${document.id}`;
  }

  private mapUnitToUCUM(unit?: string): string {
    const unitMap: { [key: string]: string } = {
      'mg/dl': 'mg/dL',
      'g/dl': 'g/dL',
      'mmol/l': 'mmol/L',
      '%': '%',
      'k/ul': '10*3/uL',
      '/ul': '/uL'
    };
    
    return unitMap[unit?.toLowerCase() || ''] || unit || '';
  }

  private parseFrequency(frequency: string): any {
    if (frequency.includes('once daily') || frequency.includes('uma vez ao dia')) {
      return { frequency: 1, period: 1, periodUnit: 'd' };
    }
    if (frequency.includes('twice daily') || frequency.includes('duas vezes ao dia')) {
      return { frequency: 2, period: 1, periodUnit: 'd' };
    }
    if (frequency.includes('three times') || frequency.includes('três vezes')) {
      return { frequency: 3, period: 1, periodUnit: 'd' };
    }
    
    return { frequency: 1, period: 1, periodUnit: 'd' }; // Default
  }

  private parseDosage(dosage: string): any {
    const match = dosage.match(/(\d+\.?\d*)\s*(mg|ml|g|mcg|units?)/i);
    if (match) {
      return {
        value: parseFloat(match[1]),
        unit: match[2],
        system: 'http://unitsofmeasure.org',
        code: this.mapUnitToUCUM(match[2])
      };
    }
    
    return { value: 1, unit: 'dose' };
  }

  private parseDuration(duration: string): any {
    const match = duration.match(/(\d+)\s+(dias?|semanas?|meses?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      if (unit.includes('dia')) {
        return { value, unit: 'days', system: 'http://unitsofmeasure.org', code: 'd' };
      }
      if (unit.includes('semana')) {
        return { value, unit: 'weeks', system: 'http://unitsofmeasure.org', code: 'wk' };
      }
      if (unit.includes('mês') || unit.includes('mes')) {
        return { value, unit: 'months', system: 'http://unitsofmeasure.org', code: 'mo' };
      }
    }
    
    return { value: 1, unit: 'days', system: 'http://unitsofmeasure.org', code: 'd' };
  }

  private mapModalityToDICOM(modality: string): string {
    const modalityMap: { [key: string]: string } = {
      'raio-x': 'DX',
      'raio x': 'DX',
      'tomografia': 'CT',
      'ressonância': 'MR',
      'ultrassom': 'US',
      'mamografia': 'MG',
      'densitometria': 'DEXA',
      'cintilografia': 'NM'
    };
    
    return modalityMap[modality.toLowerCase()] || 'OT';
  }

  private formatExtractedText(document: ProcessedDocument): string {
    const text = document.blocks
      .filter(block => block.blockType === 'LINE' && block.text)
      .map(block => block.text)
      .join('<br/>');
    
    return text || 'No text extracted';
  }

  /**
   * Validate FHIR resources
   */
  async validateResources(resources: FHIRResource[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const resource of resources) {
      // Basic validation
      if (!resource.resourceType) {
        errors.push(`Resource missing resourceType: ${JSON.stringify(resource)}`);
      }
      
      if (!resource.id) {
        errors.push(`Resource missing id: ${resource.resourceType}`);
      }

      // Type-specific validation
      switch (resource.resourceType) {
        case 'Patient':
          if (!resource.identifier || resource.identifier.length === 0) {
            errors.push('Patient resource must have at least one identifier');
          }
          break;
        
        case 'Observation':
          if (!resource.code || !resource.subject) {
            errors.push('Observation resource must have code and subject');
          }
          break;
        
        case 'MedicationRequest':
          if (!resource.medicationCodeableConcept || !resource.subject) {
            errors.push('MedicationRequest must have medication and subject');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}