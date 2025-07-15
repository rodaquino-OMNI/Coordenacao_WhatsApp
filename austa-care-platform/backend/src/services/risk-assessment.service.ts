/**
 * Advanced Medical Risk Assessment Service
 * Evidence-based algorithms for comprehensive health risk evaluation
 * Brazilian healthcare context with international best practices
 */

import {
  AdvancedRiskAssessment,
  CardiovascularRisk,
  DiabetesRisk,
  MentalHealthRisk,
  RespiratoryRisk,
  CompositeRisk,
  EmergencyAlert,
  ClinicalRecommendation,
  FollowupSchedule,
  EscalationProtocol,
  MedicalKnowledgeRule,
  RiskCorrelationMatrix,
  QuestionnaireResponse,
  ProcessedQuestionnaire,
  ExtractedSymptom,
  ExtractedRiskFactor,
  EmergencyFlag
} from '../types/risk.types';
import { logger } from '../utils/logger';

export class AdvancedRiskAssessmentService {
  private medicalKnowledgeRules: Map<string, MedicalKnowledgeRule> = new Map();
  private correlationMatrix: RiskCorrelationMatrix;
  private emergencyThresholds: Map<string, number> = new Map();

  constructor() {
    this.initializeMedicalKnowledge();
    this.initializeCorrelationMatrix();
    this.initializeEmergencyThresholds();
  }

  /**
   * Main risk assessment orchestrator
   */
  async assessRisk(questionnaire: ProcessedQuestionnaire): Promise<AdvancedRiskAssessment> {
    logger.info(`Starting advanced risk assessment for user: ${questionnaire.userId}`);

    // Extract symptoms and risk factors
    const extractedData = this.extractMedicalData(questionnaire);
    
    // Individual condition assessments
    const cardiovascular = await this.assessCardiovascularRisk(extractedData);
    const diabetes = await this.assessDiabetesRisk(extractedData);
    const mentalHealth = await this.assessMentalHealthRisk(extractedData);
    const respiratory = await this.assessRespiratoryRisk(extractedData);
    
    // Composite risk analysis
    const composite = await this.assessCompositeRisk({
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory
    }, extractedData);
    
    // Emergency alerts
    const emergencyAlerts = this.generateEmergencyAlerts({
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory,
      composite
    });
    
    // Clinical recommendations
    const recommendations = this.generateClinicalRecommendations({
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory,
      composite
    });
    
    // Follow-up scheduling
    const followupSchedule = this.createFollowupSchedule({
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory,
      composite
    });
    
    // Escalation protocol
    const escalationProtocol = this.determineEscalationProtocol({
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory,
      composite
    });

    const assessment: AdvancedRiskAssessment = {
      userId: questionnaire.userId,
      assessmentId: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      cardiovascular,
      diabetes,
      mentalHealth,
      respiratory,
      composite,
      emergencyAlerts,
      recommendations,
      followupSchedule,
      escalationProtocol
    };

    // Store assessment for temporal analysis
    await this.storeAssessment(assessment);
    
    // Trigger immediate actions if necessary
    await this.triggerImmediateActions(assessment);
    
    logger.info(`Risk assessment completed for user: ${questionnaire.userId}, composite risk: ${composite.riskLevel}`);
    
    return assessment;
  }

  /**
   * Cardiovascular Risk Assessment - Evidence-based Brazilian guidelines
   */
  private async assessCardiovascularRisk(data: ExtractedMedicalData): Promise<CardiovascularRisk> {
    const factors = this.extractCardiovascularFactors(data);
    
    // Emergency indicators check
    const emergencyIndicators: string[] = [];
    
    // Chest pain + shortness of breath at rest = immediate concern
    if (factors.chestPain && factors.shortnessOfBreath) {
      emergencyIndicators.push('ACUTE_CORONARY_SYNDROME_SUSPECTED');
    }
    
    // Syncope + chest pain = urgent evaluation needed
    if (factors.syncope && factors.chestPain) {
      emergencyIndicators.push('CARDIAC_SYNCOPE_SUSPECTED');
    }
    
    // Framingham Risk Score calculation
    const framinghamScore = this.calculateFraminghamScore(factors);
    
    // Overall risk calculation
    let overallScore = framinghamScore;
    
    // Symptom-based adjustments
    if (factors.chestPain) overallScore += 15;
    if (factors.shortnessOfBreath) overallScore += 10;
    if (factors.palpitations) overallScore += 5;
    if (factors.syncope) overallScore += 20;
    
    // Risk level determination
    let riskLevel: CardiovascularRisk['riskLevel'] = 'low';
    if (overallScore >= 20) riskLevel = 'very_high';
    else if (overallScore >= 15) riskLevel = 'high';
    else if (overallScore >= 10) riskLevel = 'intermediate';
    
    // Escalation criteria
    const escalationRequired = emergencyIndicators.length > 0 || riskLevel === 'very_high';
    const timeToEscalation = emergencyIndicators.length > 0 ? 0.5 : riskLevel === 'very_high' ? 2 : 12;
    
    return {
      overallScore,
      riskLevel,
      factors,
      framinghamScore,
      emergencyIndicators,
      recommendations: this.generateCardiovascularRecommendations(riskLevel, factors),
      escalationRequired,
      timeToEscalation
    };
  }

