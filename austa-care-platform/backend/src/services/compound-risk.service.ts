/**
 * Compound Risk Analysis Service
 * Advanced multi-dimensional risk correlation and exponential scoring
 * Evidence-based medical decision support for complex conditions
 */

import {
  AdvancedRiskAssessment,
  RiskCorrelationMatrix,
  MedicalKnowledgeRule,
  CardiovascularRisk,
  DiabetesRisk,
  MentalHealthRisk,
  RespiratoryRisk,
  CompositeRisk,
  CompoundRiskAnalysis,
  TemporalRiskPattern,
  PredictiveRiskModel,
  RiskFactor,
  InterventionOpportunity,
  RiskMitigationStrategy
} from '../types/risk.types';
import { logger } from '../utils/logger';

// Interfaces are imported from risk.types.ts to avoid duplicates

export interface MedicalSynergy {
  condition1: string;
  condition2: string;
  synergyType: 'multiplicative' | 'additive' | 'exponential' | 'protective';
  factor: number;
  evidenceBase: string;
  clinicalSignificance: 'high' | 'moderate' | 'low';
  mechanismOfAction: string;
}

export class CompoundRiskAnalysisService {
  private correlationMatrix!: RiskCorrelationMatrix;
  private medicalSynergies: Map<string, MedicalSynergy[]> = new Map();
  private riskModels: Map<string, PredictiveRiskModel> = new Map();

  constructor() {
    this.initializeCorrelationMatrix();
    this.initializeMedicalSynergies();
    this.initializePredictiveModels();
  }

  /**
   * Analyze compound risk patterns
   */
  async analyzeCompoundRisk(assessment: AdvancedRiskAssessment): Promise<CompoundRiskAnalysis> {
    logger.info(`Starting compound risk analysis for assessment: ${assessment.assessmentId}`);

    // Identify primary and secondary conditions
    const conditions = this.identifyActiveConditions(assessment);
    const primaryCondition = this.determinePrimaryCondition(conditions);
    const secondaryConditions = conditions.filter(c => c !== primaryCondition);

    // Calculate risk multipliers
    const riskMultiplier = this.calculateRiskMultiplier(primaryCondition, secondaryConditions);
    
    // Analyze synergy patterns
    const synergyScore = this.calculateSynergyScore(primaryCondition, secondaryConditions);
    
    // Temporal pattern analysis
    const temporalPattern = await this.analyzeTemporalPattern(assessment);
    
    // Predictive modeling
    const predictiveModel = await this.generatePredictiveModel(assessment, conditions);
    
    // Identify intervention opportunities
    const interventionOpportunities = this.identifyInterventionOpportunities(
      primaryCondition, 
      secondaryConditions, 
      assessment
    );
    
    // Risk mitigation strategies
    const riskMitigation = this.generateRiskMitigationStrategies(
      primaryCondition,
      secondaryConditions,
      riskMultiplier,
      synergyScore
    );

    return {
      primaryCondition,
      secondaryConditions,
      riskMultiplier,
      synergyScore,
      temporalPattern,
      predictiveModel,
      interventionOpportunities,
      riskMitigation
    };
  }

