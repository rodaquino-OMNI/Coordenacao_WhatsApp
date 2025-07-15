/**
 * Temporal Risk Progression Tracking Service
 * Advanced longitudinal health risk analysis with predictive modeling
 * Pattern recognition for early intervention opportunities
 */

import {
  AdvancedRiskAssessment,
  TemporalRiskProgression,
  MedicalKnowledgeRule
} from '../types/risk.types';
import { logger } from '../utils/logger';

export interface RiskTrend {
  condition: string;
  timePoints: RiskTimePoint[];
  trendDirection: 'improving' | 'stable' | 'worsening' | 'rapid_decline' | 'fluctuating';
  trendStrength: number; // 0-1, how strong the trend is
  velocity: number; // rate of change per day
  acceleration: number; // change in velocity
  projectedTrajectory: ProjectedTrajectory;
  interventionImpact: InterventionImpact[];
  alertThresholds: AlertThreshold[];
}

export interface RiskTimePoint {
  timestamp: Date;
  riskScore: number;
  riskLevel: string;
  symptoms: string[];
  interventions: string[];
  externalFactors: string[];
  dataQuality: 'high' | 'medium' | 'low';
}

export interface ProjectedTrajectory {
  nextWeek: {
    predictedScore: number;
    confidence: number;
    riskLevel: string;
  };
  nextMonth: {
    predictedScore: number;
    confidence: number;
    riskLevel: string;
  };
  nextThreeMonths: {
    predictedScore: number;
    confidence: number;
    riskLevel: string;
  };
  criticalEvents: CriticalEventPrediction[];
}

export interface CriticalEventPrediction {
  event: string;
  probability: number;
  estimatedTimeframe: number; // days
  preventiveActions: string[];
  earlyWarningSign: string[];
}

export interface InterventionImpact {
  intervention: string;
  startDate: Date;
  expectedDuration: number; // days
  observedEffect: number; // change in risk score
  effectiveness: 'high' | 'moderate' | 'low' | 'none' | 'harmful';
  timeToEffect: number; // days until effect observed
  sustainedEffect: boolean;
}

export interface AlertThreshold {
  type: 'velocity' | 'acceleration' | 'absolute_score' | 'pattern_change';
  threshold: number;
  action: 'notify' | 'escalate' | 'emergency';
  message: string;
}

export interface SeasonalPattern {
  condition: string;
  pattern: 'seasonal' | 'monthly' | 'weekly' | 'none';
  peakMonths: number[];
  riskIncrease: number;
  confidenceLevel: number;
  adjustmentFactor: number;
}

export interface RiskCorrelationAnalysis {
  primaryCondition: string;
  correlatedConditions: CorrelatedCondition[];
  leadingIndicators: LeadingIndicator[];
  laggingindicators: LaggingIndicator[];
  crossConditionPatterns: CrossConditionPattern[];
}

export interface CorrelatedCondition {
  condition: string;
  correlationStrength: number;
  leadTime: number; // days one condition precedes another
  directionality: 'bidirectional' | 'primary_leads' | 'secondary_leads';
}

export interface LeadingIndicator {
  indicator: string;
  leadTime: number; // days before main condition worsens
  predictivePower: number;
  falsePositiveRate: number;
  actionable: boolean;
}

export interface LaggingIndicator {
  indicator: string;
  lagTime: number; // days after main condition changes
  confirmationValue: number;
  usefulForValidation: boolean;
}

export interface CrossConditionPattern {
  pattern: string;
  conditions: string[];
  frequency: number;
  riskMultiplier: number;
  interventionOpportunity: string;
}

export class TemporalRiskTrackingService {
  private riskHistories: Map<string, RiskTrend[]> = new Map();
  private seasonalPatterns: Map<string, SeasonalPattern> = new Map();
  private alertThresholds: Map<string, AlertThreshold[]> = new Map();
  private interventionDatabase: Map<string, InterventionImpact[]> = new Map();

  constructor() {
    this.initializeSeasonalPatterns();
    this.initializeAlertThresholds();
  }