  /**
   * Diabetes Risk Assessment - Classic Triad + Risk Factors
   */
  private async assessDiabetesRisk(data: ExtractedMedicalData): Promise<DiabetesRisk> {
    const factors = this.extractDiabetesFactors(data);
    
    // Classic triad assessment (critical for diabetes detection)
    const classicTriad = {
      polydipsia: this.hasSymptom(data, 'sede_excessiva'),
      polyphagia: this.hasSymptom(data, 'fome_excessiva'),
      polyuria: this.hasSymptom(data, 'urina_frequente'),
      triadComplete: false,
      triadScore: 0
    };
    
    // Calculate triad score
    let triadCount = 0;
    if (classicTriad.polydipsia) triadCount++;
    if (classicTriad.polyphagia) triadCount++;
    if (classicTriad.polyuria) triadCount++;
    
    classicTriad.triadComplete = triadCount === 3;
    classicTriad.triadScore = triadCount * 20; // 60 points for complete triad
    
    // Additional factors
    const additionalFactors = this.extractAdditionalDiabetesFactors(data);
    
    // Emergency indicators
    const emergencyIndicators: string[] = [];
    
    // Complete triad + weight loss = urgent evaluation
    if (classicTriad.triadComplete && additionalFactors.weightLoss) {
      emergencyIndicators.push('DIABETIC_KETOACIDOSIS_RISK');
    }
    
    // Ketosis symptoms
    if (this.hasSymptom(data, 'cetose') || this.hasSymptom(data, 'halito_cetonico')) {
      emergencyIndicators.push('KETOSIS_DETECTED');
    }
    
    // Overall risk calculation
    let overallScore = classicTriad.triadScore;
    
    // Additional factors scoring
    if (additionalFactors.weightLoss) overallScore += 15;
    if (additionalFactors.fatigue) overallScore += 10;
    if (additionalFactors.blurredVision) overallScore += 10;
    if (additionalFactors.slowHealing) overallScore += 8;
    if (additionalFactors.frequentInfections) overallScore += 8;
    if (additionalFactors.familyHistory) overallScore += 12;
    if (additionalFactors.obesity) overallScore += 10;
    
    // Age adjustments
    if (additionalFactors.age > 45) overallScore += 5;
    if (additionalFactors.age > 65) overallScore += 10;
    
    // Risk level determination
    let riskLevel: DiabetesRisk['riskLevel'] = 'low';
    if (overallScore >= 60) riskLevel = 'critical';
    else if (overallScore >= 40) riskLevel = 'high';
    else if (overallScore >= 25) riskLevel = 'moderate';
    
    // DKA risk assessment
    const dkaRisk = this.calculateDKARisk(classicTriad, additionalFactors, data);
    const ketosisRisk = this.calculateKetosisRisk(data);
    
    const timeToEscalation = emergencyIndicators.length > 0 ? 2 : 
                           riskLevel === 'critical' ? 12 : 
                           riskLevel === 'high' ? 24 : 72;
    
    return {
      overallScore,
      riskLevel,
      classicTriad,
      additionalFactors,
      ketosisRisk,
      dkaRisk,
      emergencyIndicators,
      timeToEscalation
    };
  }