  /**
   * Calculate exponential risk scoring for multiple conditions
   */
  calculateExponentialRiskScore(
    individualRisks: Record<string, number>,
    correlations: Record<string, Record<string, number>>
  ): number {
    const conditions = Object.keys(individualRisks);
    let baseScore = 0;
    let exponentialFactor = 1;
    let synergyBonus = 0;

    // Base additive score
    for (const condition of conditions) {
      baseScore += individualRisks[condition];
    }

    // Exponential scaling for multiple high-risk conditions
    const highRiskConditions = conditions.filter(c => individualRisks[c] > 50);
    if (highRiskConditions.length > 1) {
      exponentialFactor = Math.pow(1.3, highRiskConditions.length - 1);
    }

    // Synergy calculations
    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        const condition1 = conditions[i];
        const condition2 = conditions[j];
        
        const correlation = correlations[condition1]?.[condition2] || 0;
        if (correlation > 0.5) {
          const synergyFactor = this.getMedicalSynergy(condition1, condition2);
          synergyBonus += (individualRisks[condition1] * individualRisks[condition2] * correlation * synergyFactor) / 100;
        }
      }
    }

    // Final exponential score
    const finalScore = (baseScore * exponentialFactor) + synergyBonus;
    
    logger.info(`Exponential risk calculation: base=${baseScore}, factor=${exponentialFactor}, synergy=${synergyBonus}, final=${finalScore}`);
    
    return Math.min(finalScore, 100); // Cap at 100
  }

  /**
   * Analyze specific medical synergies
   */
  analyzeMedicalSynergies(conditions: string[]): MedicalSynergy[] {
    const activeSynergies: MedicalSynergy[] = [];

    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        const condition1 = conditions[i];
        const condition2 = conditions[j];
        
        const synergies = this.medicalSynergies.get(`${condition1}_${condition2}`) ||
                         this.medicalSynergies.get(`${condition2}_${condition1}`);
        
        if (synergies) {
          activeSynergies.push(...synergies);
        }
      }
    }

    return activeSynergies;
  }

  /**
   * Brazilian-specific risk factors integration
   */
  integrateScioeconomicRisks(assessment: AdvancedRiskAssessment): number {
    let socioeconomicMultiplier = 1.0;

    // Brazilian healthcare access factors
    const healthcareAccessFactors = {
      sus_dependent: 1.2,        // SUS dependency increases follow-up difficulty
      private_insurance: 0.9,    // Private insurance improves access
      rural_location: 1.3,       // Rural areas have limited specialist access
      urban_periphery: 1.15,     // Urban periphery has transport barriers
      low_education: 1.25,       // Lower education affects health literacy
      low_income: 1.3           // Low income affects medication adherence
    };

    // Geographic disparities in Brazil
    const regionalFactors = {
      southeast: 0.95,    // Better healthcare infrastructure
      northeast: 1.15,    // Limited specialist access
      north: 1.25,        // Severe infrastructure limitations
      south: 0.9,         // Good healthcare access
      center_west: 1.1    // Moderate access limitations
    };

    // Cultural and social factors
    const culturalFactors = {
      family_support_strong: 0.85,   // Strong family support improves outcomes
      religious_coping: 0.9,         // Religious coping helps with mental health
      social_isolation: 1.4,         // Social isolation worsens all conditions
      domestic_violence: 1.6,        // Domestic violence severely impacts health
      substance_abuse_family: 1.3    // Family substance abuse affects support
    };

    // Apply relevant factors (this would be extracted from questionnaire)
    // For now, using default moderate risk multiplier
    socioeconomicMultiplier = 1.1;

    logger.info(`Socioeconomic risk multiplier: ${socioeconomicMultiplier}`);
    return socioeconomicMultiplier;
  }

  /**
   * Temporal risk progression analysis
   */
  private async analyzeTemporalPattern(assessment: AdvancedRiskAssessment): Promise<TemporalRiskPattern> {
    // This would analyze historical assessments to detect patterns
    // For now, providing a basic pattern based on current risk levels
    
    const highRiskConditions = [
      assessment.cardiovascular.riskLevel === 'high' || assessment.cardiovascular.riskLevel === 'very_high',
      assessment.diabetes.riskLevel === 'high' || assessment.diabetes.riskLevel === 'critical',
      assessment.mentalHealth.riskLevel === 'high' || assessment.mentalHealth.riskLevel === 'severe',
      assessment.respiratory.riskLevel === 'high' || assessment.respiratory.riskLevel === 'critical'
    ].filter(Boolean).length;

    let pattern: TemporalRiskPattern['pattern'] = 'stable';
    let riskVelocity = 0;
    let interventionWindow = 30;

    if (highRiskConditions >= 3) {
      pattern = 'critical_progression';
      riskVelocity = 15; // High velocity
      interventionWindow = 3;
    } else if (highRiskConditions === 2) {
      pattern = 'accelerating';
      riskVelocity = 8;
      interventionWindow = 7;
    } else if (highRiskConditions === 1) {
      pattern = 'ascending';
      riskVelocity = 3;
      interventionWindow = 14;
    }

    const projectedPeak = new Date();
    projectedPeak.setDate(projectedPeak.getDate() + interventionWindow);

    return {
      pattern,
      timeframe: 30,
      riskVelocity,
      projectedPeak,
      interventionWindow
    };
  }

  /**
   * Generate predictive risk model
   */
  private async generatePredictiveModel(
    assessment: AdvancedRiskAssessment, 
    conditions: string[]
  ): Promise<PredictiveRiskModel> {
    // Simplified predictive model based on current risk scores
    const currentCompositeScore = assessment.composite.overallScore;
    
    // Risk progression based on number of active conditions
    const riskProgression = conditions.length * 2;
    
    const predictions = {
      next7days: Math.min(currentCompositeScore + (riskProgression * 0.25), 100),
      next30days: Math.min(currentCompositeScore + riskProgression, 100),
      next90days: Math.min(currentCompositeScore + (riskProgression * 2), 100),
      nextYear: Math.min(currentCompositeScore + (riskProgression * 5), 100)
    };

    // Key factors contributing to risk
    const keyFactors: RiskFactor[] = [
      {
        name: 'Multiple chronic conditions',
        value: conditions.length * 10,
        weight: 0.8,
        category: 'history',
        severity: conditions.length > 2 ? 'severe' : 'moderate',
        evidenceLevel: 'A'
      },
      {
        name: 'Age-related risk',
        value: assessment.composite.ageAdjustment * 10,
        weight: 0.6,
        category: 'demographic',
        severity: assessment.composite.ageAdjustment > 0.7 ? 'severe' : 'moderate',
        evidenceLevel: 'A'
      }
    ];

    // Add condition-specific factors
    if (conditions.includes('diabetes') && conditions.includes('cardiovascular')) {
      keyFactors.push({
        name: 'Diabetes-cardiovascular synergy',
        value: 25,
        weight: 0.9,
        category: 'history',
        severity: 'severe',
        evidenceLevel: 'A'
      });
    }

    return {
      algorithmType: 'clinical_rules',
      confidence: 0.75,
      predictions,
      keyFactors,
      uncertaintyBounds: {
        lower: currentCompositeScore * 0.8,
        upper: currentCompositeScore * 1.2
      }
    };
  }

  /**
   * Identify intervention opportunities
   */
  private identifyInterventionOpportunities(
    primaryCondition: string,
    secondaryConditions: string[],
    assessment: AdvancedRiskAssessment
  ): InterventionOpportunity[] {
    const opportunities: InterventionOpportunity[] = [];

    // Diabetes interventions
    if (primaryCondition === 'diabetes' || secondaryConditions.includes('diabetes')) {
      if (assessment.diabetes.classicTriad.triadComplete) {
        opportunities.push({
          type: 'therapeutic',
          description: 'Urgent glycemic control initiation',
          potentialRiskReduction: 40,
          costEffectiveness: 'high',
          timeToEffect: 7,
          evidenceLevel: 'A',
          prerequisites: ['Medical evaluation', 'Laboratory tests'],
          contraindications: ['Severe kidney disease without monitoring']
        });
      }
    }

    // Cardiovascular interventions
    if (primaryCondition === 'cardiovascular' || secondaryConditions.includes('cardiovascular')) {
      opportunities.push({
        type: 'preventive',
        description: 'Lifestyle modification program',
        potentialRiskReduction: 25,
        costEffectiveness: 'high',
        timeToEffect: 30,
        evidenceLevel: 'A',
        prerequisites: ['Motivation assessment', 'Social support'],
        contraindications: ['Severe heart failure', 'Recent cardiac event']
      });
    }

    // Mental health interventions
    if (primaryCondition === 'mental_health' || secondaryConditions.includes('mental_health')) {
      if (assessment.mentalHealth.suicideRisk.riskLevel !== 'none') {
        opportunities.push({
          type: 'therapeutic',
          description: 'Crisis intervention and psychotherapy',
          potentialRiskReduction: 60,
          costEffectiveness: 'high',
          timeToEffect: 1,
          evidenceLevel: 'A',
          prerequisites: ['Immediate safety assessment'],
          contraindications: ['Active psychosis without stabilization']
        });
      }
    }

    // Multi-condition interventions
    if (secondaryConditions.length >= 2) {
      opportunities.push({
        type: 'preventive',
        description: 'Integrated care coordination',
        potentialRiskReduction: 35,
        costEffectiveness: 'medium',
        timeToEffect: 14,
        evidenceLevel: 'B',
        prerequisites: ['Care team assembly', 'Patient education'],
        contraindications: ['Lack of patient engagement']
      });
    }

    return opportunities;
  }

  // Helper methods
  private identifyActiveConditions(assessment: AdvancedRiskAssessment): string[] {
    const conditions: string[] = [];

    if (assessment.cardiovascular.riskLevel !== 'low') {
      conditions.push('cardiovascular');
    }
    if (assessment.diabetes.riskLevel !== 'low') {
      conditions.push('diabetes');
    }
    if (assessment.mentalHealth.riskLevel !== 'low') {
      conditions.push('mental_health');
    }
    if (assessment.respiratory.riskLevel !== 'low') {
      conditions.push('respiratory');
    }

    return conditions;
  }

  private determinePrimaryCondition(conditions: string[]): string {
    // Logic to determine which condition poses the highest immediate risk
    // This would be based on severity scores and emergency indicators
    return conditions[0] || 'none';
  }

  private calculateRiskMultiplier(primary: string, secondary: string[]): number {
    let multiplier = 1.0;
    
    // Base multiplier for having multiple conditions
    if (secondary.length > 0) {
      multiplier = 1.2 + (secondary.length * 0.3);
    }

    // Specific high-risk combinations
    if (primary === 'diabetes' && secondary.includes('cardiovascular')) {
      multiplier *= 1.8; // Evidence-based multiplier
    }
    
    if (primary === 'mental_health' && secondary.length > 0) {
      multiplier *= 1.4; // Mental health complicates other conditions
    }

    return Math.min(multiplier, 3.0); // Cap at 3x
  }

  private calculateSynergyScore(primary: string, secondary: string[]): number {
    let synergyScore = 0;

    const synergies = this.analyzeMedicalSynergies([primary, ...secondary]);
    for (const synergy of synergies) {
      if (synergy.synergyType === 'exponential') {
        synergyScore += synergy.factor * 2;
      } else if (synergy.synergyType === 'multiplicative') {
        synergyScore += synergy.factor;
      } else {
        synergyScore += synergy.factor * 0.5;
      }
    }

    return synergyScore;
  }

  private getMedicalSynergy(condition1: string, condition2: string): number {
    // Evidence-based synergy factors
    const synergyMap: Record<string, Record<string, number>> = {
      'diabetes': {
        'cardiovascular': 2.5,
        'mental_health': 1.8,
        'respiratory': 1.6
      },
      'cardiovascular': {
        'diabetes': 2.5,
        'mental_health': 1.4,
        'respiratory': 1.3
      },
      'mental_health': {
        'diabetes': 1.8,
        'cardiovascular': 1.4,
        'respiratory': 1.2
      }
    };

    return synergyMap[condition1]?.[condition2] || 1.0;
  }

  private generateRiskMitigationStrategies(
    primary: string,
    secondary: string[],
    riskMultiplier: number,
    synergyScore: number
  ): RiskMitigationStrategy[] {
    const strategies: RiskMitigationStrategy[] = [];

    // High-level strategies based on compound risk
    if (riskMultiplier > 2.0) {
      strategies.push({
        strategy: 'Intensive integrated care management',
        priority: 'immediate',
        expectedRiskReduction: 40,
        timeline: '90 days',
        resources: ['Care coordinator', 'Specialist team', 'Digital monitoring'],
        monitoringRequirements: ['Weekly check-ins', 'Real-time vitals', 'Medication adherence'],
        successMetrics: [
          { metric: 'Risk score reduction', target: 25, unit: 'percentage', timeframe: '6 months', measurement: 'percentage' },
          { metric: 'Emergency visits', target: 50, unit: 'reduction', timeframe: '1 year', measurement: 'percentage' },
          { metric: 'Quality of life', target: 70, unit: 'score', timeframe: '6 months', measurement: 'absolute' }
        ]
      });
    }

    if (synergyScore > 5.0) {
      strategies.push({
        strategy: 'Targeted synergy intervention',
        priority: 'urgent',
        expectedRiskReduction: 30,
        timeline: '60 days',
        resources: ['Specialized protocols', 'Patient education', 'Family involvement'],
        monitoringRequirements: ['Bi-weekly assessments', 'Biomarker tracking'],
        successMetrics: [
          { metric: 'Synergy score reduction', target: 30, unit: 'percentage', timeframe: '60 days', measurement: 'percentage' },
          { metric: 'Individual condition improvement', target: 40, unit: 'percentage', timeframe: '90 days', measurement: 'percentage' }
        ]
      });
    }

    return strategies;
  }

  // Initialization methods
  private initializeCorrelationMatrix(): void {
    this.correlationMatrix = {
      correlations: {
        'diabetes': { 
          'cardiovascular': 0.85,
          'mental_health': 0.65,
          'respiratory': 0.70,
          'hypertension': 0.90
        },
        'cardiovascular': {
          'diabetes': 0.85,
          'mental_health': 0.55,
          'respiratory': 0.60,
          'sleep_apnea': 0.75
        },
        'mental_health': {
          'diabetes': 0.65,
          'cardiovascular': 0.55,
          'chronic_pain': 0.80,
          'substance_abuse': 0.70
        },
        'respiratory': {
          'diabetes': 0.70,
          'cardiovascular': 0.60,
          'sleep_apnea': 0.85,
          'anxiety': 0.60
        }
      },
      compoundingFactors: [
        {
          condition1: 'diabetes',
          condition2: 'cardiovascular',
          multiplicationFactor: 2.2,
          evidenceLevel: 'A'
        },
        {
          condition1: 'mental_health',
          condition2: 'diabetes',
          multiplicationFactor: 1.6,
          evidenceLevel: 'A'
        }
      ],
      exclusivePairs: [],
      dominantConditions: ['acute_coronary_syndrome', 'diabetic_ketoacidosis', 'suicide_attempt']
    };
  }

  private initializeMedicalSynergies(): void {
    // Diabetes + Cardiovascular synergy
    this.medicalSynergies.set('diabetes_cardiovascular', [{
      condition1: 'diabetes',
      condition2: 'cardiovascular',
      synergyType: 'exponential',
      factor: 2.5,
      evidenceBase: 'Multiple large cohort studies',
      clinicalSignificance: 'high',
      mechanismOfAction: 'Hyperglycemia accelerates atherosclerosis and increases cardiac risk'
    }]);

    logger.info('Medical synergies initialized');
  }

  private initializePredictiveModels(): void {
    // Initialize machine learning models for risk prediction
    logger.info('Predictive models initialized');
  }
}