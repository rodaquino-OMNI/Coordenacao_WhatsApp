/**
 * Advanced Risk Assessment Controller
 * Orchestrates sophisticated medical risk detection and analysis
 * Integrates all risk assessment services with emergency protocols
 */

import { Request, Response } from 'express';
import { AdvancedRiskAssessmentService } from '../services/risk-assessment.service';
import { EmergencyDetectionService } from '../services/emergency-detection.service';
import { CompoundRiskAnalysisService } from '../services/compound-risk.service';
import { TemporalRiskTrackingService } from '../services/temporal-risk-tracking.service';
import {
  AdvancedRiskAssessment,
  ProcessedQuestionnaire,
  EmergencyAlert,
  CompoundRiskAnalysis,
  TemporalRiskProgression
} from '../types/risk.types';
import { QuestionnaireResponse } from '../types/questionnaire.types';
import { QuestionResponse } from '../types/risk.types';
import { logger } from '../utils/logger';

export interface RiskAssessmentRequest {
  userId: string;
  questionnaireId: string;
  responses: QuestionnaireResponse[];
  userProfile?: {
    age: number;
    gender: 'M' | 'F';
    medicalHistory: string[];
    currentMedications: string[];
    socioeconomicFactors: Record<string, any>;
  };
  emergencyContacts?: {
    primary: string;
    secondary: string;
    medical: string;
  };
}

export interface ComprehensiveRiskResponse {
  assessment: AdvancedRiskAssessment;
  emergencyAlerts: EmergencyAlert[];
  compoundAnalysis: CompoundRiskAnalysis;
  temporalProgression?: TemporalRiskProgression;
  recommendations: ClinicalRecommendation[];
  escalationActions: EscalationAction[];
  followupPlan: FollowupPlan;
  patientEducation: PatientEducationContent;
}

export interface ClinicalRecommendation {
  id: string;
  priority: 'immediate' | 'urgent' | 'routine' | 'preventive';
  category: string;
  recommendation: string;
  rationale: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  timeframe: string;
  resources: string[];
  contraindications: string[];
}

export interface EscalationAction {
  action: string;
  timeframe: string;
  responsible: string;
  automated: boolean;
  triggered: boolean;
  triggerTime?: Date;
}

export interface FollowupPlan {
  immediate: FollowupTask[];
  shortTerm: FollowupTask[];
  longTerm: FollowupTask[];
  monitoring: MonitoringRequirement[];
}

export interface FollowupTask {
  task: string;
  dueDate: Date;
  responsible: string;
  priority: 'high' | 'medium' | 'low';
  automated: boolean;
}

export interface MonitoringRequirement {
  parameter: string;
  frequency: string;
  method: string;
  alertThresholds: Record<string, number>;
}

export interface PatientEducationContent {
  primaryConditions: EducationModule[];
  warningSignsEducation: WarningSignsEducation;
  selfManagementTools: SelfManagementTool[];
  emergencyInstructions: EmergencyInstruction[];
}

export interface EducationModule {
  condition: string;
  title: string;
  content: string;
  keyPoints: string[];
  resources: string[];
  interactiveElements: string[];
}

export interface WarningSignsEducation {
  redFlags: RedFlag[];
  whenToSeekHelp: WhenToSeekHelp[];
  emergencyNumbers: EmergencyNumber[];
}

export interface RedFlag {
  symptom: string;
  description: string;
  urgency: 'immediate' | 'urgent' | 'prompt';
  action: string;
}

export interface WhenToSeekHelp {
  scenario: string;
  timeframe: string;
  contactType: 'emergency' | 'urgent_care' | 'primary_care' | 'specialist';
}

export interface EmergencyNumber {
  service: string;
  number: string;
  when: string;
}

export interface SelfManagementTool {
  tool: string;
  description: string;
  instructions: string[];
  frequency: string;
  trackingMetrics: string[];
}

export interface EmergencyInstruction {
  scenario: string;
  immediateActions: string[];
  whenToCall911: string[];
  preventiveMeasures: string[];
}

export class AdvancedRiskController {
  private riskAssessmentService: AdvancedRiskAssessmentService;
  private emergencyDetectionService: EmergencyDetectionService;
  private compoundRiskService: CompoundRiskAnalysisService;
  private temporalTrackingService: TemporalRiskTrackingService;