  /**
   * Mental Health Risk Assessment - PHQ-9/GAD-7 + Suicide Risk
   */
  private async assessMentalHealthRisk(data: ExtractedMedicalData): Promise<MentalHealthRisk> {
    const depressionIndicators = this.assessDepressionIndicators(data);
    const anxietyIndicators = this.assessAnxietyIndicators(data);
    const suicideRisk = this.assessSuicideRisk(data);
    
    // Calculate overall mental health score
    let overallScore = depressionIndicators.phq9Score + anxietyIndicators.gad7Score;
    
    // Suicide risk adjustment
    if (suicideRisk.riskLevel === 'imminent') overallScore += 50;
    else if (suicideRisk.riskLevel === 'high') overallScore += 30;
    else if (suicideRisk.riskLevel === 'moderate') overallScore += 15;
    
    // Risk level determination
    let riskLevel: MentalHealthRisk['riskLevel'] = 'low';
    if (overallScore >= 40 || suicideRisk.riskLevel === 'imminent') riskLevel = 'severe';
    else if (overallScore >= 25 || suicideRisk.riskLevel === 'high') riskLevel = 'high';
    else if (overallScore >= 15 || suicideRisk.riskLevel === 'moderate') riskLevel = 'moderate';
    
    const escalationRequired = suicideRisk.immediateIntervention || riskLevel === 'severe';
    const timeToEscalation = suicideRisk.immediateIntervention ? 0 : 
                           riskLevel === 'severe' ? 2 : 
                           riskLevel === 'high' ? 12 : 48;
    
    return {
      overallScore,
      riskLevel,
      depressionIndicators,
      anxietyIndicators,
      suicideRisk,
      escalationRequired,
      timeToEscalation
    };
  }

  /**
   * Respiratory Risk Assessment - Asthma, COPD, Sleep Apnea
   */
  private async assessRespiratoryRisk(data: ExtractedMedicalData): Promise<RespiratoryRisk> {
    const asthmaIndicators = this.assessAsthmaIndicators(data);
    const copdIndicators = this.assessCOPDIndicators(data);
    const sleepApneaIndicators = this.assessSleepApneaIndicators(data);
    
    // Emergency indicators
    const emergencyIndicators: string[] = [];
    
    // Severe asthma exacerbation
    if (asthmaIndicators.shortnessOfBreath && asthmaIndicators.wheezing && 
        this.hasSymptom(data, 'dificuldade_falar')) {
      emergencyIndicators.push('SEVERE_ASTHMA_EXACERBATION');
    }
    
    // COPD exacerbation
    if (copdIndicators.dyspnea && copdIndicators.sputumProduction && 
        this.hasSymptom(data, 'febre')) {
      emergencyIndicators.push('COPD_EXACERBATION');
    }
    
    // Calculate overall respiratory score
    let overallScore = 0;
    
    // Asthma scoring
    overallScore += this.calculateAsthmaScore(asthmaIndicators);
    
    // COPD scoring
    overallScore += this.calculateCOPDScore(copdIndicators);
    
    // Sleep apnea scoring
    overallScore += this.calculateSleepApneaScore(sleepApneaIndicators);
    
    // Risk level determination
    let riskLevel: RespiratoryRisk['riskLevel'] = 'low';
    if (overallScore >= 40 || emergencyIndicators.length > 0) riskLevel = 'critical';
    else if (overallScore >= 25) riskLevel = 'high';
    else if (overallScore >= 15) riskLevel = 'moderate';
    
    const timeToEscalation = emergencyIndicators.length > 0 ? 0.5 : 
                           riskLevel === 'critical' ? 2 : 12;
    
    return {
      overallScore,
      riskLevel,
      asthmaIndicators,
      copdIndicators,
      sleepApneaIndicators,
      emergencyIndicators,
      timeToEscalation
    };
  }