  /**
   * Analyze temporal risk progression for a user
   */
  async analyzeTemporalProgression(
    userId: string,
    currentAssessment: AdvancedRiskAssessment,
    historicalAssessments: AdvancedRiskAssessment[]
  ): Promise<TemporalRiskProgression> {
    logger.info(`Analyzing temporal risk progression for user: ${userId}`);

    // Build comprehensive risk history
    const riskTrends = this.buildRiskTrends(userId, currentAssessment, historicalAssessments);
    
    // Analyze overall progression patterns
    const trends = this.analyzeProgressionTrends(riskTrends);
    
    // Generate predictive model
    const predictiveModeling = this.generatePredictiveModeling(riskTrends, currentAssessment);
    
    // Identify intervention opportunities
    const interventionOpportunities = this.identifyTemporalInterventionOpportunities(riskTrends);
    
    // Check for alerts and escalations
    await this.checkTemporalAlerts(userId, riskTrends);

    return {
      assessments: [currentAssessment, ...historicalAssessments],
      trends,
      predictiveModeling
    };
  }

  /**
   * Build detailed risk trends for each condition
   */
  private buildRiskTrends(
    userId: string,
    current: AdvancedRiskAssessment,
    historical: AdvancedRiskAssessment[]
  ): RiskTrend[] {
    const allAssessments = [current, ...historical].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const trends: RiskTrend[] = [];

    // Cardiovascular trend
    trends.push(this.buildConditionTrend('cardiovascular', allAssessments, 
      assessments => assessments.map(a => ({
        timestamp: a.timestamp,
        riskScore: a.cardiovascular.overallScore,
        riskLevel: a.cardiovascular.riskLevel,
        symptoms: a.cardiovascular.emergencyIndicators,
        interventions: a.recommendations
          .filter(r => r.category === 'cardiovascular' || r.condition.includes('cardiac'))
          .map(r => r.recommendation),
        externalFactors: [],
        dataQuality: 'high'
      }))
    ));

    // Diabetes trend
    trends.push(this.buildConditionTrend('diabetes', allAssessments,
      assessments => assessments.map(a => ({
        timestamp: a.timestamp,
        riskScore: a.diabetes.overallScore,
        riskLevel: a.diabetes.riskLevel,
        symptoms: a.diabetes.emergencyIndicators,
        interventions: a.recommendations
          .filter(r => r.category === 'diabetes' || r.condition.includes('diabetes'))
          .map(r => r.recommendation),
        externalFactors: [],
        dataQuality: 'high'
      }))
    ));

    // Mental health trend
    trends.push(this.buildConditionTrend('mental_health', allAssessments,
      assessments => assessments.map(a => ({
        timestamp: a.timestamp,
        riskScore: a.mentalHealth.overallScore,
        riskLevel: a.mentalHealth.riskLevel,
        symptoms: a.mentalHealth.suicideRisk.riskFactors,
        interventions: a.recommendations
          .filter(r => r.category === 'mental_health' || r.condition.includes('mental'))
          .map(r => r.recommendation),
        externalFactors: [],
        dataQuality: 'high'
      }))
    ));

    // Respiratory trend
    trends.push(this.buildConditionTrend('respiratory', allAssessments,
      assessments => assessments.map(a => ({
        timestamp: a.timestamp,
        riskScore: a.respiratory.overallScore,
        riskLevel: a.respiratory.riskLevel,
        symptoms: a.respiratory.emergencyIndicators,
        interventions: a.recommendations
          .filter(r => r.category === 'respiratory' || r.condition.includes('respiratory'))
          .map(r => r.recommendation),
        externalFactors: [],
        dataQuality: 'high'
      }))
    ));

    return trends.filter(trend => trend.timePoints.length >= 2);
  }