  constructor() {
    this.riskAssessmentService = new AdvancedRiskAssessmentService();
    this.emergencyDetectionService = new EmergencyDetectionService({
      autoEscalation: true,
      emergencyContacts: [],
      escalationTimeouts: {
        'immediate': 15,
        'critical': 60,
        'high': 240
      },
      notificationChannels: [
        { type: 'whatsapp', enabled: true, priority: 1, template: 'emergency_alert' },
        { type: 'sms', enabled: true, priority: 2, template: 'emergency_sms' },
        { type: 'call', enabled: true, priority: 3, template: 'emergency_call' }
      ]
    });
    this.compoundRiskService = new CompoundRiskAnalysisService();
    this.temporalTrackingService = new TemporalRiskTrackingService();
  }

  /**
   * Main endpoint for comprehensive risk assessment
   */
  async assessRisk(req: Request, res: Response): Promise<void> {
    try {
      const requestData: RiskAssessmentRequest = req.body;
      
      logger.info(`Starting comprehensive risk assessment for user: ${requestData.userId}`);
      
      // Validate request
      if (!this.validateRiskAssessmentRequest(requestData)) {
        res.status(400).json({ error: 'Invalid request data' });
        return;
      }

      // Process questionnaire responses
      const processedQuestionnaire = await this.processQuestionnaireResponses(requestData);
      
      // Core risk assessment
      const assessment = await this.riskAssessmentService.assessRisk(processedQuestionnaire);
      
      // Emergency detection
      const emergencyAlerts = await this.emergencyDetectionService.detectEmergencies(assessment);
      
      // Compound risk analysis
      const compoundAnalysis = await this.compoundRiskService.analyzeCompoundRisk(assessment);
      
      // Temporal progression (if historical data available)
      let temporalProgression: TemporalRiskProgression | undefined;
      const historicalAssessments = await this.getHistoricalAssessments(requestData.userId);
      if (historicalAssessments.length > 0) {
        temporalProgression = await this.temporalTrackingService.analyzeTemporalProgression(
          requestData.userId,
          assessment,
          historicalAssessments
        );
      }
      
      // Generate comprehensive recommendations
      const recommendations = this.generateComprehensiveRecommendations(
        assessment,
        compoundAnalysis,
        emergencyAlerts
      );
      
      // Determine escalation actions
      const escalationActions = this.determineEscalationActions(
        assessment,
        emergencyAlerts,
        compoundAnalysis
      );
      
      // Create follow-up plan
      const followupPlan = this.createFollowupPlan(
        assessment,
        compoundAnalysis,
        temporalProgression
      );
      
      // Generate patient education content
      const patientEducation = this.generatePatientEducation(
        assessment,
        emergencyAlerts,
        requestData.userProfile
      );
      
      // Execute immediate actions if necessary
      await this.executeImmediateActions(escalationActions);

      const response: ComprehensiveRiskResponse = {
        assessment,
        emergencyAlerts,
        compoundAnalysis,
        temporalProgression,
        recommendations,
        escalationActions,
        followupPlan,
        patientEducation
      };

      logger.info(`Risk assessment completed for user: ${requestData.userId}, overall risk: ${assessment.composite.riskLevel}`);
      
      res.status(200).json(response);
      
    } catch (error) {
      logger.error('Risk assessment failed:', error);
      res.status(500).json({ 
        error: 'Risk assessment failed',
        message: 'Sistema de avaliação de risco temporariamente indisponível. Procure atendimento médico se necessário.'
      });
    }
  }

  /**
   * Endpoint for emergency risk re-evaluation
   */
  async emergencyReassessment(req: Request, res: Response): Promise<void> {
    try {
      const { userId, urgentSymptoms, currentMedications } = req.body;
      
      logger.warn(`Emergency reassessment requested for user: ${userId}`);
      
      // Get latest assessment
      const latestAssessment = await this.getLatestAssessment(userId);
      if (!latestAssessment) {
        res.status(404).json({ error: 'No previous assessment found' });
        return;
      }
      
      // Quick emergency screening
      const emergencyScreening = await this.performEmergencyScreening(
        userId,
        urgentSymptoms,
        latestAssessment
      );
      
      // Immediate recommendations
      const immediateActions = this.generateImmediateActions(emergencyScreening);
      
      res.status(200).json({
        emergencyLevel: emergencyScreening.severity,
        immediateActions,
        contactNumbers: ['192', '193', 'CVV 188'],
        followupRequired: true
      });
      
    } catch (error) {
      logger.error('Emergency reassessment failed:', error);
      res.status(500).json({ 
        error: 'Emergency reassessment failed',
        immediateAction: 'SE EMERGÊNCIA, LIGUE 192 IMEDIATAMENTE'
      });
    }
  }

