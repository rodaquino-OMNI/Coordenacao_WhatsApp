import { HealthPromptTemplate, PersonaType, HealthTopicClassification } from '../types/ai';
import { logger } from '../utils/logger';

export class HealthPromptService {
  private templates: Map<string, HealthPromptTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: HealthPromptTemplate[] = [
      // Symptom Inquiry Templates
      {
        id: 'symptom_general_zeca',
        name: 'Consulta Geral de Sintomas - Zeca',
        category: 'symptom_inquiry',
        persona: 'zeca',
        template: `Entendo que você está sentindo {symptom}. Para te ajudar melhor, preciso saber mais alguns detalhes:

1. Há quanto tempo você está sentindo isso?
2. A dor/desconforto é constante ou vem e vai?
3. Tem alguma coisa que piora ou melhora os sintomas?
4. Você está tomando algum medicamento?

Lembre-se: não sou médico, mas posso te orientar sobre quando buscar ajuda profissional e como agendar uma consulta.`,
        variables: ['symptom'],
        triggers: ['dor', 'desconforto', 'sintoma', 'mal estar', 'sentindo'],
        priority: 'high'
      },
      {
        id: 'symptom_general_ana',
        name: 'Consulta Geral de Sintomas - Ana',
        category: 'symptom_inquiry',
        persona: 'ana',
        template: `Querida, entendo que você está sentindo {symptom}. Sei que pode ser preocupante, mas estou aqui para te ajudar. Para entender melhor sua situação:

1. Há quanto tempo você está sentindo isso?
2. Os sintomas são constantes ou aparecem em momentos específicos?
3. Existe algo que alivia ou piora o que você está sentindo?
4. Você está usando algum medicamento ou tratamento?

Lembre-se: sou aqui para te apoiar e orientar sobre quando buscar ajuda médica especializada.`,
        variables: ['symptom'],
        triggers: ['dor', 'desconforto', 'sintoma', 'mal estar', 'sentindo'],
        priority: 'high'
      },

      // Appointment Scheduling Templates
      {
        id: 'appointment_general_zeca',
        name: 'Agendamento Geral - Zeca',
        category: 'appointment_scheduling',
        persona: 'zeca',
        template: `Perfeito! Vou te ajudar a agendar uma consulta. Para encontrar o melhor horário e especialista:

📅 **Que tipo de consulta você precisa?**
- Consulta de rotina/check-up
- Especialista (qual área?)
- Retorno/acompanhamento
- Urgente

📍 **Preferência de local:**
- Clínica mais próxima
- Especialista específico
- Telemedicina (quando possível)

⏰ **Melhor período:**
- Manhã, tarde ou noite?
- Dias da semana específicos?

Posso verificar a disponibilidade e te ajudar com o agendamento!`,
        variables: [],
        triggers: ['agendar', 'consulta', 'médico', 'marcar', 'horário'],
        priority: 'medium'
      },
      {
        id: 'appointment_general_ana',
        name: 'Agendamento Geral - Ana',
        category: 'appointment_scheduling',
        persona: 'ana',
        template: `Claro, querida! Fico feliz em te ajudar a agendar sua consulta. Vamos organizar tudo direitinho:

💕 **Que tipo de consulta você gostaria?**
- Check-up de rotina
- Ginecologista
- Outro especialista
- Acompanhamento

🏥 **Onde você prefere ser atendida?**
- Clínica mais próxima de casa/trabalho
- Médica específica
- Teleconsulta (quando disponível)

🕐 **Qual horário funciona melhor?**
- Manhã, tarde ou final do dia?
- Algum dia da semana específico?

Vou verificar as opções disponíveis e encontrar o melhor horário para você!`,
        variables: [],
        triggers: ['agendar', 'consulta', 'médica', 'gineco', 'marcar'],
        priority: 'medium'
      },

      // Health Education Templates
      {
        id: 'education_prevention_male',
        name: 'Educação Preventiva Masculina - Zeca',
        category: 'health_education',
        persona: 'zeca',
        template: `Ótima pergunta sobre {topic}! A prevenção é fundamental na saúde masculina. Aqui estão os pontos principais:

🔍 **O que você precisa saber:**
{educational_content}

📅 **Recomendações de frequência:**
{frequency_recommendations}

⚠️ **Sinais de alerta:**
{warning_signs}

💡 **Dica importante:** Muitos homens deixam a saúde de lado, mas pequenos cuidados fazem uma grande diferença. Que tal aproveitar e agendar um check-up?`,
        variables: ['topic', 'educational_content', 'frequency_recommendations', 'warning_signs'],
        triggers: ['prevenção', 'cuidados', 'check-up', 'exames', 'saúde masculina'],
        priority: 'medium'
      },
      {
        id: 'education_prevention_female',
        name: 'Educação Preventiva Feminina - Ana',
        category: 'health_education',
        persona: 'ana',
        template: `Que bom que você está se cuidando! Vou te explicar tudo sobre {topic} de forma bem clara:

💕 **Informações importantes:**
{educational_content}

📋 **Quando fazer:**
{frequency_recommendations}

🚨 **Fique atenta a estes sinais:**
{warning_signs}

✨ **Lembre-se:** Cuidar da nossa saúde é um ato de amor próprio. Você está no caminho certo! Posso te ajudar a agendar os exames necessários?`,
        variables: ['topic', 'educational_content', 'frequency_recommendations', 'warning_signs'],
        triggers: ['prevenção', 'exames', 'ginecológico', 'mama', 'saúde feminina'],
        priority: 'medium'
      },

      // Emergency Guidance Templates
      {
        id: 'emergency_guidance_both',
        name: 'Orientação de Emergência',
        category: 'emergency_guidance',
        persona: 'both',
        template: `🚨 **ATENÇÃO: Esta situação pode necessitar atendimento médico imediato!**

📞 **Procure ajuda AGORA:**
- SAMU: 192
- Emergência: 193
- Hospital mais próximo

⚠️ **Enquanto aguarda atendimento:**
{emergency_instructions}

🏥 **Esta é uma emergência se você apresenta:**
{emergency_symptoms}

📱 **Posso te ajudar a:**
- Localizar o hospital mais próximo
- Ligar para emergência
- Orientar acompanhante

**NÃO ESPERE - BUSQUE ATENDIMENTO MÉDICO IMEDIATAMENTE!**`,
        variables: ['emergency_instructions', 'emergency_symptoms'],
        triggers: ['emergência', 'urgente', 'socorro', 'grave', 'samu'],
        priority: 'critical'
      },

      // Wellness and Lifestyle Templates
      {
        id: 'wellness_lifestyle_zeca',
        name: 'Bem-estar e Estilo de Vida - Zeca',
        category: 'general_wellness',
        persona: 'zeca',
        template: `Cara, que legal você querer saber sobre {wellness_topic}! Manter um estilo de vida saudável é um investimento no seu futuro.

💪 **Dicas práticas:**
{wellness_tips}

🎯 **Meta realista:**
{achievable_goals}

📈 **Como acompanhar progresso:**
{progress_tracking}

🤝 **Quer ajuda para:**
- Criar um plano personalizado?
- Acompanhar sua evolução?
- Agendar check-up para avaliar sua saúde atual?`,
        variables: ['wellness_topic', 'wellness_tips', 'achievable_goals', 'progress_tracking'],
        triggers: ['exercício', 'dieta', 'bem-estar', 'estilo de vida', 'saúde'],
        priority: 'low'
      },
      {
        id: 'wellness_lifestyle_ana',
        name: 'Bem-estar e Estilo de Vida - Ana',
        category: 'general_wellness',
        persona: 'ana',
        template: `Que amor você cuidar do seu bem-estar! Vou te dar dicas sobre {wellness_topic} que cabem na sua rotina:

🌸 **Dicas carinhosas:**
{wellness_tips}

🎯 **Objetivos alcançáveis:**
{achievable_goals}

📊 **Acompanhe sua jornada:**
{progress_tracking}

💕 **Posso te apoiar com:**
- Plano personalizado para sua rotina
- Lembretes gentis de autocuidado
- Agendamento de consultas para acompanhamento

Lembre-se: cada pequeno passo conta na sua jornada de bem-estar!`,
        variables: ['wellness_topic', 'wellness_tips', 'achievable_goals', 'progress_tracking'],
        triggers: ['autocuidado', 'bem-estar', 'exercício', 'alimentação', 'saúde mental'],
        priority: 'low'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info(`Initialized ${templates.length} health prompt templates`);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): HealthPromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Find best template for message and persona
   */
  findBestTemplate(message: string, persona: PersonaType, category?: string): HealthPromptTemplate | null {
    const messageWords = message.toLowerCase().split(/\s+/);
    let bestMatch: { template: HealthPromptTemplate; score: number } | null = null;

    for (const template of this.templates.values()) {
      // Skip if template is for specific persona and doesn't match
      if (template.persona !== 'both' && template.persona !== persona) {
        continue;
      }

      // Skip if category specified and doesn't match
      if (category && template.category !== category) {
        continue;
      }

      // Calculate relevance score based on trigger words
      let score = 0;
      for (const trigger of template.triggers) {
        if (messageWords.some(word => word.includes(trigger.toLowerCase()))) {
          score += template.priority === 'critical' ? 10 : 
                   template.priority === 'high' ? 5 : 
                   template.priority === 'medium' ? 3 : 1;
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { template, score };
      }
    }

    return bestMatch?.template || null;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string, persona?: PersonaType): HealthPromptTemplate[] {
    const filtered = Array.from(this.templates.values()).filter(template => {
      const categoryMatch = template.category === category;
      const personaMatch = !persona || template.persona === persona || template.persona === 'both';
      return categoryMatch && personaMatch;
    });

    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Classify health topic from message
   */
  classifyHealthTopic(message: string): HealthTopicClassification {
    const messageText = message.toLowerCase();
    const words = messageText.split(/\s+/);

    // Emergency keywords
    const emergencyKeywords = ['emergência', 'urgente', 'socorro', 'grave', 'samu', 'hospital', 'dor forte', 'não consigo respirar'];
    const symptomKeywords = ['dor', 'febre', 'mal estar', 'sintoma', 'desconforto', 'sangramento'];
    const preventiveKeywords = ['check-up', 'exame', 'prevenção', 'rotina', 'agendar'];
    const mentalHealthKeywords = ['ansiedade', 'depressão', 'estresse', 'mental', 'psicológico'];
    const nutritionKeywords = ['alimentação', 'dieta', 'nutrição', 'peso', 'comer'];
    const exerciseKeywords = ['exercício', 'atividade física', 'ginástica', 'academia', 'esporte'];

    let category: HealthTopicClassification['category'] = 'general';
    let urgencyLevel: HealthTopicClassification['urgencyLevel'] = 'low';
    let confidence = 0;
    let keywords: string[] = [];
    let requiresHumanIntervention = false;

    // Check for emergency
    if (emergencyKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'emergency';
      urgencyLevel = 'critical';
      confidence = 0.9;
      requiresHumanIntervention = true;
      keywords = emergencyKeywords.filter(keyword => messageText.includes(keyword));
    }
    // Check for symptoms
    else if (symptomKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'symptoms';
      urgencyLevel = 'medium';
      confidence = 0.8;
      keywords = symptomKeywords.filter(keyword => messageText.includes(keyword));
      
      // Check for severe symptoms
      if (messageText.includes('dor forte') || messageText.includes('muito mal')) {
        urgencyLevel = 'high';
        requiresHumanIntervention = true;
      }
    }
    // Check for preventive care
    else if (preventiveKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'preventive_care';
      urgencyLevel = 'low';
      confidence = 0.7;
      keywords = preventiveKeywords.filter(keyword => messageText.includes(keyword));
    }
    // Check for mental health
    else if (mentalHealthKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'mental_health';
      urgencyLevel = 'medium';
      confidence = 0.8;
      keywords = mentalHealthKeywords.filter(keyword => messageText.includes(keyword));
    }
    // Check for nutrition
    else if (nutritionKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'nutrition';
      urgencyLevel = 'low';
      confidence = 0.6;
      keywords = nutritionKeywords.filter(keyword => messageText.includes(keyword));
    }
    // Check for exercise
    else if (exerciseKeywords.some(keyword => messageText.includes(keyword))) {
      category = 'exercise';
      urgencyLevel = 'low';
      confidence = 0.6;
      keywords = exerciseKeywords.filter(keyword => messageText.includes(keyword));
    }

    return {
      category,
      confidence,
      keywords,
      urgencyLevel,
      requiresHumanIntervention
    };
  }

  /**
   * Generate contextual prompt enhancement
   */
  generateContextualPrompt(
    baseTemplate: HealthPromptTemplate,
    classification: HealthTopicClassification,
    userProfile?: any
  ): string {
    let enhancedPrompt = baseTemplate.template;

    // Add urgency context
    if (classification.urgencyLevel === 'critical') {
      enhancedPrompt = `🚨 SITUAÇÃO CRÍTICA DETECTADA\n\n${enhancedPrompt}`;
    } else if (classification.urgencyLevel === 'high') {
      enhancedPrompt = `⚠️ ATENÇÃO NECESSÁRIA\n\n${enhancedPrompt}`;
    }

    // Add user profile context if available
    if (userProfile) {
      const ageContext = userProfile.age ? `Considerando sua idade (${userProfile.age} anos), ` : '';
      const conditionsContext = userProfile.healthConditions?.length > 0 
        ? `Levando em conta suas condições de saúde (${userProfile.healthConditions.join(', ')}), `
        : '';
      
      if (ageContext || conditionsContext) {
        enhancedPrompt += `\n\n💡 **Considerações personalizadas:** ${ageContext}${conditionsContext}é importante manter acompanhamento regular.`;
      }
    }

    return enhancedPrompt;
  }

  /**
   * Add or update template
   */
  addTemplate(template: HealthPromptTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Health prompt template added/updated: ${template.id}`);
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      logger.info(`Health prompt template removed: ${templateId}`);
    }
    return deleted;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): HealthPromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    total: number;
    byCategory: Record<string, number>;
    byPersona: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const templates = Array.from(this.templates.values());
    
    const byCategory: Record<string, number> = {};
    const byPersona: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    templates.forEach(template => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      byPersona[template.persona] = (byPersona[template.persona] || 0) + 1;
      byPriority[template.priority] = (byPriority[template.priority] || 0) + 1;
    });

    return {
      total: templates.length,
      byCategory,
      byPersona,
      byPriority
    };
  }
}