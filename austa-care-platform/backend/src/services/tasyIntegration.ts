import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { AuthorizationRequest, TasyIntegration } from '../types/authorization';

/**
 * Tasy ERP Integration Service
 * Handles all integrations with the Tasy healthcare ERP system
 */
export class TasyIntegrationService extends EventEmitter implements TasyIntegration {
  private apiClient: AxiosInstance;
  private authToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private requestQueue: Map<string, Promise<any>>;
  private rateLimitCounter: Map<string, number>;
  private lastRequestTime: Map<string, number>;

  constructor() {
    super();
    this.requestQueue = new Map();
    this.rateLimitCounter = new Map();
    this.lastRequestTime = new Map();
    this.initializeApiClient();
    this.setupInterceptors();
  }

  /**
   * Initialize Tasy API client
   */
  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: config.tasy.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AUSTA-Care-Platform/1.0'
      }
    });

    logger.info('Tasy API client initialized', {
      baseURL: config.tasy.apiUrl
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.apiClient.interceptors.request.use(
      async (config) => {
        await this.ensureAuthenticated();
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request tracking
        const endpoint = config.url || 'unknown';
        this.trackRequest(endpoint);

        return config;
      },
      (error) => {
        logger.error('Tasy API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => {
        // Log successful responses
        logger.debug('Tasy API response', {
          status: response.status,
          endpoint: response.config.url
        });
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          await this.refreshAuthentication();
          return this.apiClient(originalRequest);
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          logger.warn(`Tasy API rate limited, retrying after ${retryAfter}s`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.apiClient(originalRequest);
        }

        logger.error('Tasy API error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          endpoint: error.config?.url
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Ensure authentication token is valid
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return; // Token is still valid
    }

    await this.authenticate();
  }

  /**
   * Authenticate with Tasy API
   */
  private async authenticate(): Promise<void> {
    try {
      logger.info('Authenticating with Tasy API');

      const response = await axios.post(`${config.tasy.apiUrl}/auth/login`, {
        apiKey: config.tasy.apiKey,
        apiSecret: config.tasy.apiSecret,
        scope: 'authorization,patient,provider,claims'
      });

      const { token, expiresIn } = response.data;
      
      this.authToken = token;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info('Tasy authentication successful', {
        expiresAt: this.tokenExpiresAt
      });

      this.emit('authenticated', {
        token: this.authToken,
        expiresAt: this.tokenExpiresAt
      });
    } catch (error) {
      logger.error('Tasy authentication failed', { error });
      this.authToken = null;
      this.tokenExpiresAt = null;
      throw new Error('Failed to authenticate with Tasy API');
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthentication(): Promise<void> {
    this.authToken = null;
    this.tokenExpiresAt = null;
    await this.authenticate();
  }

  /**
   * Track API requests for rate limiting
   */
  private trackRequest(endpoint: string): void {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${endpoint}-${minute}`;

    const count = this.rateLimitCounter.get(key) || 0;
    this.rateLimitCounter.set(key, count + 1);
    this.lastRequestTime.set(endpoint, now);

    // Clean up old entries
    for (const [key] of this.rateLimitCounter.entries()) {
      const keyMinute = parseInt(key.split('-').pop() || '0');
      if (minute - keyMinute > 5) { // Keep last 5 minutes
        this.rateLimitCounter.delete(key);
      }
    }
  }

  /**
   * Check patient eligibility in Tasy
   */
  async checkEligibility(patientId: string, procedureCode: string): Promise<boolean> {
    const cacheKey = `eligibility-${patientId}-${procedureCode}`;
    
    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const eligibilityPromise = this.performEligibilityCheck(patientId, procedureCode);
    this.requestQueue.set(cacheKey, eligibilityPromise);

    try {
      const result = await eligibilityPromise;
      this.requestQueue.delete(cacheKey);
      
      this.emit('eligibilityChecked', {
        patientId,
        procedureCode,
        eligible: result,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Perform actual eligibility check
   */
  private async performEligibilityCheck(patientId: string, procedureCode: string): Promise<boolean> {
    try {
      logger.info('Checking patient eligibility in Tasy', {
        patientId,
        procedureCode
      });

      const response = await this.apiClient.get('/eligibility/check', {
        params: {
          patientId,
          procedureCode,
          includeDetails: true
        }
      });

      const eligibilityData = response.data;

      return eligibilityData.eligible && 
             eligibilityData.planActive && 
             !eligibilityData.suspended &&
             eligibilityData.coverageActive;
    } catch (error) {
      logger.error('Eligibility check failed', {
        patientId,
        procedureCode,
        error
      });
      
      // Return false for eligibility if check fails
      return false;
    }
  }

  /**
   * Verify coverage amount for procedure
   */
  async coverageVerification(patientId: string, procedureCode: string): Promise<number> {
    try {
      logger.info('Verifying coverage in Tasy', {
        patientId,
        procedureCode
      });

      const response = await this.apiClient.get('/coverage/verify', {
        params: {
          patientId,
          procedureCode,
          includeLimits: true,
          includeDeductibles: true
        }
      });

      const coverageData = response.data;

      const coverageAmount = Math.min(
        coverageData.procedureCoverage || 0,
        coverageData.remainingLimit || 0
      );

      this.emit('coverageVerified', {
        patientId,
        procedureCode,
        coverageAmount,
        details: coverageData
      });

      return coverageAmount;
    } catch (error) {
      logger.error('Coverage verification failed', {
        patientId,
        procedureCode,
        error
      });
      return 0;
    }
  }

  /**
   * Submit authorization request to Tasy
   */
  async submitAuthorization(request: AuthorizationRequest): Promise<string> {
    try {
      logger.info('Submitting authorization to Tasy', {
        authorizationId: request.id,
        patientId: request.patientId,
        procedureId: request.procedureId
      });

      const tasyRequest = this.mapAuthorizationToTasy(request);

      const response = await this.apiClient.post('/authorization/submit', tasyRequest);

      const authorizationNumber = response.data.authorizationNumber;

      this.emit('authorizationSubmitted', {
        authorizationId: request.id,
        tasyAuthorizationNumber: authorizationNumber,
        timestamp: new Date()
      });

      return authorizationNumber;
    } catch (error) {
      logger.error('Authorization submission failed', {
        authorizationId: request.id,
        error
      });
      throw error;
    }
  }

  /**
   * Update authorization status in Tasy
   */
  async updateAuthorizationStatus(authNumber: string, status: string): Promise<void> {
    try {
      logger.info('Updating authorization status in Tasy', {
        authNumber,
        status
      });

      await this.apiClient.put(`/authorization/${authNumber}/status`, {
        status: this.mapStatusToTasy(status),
        updatedAt: new Date().toISOString(),
        source: 'AUSTA-Care-Platform'
      });

      this.emit('statusUpdated', {
        authNumber,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Status update failed', {
        authNumber,
        status,
        error
      });
      throw error;
    }
  }

  /**
   * Sync patient data from Tasy
   */
  async syncPatientData(patientId: string): Promise<any> {
    try {
      logger.info('Syncing patient data from Tasy', { patientId });

      const response = await this.apiClient.get(`/patient/${patientId}`, {
        params: {
          includeInsurance: true,
          includeHistory: true,
          includeDemographics: true
        }
      });

      const patientData = response.data;

      this.emit('patientDataSynced', {
        patientId,
        data: patientData,
        timestamp: new Date()
      });

      return patientData;
    } catch (error) {
      logger.error('Patient data sync failed', {
        patientId,
        error
      });
      throw error;
    }
  }

  /**
   * Sync authorization status from Tasy
   */
  async syncAuthorizationStatus(authorizationId: string): Promise<void> {
    try {
      // Get Tasy authorization number from local data
      const tasyAuthNumber = await this.getTasyAuthorizationNumber(authorizationId);
      
      if (!tasyAuthNumber) {
        logger.warn('No Tasy authorization number found', { authorizationId });
        return;
      }

      logger.info('Syncing authorization status from Tasy', {
        authorizationId,
        tasyAuthNumber
      });

      const response = await this.apiClient.get(`/authorization/${tasyAuthNumber}`);
      const tasyData = response.data;

      this.emit('syncComplete', {
        authorizationId,
        tasyAuthNumber,
        status: tasyData.status,
        lastUpdated: tasyData.lastUpdated,
        syncTimestamp: new Date()
      });
    } catch (error) {
      logger.error('Authorization sync failed', {
        authorizationId,
        error
      });
    }
  }

  /**
   * Get provider network status
   */
  async getProviderNetworkStatus(providerId: string): Promise<{
    inNetwork: boolean;
    contractActive: boolean;
    credentialsValid: boolean;
  }> {
    try {
      const response = await this.apiClient.get(`/provider/${providerId}/network-status`);
      return response.data;
    } catch (error) {
      logger.error('Provider network status check failed', {
        providerId,
        error
      });
      return {
        inNetwork: false,
        contractActive: false,
        credentialsValid: false
      };
    }
  }

  /**
   * Get procedure details from Tasy
   */
  async getProcedureDetails(procedureCode: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/procedure/${procedureCode}`);
      return response.data;
    } catch (error) {
      logger.error('Procedure details fetch failed', {
        procedureCode,
        error
      });
      return null;
    }
  }

  /**
   * Submit claim to Tasy
   */
  async submitClaim(authorizationId: string, claimData: any): Promise<string> {
    try {
      logger.info('Submitting claim to Tasy', { authorizationId });

      const response = await this.apiClient.post('/claims/submit', {
        ...claimData,
        authorizationId,
        submittedAt: new Date().toISOString()
      });

      const claimNumber = response.data.claimNumber;

      this.emit('claimSubmitted', {
        authorizationId,
        claimNumber,
        timestamp: new Date()
      });

      return claimNumber;
    } catch (error) {
      logger.error('Claim submission failed', {
        authorizationId,
        error
      });
      throw error;
    }
  }

  /**
   * Get financial impact analysis
   */
  async getFinancialImpact(authorizationId: string): Promise<{
    estimatedCost: number;
    patientResponsibility: number;
    insuranceCoverage: number;
    deductibleApplied: number;
    copayAmount: number;
  }> {
    try {
      const response = await this.apiClient.get('/financial/impact', {
        params: { authorizationId }
      });

      return response.data;
    } catch (error) {
      logger.error('Financial impact analysis failed', {
        authorizationId,
        error
      });
      
      return {
        estimatedCost: 0,
        patientResponsibility: 0,
        insuranceCoverage: 0,
        deductibleApplied: 0,
        copayAmount: 0
      };
    }
  }

  /**
   * Map authorization request to Tasy format
   */
  private mapAuthorizationToTasy(request: AuthorizationRequest): any {
    return {
      patientId: request.patientId,
      providerId: request.providerId,
      procedureCode: request.procedureId,
      requestDate: request.requestedDate.toISOString(),
      preferredDate: request.preferredDate?.toISOString(),
      urgency: this.mapUrgencyToTasy(request.urgency),
      clinicalJustification: request.clinicalJustification,
      estimatedCost: request.estimatedCost,
      documents: request.documents.map(doc => ({
        type: doc.type,
        fileName: doc.fileName,
        uploadDate: doc.uploadedAt.toISOString(),
        validated: doc.isValid
      })),
      requestingPhysician: request.providerId,
      source: 'AUSTA-Care-Platform',
      metadata: {
        internalId: request.id,
        workflowId: request.workflowId
      }
    };
  }

  /**
   * Map urgency levels to Tasy format
   */
  private mapUrgencyToTasy(urgency: string): string {
    const urgencyMap: Record<string, string> = {
      'emergency': 'EMERGENCY',
      'urgent': 'URGENT',
      'high': 'HIGH',
      'medium': 'NORMAL',
      'low': 'LOW'
    };

    return urgencyMap[urgency] || 'NORMAL';
  }

  /**
   * Map status to Tasy format
   */
  private mapStatusToTasy(status: string): string {
    const statusMap: Record<string, string> = {
      'approved': 'APPROVED',
      'rejected': 'DENIED',
      'pending': 'PENDING',
      'expired': 'EXPIRED',
      'canceled': 'CANCELLED',
      'on_hold': 'ON_HOLD'
    };

    return statusMap[status] || 'PENDING';
  }

  /**
   * Get Tasy authorization number from local storage
   */
  private async getTasyAuthorizationNumber(authorizationId: string): Promise<string | null> {
    // In production, query database for Tasy authorization number
    // For now, return mock data
    return `TASY-${authorizationId.substring(0, 8)}`;
  }

  /**
   * Batch sync multiple authorizations
   */
  async batchSyncAuthorizations(authorizationIds: string[]): Promise<void> {
    logger.info(`Starting batch sync for ${authorizationIds.length} authorizations`);

    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < authorizationIds.length; i += batchSize) {
      batches.push(authorizationIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const syncPromises = batch.map(id => 
        this.syncAuthorizationStatus(id).catch(error => 
          logger.error(`Batch sync failed for authorization ${id}`, { error })
        )
      );

      await Promise.all(syncPromises);
      
      // Rate limiting - wait between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.emit('batchSyncComplete', {
      totalAuthorizations: authorizationIds.length,
      timestamp: new Date()
    });
  }

  /**
   * Get Tasy system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    lastChecked: Date;
  }> {
    const startTime = Date.now();

    try {
      await this.apiClient.get('/health/check', { timeout: 5000 });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Get integration metrics
   */
  getIntegrationMetrics(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    rateLimitHits: number;
  } {
    // In production, implement actual metrics tracking
    return {
      totalRequests: 0,
      successRate: 0.95,
      averageResponseTime: 850,
      rateLimitHits: 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.requestQueue.clear();
    this.rateLimitCounter.clear();
    this.lastRequestTime.clear();
    this.authToken = null;
    this.tokenExpiresAt = null;
    
    logger.info('Tasy integration service cleaned up');
  }
}