  /**
   * Build trend for individual condition
   */
  private buildConditionTrend(
    condition: string,
    assessments: AdvancedRiskAssessment[],
    extractor: (assessments: AdvancedRiskAssessment[]) => RiskTimePoint[]
  ): RiskTrend {
    const timePoints = extractor(assessments);
    
    // Calculate trend direction and strength
    const { direction, strength, velocity, acceleration } = this.calculateTrendMetrics(timePoints);
    
    // Generate projections
    const projectedTrajectory = this.generateProjectedTrajectory(timePoints, velocity, acceleration);
    
    // Analyze intervention impacts
    const interventionImpact = this.analyzeInterventionImpacts(timePoints);
    
    // Set up alert thresholds
    const alertThresholds = this.getAlertThresholds(condition);

    return {
      condition,
      timePoints,
      trendDirection: direction,
      trendStrength: strength,
      velocity,
      acceleration,
      projectedTrajectory,
      interventionImpact,
      alertThresholds
    };
  }

  /**
   * Calculate comprehensive trend metrics
   */
  private calculateTrendMetrics(timePoints: RiskTimePoint[]): {
    direction: RiskTrend['trendDirection'];
    strength: number;
    velocity: number;
    acceleration: number;
  } {
    if (timePoints.length < 2) {
      return { direction: 'stable', strength: 0, velocity: 0, acceleration: 0 };
    }

    // Calculate velocity (rate of change)
    const velocities: number[] = [];
    for (let i = 1; i < timePoints.length; i++) {
      const timeDiff = (timePoints[i].timestamp.getTime() - timePoints[i-1].timestamp.getTime()) / (1000 * 60 * 60 * 24); // days
      const scoreDiff = timePoints[i].riskScore - timePoints[i-1].riskScore;
      velocities.push(scoreDiff / timeDiff);
    }

    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;

    // Calculate acceleration (change in velocity)
    let acceleration = 0;
    if (velocities.length >= 2) {
      const recentVelocity = velocities[velocities.length - 1];
      const earlierVelocity = velocities[0];
      acceleration = recentVelocity - earlierVelocity;
    }

    // Determine trend direction
    let direction: RiskTrend['trendDirection'] = 'stable';
    const absVelocity = Math.abs(avgVelocity);
    
    if (absVelocity > 5) { // Significant change threshold
      if (avgVelocity > 0) {
        direction = acceleration > 2 ? 'rapid_decline' : 'worsening';
      } else {
        direction = 'improving';
      }
    } else if (absVelocity > 1) {
      direction = 'fluctuating';
    }

    // Calculate trend strength (how consistent the trend is)
    const strength = this.calculateTrendConsistency(velocities);

    return {
      direction,
      strength,
      velocity: avgVelocity,
      acceleration
    };
  }

  /**
   * Calculate how consistent the trend is
   */
  private calculateTrendConsistency(velocities: number[]): number {
    if (velocities.length <= 1) return 0;

    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    // Normalize to 0-1 scale
    const consistency = Math.max(0, 1 - (stdDev / 10));
    return consistency;
  }

  /**
   * Generate projected trajectory using advanced modeling
   */
  private generateProjectedTrajectory(
    timePoints: RiskTimePoint[],
    velocity: number,
    acceleration: number
  ): ProjectedTrajectory {
    const currentScore = timePoints[timePoints.length - 1].riskScore;
    
    // Apply seasonal adjustments
    const seasonalAdjustment = this.getSeasonalAdjustment(new Date());
    
    // Calculate projections with diminishing confidence over time
    const nextWeek = {
      predictedScore: Math.max(0, Math.min(100, currentScore + (velocity * 7) + (acceleration * 7 * 7 / 2) + seasonalAdjustment)),
      confidence: 0.8,
      riskLevel: this.scoreToRiskLevel(currentScore + (velocity * 7))
    };

    const nextMonth = {
      predictedScore: Math.max(0, Math.min(100, currentScore + (velocity * 30) + (acceleration * 30 * 30 / 2) + seasonalAdjustment)),
      confidence: 0.6,
      riskLevel: this.scoreToRiskLevel(currentScore + (velocity * 30))
    };

    const nextThreeMonths = {
      predictedScore: Math.max(0, Math.min(100, currentScore + (velocity * 90) + (acceleration * 90 * 90 / 2) + seasonalAdjustment)),
      confidence: 0.4,
      riskLevel: this.scoreToRiskLevel(currentScore + (velocity * 90))
    };

    // Predict critical events
    const criticalEvents = this.predictCriticalEvents(timePoints, velocity, acceleration);

    return {
      nextWeek,
      nextMonth,
      nextThreeMonths,
      criticalEvents
    };
  }

