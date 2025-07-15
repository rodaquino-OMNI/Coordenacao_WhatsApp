import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { NotificationTemplate } from '../types/authorization';

/**
 * Notification Service for Authorization Workflow
 * Handles multi-channel notifications (Email, SMS, WhatsApp, System)
 */
export class NotificationService extends EventEmitter {
  private templates: Map<string, NotificationTemplate>;
  private notificationQueue: Map<string, any[]>;
  private deliveryProviders: Map<string, any>;
  private retryAttempts: Map<string, number>;

  constructor() {
    super();
    this.templates = new Map();
    this.notificationQueue = new Map();
    this.deliveryProviders = new Map();
    this.retryAttempts = new Map();
    this.initializeTemplates();
    this.initializeProviders();
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      // Authorization Approved
      {
        id: 'auth-approved',
        name: 'Authorization Approved',
        type: 'email',
        trigger: 'approve',
        recipients: ['patient', 'provider'],
        subject: 'Autorização Aprovada - {{procedureName}}',
        template: `
          Prezado(a) {{recipientName}},
          
          Sua solicitação de autorização foi APROVADA.
          
          Detalhes:
          - Número da Autorização: {{authorizationNumber}}
          - Procedimento: {{procedureName}}
          - Data Solicitada: {{requestedDate}}
          - Válida até: {{expirationDate}}
          
          Próximos passos:
          - Agende seu procedimento com o prestador
          - Apresente este número de autorização
          - Mantenha seus documentos atualizados
          
          Atenciosamente,
          Equipe AUSTA Care
        `,
        isActive: true
      },

      // Authorization Rejected
      {
        id: 'auth-rejected',
        name: 'Authorization Rejected',
        type: 'email',
        trigger: 'reject',
        recipients: ['patient', 'provider'],
        subject: 'Autorização Negada - {{procedureName}}',
        template: `
          Prezado(a) {{recipientName}},
          
          Sua solicitação de autorização foi NEGADA.
          
          Motivo: {{rejectionReason}}
          
          Detalhes:
          - Procedimento: {{procedureName}}
          - Data da Solicitação: {{requestedDate}}
          - Data da Decisão: {{decisionDate}}
          
          Opções disponíveis:
          - Entrar com recurso em até 30 dias
          - Solicitar nova avaliação com documentação adicional
          - Contatar nossa central de atendimento
          
          Para recurso, acesse: {{appealUrl}}
          
          Atenciosamente,
          Equipe AUSTA Care
        `,
        isActive: true
      },

      // Additional Info Request
      {
        id: 'additional-info-request',
        name: 'Additional Information Request',
        type: 'whatsapp',
        trigger: 'request_additional_info',
        recipients: ['patient', 'provider'],
        subject: 'Documentação Adicional Necessária',
        template: `
          🏥 *AUSTA Care - Documentação Pendente*
          
          Olá {{recipientName}},
          
          Para prosseguir com sua autorização, precisamos de documentação adicional:
          
          📋 *Documentos Necessários:*
          {{#each missingDocuments}}
          • {{this}}
          {{/each}}
          
          📅 *Prazo:* {{deadline}}
          🔗 *Upload:* {{uploadUrl}}
          
          Envie os documentos o quanto antes para evitar atrasos.
          
          Dúvidas? Responda esta mensagem!
        `,
        isActive: true
      },

      // Reviewer Assignment
      {
        id: 'reviewer-assignment',
        name: 'Reviewer Assignment',
        type: 'system',
        trigger: 'assign_reviewer',
        recipients: ['reviewer'],
        subject: 'Nova Autorização para Revisão',
        template: `
          Nova autorização atribuída para revisão.
          
          Tipo: {{reviewType}}
          Urgência: {{urgency}}
          Paciente: {{patientName}}
          Procedimento: {{procedureName}}
          Prazo: {{deadline}}
          
          Acesse o sistema para revisar.
        `,
        isActive: true
      },

      // Escalation Notice
      {
        id: 'escalation-notice',
        name: 'Escalation Notice',
        type: 'email',
        trigger: 'escalate',
        recipients: ['senior_reviewer', 'manager'],
        subject: 'Autorização Escalada - Ação Necessária',
        template: `
          Uma autorização foi escalada e requer atenção imediata.
          
          Motivo da Escalação: {{escalationReason}}
          Revisor Original: {{originalReviewer}}
          Tempo em Revisão: {{reviewTime}}
          Urgência: {{urgency}}
          
          Acesse o sistema para revisar imediatamente.
        `,
        isActive: true
      },

      // Expiration Warning
      {
        id: 'expiration-warning',
        name: 'Authorization Expiration Warning',
        type: 'sms',
        trigger: 'expiration_warning',
        recipients: ['patient'],
        subject: '',
        template: `
          AUSTA Care: Sua autorização {{authorizationNumber}} expira em {{daysUntilExpiration}} dias. Agende seu procedimento urgentemente. Dúvidas: {{phoneNumber}}
        `,
        isActive: true
      },

      // Appeal Submitted
      {
        id: 'appeal-submitted',
        name: 'Appeal Submitted',
        type: 'email',
        trigger: 'appeal',
        recipients: ['patient', 'appeals_team'],
        subject: 'Recurso Recebido - {{authorizationNumber}}',
        template: `
          Seu recurso foi recebido e está sendo analisado.
          
          Número do Recurso: {{appealNumber}}
          Data de Submissão: {{submissionDate}}
          Prazo de Análise: {{analysisDeadline}}
          
          Acompanhe o status pelo nosso site ou app.
        `,
        isActive: true
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info(`Loaded ${templates.length} notification templates`);
  }

  /**
   * Initialize delivery providers
   */
  private initializeProviders(): void {
    // Email provider (using configured SMTP or service)
    this.deliveryProviders.set('email', {
      send: this.sendEmail.bind(this),
      rateLimit: 100, // per minute
      retryAttempts: 3
    });

    // SMS provider 
    this.deliveryProviders.set('sms', {
      send: this.sendSMS.bind(this),
      rateLimit: 50, // per minute
      retryAttempts: 3
    });

    // WhatsApp provider (using Z-API)
    this.deliveryProviders.set('whatsapp', {
      send: this.sendWhatsApp.bind(this),
      rateLimit: 30, // per minute
      retryAttempts: 2
    });

    // System notifications (in-app)
    this.deliveryProviders.set('system', {
      send: this.sendSystemNotification.bind(this),
      rateLimit: 1000, // per minute
      retryAttempts: 1
    });

    logger.info('Notification delivery providers initialized');
  }

  /**
   * Send notification based on event
   */
  async sendNotification(event: {
    authorizationId: string;
    type: string;
    recipients?: string[];
    urgency?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    logger.info('Sending notification', {
      authorizationId: event.authorizationId,
      type: event.type,
      recipients: event.recipients
    });

    // Find appropriate template
    const template = this.findTemplate(event.type);
    if (!template) {
      logger.warn(`No template found for notification type: ${event.type}`);
      return;
    }

    // Get authorization details
    const authData = await this.getAuthorizationData(event.authorizationId);
    if (!authData) {
      logger.error(`No authorization data found for ID: ${event.authorizationId}`);
      return;
    }

    // Determine recipients
    const recipients = event.recipients || template.recipients;
    
    // Send to each recipient
    const sendPromises = recipients.map(async (recipientType) => {
      const recipientInfo = await this.getRecipientInfo(recipientType, authData);
      if (!recipientInfo) {
        logger.warn(`No recipient info found for type: ${recipientType}`);
        return;
      }

      const personalizedContent = this.personalizeContent(template, {
        ...authData,
        ...event.metadata,
        recipientName: recipientInfo.name,
        recipientType
      });

      await this.deliverNotification(template.type, recipientInfo, personalizedContent);
    });

    await Promise.all(sendPromises);

    this.emit('notificationSent', {
      authorizationId: event.authorizationId,
      type: event.type,
      templateId: template.id,
      recipientCount: recipients.length,
      timestamp: new Date()
    });
  }

  /**
   * Send reviewer assignment notification
   */
  async sendReviewerAssignment(authorizationId: string, reviewerId: string): Promise<void> {
    logger.info('Sending reviewer assignment notification', {
      authorizationId,
      reviewerId
    });

    const template = this.templates.get('reviewer-assignment');
    if (!template) return;

    const authData = await this.getAuthorizationData(authorizationId);
    const reviewerInfo = await this.getReviewerInfo(reviewerId);

    if (!authData || !reviewerInfo) return;

    const content = this.personalizeContent(template, {
      ...authData,
      reviewerName: reviewerInfo.name,
      reviewType: authData.reviewType || 'medical',
      deadline: this.calculateDeadline(authData.urgency)
    });

    await this.deliverNotification('system', reviewerInfo, content);
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(authorizationId: string, escalationData: any): Promise<void> {
    logger.info('Sending escalation notification', {
      authorizationId,
      escalationReason: escalationData.reason
    });

    const template = this.templates.get('escalation-notice');
    if (!template) return;

    const authData = await this.getAuthorizationData(authorizationId);
    if (!authData) return;

    const content = this.personalizeContent(template, {
      ...authData,
      ...escalationData
    });

    // Send to senior reviewers and managers
    const escalationRecipients = await this.getEscalationRecipients();
    
    const sendPromises = escalationRecipients.map(recipient =>
      this.deliverNotification('email', recipient, content)
    );

    await Promise.all(sendPromises);
  }

  /**
   * Schedule expiration warnings
   */
  scheduleExpirationWarnings(authorizationId: string, expirationDate: Date): void {
    const warningDays = [7, 3, 1]; // Days before expiration

    warningDays.forEach(days => {
      const warningDate = new Date(expirationDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      if (warningDate > new Date()) {
        setTimeout(async () => {
          await this.sendExpirationWarning(authorizationId, days);
        }, warningDate.getTime() - Date.now());
      }
    });
  }

  /**
   * Send expiration warning
   */
  private async sendExpirationWarning(authorizationId: string, daysUntilExpiration: number): Promise<void> {
    const template = this.templates.get('expiration-warning');
    if (!template) return;

    const authData = await this.getAuthorizationData(authorizationId);
    if (!authData) return;

    const content = this.personalizeContent(template, {
      ...authData,
      daysUntilExpiration,
      phoneNumber: '0800-123-4567'
    });

    const patientInfo = await this.getRecipientInfo('patient', authData);
    if (patientInfo) {
      await this.deliverNotification('sms', patientInfo, content);
    }
  }

  /**
   * Find appropriate template
   */
  private findTemplate(notificationType: string): NotificationTemplate | null {
    // Direct match
    for (const template of this.templates.values()) {
      if (template.id.includes(notificationType) || template.trigger === notificationType) {
        return template;
      }
    }

    // Fuzzy match
    const typeMap: Record<string, string> = {
      'approval': 'auth-approved',
      'rejection': 'auth-rejected',
      'additional_info_request': 'additional-info-request',
      'reviewer_assignment': 'reviewer-assignment',
      'escalation': 'escalation-notice',
      'appeal': 'appeal-submitted'
    };

    const templateId = typeMap[notificationType];
    return templateId ? this.templates.get(templateId) || null : null;
  }

  /**
   * Personalize content with template variables
   */
  private personalizeContent(template: NotificationTemplate, data: Record<string, any>): any {
    let content = template.template;
    let subject = template.subject;

    // Replace variables in format {{variable}}
    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return data[variable] || match;
      });
    };

    content = replaceVariables(content);
    subject = replaceVariables(subject);

    // Handle arrays (like missing documents)
    content = content.replace(/\{\{#each (\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (Array.isArray(array)) {
        return array.map(item => itemTemplate.replace(/\{\{this\}\}/g, item)).join('\n');
      }
      return '';
    });

    return {
      subject,
      content,
      type: template.type
    };
  }

  /**
   * Deliver notification via appropriate channel
   */
  private async deliverNotification(
    type: string,
    recipient: any,
    content: any
  ): Promise<void> {
    const provider = this.deliveryProviders.get(type);
    if (!provider) {
      logger.error(`No provider found for notification type: ${type}`);
      return;
    }

    try {
      await provider.send(recipient, content);
      
      this.emit('notificationDelivered', {
        type,
        recipient: recipient.id || recipient.email || recipient.phone,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(`Failed to deliver ${type} notification`, {
        recipient: recipient.id,
        error
      });

      // Retry logic
      await this.handleDeliveryFailure(type, recipient, content, error);
    }
  }

  /**
   * Handle delivery failures with retry
   */
  private async handleDeliveryFailure(
    type: string,
    recipient: any,
    content: any,
    error: any
  ): Promise<void> {
    const retryKey = `${type}-${recipient.id}-${Date.now()}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    const provider = this.deliveryProviders.get(type);
    
    if (currentAttempts < (provider?.retryAttempts || 0)) {
      this.retryAttempts.set(retryKey, currentAttempts + 1);
      
      // Exponential backoff
      const delay = Math.pow(2, currentAttempts) * 1000;
      
      setTimeout(async () => {
        try {
          await provider.send(recipient, content);
          this.retryAttempts.delete(retryKey);
        } catch (retryError) {
          await this.handleDeliveryFailure(type, recipient, content, retryError);
        }
      }, delay);
    } else {
      // Final failure
      this.retryAttempts.delete(retryKey);
      
      this.emit('notificationFailed', {
        type,
        recipient: recipient.id,
        error: error.message,
        attempts: currentAttempts + 1,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(recipient: any, content: any): Promise<void> {
    // Implementation would use actual email service (SendGrid, SES, etc.)
    logger.info('Sending email notification', {
      to: recipient.email,
      subject: content.subject
    });

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (Math.random() > 0.95) { // 5% failure rate for testing
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(recipient: any, content: any): Promise<void> {
    // Implementation would use SMS service (Twilio, AWS SNS, etc.)
    logger.info('Sending SMS notification', {
      to: recipient.phone,
      content: content.content.substring(0, 160)
    });

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(recipient: any, content: any): Promise<void> {
    // Implementation would use WhatsApp Business API or Z-API
    logger.info('Sending WhatsApp notification', {
      to: recipient.phone,
      content: content.content
    });

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Send system notification
   */
  private async sendSystemNotification(recipient: any, content: any): Promise<void> {
    // Implementation would save to database for in-app notifications
    logger.info('Sending system notification', {
      to: recipient.id,
      subject: content.subject
    });

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get authorization data
   */
  private async getAuthorizationData(authorizationId: string): Promise<any> {
    // In production, fetch from database
    return {
      id: authorizationId,
      authorizationNumber: `AUTH-${authorizationId.substring(0, 8)}`,
      procedureName: 'Consulta Cardiológica',
      requestedDate: new Date().toLocaleDateString('pt-BR'),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      patientName: 'João Silva',
      urgency: 'medium'
    };
  }

  /**
   * Get recipient information
   */
  private async getRecipientInfo(recipientType: string, authData: any): Promise<any> {
    // In production, fetch from database based on type and authorization
    const recipients: Record<string, any> = {
      patient: {
        id: 'patient-123',
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '+5511999999999'
      },
      provider: {
        id: 'provider-456',
        name: 'Dr. Maria Santos',
        email: 'maria.santos@hospital.com',
        phone: '+5511888888888'
      },
      reviewer: {
        id: 'reviewer-789',
        name: 'Dr. Carlos Pereira',
        email: 'carlos.pereira@austa.com',
        phone: '+5511777777777'
      }
    };

    return recipients[recipientType] || null;
  }

  /**
   * Get reviewer information
   */
  private async getReviewerInfo(reviewerId: string): Promise<any> {
    // In production, fetch from database
    return {
      id: reviewerId,
      name: 'Dr. Ana Costa',
      email: 'ana.costa@austa.com',
      specialty: 'Cardiologia'
    };
  }

  /**
   * Get escalation recipients
   */
  private async getEscalationRecipients(): Promise<any[]> {
    // In production, fetch from database
    return [
      {
        id: 'senior-reviewer-1',
        name: 'Dr. Roberto Lima',
        email: 'roberto.lima@austa.com'
      },
      {
        id: 'manager-1',
        name: 'Sandra Oliveira',
        email: 'sandra.oliveira@austa.com'
      }
    ];
  }

  /**
   * Calculate deadline based on urgency
   */
  private calculateDeadline(urgency: string): string {
    const deadlineHours: Record<string, number> = {
      emergency: 1,
      urgent: 4,
      high: 24,
      medium: 72,
      low: 168
    };

    const hours = deadlineHours[urgency] || 72;
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    return deadline.toLocaleString('pt-BR');
  }

  /**
   * Add custom template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Added notification template: ${template.name}`);
  }

  /**
   * Update template
   */
  updateTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Updated notification template: ${template.name}`);
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): Record<string, any> {
    // In production, implement actual statistics tracking
    return {
      totalSent: 0,
      deliveryRate: 0.95,
      averageDeliveryTime: 2.5,
      failuresByType: {
        email: 0,
        sms: 0,
        whatsapp: 0,
        system: 0
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.notificationQueue.clear();
    this.retryAttempts.clear();
    logger.info('Notification service cleaned up');
  }
}