  /**
   * Composite Risk Analysis - Multi-dimensional assessment
   */
  private async assessCompositeRisk(
    individualRisks: {
      cardiovascular: CardiovascularRisk;
      diabetes: DiabetesRisk;
      mentalHealth: MentalHealthRisk;
      respiratory: RespiratoryRisk;
    },
    data: ExtractedMedicalData
  ): Promise<CompositeRisk> {
    const { cardiovascular, diabetes, mentalHealth, respiratory } = individualRisks;
    
    // Base composite score
    let overallScore = (
      cardiovascular.overallScore * 0.3 +
      diabetes.overallScore * 0.25 +
      mentalHealth.overallScore * 0.25 +
      respiratory.overallScore * 0.2
    );
    
    // Multiple conditions penalty (exponential risk increase)
    const highRiskConditions = [
      cardiovascular.riskLevel === 'high' || cardiovascular.riskLevel === 'very_high',
      diabetes.riskLevel === 'high' || diabetes.riskLevel === 'critical',
      mentalHealth.riskLevel === 'high' || mentalHealth.riskLevel === 'severe',
      respiratory.riskLevel === 'high' || respiratory.riskLevel === 'critical'
    ].filter(Boolean).length;
    
    const multipleConditionsPenalty = highRiskConditions > 1 ? 
      Math.pow(1.5, highRiskConditions - 1) : 1;
    
    // Synergy factor (certain combinations are particularly dangerous)
    let synergyFactor = 1;
    
    // Diabetes + Cardiovascular = very high risk
    if ((diabetes.riskLevel === 'high' || diabetes.riskLevel === 'critical') &&
        (cardiovascular.riskLevel === 'high' || cardiovascular.riskLevel === 'very_high')) {
      synergyFactor *= 1.8;
    }
    
    // Mental health + chronic conditions = poor outcomes
    if (mentalHealth.riskLevel === 'high' || mentalHealth.riskLevel === 'severe') {
      if (diabetes.riskLevel !== 'low' || cardiovascular.riskLevel !== 'low') {
        synergyFactor *= 1.4;
      }
    }
    
    // Age adjustments
    const age = this.extractAge(data);
    let ageAdjustment = 1;
    if (age > 65) ageAdjustment = 1.3;
    else if (age > 45) ageAdjustment = 1.1;
    else if (age < 18) ageAdjustment = 0.8;
    
    // Gender adjustments (evidence-based)
    const gender = this.extractGender(data);
    let genderAdjustment = 1;
    if (gender === 'M' && cardiovascular.riskLevel !== 'low') genderAdjustment = 1.2;
    if (gender === 'F' && mentalHealth.riskLevel !== 'low') genderAdjustment = 1.1;
    
    // Apply all adjustments
    overallScore = overallScore * multipleConditionsPenalty * synergyFactor * 
                   ageAdjustment * genderAdjustment;
    
    // Risk level determination
    let riskLevel: CompositeRisk['riskLevel'] = 'low';
    if (overallScore >= 70) riskLevel = 'critical';
    else if (overallScore >= 50) riskLevel = 'high';
    else if (overallScore >= 30) riskLevel = 'moderate';
    
    // Emergency escalation
    const emergencyEscalation = 
      cardiovascular.emergencyIndicators.length > 0 ||
      diabetes.emergencyIndicators.length > 0 ||
      mentalHealth.suicideRisk.immediateIntervention ||
      respiratory.emergencyIndicators.length > 0;
    
    const urgentEscalation = !emergencyEscalation && (
      riskLevel === 'critical' ||
      cardiovascular.escalationRequired ||
      diabetes.timeToEscalation <= 2 ||
      mentalHealth.escalationRequired ||
      respiratory.timeToEscalation <= 2
    );
    
    // Prioritize conditions for treatment
    const prioritizedConditions = this.prioritizeConditions(individualRisks);
    
    return {
      overallScore,
      riskLevel,
      multipleConditionsPenalty,
      synergyFactor,
      ageAdjustment,
      genderAdjustment,
      socioeconomicFactors: 1, // Would be calculated from questionnaire data
      accessToCareFactor: 1,   // Would be calculated from location/insurance data
      prioritizedConditions,
      emergencyEscalation,
      urgentEscalation,
      routineFollowup: !emergencyEscalation && !urgentEscalation && riskLevel !== 'low'
    };
  }

  /**
   * Initialize medical knowledge base with evidence-based rules
   */
  private initializeMedicalKnowledge(): void {
    // Diabetes detection rule
    const diabetesRule: MedicalKnowledgeRule = {
      id: 'diabetes_classic_triad',
      name: 'Tríade Clássica do Diabetes',
      description: 'Detecção de diabetes baseada na tríade polidipsia, polifagia, poliúria',
      condition: 'diabetes_mellitus',
      symptoms: ['sede_excessiva', 'fome_excessiva', 'urina_frequente'],
      riskFactors: ['familia_diabetes', 'obesidade', 'idade_45_plus'],
      scoring: {
        basePoints: 0,
        symptomMultipliers: {
          'sede_excessiva': 20,
          'fome_excessiva': 20,
          'urina_frequente': 20,
          'perda_peso': 15,
          'fadiga': 10
        },
        ageFactors: { '45+': 5, '65+': 10 },
        genderFactors: { 'M': 1, 'F': 1 }
      },
      thresholds: { low: 20, moderate: 35, high: 50, critical: 60 },
      escalationCriteria: ['triada_completa', 'perda_peso_rapida', 'cetose'],
      evidenceSource: 'SBD Guidelines 2023',
      lastUpdated: new Date()
    };
    
    this.medicalKnowledgeRules.set('diabetes_classic_triad', diabetesRule);
    
    logger.info('Medical knowledge base initialized with evidence-based rules');
  }