  /**
   * Predict potential critical events
   */
  private predictCriticalEvents(
    timePoints: RiskTimePoint[],
    velocity: number,
    acceleration: number
  ): CriticalEventPrediction[] {
    const criticalEvents: CriticalEventPrediction[] = [];
    const currentScore = timePoints[timePoints.length - 1].riskScore;

    // Emergency threshold prediction
    if (velocity > 3 && currentScore > 60) {
      const daysToEmergency = (90 - currentScore) / velocity;
      if (daysToEmergency > 0 && daysToEmergency < 30) {
        criticalEvents.push({
          event: 'Emergency threshold breach',
          probability: Math.min(0.9, velocity / 10),
          estimatedTimeframe: Math.round(daysToEmergency),
          preventiveActions: [
            'Immediate medical evaluation',
            'Medication adjustment',
            'Lifestyle intervention'
          ],
          earlyWarningSign: [
            'Accelerating symptom progression',
            'New concerning symptoms',
            'Medication non-adherence'
          ]
        });
      }
    }

    // Hospitalization risk
    if (acceleration > 1 && currentScore > 70) {
      criticalEvents.push({
        event: 'Hospitalization risk',
        probability: 0.6,
        estimatedTimeframe: 14,
        preventiveActions: [
          'Urgent specialist consultation',
          'Enhanced monitoring protocol',
          'Family/caregiver involvement'
        ],
        earlyWarningSign: [
          'Rapid symptom escalation',
          'Multiple system involvement',
          'Functional decline'
        ]
      });
    }

    return criticalEvents;
  }

