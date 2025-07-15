/**
 * Advanced Risk Assessment Service Tests
 * Comprehensive testing of medical risk algorithms
 */

import { AdvancedRiskAssessmentService } from '../../services/risk-assessment.service';
import { EmergencyDetectionService } from '../../services/emergency-detection.service';
import { CompoundRiskAnalysisService } from '../../services/compound-risk.service';
import {
  ProcessedQuestionnaire,
  AdvancedRiskAssessment,
  QuestionnaireResponse,
  ExtractedSymptom,
  ExtractedRiskFactor,
  EmergencyFlag
} from '../../types/risk.types';

describe('AdvancedRiskAssessmentService', () => {
  let riskService: AdvancedRiskAssessmentService;
  let emergencyService: EmergencyDetectionService;
  let compoundService: CompoundRiskAnalysisService;

  beforeEach(() => {
    riskService = new AdvancedRiskAssessmentService();
    emergencyService = new EmergencyDetectionService({
      autoEscalation: true,
      emergencyContacts: [],
      escalationTimeouts: { immediate: 15, critical: 60, high: 240 },
      notificationChannels: []
    });
    compoundService = new CompoundRiskAnalysisService();
  });

  describe('Diabetes Risk Assessment', () => {
    it('should detect complete diabetic triad and assign critical risk', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você tem sede excessiva?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você sente fome excessiva?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você urina com frequência?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você perdeu peso recentemente?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 15 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.diabetes.classicTriad.triadComplete).toBe(true);
      expect(assessment.diabetes.classicTriad.triadScore).toBe(60);
      expect(assessment.diabetes.riskLevel).toBe('critical');
      expect(assessment.diabetes.timeToEscalation).toBeLessThanOrEqual(12);
    });

    it('should calculate appropriate risk for partial triad', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você tem sede excessiva?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você sente fome excessiva?', answer: 'não', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você urina com frequência?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Tem histórico familiar de diabetes?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 12 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.diabetes.classicTriad.triadComplete).toBe(false);
      expect(assessment.diabetes.classicTriad.triadScore).toBe(40);
      expect(assessment.diabetes.riskLevel).toBe('moderate');
    });

    it('should identify DKA risk factors', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você tem sede excessiva?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você sente fome excessiva?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você urina com frequência?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 20 } },
        { question: 'Você perdeu peso rapidamente?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 15 } },
        { question: 'Você sente náusea ou vômitos?', answer: 'sim', medicalRelevance: { conditions: ['diabetes'], weight: 10 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.diabetes.emergencyIndicators).toContain('DIABETIC_KETOACIDOSIS_RISK');
      expect(assessment.diabetes.dkaRisk).toBeGreaterThan(50);
    });
  });

  describe('Cardiovascular Risk Assessment', () => {
    it('should detect acute coronary syndrome risk', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você sente dor no peito?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 15 } },
        { question: 'Você tem falta de ar?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 10 } },
        { question: 'A dor no peito acontece em repouso?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 20 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.cardiovascular.emergencyIndicators).toContain('ACUTE_CORONARY_SYNDROME_SUSPECTED');
      expect(assessment.cardiovascular.escalationRequired).toBe(true);
      expect(assessment.cardiovascular.timeToEscalation).toBeLessThan(1);
    });

    it('should calculate Framingham risk score appropriately', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Qual sua idade?', answer: '55', medicalRelevance: { conditions: ['cardiovascular'], weight: 5 } },
        { question: 'Qual seu sexo?', answer: 'masculino', medicalRelevance: { conditions: ['cardiovascular'], weight: 5 } },
        { question: 'Você fuma?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 10 } },
        { question: 'Tem pressão alta?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 10 } },
        { question: 'Tem diabetes?', answer: 'sim', medicalRelevance: { conditions: ['cardiovascular'], weight: 15 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.cardiovascular.framinghamScore).toBeGreaterThan(0);
      expect(assessment.cardiovascular.riskLevel).toBeOneOf(['intermediate', 'high', 'very_high']);
    });
  });

  describe('Mental Health Risk Assessment', () => {
    it('should detect high suicide risk and trigger immediate intervention', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você tem pensamentos de se machucar?', answer: 'sim', medicalRelevance: { conditions: ['mental_health'], weight: 25 } },
        { question: 'Você tem planos específicos?', answer: 'sim', medicalRelevance: { conditions: ['mental_health'], weight: 30 } },
        { question: 'Você se sente sem esperança?', answer: 'sim', medicalRelevance: { conditions: ['mental_health'], weight: 15 } },
        { question: 'Você perdeu interesse nas atividades?', answer: 'sim', medicalRelevance: { conditions: ['mental_health'], weight: 10 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.mentalHealth.suicideRisk.riskLevel).toBeOneOf(['high', 'imminent']);
      expect(assessment.mentalHealth.suicideRisk.immediateIntervention).toBe(true);
      expect(assessment.mentalHealth.timeToEscalation).toBeLessThanOrEqual(2);
    });

    it('should calculate PHQ-9 score for depression assessment', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Pouco interesse ou prazer em fazer as coisas?', answer: '2', type: 'scale', medicalRelevance: { conditions: ['mental_health'] } },
        { question: 'Se sentindo triste, deprimido ou sem esperança?', answer: '3', type: 'scale', medicalRelevance: { conditions: ['mental_health'] } },
        { question: 'Problemas para dormir ou dormir demais?', answer: '2', type: 'scale', medicalRelevance: { conditions: ['mental_health'] } },
        { question: 'Se sentindo cansado ou com pouca energia?', answer: '2', type: 'scale', medicalRelevance: { conditions: ['mental_health'] } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.mentalHealth.depressionIndicators.phq9Score).toBeGreaterThan(0);
      expect(assessment.mentalHealth.riskLevel).toBeOneOf(['moderate', 'high']);
    });
  });

  describe('Respiratory Risk Assessment', () => {
    it('should detect severe asthma exacerbation', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você tem chiado no peito?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 10 } },
        { question: 'Você tem falta de ar severa?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 15 } },
        { question: 'Você tem dificuldade para falar?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 20 } },
        { question: 'Seus sintomas pioraram rapidamente?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 15 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.respiratory.emergencyIndicators).toContain('SEVERE_ASTHMA_EXACERBATION');
      expect(assessment.respiratory.riskLevel).toBe('critical');
      expect(assessment.respiratory.timeToEscalation).toBeLessThan(1);
    });

    it('should calculate STOP-BANG score for sleep apnea', async () => {
      const questionnaire = createMockQuestionnaire([
        { question: 'Você ronca alto?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Você se sente cansado durante o dia?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Alguém observou pausas respiratórias?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 10 } },
        { question: 'Você tem pressão alta?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Seu IMC é maior que 35?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Idade maior que 50?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Circunferência do pescoço > 40cm?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } },
        { question: 'Sexo masculino?', answer: 'sim', medicalRelevance: { conditions: ['respiratory'], weight: 5 } }
      ]);

      const assessment = await riskService.assessRisk(questionnaire);

      expect(assessment.respiratory.sleepApneaIndicators.stopBangScore).toBeGreaterThanOrEqual(6);
      expect(assessment.respiratory.riskLevel).toBeOneOf(['high', 'critical']);
    });
  });

  describe('Emergency Detection', () => {
    it('should trigger immediate emergency for life-threatening symptoms', async () => {
      const assessment = createMockAssessment({
        cardiovascular: { emergencyIndicators: ['ACUTE_CORONARY_SYNDROME_SUSPECTED'], riskLevel: 'very_high' },
        diabetes: { emergencyIndicators: ['DIABETIC_KETOACIDOSIS_RISK'], riskLevel: 'critical' }
      });

      const emergencyAlerts = await emergencyService.detectEmergencies(assessment);

      expect(emergencyAlerts.length).toBeGreaterThan(0);
      expect(emergencyAlerts.some(alert => alert.severity === 'immediate')).toBe(true);
      expect(emergencyAlerts.some(alert => alert.timeToAction <= 30)).toBe(true);
    });

    it('should prioritize alerts by severity and time to action', async () => {
      const assessment = createMockAssessment({
        cardiovascular: { emergencyIndicators: ['ACUTE_CORONARY_SYNDROME_SUSPECTED'], riskLevel: 'very_high' },
        mentalHealth: { suicideRisk: { riskLevel: 'imminent', immediateIntervention: true } }
      });

      const emergencyAlerts = await emergencyService.detectEmergencies(assessment);

      // Alerts should be sorted by severity (immediate > critical > high)
      for (let i = 0; i < emergencyAlerts.length - 1; i++) {
        const currentSeverity = getSeverityWeight(emergencyAlerts[i].severity);
        const nextSeverity = getSeverityWeight(emergencyAlerts[i + 1].severity);
        expect(currentSeverity).toBeGreaterThanOrEqual(nextSeverity);
      }
    });
  });

  describe('Compound Risk Analysis', () => {
    it('should calculate exponential risk for multiple conditions', async () => {
      const individualRisks = {
        diabetes: 60,
        cardiovascular: 55,
        mental_health: 40
      };

      const correlations = {
        diabetes: { cardiovascular: 0.85, mental_health: 0.65 },
        cardiovascular: { diabetes: 0.85, mental_health: 0.55 },
        mental_health: { diabetes: 0.65, cardiovascular: 0.55 }
      };

      const exponentialScore = compoundService.calculateExponentialRiskScore(individualRisks, correlations);

      expect(exponentialScore).toBeGreaterThan(Math.max(...Object.values(individualRisks)));
      expect(exponentialScore).toBeLessThanOrEqual(100);
    });

    it('should identify high-risk medical synergies', async () => {
      const conditions = ['diabetes', 'cardiovascular', 'mental_health'];
      const synergies = compoundService.analyzeMedicalSynergies(conditions);

      expect(synergies.length).toBeGreaterThan(0);
      expect(synergies.some(s => s.condition1 === 'diabetes' && s.condition2 === 'cardiovascular')).toBe(true);
      expect(synergies.some(s => s.synergyType === 'exponential')).toBe(true);
    });

    it('should apply Brazilian socioeconomic risk factors', async () => {
      const assessment = createMockAssessment({});
      const socioeconomicMultiplier = compoundService.integrateScioeconomicRisks(assessment);

      expect(socioeconomicMultiplier).toBeGreaterThan(0.8);
      expect(socioeconomicMultiplier).toBeLessThan(1.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty questionnaire gracefully', async () => {
      const emptyQuestionnaire = createMockQuestionnaire([]);

      const assessment = await riskService.assessRisk(emptyQuestionnaire);

      expect(assessment).toBeDefined();
      expect(assessment.composite.riskLevel).toBe('low');
      expect(assessment.emergencyAlerts.length).toBe(0);
    });

    it('should handle invalid questionnaire data', async () => {
      const invalidQuestionnaire = createMockQuestionnaire([
        { question: '', answer: null, medicalRelevance: null }
      ]);

      const assessment = await riskService.assessRisk(invalidQuestionnaire);

      expect(assessment).toBeDefined();
      expect(assessment.composite.riskLevel).toBe('low');
    });

    it('should provide fail-safe emergency detection', async () => {
      // Mock a service failure scenario
      jest.spyOn(emergencyService, 'detectEmergencies').mockRejectedValueOnce(new Error('Service failure'));

      const assessment = createMockAssessment({});
      const emergencyAlerts = await emergencyService.detectEmergencies(assessment);

      expect(emergencyAlerts.length).toBe(1);
      expect(emergencyAlerts[0].condition).toContain('Erro no Sistema');
      expect(emergencyAlerts[0].severity).toBe('high');
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete risk assessment within acceptable time limits', async () => {
      const largeQuestionnaire = createMockQuestionnaire(
        Array.from({ length: 100 }, (_, i) => ({
          question: `Question ${i}`,
          answer: 'test answer',
          medicalRelevance: { conditions: ['general'], weight: 1 }
        }))
      );

      const startTime = Date.now();
      const assessment = await riskService.assessRisk(largeQuestionnaire);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(assessment).toBeDefined();
    });

    it('should handle concurrent assessments', async () => {
      const questionnaires = Array.from({ length: 10 }, (_, i) => 
        createMockQuestionnaire([
          { question: `Question for user ${i}`, answer: 'answer', medicalRelevance: { conditions: ['general'], weight: 1 } }
        ])
      );

      const startTime = Date.now();
      const assessments = await Promise.all(
        questionnaires.map(q => riskService.assessRisk(q))
      );
      const endTime = Date.now();

      expect(assessments.length).toBe(10);
      expect(assessments.every(a => a !== undefined)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  // Helper functions
  function createMockQuestionnaire(responses: any[]): ProcessedQuestionnaire {
    return {
      userId: 'test-user',
      questionnaireId: 'test-questionnaire',
      responses: responses.map((r, index) => ({
        questionId: `q${index}`,
        question: r.question || 'Test question',
        answer: r.answer || 'Test answer',
        type: r.type || 'text',
        medicalRelevance: r.medicalRelevance || { conditions: [], weight: 1, category: 'general' },
        timestamp: new Date()
      })),
      extractedSymptoms: [],
      riskFactors: [],
      emergencyFlags: [],
      completedAt: new Date()
    };
  }

  function createMockAssessment(overrides: any = {}): AdvancedRiskAssessment {
    const defaultAssessment = {
      userId: 'test-user',
      assessmentId: 'test-assessment',
      timestamp: new Date(),
      cardiovascular: {
        overallScore: 25,
        riskLevel: 'low',
        factors: {},
        framinghamScore: 10,
        emergencyIndicators: [],
        recommendations: [],
        escalationRequired: false,
        timeToEscalation: 72
      },
      diabetes: {
        overallScore: 20,
        riskLevel: 'low',
        classicTriad: { polydipsia: false, polyphagia: false, polyuria: false, triadComplete: false, triadScore: 0 },
        additionalFactors: {},
        ketosisRisk: 0,
        dkaRisk: 0,
        emergencyIndicators: [],
        timeToEscalation: 72
      },
      mentalHealth: {
        overallScore: 15,
        riskLevel: 'low',
        depressionIndicators: { phq9Score: 5, persistentSadness: false, anhedonia: false },
        anxietyIndicators: { gad7Score: 3 },
        suicideRisk: { riskLevel: 'none', protectiveFactors: [], riskFactors: [], immediateIntervention: false },
        escalationRequired: false,
        timeToEscalation: 72
      },
      respiratory: {
        overallScore: 10,
        riskLevel: 'low',
        asthmaIndicators: {},
        copdIndicators: {},
        sleepApneaIndicators: { stopBangScore: 2 },
        emergencyIndicators: [],
        timeToEscalation: 72
      },
      composite: {
        overallScore: 20,
        riskLevel: 'low',
        multipleConditionsPenalty: 1,
        synergyFactor: 1,
        ageAdjustment: 1,
        genderAdjustment: 1,
        socioeconomicFactors: 1,
        accessToCareFactor: 1,
        prioritizedConditions: [],
        emergencyEscalation: false,
        urgentEscalation: false,
        routineFollowup: false
      },
      emergencyAlerts: [],
      recommendations: [],
      followupSchedule: { immediate: [], within24h: [], within1week: [], within1month: [], routine: [] },
      escalationProtocol: {
        immediate: false,
        urgent: false,
        timeToEscalation: 72,
        escalationLevel: 'ai_only',
        notificationChannels: [],
        automaticScheduling: false
      }
    };

    return { ...defaultAssessment, ...overrides };
  }

  function getSeverityWeight(severity: string): number {
    const weights = { immediate: 3, critical: 2, high: 1 };
    return weights[severity] || 0;
  }
});