  /**
   * Initialize correlation matrix for compound risk analysis
   */
  private initializeCorrelationMatrix(): void {
    this.correlationMatrix = {
      correlations: {
        'diabetes': { 'cardiovascular': 0.8, 'depression': 0.6, 'sleep_apnea': 0.7 },
        'cardiovascular': { 'diabetes': 0.8, 'sleep_apnea': 0.6, 'anxiety': 0.5 },
        'depression': { 'diabetes': 0.6, 'anxiety': 0.9, 'chronic_pain': 0.7 },
        'sleep_apnea': { 'diabetes': 0.7, 'cardiovascular': 0.6, 'hypertension': 0.8 }
      },
      compoundingFactors: [
        {
          condition1: 'diabetes',
          condition2: 'cardiovascular',
          multiplicationFactor: 1.8,
          evidenceLevel: 'A'
        },
        {
          condition1: 'depression',
          condition2: 'diabetes',
          multiplicationFactor: 1.4,
          evidenceLevel: 'B'
        }
      ],
      exclusivePairs: [],
      dominantConditions: ['acute_coronary_syndrome', 'diabetic_ketoacidosis', 'suicide_risk']
    };
  }

  /**
   * Initialize emergency thresholds
   */
  private initializeEmergencyThresholds(): void {
    this.emergencyThresholds.set('cardiovascular_emergency', 25);
    this.emergencyThresholds.set('diabetes_emergency', 60);
    this.emergencyThresholds.set('suicide_risk', 15);
    this.emergencyThresholds.set('respiratory_emergency', 35);
  }

  // Helper methods for data extraction and scoring
  private extractMedicalData(questionnaire: ProcessedQuestionnaire): ExtractedMedicalData {
    return {
      symptoms: questionnaire.extractedSymptoms,
      riskFactors: questionnaire.extractedRiskFactors,
      emergencyFlags: questionnaire.emergencyFlags,
      responses: questionnaire.responses
    };
  }

  private hasSymptom(data: ExtractedMedicalData, symptomName: string): boolean {
    return data.symptoms.some(s => s.symptom.toLowerCase().includes(symptomName.toLowerCase()));
  }

  private extractAge(data: ExtractedMedicalData): number {
    const ageResponse = data.responses.find(r => r.question.toLowerCase().includes('idade'));
    return ageResponse ? Number(ageResponse.answer) : 0;
  }

  private extractGender(data: ExtractedMedicalData): 'M' | 'F' {
    const genderResponse = data.responses.find(r => r.question.toLowerCase().includes('sexo'));
    return genderResponse && genderResponse.answer === 'masculino' ? 'M' : 'F';
  }

  // Additional helper methods would be implemented here...
  private extractCardiovascularFactors(data: ExtractedMedicalData): any {
    // Implementation details...
    return {};
  }

  private calculateFraminghamScore(factors: any): number {
    // Framingham risk score implementation
    return 0;
  }

  private generateCardiovascularRecommendations(riskLevel: string, factors: any): string[] {
    // Implementation details...
    return [];
  }

  // More methods would be implemented...
  
  private async storeAssessment(assessment: AdvancedRiskAssessment): Promise<void> {
    // Store in database for temporal analysis
    logger.info(`Storing assessment: ${assessment.assessmentId}`);
  }

  private async triggerImmediateActions(assessment: AdvancedRiskAssessment): Promise<void> {
    if (assessment.emergencyAlerts.length > 0) {
      logger.warn(`Emergency alerts triggered for user: ${assessment.userId}`);
      // Trigger immediate notifications, appointments, etc.
    }
  }
}

interface ExtractedMedicalData {
  symptoms: ExtractedSymptom[];
  riskFactors: ExtractedRiskFactor[];
  emergencyFlags: EmergencyFlag[];
  responses: QuestionnaireResponse[];
}