  /**
   * Analyze intervention impacts over time
   */
  private analyzeInterventionImpacts(timePoints: RiskTimePoint[]): InterventionImpact[] {
    const impacts: InterventionImpact[] = [];

    // Look for interventions and their effects
    for (let i = 0; i < timePoints.length - 1; i++) {
      const current = timePoints[i];
      const next = timePoints[i + 1];

      if (current.interventions.length > 0) {
        const timeDiff = (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const scoreChange = next.riskScore - current.riskScore;

        for (const intervention of current.interventions) {
          impacts.push({
            intervention,
            startDate: current.timestamp,
            expectedDuration: 30, // Default 30 days
            observedEffect: scoreChange,
            effectiveness: this.categorizeEffectiveness(scoreChange),
            timeToEffect: timeDiff,
            sustainedEffect: this.checkSustainedEffect(timePoints, i)
          });
        }
      }
    }

    return impacts;
  }

  /**
   * Categorize intervention effectiveness
   */
  private categorizeEffectiveness(scoreChange: number): InterventionImpact['effectiveness'] {
    if (scoreChange < -10) return 'high';
    if (scoreChange < -5) return 'moderate';
    if (scoreChange < -1) return 'low';
    if (scoreChange > 5) return 'harmful';
    return 'none';
  }

  /**
   * Check if intervention effect is sustained
   */
  private checkSustainedEffect(timePoints: RiskTimePoint[], interventionIndex: number): boolean {
    // Look at subsequent points to see if improvement is maintained
    if (interventionIndex + 2 >= timePoints.length) return false;

    const baseline = timePoints[interventionIndex].riskScore;
    const immediate = timePoints[interventionIndex + 1].riskScore;
    const sustained = timePoints[interventionIndex + 2].riskScore;

    const immediateImprovement = baseline - immediate;
    const sustainedImprovement = baseline - sustained;

    return immediateImprovement > 0 && sustainedImprovement >= (immediateImprovement * 0.7);
  }

  /**
   * Analyze overall progression trends
   */
  private analyzeProgressionTrends(riskTrends: RiskTrend[]): TemporalRiskProgression['trends'] {
    return riskTrends.map(trend => ({
      condition: trend.condition,
      progression: trend.trendDirection,
      timeframe: this.calculateTimeframe(trend.timePoints),
      confidenceLevel: trend.trendStrength
    }));
  }

  /**
   * Generate predictive modeling
   */
  private generatePredictiveModeling(
    riskTrends: RiskTrend[],
    currentAssessment: AdvancedRiskAssessment
  ): TemporalRiskProgression['predictiveModeling'] {
    // Find the trend with highest risk velocity
    const highestRiskTrend = riskTrends.reduce((highest, current) => 
      Math.abs(current.velocity) > Math.abs(highest.velocity) ? current : highest
    );

    // Calculate next assessment timing
    const baseInterval = 30; // days
    let adjustedInterval = baseInterval;

    if (highestRiskTrend.velocity > 5) adjustedInterval = 7;  // Weekly if rapid worsening
    else if (highestRiskTrend.velocity > 2) adjustedInterval = 14; // Bi-weekly if moderate worsening
    else if (highestRiskTrend.velocity < -2) adjustedInterval = 60; // Can extend if improving

    const nextAssessmentRecommended = new Date();
    nextAssessmentRecommended.setDate(nextAssessmentRecommended.getDate() + adjustedInterval);

    // Risk projection based on composite trends
    const compositeVelocity = riskTrends.reduce((sum, trend) => sum + trend.velocity, 0) / riskTrends.length;
    const riskProjection = Math.max(0, Math.min(100, 
      currentAssessment.composite.overallScore + (compositeVelocity * adjustedInterval)
    ));

    // Identify intervention opportunities
    const interventionOpportunities = riskTrends
      .filter(trend => trend.velocity > 1 || trend.trendDirection === 'worsening')
      .map(trend => `${trend.condition} intervention: velocity ${trend.velocity.toFixed(2)}/day`)
      .slice(0, 3); // Top 3 opportunities

    return {
      nextAssessmentRecommended,
      riskProjection,
      interventionOpportunities
    };
  }

  /**
   * Identify temporal intervention opportunities
   */
  private identifyTemporalInterventionOpportunities(riskTrends: RiskTrend[]): string[] {
    const opportunities: string[] = [];

    for (const trend of riskTrends) {
      // Early intervention for accelerating conditions
      if (trend.acceleration > 1 && trend.velocity > 0) {
        opportunities.push(`Early intervention for accelerating ${trend.condition} risk`);
      }

      // Optimization opportunities for stable conditions
      if (trend.trendDirection === 'stable' && trend.timePoints[trend.timePoints.length - 1].riskScore > 40) {
        opportunities.push(`Optimization opportunity for stable ${trend.condition} condition`);
      }

      // Maintenance for improving conditions
      if (trend.trendDirection === 'improving') {
        opportunities.push(`Maintenance strategy for improving ${trend.condition} condition`);
      }
    }

    return opportunities;
  }

  /**
   * Check for temporal alerts
   */
  private async checkTemporalAlerts(userId: string, riskTrends: RiskTrend[]): Promise<void> {
    for (const trend of riskTrends) {
      for (const threshold of trend.alertThresholds) {
        let triggerAlert = false;
        let alertMessage = '';

        switch (threshold.type) {
          case 'velocity':
            if (Math.abs(trend.velocity) > threshold.threshold) {
              triggerAlert = true;
              alertMessage = `${trend.condition} risk changing at ${trend.velocity.toFixed(2)} points/day`;
            }
            break;
          case 'acceleration':
            if (Math.abs(trend.acceleration) > threshold.threshold) {
              triggerAlert = true;
              alertMessage = `${trend.condition} risk acceleration: ${trend.acceleration.toFixed(2)}`;
            }
            break;
          case 'absolute_score':
            const currentScore = trend.timePoints[trend.timePoints.length - 1].riskScore;
            if (currentScore > threshold.threshold) {
              triggerAlert = true;
              alertMessage = `${trend.condition} risk score: ${currentScore}`;
            }
            break;
        }

        if (triggerAlert) {
          logger.warn(`TEMPORAL ALERT for user ${userId}: ${alertMessage}`);
          await this.triggerTemporalAlert(userId, threshold.action, alertMessage);
        }
      }
    }
  }

  /**
   * Trigger temporal alert
   */
  private async triggerTemporalAlert(userId: string, action: string, message: string): Promise<void> {
    switch (action) {
      case 'emergency':
        logger.error(`EMERGENCY TEMPORAL ALERT for ${userId}: ${message}`);
        // Trigger emergency protocols
        break;
      case 'escalate':
        logger.warn(`ESCALATION TEMPORAL ALERT for ${userId}: ${message}`);
        // Trigger escalation protocols
        break;
      case 'notify':
        logger.info(`NOTIFICATION TEMPORAL ALERT for ${userId}: ${message}`);
        // Send notification
        break;
    }
  }

  // Helper methods
  private calculateTimeframe(timePoints: RiskTimePoint[]): number {
    if (timePoints.length < 2) return 0;
    const first = timePoints[0].timestamp;
    const last = timePoints[timePoints.length - 1].timestamp;
    return (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24); // days
  }

  private scoreToRiskLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'moderate';
    return 'low';
  }

