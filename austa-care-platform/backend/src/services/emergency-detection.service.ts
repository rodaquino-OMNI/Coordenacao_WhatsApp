/**
 * Emergency Detection and Escalation Service
 * Real-time critical condition detection with automated escalation
 * Brazilian healthcare emergency protocols
 */

import {
  EmergencyAlert,
  EscalationProtocol,
  AdvancedRiskAssessment,
  CardiovascularRisk,
  DiabetesRisk,
  MentalHealthRisk,
  RespiratoryRisk
} from '../types/risk.types';
import { QuestionnaireResponse } from '../types/questionnaire.types';
import { logger } from '../utils/logger';

export interface EmergencyConfig {
  autoEscalation: boolean;
  emergencyContacts: EmergencyContact[];
  escalationTimeouts: Record<string, number>;
  notificationChannels: NotificationChannel[];
}

export interface EmergencyContact {
  id: string;
  type: 'samu' | 'hospital' | 'medical_team' | 'family';
  name: string;
  phone: string;
  priority: number;
  available24h: boolean;
  specialties?: string[];
}

export interface NotificationChannel {
  type: 'sms' | 'whatsapp' | 'call' | 'email' | 'push';
  enabled: boolean;
  priority: number;
  template: string;
}

export interface EmergencyDetectionRule {
  id: string;
  name: string;
  conditions: EmergencyCondition[];
  severity: 'high' | 'critical' | 'immediate';
  timeToAction: number; // minutes
  autoEscalate: boolean;
  notifications: string[];
  actions: string[];
}

export interface EmergencyCondition {
  type: 'symptom_combination' | 'single_critical' | 'score_threshold' | 'temporal_pattern';
  criteria: Record<string, any>;
  weight: number;
}

export class EmergencyDetectionService {
  private emergencyRules: Map<string, EmergencyDetectionRule> = new Map();
  private config: EmergencyConfig;
  private activeAlerts: Map<string, EmergencyAlert> = new Map();

  constructor(config: EmergencyConfig) {
    this.config = config;
    this.initializeEmergencyRules();
  }

