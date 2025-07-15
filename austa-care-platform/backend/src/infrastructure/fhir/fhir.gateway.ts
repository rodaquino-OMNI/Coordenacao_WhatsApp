import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';
import { eventPublisher } from '../kafka/events/event.publisher';

// FHIR Resource Types
export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name: Array<{
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
    use?: 'home' | 'work' | 'mobile';
  }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  subject: {
    reference: string; // Patient reference
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'instance-order';
  medicationCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  subject: {
    reference: string; // Patient reference
  };
  authoredOn?: string;
  requester?: {
    reference: string; // Practitioner reference
  };
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
      };
    };
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value: number;
        unit: string;
      };
    }>;
  }>;
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id?: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  subject: {
    reference: string; // Patient reference
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    reference: string; // Practitioner or Organization reference
  }>;
  result?: Array<{
    reference: string; // Observation reference
  }>;
  conclusion?: string;
}

export interface FHIREncounter {
  resourceType: 'Encounter';
  id?: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: {
    system: string;
    code: string;
    display?: string;
  };
  type?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
  subject: {
    reference: string; // Patient reference
  };
  participant?: Array<{
    individual?: {
      reference: string; // Practitioner reference
    };
  }>;
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
}

export type FHIRResource = FHIRPatient | FHIRObservation | FHIRMedicationRequest | FHIRDiagnosticReport | FHIREncounter;

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'batch' | 'transaction' | 'history' | 'document' | 'message';
  total?: number;
  entry?: Array<{
    resource: FHIRResource;
    search?: {
      mode: 'match' | 'include' | 'outcome';
    };
  }>;
}