  private getSeasonalAdjustment(date: Date): number {
    const month = date.getMonth();
    // Brazilian seasonal patterns (simplified)
    if (month >= 5 && month <= 8) return 2; // Winter months - higher risk
    if (month >= 11 || month <= 2) return -1; // Summer months - lower risk
    return 0;
  }

  private getAlertThresholds(condition: string): AlertThreshold[] {
    return this.alertThresholds.get(condition) || [];
  }

  // Initialization methods
  private initializeSeasonalPatterns(): void {
    // Brazilian seasonal patterns for health conditions
    this.seasonalPatterns.set('respiratory', {
      condition: 'respiratory',
      pattern: 'seasonal',
      peakMonths: [6, 7, 8], // Winter months in Brazil
      riskIncrease: 15,
      confidenceLevel: 0.8,
      adjustmentFactor: 1.2
    });

    this.seasonalPatterns.set('mental_health', {
      condition: 'mental_health',
      pattern: 'seasonal',
      peakMonths: [5, 6, 7], // Seasonal affective patterns
      riskIncrease: 10,
      confidenceLevel: 0.6,
      adjustmentFactor: 1.1
    });
  }

  private initializeAlertThresholds(): void {
    // Cardiovascular thresholds
    this.alertThresholds.set('cardiovascular', [
      { type: 'velocity', threshold: 5, action: 'escalate', message: 'Rapid cardiovascular risk increase' },
      { type: 'acceleration', threshold: 2, action: 'notify', message: 'Accelerating cardiovascular risk' },
      { type: 'absolute_score', threshold: 80, action: 'emergency', message: 'Critical cardiovascular risk' }
    ]);

    // Diabetes thresholds
    this.alertThresholds.set('diabetes', [
      { type: 'velocity', threshold: 7, action: 'escalate', message: 'Rapid diabetes risk increase' },
      { type: 'absolute_score', threshold: 75, action: 'emergency', message: 'Critical diabetes risk' }
    ]);

    // Mental health thresholds
    this.alertThresholds.set('mental_health', [
      { type: 'velocity', threshold: 6, action: 'escalate', message: 'Rapid mental health deterioration' },
      { type: 'absolute_score', threshold: 70, action: 'emergency', message: 'Severe mental health risk' }
    ]);

    // Respiratory thresholds
    this.alertThresholds.set('respiratory', [
      { type: 'velocity', threshold: 6, action: 'escalate', message: 'Rapid respiratory risk increase' },
      { type: 'absolute_score', threshold: 75, action: 'emergency', message: 'Critical respiratory risk' }
    ]);
  }
}