  /**
   * Main emergency detection entry point
   */
  async detectEmergencies(assessment: AdvancedRiskAssessment): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    try {
      // Cardiovascular emergencies
      const cardiacAlerts = await this.detectCardiacEmergencies(assessment.cardiovascular);
      alerts.push(...cardiacAlerts);

      // Diabetic emergencies
      const diabeticAlerts = await this.detectDiabeticEmergencies(assessment.diabetes);
      alerts.push(...diabeticAlerts);

      // Mental health emergencies
      const mentalHealthAlerts = await this.detectMentalHealthEmergencies(assessment.mentalHealth);
      alerts.push(...mentalHealthAlerts);

      // Respiratory emergencies
      const respiratoryAlerts = await this.detectRespiratoryEmergencies(assessment.respiratory);
      alerts.push(...respiratoryAlerts);

      // Composite emergency patterns
      const compositeAlerts = await this.detectCompositeEmergencies(assessment);
      alerts.push(...compositeAlerts);

      // Process and prioritize alerts
      const processedAlerts = this.processAndPrioritizeAlerts(alerts);

      // Trigger immediate actions for critical alerts
      await this.triggerEmergencyActions(processedAlerts);

      return processedAlerts;

    } catch (error) {
      logger.error('Emergency detection failed:', error);
      // Fail-safe: create high-priority alert for manual review
      const failsafeAlert = this.createFailsafeAlert(assessment.userId);
      return [failsafeAlert];
    }
  }

  /**
   * Detect cardiovascular emergencies
   */
  private async detectCardiacEmergencies(cardiovascular: CardiovascularRisk): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // Acute Coronary Syndrome (ACS) Detection
    if (cardiovascular.factors.chestPain && cardiovascular.factors.shortnessOfBreath) {
      alerts.push({
        id: `cardiac_acs_${Date.now()}`,
        severity: 'immediate',
        condition: 'Síndrome Coronariana Aguda Suspeita',
        symptoms: ['dor no peito', 'falta de ar'],
        timeToAction: 15, // 15 minutes
        actions: [
          'Chamar SAMU imediatamente (192)',
          'Manter paciente em repouso',
          'Não dar medicamentos por conta própria',
          'Estar preparado para RCP se necessário'
        ],
        contactNumbers: ['192', '193'],
        automated: true
      });
    }

    // Hypertensive Crisis
    if (cardiovascular.factors.hypertension && 
        cardiovascular.emergencyIndicators.includes('HYPERTENSIVE_CRISIS')) {
      alerts.push({
        id: `cardiac_htn_crisis_${Date.now()}`,
        severity: 'critical',
        condition: 'Crise Hipertensiva',
        symptoms: ['pressão alta', 'dor de cabeça severa', 'alterações visuais'],
        timeToAction: 30,
        actions: [
          'Procurar atendimento médico imediato',
          'Não tomar medicação extra sem orientação',
          'Monitorar sinais vitais se possível'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    // Cardiac Syncope
    if (cardiovascular.factors.syncope && cardiovascular.factors.chestPain) {
      alerts.push({
        id: `cardiac_syncope_${Date.now()}`,
        severity: 'critical',
        condition: 'Síncope Cardíaca',
        symptoms: ['desmaio', 'dor no peito'],
        timeToAction: 20,
        actions: [
          'Buscar avaliação médica urgente',
          'Evitar atividades que possam causar lesões',
          'Monitorar consciência e pulso'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    return alerts;
  }

  /**
   * Detect diabetic emergencies
   */
  private async detectDiabeticEmergencies(diabetes: DiabetesRisk): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // Diabetic Ketoacidosis (DKA)
    if (diabetes.dkaRisk > 70 || diabetes.emergencyIndicators.includes('DIABETIC_KETOACIDOSIS_RISK')) {
      alerts.push({
        id: `diabetes_dka_${Date.now()}`,
        severity: 'immediate',
        condition: 'Cetoacidose Diabética (CAD)',
        symptoms: ['sede extrema', 'vômitos', 'dificuldade respiratória', 'hálito cetônico'],
        timeToAction: 30,
        actions: [
          'Procurar pronto-socorro IMEDIATAMENTE',
          'Não tentar tratar em casa',
          'Levar histórico de medicamentos',
          'Informar sobre diabetes na chegada'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    // Severe Hyperglycemia (Complete Triad + Severe Symptoms)
    if (diabetes.classicTriad.triadComplete && diabetes.riskLevel === 'critical') {
      alerts.push({
        id: `diabetes_severe_hyper_${Date.now()}`,
        severity: 'critical',
        condition: 'Hiperglicemia Severa',
        symptoms: ['sede excessiva', 'fome excessiva', 'urinar muito', 'perda de peso'],
        timeToAction: 120, // 2 hours
        actions: [
          'Agendar consulta médica urgente (hoje)',
          'Evitar alimentos açucarados',
          'Manter hidratação com água',
          'Monitorar sintomas'
        ],
        contactNumbers: ['Central de Agendamento'],
        automated: true
      });
    }

    // Hypoglycemia Risk
    if (diabetes.emergencyIndicators.includes('HYPOGLYCEMIA_RISK')) {
      alerts.push({
        id: `diabetes_hypo_${Date.now()}`,
        severity: 'high',
        condition: 'Risco de Hipoglicemia',
        symptoms: ['tontura', 'confusão', 'sudorese', 'fome súbita'],
        timeToAction: 10,
        actions: [
          'Consumir açúcar ou carboidrato de ação rápida',
          'Sentar ou deitar em local seguro',
          'Ter alguém por perto se possível',
          'Buscar ajuda se sintomas piorarem'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    return alerts;
  }

  /**
   * Detect mental health emergencies
   */
  private async detectMentalHealthEmergencies(mentalHealth: MentalHealthRisk): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // Imminent Suicide Risk
    if (mentalHealth.suicideRisk.riskLevel === 'imminent') {
      alerts.push({
        id: `mental_suicide_imminent_${Date.now()}`,
        severity: 'immediate',
        condition: 'Risco Iminente de Suicídio',
        symptoms: ['ideação suicida ativa', 'plano específico', 'acesso a meios'],
        timeToAction: 0, // Immediate
        actions: [
          'LIGAR IMEDIATAMENTE: CVV 188',
          'Buscar atendimento psiquiátrico de emergência',
          'Não deixar pessoa sozinha',
          'Remover objetos que possam causar dano',
          'Contatar familiares/rede de apoio'
        ],
        contactNumbers: ['188', '192'],
        automated: true
      });
    }

    // High Suicide Risk
    else if (mentalHealth.suicideRisk.riskLevel === 'high') {
      alerts.push({
        id: `mental_suicide_high_${Date.now()}`,
        severity: 'critical',
        condition: 'Alto Risco de Suicídio',
        symptoms: ['pensamentos suicidas frequentes', 'desesperança', 'isolamento'],
        timeToAction: 60,
        actions: [
          'Contatar CVV: 188',
          'Agendar avaliação psiquiátrica urgente',
          'Fortalecer rede de apoio',
          'Considerar internação voluntária'
        ],
        contactNumbers: ['188'],
        automated: true
      });
    }

    // Severe Depression with Psychotic Features
    if (mentalHealth.depressionIndicators.phq9Score > 20 && 
        mentalHealth.riskLevel === 'severe') {
      alerts.push({
        id: `mental_severe_depression_${Date.now()}`,
        severity: 'critical',
        condition: 'Depressão Severa',
        symptoms: ['humor muito baixo', 'perda completa de interesse', 'sintomas psicóticos'],
        timeToAction: 240, // 4 hours
        actions: [
          'Buscar atendimento psiquiátrico hoje',
          'Não tomar decisões importantes',
          'Manter supervisão próxima',
          'Considerar hospitalização'
        ],
        contactNumbers: ['CAPS mais próximo'],
        automated: true
      });
    }

    // Severe Anxiety/Panic
    if (mentalHealth.anxietyIndicators.gad7Score > 15) {
      alerts.push({
        id: `mental_severe_anxiety_${Date.now()}`,
        severity: 'high',
        condition: 'Ansiedade Severa/Pânico',
        symptoms: ['ansiedade extrema', 'ataques de pânico', 'incapacitação'],
        timeToAction: 120,
        actions: [
          'Técnicas de respiração profunda',
          'Buscar ambiente calmo e seguro',
          'Contatar psicólogo/psiquiatra',
          'Considerar medicação de resgate se prescrita'
        ],
        contactNumbers: ['CVV 188'],
        automated: false
      });
    }

    return alerts;
  }

  /**
   * Detect respiratory emergencies
   */
  private async detectRespiratoryEmergencies(respiratory: RespiratoryRisk): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // Severe Asthma Exacerbation
    if (respiratory.emergencyIndicators.includes('SEVERE_ASTHMA_EXACERBATION')) {
      alerts.push({
        id: `resp_severe_asthma_${Date.now()}`,
        severity: 'immediate',
        condition: 'Crise Asmática Grave',
        symptoms: ['falta de ar severa', 'chiado', 'dificuldade para falar'],
        timeToAction: 15,
        actions: [
          'Usar broncodilatador de resgate AGORA',
          'Chamar SAMU se não melhorar (192)',
          'Sentar-se inclinado para frente',
          'Manter calma e respiração controlada'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    // COPD Exacerbation
    if (respiratory.emergencyIndicators.includes('COPD_EXACERBATION')) {
      alerts.push({
        id: `resp_copd_exacerb_${Date.now()}`,
        severity: 'critical',
        condition: 'Exacerbação de DPOC',
        symptoms: ['falta de ar pior que usual', 'catarro com sangue', 'febre'],
        timeToAction: 30,
        actions: [
          'Buscar atendimento médico imediato',
          'Usar medicações prescritas',
          'Evitar esforço físico',
          'Manter oxigenoterapia se prescrita'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    // Sleep Apnea with Cardiovascular Risk
    if (respiratory.sleepApneaIndicators.stopBangScore > 5 && 
        respiratory.sleepApneaIndicators.hypertension) {
      alerts.push({
        id: `resp_sleep_apnea_${Date.now()}`,
        severity: 'high',
        condition: 'Apneia do Sono com Risco Cardiovascular',
        symptoms: ['ronco alto', 'pausas respiratórias', 'sonolência diurna'],
        timeToAction: 1440, // 24 hours
        actions: [
          'Agendar polissonografia urgente',
          'Avaliar pressão arterial',
          'Evitar álcool e sedativos',
          'Dormir de lado'
        ],
        contactNumbers: ['Centro do Sono'],
        automated: false
      });
    }

    return alerts;
  }

  /**
   * Detect composite emergency patterns
   */
  private async detectCompositeEmergencies(assessment: AdvancedRiskAssessment): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // Multiple critical conditions
    const criticalConditions = [
      assessment.cardiovascular.riskLevel === 'very_high',
      assessment.diabetes.riskLevel === 'critical',
      assessment.mentalHealth.riskLevel === 'severe',
      assessment.respiratory.riskLevel === 'critical'
    ].filter(Boolean).length;

    if (criticalConditions >= 2) {
      alerts.push({
        id: `composite_multiple_critical_${Date.now()}`,
        severity: 'critical',
        condition: 'Múltiplas Condições Críticas',
        symptoms: ['combinação de sintomas graves'],
        timeToAction: 60,
        actions: [
          'Buscar atendimento médico especializado HOJE',
          'Considerar internação para estabilização',
          'Coordenar cuidados multiprofissionais',
          'Revisão urgente de medicações'
        ],
        contactNumbers: ['Hospital de referência'],
        automated: true
      });
    }

    // Diabetic + Cardiac Emergency
    if ((assessment.diabetes.dkaRisk > 50 || assessment.diabetes.riskLevel === 'critical') &&
        (assessment.cardiovascular.riskLevel === 'high' || assessment.cardiovascular.riskLevel === 'very_high')) {
      alerts.push({
        id: `composite_diabetic_cardiac_${Date.now()}`,
        severity: 'immediate',
        condition: 'Emergência Diabética + Cardíaca',
        symptoms: ['sintomas diabéticos + cardiovasculares'],
        timeToAction: 20,
        actions: [
          'SAMU IMEDIATO (192)',
          'Informar ambas condições na chegada',
          'Levar lista de medicamentos',
          'Preparar para UTI se necessário'
        ],
        contactNumbers: ['192'],
        automated: true
      });
    }

    return alerts;
  }

  /**
   * Process and prioritize emergency alerts
   */
  private processAndPrioritizeAlerts(alerts: EmergencyAlert[]): EmergencyAlert[] {
    // Remove duplicates
    const uniqueAlerts = alerts.filter((alert, index, self) => 
      index === self.findIndex(a => a.condition === alert.condition));

    // Sort by severity and time to action
    return uniqueAlerts.sort((a, b) => {
      const severityOrder = { immediate: 3, critical: 2, high: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      return a.timeToAction - b.timeToAction;
    });
  }

  /**
   * Trigger immediate emergency actions
   */
  private async triggerEmergencyActions(alerts: EmergencyAlert[]): Promise<void> {
    for (const alert of alerts) {
      if (alert.automated && alert.timeToAction <= 30) { // 30 minutes or less
        try {
          // Log emergency
          logger.error(`EMERGENCY ALERT: ${alert.condition} - Time to action: ${alert.timeToAction} minutes`);
          
          // Send notifications
          await this.sendEmergencyNotifications(alert);
          
          // Auto-schedule if possible
          if (alert.severity === 'immediate' || alert.severity === 'critical') {
            await this.attemptAutoScheduling(alert);
          }
          
          // Store alert for tracking
          this.activeAlerts.set(alert.id, alert);
          
        } catch (error) {
          logger.error(`Failed to trigger emergency actions for alert ${alert.id}:`, error);
        }
      }
    }
  }

  /**
   * Send emergency notifications
   */
  private async sendEmergencyNotifications(alert: EmergencyAlert): Promise<void> {
    const channels = this.config.notificationChannels.filter(c => c.enabled);
    
    for (const channel of channels) {
      try {
        const message = this.formatEmergencyMessage(alert, channel.template);
        await this.sendNotification(channel.type, message, alert.contactNumbers);
        
        logger.info(`Emergency notification sent via ${channel.type} for alert: ${alert.id}`);
      } catch (error) {
        logger.error(`Failed to send emergency notification via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Attempt automatic scheduling for emergencies
   */
  private async attemptAutoScheduling(alert: EmergencyAlert): Promise<void> {
    if (alert.severity === 'immediate') {
      // For immediate emergencies, we don't schedule - we escalate to emergency services
      logger.info(`Immediate emergency detected: ${alert.condition}. Escalating to emergency services.`);
      return;
    }
    
    if (alert.severity === 'critical') {
      // Try to schedule urgent appointment within timeToAction window
      logger.info(`Attempting urgent appointment scheduling for: ${alert.condition}`);
      // Implementation would connect to scheduling system
    }
  }

  /**
   * Create fail-safe alert for system errors
   */
  private createFailsafeAlert(userId: string): EmergencyAlert {
    return {
      id: `failsafe_${Date.now()}`,
      severity: 'high',
      condition: 'Erro no Sistema de Detecção',
      symptoms: ['avaliação manual necessária'],
      timeToAction: 60,
      actions: [
        'Revisar manualmente questionário do paciente',
        'Contatar equipe médica para avaliação',
        'Priorizar agendamento de consulta'
      ],
      contactNumbers: ['Equipe Médica'],
      automated: false
    };
  }

  /**
   * Initialize emergency detection rules
   */
  private initializeEmergencyRules(): void {
    // Implementation of rule-based emergency detection
    logger.info('Emergency detection rules initialized');
  }

  /**
   * Format emergency message for notification
   */
  private formatEmergencyMessage(alert: EmergencyAlert, template: string): string {
    return template
      .replace('{condition}', alert.condition)
      .replace('{severity}', alert.severity)
      .replace('{timeToAction}', alert.timeToAction.toString())
      .replace('{actions}', alert.actions.join(', '));
  }

  /**
   * Send notification via specified channel
   */
  private async sendNotification(type: string, message: string, contacts: string[]): Promise<void> {
    // Implementation would integrate with actual notification systems
    logger.info(`Sending ${type} notification: ${message}`);
  }
}