export class FHIRGateway {
  private static instance: FHIRGateway;
  private client: AxiosInstance;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = config.fhir?.baseUrl || 'http://localhost:8080/fhir';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
      },
    });

    this.setupInterceptors();
  }

  static getInstance(): FHIRGateway {
    if (!FHIRGateway.instance) {
      FHIRGateway.instance = new FHIRGateway();
    }
    return FHIRGateway.instance;
  }

  // Setup axios interceptors
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add OAuth token if available
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        logger.debug('FHIR request:', {
          method: config.method,
          url: config.url,
        });

        return config;
      },
      (error) => {
        logger.error('FHIR request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('FHIR response:', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error) => {
        logger.error('FHIR response error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        // Handle authentication errors
        if (error.response?.status === 401) {
          await this.refreshAccessToken();
          // Retry the request
          return this.client.request(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  // Get access token (implement OAuth flow)
  private getAccessToken(): string | null {
    // TODO: Implement OAuth token management
    // For now, return null as FHIR config doesn't include accessToken
    return null;
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<void> {
    // TODO: Implement OAuth token refresh
    logger.info('Refreshing FHIR access token');
  }

  // Create a resource
  async createResource<T extends FHIRResource>(resource: T): Promise<T> {
    try {
      const response = await this.client.post(`/${resource.resourceType}`, resource);
      
      await eventPublisher.publish({
        eventType: 'fhir.resource.created',
        source: 'fhir-gateway',
        version: '1.0',
        data: {
          resourceType: resource.resourceType,
          resourceId: response.data.id,
          userId: 'system', // TODO: Pass actual user ID
          resource: response.data,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to create FHIR ${resource.resourceType}:`, error);
      throw error;
    }
  }

  // Read a resource by ID
  async readResource<T extends FHIRResource>(resourceType: string, id: string): Promise<T> {
    try {
      const response = await this.client.get(`/${resourceType}/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to read FHIR ${resourceType}/${id}:`, error);
      throw error;
    }
  }

  // Update a resource
  async updateResource<T extends FHIRResource>(resource: T): Promise<T> {
    if (!resource.id) {
      throw new Error('Resource ID is required for update');
    }

    try {
      const response = await this.client.put(`/${resource.resourceType}/${resource.id}`, resource);
      
      await eventPublisher.publish({
        eventType: 'fhir.resource.updated',
        source: 'fhir-gateway',
        version: '1.0',
        data: {
          resourceType: resource.resourceType,
          resourceId: resource.id,
          userId: 'system', // TODO: Pass actual user ID
          resource: response.data,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to update FHIR ${resource.resourceType}/${resource.id}:`, error);
      throw error;
    }
  }

  // Delete a resource
  async deleteResource(resourceType: string, id: string): Promise<void> {
    try {
      await this.client.delete(`/${resourceType}/${id}`);
      
      await eventPublisher.publish({
        eventType: 'fhir.resource.deleted',
        source: 'fhir-gateway',
        version: '1.0',
        data: {
          resourceType,
          resourceId: id,
          userId: 'system', // TODO: Pass actual user ID
        },
      });
    } catch (error) {
      logger.error(`Failed to delete FHIR ${resourceType}/${id}:`, error);
      throw error;
    }
  }

  // Search resources
  async searchResources<T extends FHIRResource>(
    resourceType: string,
    params: Record<string, any>
  ): Promise<FHIRBundle> {
    try {
      const response = await this.client.get(`/${resourceType}`, { params });
      return response.data;
    } catch (error) {
      logger.error(`Failed to search FHIR ${resourceType}:`, error);
      throw error;
    }
  }

  // Batch/Transaction operations
  async executeBatch(bundle: FHIRBundle): Promise<FHIRBundle> {
    try {
      const response = await this.client.post('/', bundle);
      return response.data;
    } catch (error) {
      logger.error('Failed to execute FHIR batch:', error);
      throw error;
    }
  }

  // Helper methods for common operations

  // Get patient by identifier (CPF)
  async getPatientByCPF(cpf: string): Promise<FHIRPatient | null> {
    const bundle = await this.searchResources<FHIRPatient>('Patient', {
      identifier: `http://hl7.org/fhir/sid/br-cpf|${cpf}`,
    });

    if (bundle.entry && bundle.entry.length > 0) {
      return bundle.entry[0].resource as FHIRPatient;
    }

    return null;
  }

  // Create patient from user data
  async createPatientFromUser(userData: any): Promise<FHIRPatient> {
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      identifier: userData.cpf ? [{
        system: 'http://hl7.org/fhir/sid/br-cpf',
        value: userData.cpf,
      }] : undefined,
      name: [{
        family: userData.lastName,
        given: [userData.firstName],
      }],
      gender: userData.gender?.toLowerCase() as FHIRPatient['gender'],
      birthDate: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : undefined,
      telecom: [
        {
          system: 'phone',
          value: userData.phone,
          use: 'mobile',
        },
        ...(userData.email ? [{
          system: 'email' as const,
          value: userData.email,
          use: 'home' as const,
        }] : []),
      ],
    };

    return await this.createResource(patient);
  }

  // Create observation from health data
  async createObservationFromHealthData(healthData: any, patientId: string): Promise<FHIRObservation> {
    const observation: FHIRObservation = {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: this.mapHealthDataToLOINC(healthData.type),
          display: healthData.type,
        }],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: healthData.value ? {
        value: healthData.value,
        unit: healthData.unit,
      } : undefined,
      valueString: healthData.textValue,
    };

    return await this.createResource(observation);
  }

  // Map health data types to LOINC codes
  private mapHealthDataToLOINC(type: string): string {
    const loincMap: Record<string, string> = {
      'blood_pressure_systolic': '8480-6',
      'blood_pressure_diastolic': '8462-4',
      'heart_rate': '8867-4',
      'body_temperature': '8310-5',
      'body_weight': '29463-7',
      'body_height': '8302-2',
      'glucose': '2339-0',
      'oxygen_saturation': '2708-6',
    };

    return loincMap[type] || '74964-5'; // Default to "Other"
  }

  // Create medication request from prescription
  async createMedicationRequestFromPrescription(prescription: any, patientId: string, practitionerId: string): Promise<FHIRMedicationRequest> {
    const medicationRequest: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: prescription.medicationCode || 'unknown',
          display: prescription.medicationName,
        }],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      authoredOn: new Date().toISOString(),
      requester: {
        reference: `Practitioner/${practitionerId}`,
      },
      dosageInstruction: [{
        text: prescription.instructions,
        timing: {
          repeat: {
            frequency: prescription.frequency,
            period: prescription.period,
            periodUnit: prescription.periodUnit,
          },
        },
        doseAndRate: [{
          doseQuantity: {
            value: prescription.dose,
            unit: prescription.doseUnit,
          },
        }],
      }],
    };

    return await this.createResource(medicationRequest);
  }

  // Get patient observations
  async getPatientObservations(patientId: string, code?: string): Promise<FHIRObservation[]> {
    const params: any = {
      patient: patientId,
      _sort: '-date',
    };

    if (code) {
      params.code = code;
    }

    const bundle = await this.searchResources<FHIRObservation>('Observation', params);
    
    return bundle.entry?.map(entry => entry.resource as FHIRObservation) || [];
  }

  // Get patient medications
  async getPatientMedications(patientId: string, status?: string): Promise<FHIRMedicationRequest[]> {
    const params: any = {
      patient: patientId,
      _sort: '-authoredon',
    };

    if (status) {
      params.status = status;
    }

    const bundle = await this.searchResources<FHIRMedicationRequest>('MedicationRequest', params);
    
    return bundle.entry?.map(entry => entry.resource as FHIRMedicationRequest) || [];
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/metadata');
      return response.status === 200;
    } catch (error) {
      logger.error('FHIR health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const fhirGateway = FHIRGateway.getInstance();