  /**
   * Endpoint for temporal risk monitoring
   */
  async getTemporalRiskReport(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe = '90d' } = req.query;
      
      logger.info(`Generating temporal risk report for user: ${userId}`);
      
      const historicalAssessments = await this.getHistoricalAssessments(userId, timeframe as string);
      const latestAssessment = await this.getLatestAssessment(userId);
      
      if (!latestAssessment || historicalAssessments.length === 0) {
        res.status(404).json({ error: 'Insufficient data for temporal analysis' });
        return;
      }
      
      const temporalProgression = await this.temporalTrackingService.analyzeTemporalProgression(
        userId,
        latestAssessment,
        historicalAssessments
      );
      
      const riskTrends = this.generateRiskTrendsReport(temporalProgression);
      const interventionEffectiveness = this.analyzeInterventionEffectiveness(temporalProgression);
      const futureRiskProjections = this.generateFutureRiskProjections(temporalProgression);
      
      res.status(200).json({
        temporalProgression,
        riskTrends,
        interventionEffectiveness,
        futureRiskProjections,
        recommendations: this.generateTemporalRecommendations(temporalProgression)
      });
      
    } catch (error) {
      logger.error('Temporal risk report generation failed:', error);
      res.status(500).json({ error: 'Failed to generate temporal risk report' });
    }
  }

  /**
   * Process questionnaire responses into structured medical data
   */
  private async processQuestionnaireResponses(request: RiskAssessmentRequest): Promise<ProcessedQuestionnaire> {
    // Convert QuestionnaireResponse to QuestionResponse first
    const questionResponses: QuestionResponse[] = this.convertToQuestionResponses(request.responses);
    
    // Extract symptoms from responses
    const extractedSymptoms = this.extractSymptomsFromQuestionResponses(questionResponses);
    
    // Extract risk factors
    const riskFactors = this.extractRiskFactorsFromQuestionResponses(questionResponses);
    
    // Check for emergency flags
    const emergencyFlags = this.identifyEmergencyFlagsFromQuestionResponses(questionResponses);
    
    return {
      userId: request.userId,
      questionnaireId: request.questionnaireId,
      responses: questionResponses,
      extractedSymptoms,
      riskFactors,
      emergencyFlags,
      completedAt: new Date()
    };
  }

  /**
   * Extract symptoms from questionnaire responses
   */
  private extractSymptomsFromQuestionResponses(responses: QuestionResponse[]): any[] {
    // Convert QuestionResponse to match existing logic
    return this.extractSymptomsFromResponses(responses as any);
  }

  private extractRiskFactorsFromQuestionResponses(responses: QuestionResponse[]): any[] {
    return this.extractRiskFactorsFromResponses(responses as any);
  }

  private identifyEmergencyFlagsFromQuestionResponses(responses: QuestionResponse[]): any[] {
    return this.identifyEmergencyFlags(responses as any);
  }

  private extractSymptomsFromResponses(responses: QuestionnaireResponse[]): any[] {
    const symptoms: any[] = [];
    
    // Pattern matching for key symptoms
    const symptomPatterns = {
      'chest_pain': ['dor no peito', 'dor torácica', 'aperto no peito'],
      'shortness_breath': ['falta de ar', 'dificuldade respirar', 'sufoco'],
      'excessive_thirst': ['sede excessiva', 'muita sede', 'bebe muita água'],
      'excessive_hunger': ['fome excessiva', 'muita fome', 'come muito'],
      'frequent_urination': ['urina muito', 'vai muito ao banheiro', 'xixi frequente'],
      'depressed_mood': ['tristeza', 'deprimido', 'desanimado', 'sem esperança'],
      'suicidal_thoughts': ['pensamentos suicidas', 'vontade morrer', 'tirar vida']
    };
    
    for (const response of responses) {
      const answerText = String(response.answer).toLowerCase();
      
      for (const [symptomKey, patterns] of Object.entries(symptomPatterns)) {
        if (patterns.some(pattern => answerText.includes(pattern))) {
          symptoms.push({
            symptom: symptomKey,
            severity: this.assessSymptomSeverity(response),
            duration: this.extractDuration(answerText),
            frequency: this.extractFrequency(answerText),
            medicalRelevance: response.medicalRelevance?.conditions || []
          });
        }
      }
    }
    
    return symptoms;
  }

  /**
   * Extract risk factors from responses
   */
  private extractRiskFactorsFromResponses(responses: QuestionnaireResponse[]): any[] {
    const riskFactors: any[] = [];
    
    const riskPatterns = {
      'family_history_diabetes': ['família diabetes', 'pai diabetes', 'mãe diabetes'],
      'family_history_heart': ['família coração', 'família cardíaco', 'infarto família'],
      'smoking': ['fumo', 'cigarro', 'fumante'],
      'alcohol': ['álcool', 'bebida', 'drink'],
      'sedentary': ['sedentário', 'não exercita', 'parado'],
      'obesity': ['obeso', 'sobrepeso', 'gordo']
    };
    
    for (const response of responses) {
      const answerText = String(response.answer).toLowerCase();
      
      for (const [factorKey, patterns] of Object.entries(riskPatterns)) {
        if (patterns.some(pattern => answerText.includes(pattern))) {
          riskFactors.push({
            factor: factorKey,
            value: response.answer,
            significance: this.assessRiskFactorSignificance(factorKey),
            medicalConditions: response.medicalRelevance?.conditions || []
          });
        }
      }
    }
    
    return riskFactors;
  }

  /**
   * Identify emergency flags in responses
   */
  private identifyEmergencyFlags(responses: QuestionnaireResponse[]): any[] {
    const emergencyFlags: any[] = [];
    
    const emergencyPatterns = {
      'chest_pain_severe': {
        patterns: ['dor forte peito', 'dor intensa torácica'],
        severity: 'critical',
        condition: 'acute_coronary_syndrome_suspected',
        action: 'SAMU imediato'
      },
      'suicidal_ideation': {
        patterns: ['quero morrer', 'tirar minha vida', 'suicídio'],
        severity: 'critical',
        condition: 'suicide_risk',
        action: 'CVV 188 + avaliação psiquiátrica'
      },
      'diabetic_triad': {
        patterns: ['sede+fome+urina', 'tríade diabética'],
        severity: 'urgent',
        condition: 'diabetes_mellitus_suspected',
        action: 'Avaliação médica urgente'
      }
    };
    
    for (const response of responses) {
      const answerText = String(response.answer).toLowerCase();
      
      for (const [flagKey, flagData] of Object.entries(emergencyPatterns)) {
        if (flagData.patterns.some(pattern => answerText.includes(pattern))) {
          emergencyFlags.push({
            flag: flagKey,
            severity: flagData.severity,
            condition: flagData.condition,
            immediateAction: flagData.action,
            timeToAction: flagData.severity === 'critical' ? 0 : 60
          });
        }
      }
    }
    
    return emergencyFlags;
  }

  // Helper methods for symptom and risk factor assessment
  private assessSymptomSeverity(response: QuestionnaireResponse): 'mild' | 'moderate' | 'severe' {
    if (response.type === 'scale') {
      const score = Number(response.answer);
      if (score >= 8) return 'severe';
      if (score >= 5) return 'moderate';
      return 'mild';
    }
    
    const severityWords = {
      severe: ['muito', 'intensa', 'forte', 'insuportável'],
      moderate: ['moderada', 'média', 'razoável'],
      mild: ['leve', 'pouca', 'pouco']
    };
    
    const answerText = String(response.answer).toLowerCase();
    
    if (severityWords.severe.some(word => answerText.includes(word))) return 'severe';
    if (severityWords.moderate.some(word => answerText.includes(word))) return 'moderate';
    return 'mild';
  }

  private extractDuration(text: string): string {
    if (text.includes('anos')) return 'chronic';
    if (text.includes('meses')) return 'months';
    if (text.includes('semanas')) return 'weeks';
    if (text.includes('dias')) return 'days';
    if (text.includes('horas')) return 'hours';
    return 'unknown';
  }

  private extractFrequency(text: string): string {
    if (text.includes('sempre') || text.includes('constante')) return 'constant';
    if (text.includes('frequente') || text.includes('muito')) return 'frequent';
    if (text.includes('às vezes') || text.includes('ocasional')) return 'occasional';
    return 'unknown';
  }

  private assessRiskFactorSignificance(factor: string): 'low' | 'moderate' | 'high' | 'critical' {
    const highRiskFactors = ['family_history_diabetes', 'family_history_heart', 'smoking'];
    const moderateRiskFactors = ['alcohol', 'obesity', 'sedentary'];
    
    if (highRiskFactors.includes(factor)) return 'high';
    if (moderateRiskFactors.includes(factor)) return 'moderate';
    return 'low';
  }

  // Additional helper methods would be implemented here...
  private validateRiskAssessmentRequest(request: RiskAssessmentRequest): boolean {
    return !!(request.userId && request.questionnaireId && request.responses?.length > 0);
  }

  private async getHistoricalAssessments(userId: string, timeframe: string = '90d'): Promise<AdvancedRiskAssessment[]> {
    // Implementation would fetch from database
    return [];
  }

  private async getLatestAssessment(userId: string): Promise<AdvancedRiskAssessment | null> {
    // Implementation would fetch from database
    return null;
  }

  private generateComprehensiveRecommendations(
    assessment: AdvancedRiskAssessment,
    compoundAnalysis: CompoundRiskAnalysis,
    emergencyAlerts: EmergencyAlert[]
  ): ClinicalRecommendation[] {
    // Implementation would generate evidence-based recommendations
    return [];
  }

  private determineEscalationActions(
    assessment: AdvancedRiskAssessment,
    emergencyAlerts: EmergencyAlert[],
    compoundAnalysis: CompoundRiskAnalysis
  ): EscalationAction[] {
    // Implementation would determine escalation needs
    return [];
  }

  private createFollowupPlan(
    assessment: AdvancedRiskAssessment,
    compoundAnalysis: CompoundRiskAnalysis,
    temporalProgression?: TemporalRiskProgression
  ): FollowupPlan {
    // Implementation would create comprehensive follow-up plan
    return {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      monitoring: []
    };
  }

  private generatePatientEducation(
    assessment: AdvancedRiskAssessment,
    emergencyAlerts: EmergencyAlert[],
    userProfile?: any
  ): PatientEducationContent {
    // Implementation would generate personalized education content
    return {
      primaryConditions: [],
      warningSignsEducation: {
        redFlags: [],
        whenToSeekHelp: [],
        emergencyNumbers: []
      },
      selfManagementTools: [],
      emergencyInstructions: []
    };
  }

  private async executeImmediateActions(escalationActions: EscalationAction[]): Promise<void> {
    // Implementation would execute immediate actions
  }

  private async performEmergencyScreening(userId: string, symptoms: string[], latestAssessment: AdvancedRiskAssessment): Promise<any> {
    // Implementation would perform emergency screening
    return { severity: 'high' };
  }

  private generateImmediateActions(screening: any): string[] {
    // Implementation would generate immediate actions
    return [];
  }

  // Additional methods for temporal analysis...
  private generateRiskTrendsReport(progression: TemporalRiskProgression): any {
    return {};
  }

  private analyzeInterventionEffectiveness(progression: TemporalRiskProgression): any {
    return {};
  }

  private generateFutureRiskProjections(progression: TemporalRiskProgression): any {
    return {};
  }

  private generateTemporalRecommendations(progression: TemporalRiskProgression): any[] {
    return [];
  }

  /**
   * Convert QuestionnaireResponse to QuestionResponse format
   */
  private convertToQuestionResponses(responses: QuestionnaireResponse[]): QuestionResponse[] {
    // If responses is an array of QuestionnaireResponse objects, we need to extract individual questions
    // This is a placeholder implementation - adjust based on actual data structure
    const questionResponses: QuestionResponse[] = [];
    
    responses.forEach(response => {
      // Extract individual question responses from the QuestionnaireResponse
      if (response.responses && typeof response.responses === 'object') {
        Object.entries(response.responses).forEach(([questionId, answer]) => {
          questionResponses.push({
            questionId,
            question: questionId, // This should be mapped to actual question text
            answer: answer as string | number | boolean,
            type: this.determineAnswerType(answer),
            medicalRelevance: {
              conditions: [],
              weight: 1,
              category: 'general'
            },
            timestamp: response.completedAt || new Date()
          });
        });
      }
    });
    
    return questionResponses;
  }

  private determineAnswerType(answer: any): 'boolean' | 'multiple_choice' | 'scale' | 'text' | 'numeric' {
    if (typeof answer === 'boolean') return 'boolean';
    if (typeof answer === 'number') return 'numeric';
    if (typeof answer === 'string') {
      if (answer.length > 50) return 'text';
      return 'multiple_choice';
    }
    return 'text';
  }
}