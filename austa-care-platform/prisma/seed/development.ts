import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create Organizations
  const hospital = await prisma.organization.create({
    data: {
      id: 'org-hospital-001',
      name: 'Hospital São Paulo',
      type: 'HOSPITAL',
      taxId: '12.345.678/0001-90',
      address: {
        street: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil'
      },
      phone: '+55 11 3456-7890',
      email: 'contato@hospitalsaopaulo.com.br',
      hipaaCompliant: true,
      settings: {
        whatsappBusinessId: 'wa-business-001',
        defaultLanguage: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        features: {
          aiChatbot: true,
          voiceMessages: true,
          documentOcr: true,
          tasyIntegration: true
        }
      }
    }
  })

  const clinic = await prisma.organization.create({
    data: {
      id: 'org-clinic-001',
      name: 'Clínica Vida Saudável',
      type: 'CLINIC',
      taxId: '98.765.432/0001-10',
      address: {
        street: 'Av. Paulista, 456',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        country: 'Brasil'
      },
      phone: '+55 11 9876-5432',
      email: 'contato@vidasaudavel.com.br',
      hipaaCompliant: true,
      settings: {
        whatsappBusinessId: 'wa-business-002',
        defaultLanguage: 'pt-BR',
        timezone: 'America/Sao_Paulo'
      }
    }
  })

  console.log('✅ Organizations created')

  // Create Providers
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        id: 'provider-001',
        firstName: 'Dr. Ana',
        lastName: 'Silva',
        email: 'ana.silva@hospitalsaopaulo.com.br',
        phone: '+55 11 99999-1111',
        license: 'CRM-SP 123456',
        specialty: ['CARDIOLOGY', 'GENERAL'],
        organizationId: hospital.id,
        role: 'DOCTOR'
      }
    }),
    prisma.provider.create({
      data: {
        id: 'provider-002',
        firstName: 'Enf. Maria',
        lastName: 'Santos',
        email: 'maria.santos@hospitalsaopaulo.com.br',
        phone: '+55 11 99999-2222',
        license: 'COREN-SP 654321',
        specialty: ['GENERAL', 'PEDIATRICS'],
        organizationId: hospital.id,
        role: 'NURSE'
      }
    }),
    prisma.provider.create({
      data: {
        id: 'provider-003',
        firstName: 'Dr. João',
        lastName: 'Oliveira',
        email: 'joao.oliveira@vidasaudavel.com.br',
        phone: '+55 11 99999-3333',
        license: 'CRM-SP 789012',
        specialty: ['DIABETES', 'ENDOCRINOLOGY'],
        organizationId: clinic.id,
        role: 'DOCTOR'
      }
    })
  ])

  console.log('✅ Providers created')

  // Create Test Users (Patients)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user-001',
        firstName: 'Carlos',
        lastName: 'Mendes',
        email: 'carlos.mendes@email.com',
        phone: '+5511987654321',
        cpf: '123.456.789-01', // In production, this would be encrypted
        dateOfBirth: new Date('1985-03-15'),
        gender: 'MALE',
        whatsappId: 'wa-user-001',
        organizationId: hospital.id,
        isVerified: true,
        emergencyContact: {
          name: 'Maria Mendes',
          phone: '+5511987654322',
          relationship: 'spouse'
        }
      }
    }),
    prisma.user.create({
      data: {
        id: 'user-002',
        firstName: 'Ana',
        lastName: 'Costa',
        email: 'ana.costa@email.com',
        phone: '+5511876543210',
        cpf: '987.654.321-09',
        dateOfBirth: new Date('1992-07-22'),
        gender: 'FEMALE',
        whatsappId: 'wa-user-002',
        organizationId: hospital.id,
        isVerified: true,
        emergencyContact: {
          name: 'João Costa',
          phone: '+5511876543211',
          relationship: 'father'
        }
      }
    }),
    prisma.user.create({
      data: {
        id: 'user-003',
        firstName: 'Pedro',
        lastName: 'Lima',
        email: 'pedro.lima@email.com',
        phone: '+5511765432109',
        cpf: '456.789.123-45',
        dateOfBirth: new Date('1978-11-08'),
        gender: 'MALE',
        whatsappId: 'wa-user-003',
        organizationId: clinic.id,
        isVerified: true
      }
    })
  ])

  console.log('✅ Users created')

  // Create Health Data
  const healthDataEntries = await Promise.all([
    prisma.healthData.create({
      data: {
        userId: users[0].id,
        organizationId: hospital.id,
        type: 'CONDITION',
        category: 'CARDIOLOGY',
        conditions: {
          primary: 'Hipertensão Arterial',
          icd10: 'I10',
          severity: 'moderate',
          diagnosedAt: '2023-01-15',
          status: 'active'
        },
        source: 'PROVIDER_ENTERED',
        reliability: 'VERIFIED',
        isVerified: true,
        verifiedBy: providers[0].id,
        verifiedAt: new Date(),
        sensitivityLevel: 'SENSITIVE',
        accessLevel: 'PROVIDER_PATIENT'
      }
    }),
    prisma.healthData.create({
      data: {
        userId: users[0].id,
        organizationId: hospital.id,
        type: 'MEDICATION',
        category: 'CARDIOLOGY',
        medications: {
          name: 'Losartana',
          dosage: '50mg',
          frequency: 'once_daily',
          startDate: '2023-01-15',
          prescribedBy: providers[0].id,
          instructions: 'Tomar pela manhã, com o estômago vazio'
        },
        source: 'PROVIDER_ENTERED',
        reliability: 'VERIFIED',
        isVerified: true,
        verifiedBy: providers[0].id,
        sensitivityLevel: 'SENSITIVE'
      }
    }),
    prisma.healthData.create({
      data: {
        userId: users[1].id,
        organizationId: hospital.id,
        type: 'ALLERGY',
        category: 'GENERAL',
        allergies: {
          allergen: 'Penicilina',
          severity: 'severe',
          reaction: 'Urticária generalizada',
          diagnosedAt: '2020-05-10'
        },
        source: 'USER_REPORTED',
        reliability: 'HIGH',
        sensitivityLevel: 'HIGHLY_SENSITIVE'
      }
    }),
    prisma.healthData.create({
      data: {
        userId: users[2].id,
        organizationId: clinic.id,
        type: 'CONDITION',
        category: 'DIABETES',
        conditions: {
          primary: 'Diabetes Mellitus Tipo 2',
          icd10: 'E11',
          severity: 'moderate',
          diagnosedAt: '2022-08-20',
          status: 'active',
          complications: []
        },
        source: 'PROVIDER_ENTERED',
        reliability: 'VERIFIED',
        isVerified: true,
        verifiedBy: providers[2].id,
        sensitivityLevel: 'SENSITIVE'
      }
    })
  ])

  console.log('✅ Health data created')

  // Create Missions for Gamification
  const missions = await Promise.all([
    prisma.mission.create({
      data: {
        id: 'mission-001',
        title: 'Completar Perfil de Saúde',
        description: 'Preencha todas as informações básicas do seu perfil de saúde',
        category: 'ONBOARDING',
        difficulty: 'EASY',
        pointsReward: 100,
        badgeReward: 'first_steps',
        requiredActions: {
          steps: [
            { action: 'fill_personal_info', completed: false },
            { action: 'add_emergency_contact', completed: false },
            { action: 'verify_phone', completed: false }
          ]
        },
        organizationId: hospital.id,
        estimatedTime: 10,
        tags: ['profile', 'basic', 'onboarding']
      }
    }),
    prisma.mission.create({
      data: {
        id: 'mission-002',
        title: 'Primeira Conversa com IA',
        description: 'Inicie sua primeira conversa com nosso assistente de saúde',
        category: 'ENGAGEMENT',
        difficulty: 'EASY',
        pointsReward: 50,
        requiredActions: {
          steps: [
            { action: 'start_conversation', completed: false },
            { action: 'ask_health_question', completed: false }
          ]
        },
        organizationId: hospital.id,
        estimatedTime: 5,
        tags: ['ai', 'chat', 'engagement']
      }
    }),
    prisma.mission.create({
      data: {
        id: 'mission-003',
        title: 'Adicionar Medicamentos',
        description: 'Registre seus medicamentos atuais no sistema',
        category: 'HEALTH_EDUCATION',
        difficulty: 'MEDIUM',
        pointsReward: 150,
        prerequisites: ['mission-001'],
        requiredActions: {
          steps: [
            { action: 'add_medication', completed: false },
            { action: 'set_reminder', completed: false },
            { action: 'confirm_dosage', completed: false }
          ]
        },
        organizationId: hospital.id,
        estimatedTime: 15,
        tags: ['medication', 'health_data', 'management']
      }
    })
  ])

  console.log('✅ Missions created')

  // Create Conversations
  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        id: 'conv-001',
        whatsappChatId: 'wa-chat-001',
        userId: users[0].id,
        organizationId: hospital.id,
        type: 'SUPPORT',
        title: 'Dúvidas sobre medicação',
        status: 'ACTIVE',
        priority: 'NORMAL',
        healthTopics: ['medication', 'hypertension'],
        medicationsMentioned: ['Losartana'],
        messageCount: 5
      }
    }),
    prisma.conversation.create({
      data: {
        id: 'conv-002',
        whatsappChatId: 'wa-chat-002',
        userId: users[1].id,
        organizationId: hospital.id,
        type: 'ONBOARDING',
        title: 'Boas-vindas ao sistema',
        status: 'COMPLETED',
        priority: 'HIGH',
        healthTopics: ['allergies', 'profile_setup'],
        messageCount: 12,
        satisfactionScore: 4.5,
        endedAt: new Date()
      }
    })
  ])

  console.log('✅ Conversations created')

  // Create Sample Messages
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        whatsappMessageId: 'wa-msg-001',
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Olá, tenho uma dúvida sobre meu medicamento para pressão',
        conversationId: conversations[0].id,
        userId: users[0].id,
        healthKeywords: ['medicamento', 'pressão'],
        urgencyLevel: 'MEDIUM',
        requiresResponse: true,
        aiProcessed: true,
        aiIntent: 'medication_inquiry',
        aiEntities: {
          medications: ['pressure_medication'],
          conditions: ['hypertension']
        }
      }
    }),
    prisma.message.create({
      data: {
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: 'Olá Carlos! Posso ajudá-lo com sua dúvida. Qual medicamento especificamente?',
        conversationId: conversations[0].id,
        userId: users[0].id,
        isBot: true,
        botResponseTime: 2.5,
        status: 'DELIVERED'
      }
    }),
    prisma.message.create({
      data: {
        whatsappMessageId: 'wa-msg-002',
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'É a Losartana 50mg. Posso tomar com o estômago cheio?',
        conversationId: conversations[0].id,
        userId: users[0].id,
        healthKeywords: ['Losartana', 'estômago'],
        urgencyLevel: 'LOW',
        requiresResponse: true,
        aiProcessed: true,
        aiIntent: 'medication_administration',
        aiEntities: {
          medications: ['Losartana'],
          dosage: ['50mg'],
          administration: ['stomach_full']
        }
      }
    })
  ])

  console.log('✅ Messages created')

  // Create User Points and Progress
  const healthPoints = await Promise.all([
    prisma.healthPoints.create({
      data: {
        userId: users[0].id,
        organizationId: hospital.id,
        totalPoints: 250,
        availablePoints: 200,
        spentPoints: 50,
        onboardingPoints: 100,
        engagementPoints: 150,
        currentLevel: 2,
        experiencePoints: 250,
        nextLevelAt: 500,
        badges: ['first_steps', 'active_user'],
        achievements: [
          {
            id: 'first_conversation',
            name: 'Primeira Conversa',
            earnedAt: new Date().toISOString()
          }
        ],
        dailyStreak: 5,
        weeklyStreak: 2,
        longestStreak: 7
      }
    }),
    prisma.healthPoints.create({
      data: {
        userId: users[1].id,
        organizationId: hospital.id,
        totalPoints: 500,
        availablePoints: 400,
        spentPoints: 100,
        onboardingPoints: 200,
        engagementPoints: 200,
        healthPoints: 100,
        currentLevel: 3,
        experiencePoints: 500,
        nextLevelAt: 750,
        badges: ['first_steps', 'active_user', 'health_champion'],
        achievements: [
          {
            id: 'profile_complete',
            name: 'Perfil Completo',
            earnedAt: new Date().toISOString()
          },
          {
            id: 'first_week',
            name: 'Primeira Semana',
            earnedAt: new Date().toISOString()
          }
        ],
        dailyStreak: 10,
        weeklyStreak: 3,
        longestStreak: 15
      }
    })
  ])

  console.log('✅ Health points created')

  // Create Onboarding Progress
  const onboardingProgress = await Promise.all([
    prisma.onboardingProgress.create({
      data: {
        userId: users[0].id,
        missionId: missions[0].id,
        organizationId: hospital.id,
        status: 'COMPLETED',
        progress: 100,
        currentStep: 3,
        totalSteps: 3,
        startedAt: new Date(Date.now() - 86400000), // Yesterday
        completedAt: new Date(),
        pointsEarned: 100,
        badgeEarned: 'first_steps',
        attemptsCount: 1,
        timeSpent: 8
      }
    }),
    prisma.onboardingProgress.create({
      data: {
        userId: users[0].id,
        missionId: missions[1].id,
        organizationId: hospital.id,
        status: 'IN_PROGRESS',
        progress: 50,
        currentStep: 1,
        totalSteps: 2,
        startedAt: new Date(),
        attemptsCount: 1,
        timeSpent: 3
      }
    }),
    prisma.onboardingProgress.create({
      data: {
        userId: users[1].id,
        missionId: missions[0].id,
        organizationId: hospital.id,
        status: 'COMPLETED',
        progress: 100,
        currentStep: 3,
        totalSteps: 3,
        startedAt: new Date(Date.now() - 172800000), // 2 days ago
        completedAt: new Date(Date.now() - 86400000), // Yesterday
        pointsEarned: 100,
        badgeEarned: 'first_steps',
        attemptsCount: 1,
        timeSpent: 12
      }
    })
  ])

  console.log('✅ Onboarding progress created')

  // Create Point Transactions
  const pointTransactions = await Promise.all([
    prisma.pointTransaction.create({
      data: {
        userId: users[0].id,
        healthPointsId: healthPoints[0].id,
        type: 'EARNED',
        amount: 100,
        reason: 'Mission completed',
        description: 'Completed "Completar Perfil de Saúde" mission',
        sourceType: 'MISSION',
        sourceId: missions[0].id,
        metadata: {
          missionTitle: 'Completar Perfil de Saúde',
          difficulty: 'EASY'
        }
      }
    }),
    prisma.pointTransaction.create({
      data: {
        userId: users[0].id,
        healthPointsId: healthPoints[0].id,
        type: 'EARNED',
        amount: 50,
        reason: 'Daily engagement',
        description: 'Active conversation participation',
        sourceType: 'ENGAGEMENT',
        sourceId: conversations[0].id
      }
    }),
    prisma.pointTransaction.create({
      data: {
        userId: users[1].id,
        healthPointsId: healthPoints[1].id,
        type: 'EARNED',
        amount: 200,
        reason: 'Multiple missions completed',
        description: 'Completed onboarding missions',
        sourceType: 'MISSION',
        sourceId: missions[0].id
      }
    })
  ])

  console.log('✅ Point transactions created')

  // Create Sample Documents
  const documents = await Promise.all([
    prisma.document.create({
      data: {
        filename: 'exame_sangue_carlos_20240115.pdf',
        originalName: 'Exame de Sangue - Carlos Mendes.pdf',
        mimeType: 'application/pdf',
        size: 2048576, // 2MB
        storageProvider: 'LOCAL',
        storagePath: '/uploads/documents/exame_sangue_carlos_20240115.pdf',
        type: 'LAB_RESULT',
        category: 'LABORATORY',
        userId: users[0].id,
        organizationId: hospital.id,
        hasOcr: true,
        ocrText: 'HEMOGRAMA COMPLETO\nGlicose: 95 mg/dL (Normal)\nColesterol Total: 180 mg/dL (Normal)\nTriglicerídeos: 120 mg/dL (Normal)',
        ocrConfidence: 0.95,
        processedAt: new Date(),
        extractedData: {
          tests: [
            { name: 'Glicose', value: 95, unit: 'mg/dL', status: 'normal' },
            { name: 'Colesterol Total', value: 180, unit: 'mg/dL', status: 'normal' },
            { name: 'Triglicerídeos', value: 120, unit: 'mg/dL', status: 'normal' }
          ]
        },
        healthKeywords: ['hemograma', 'glicose', 'colesterol'],
        accessLevel: 'PROVIDER_PATIENT',
        sensitivityLevel: 'SENSITIVE',
        retentionUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
      }
    })
  ])

  console.log('✅ Documents created')

  // Create Audit Logs
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: users[0].id,
        organizationId: hospital.id,
        action: 'CREATE',
        entity: 'User',
        entityId: users[0].id,
        description: 'User account created',
        newValues: {
          firstName: users[0].firstName,
          lastName: users[0].lastName,
          phone: users[0].phone
        },
        riskLevel: 'LOW',
        hipaaRelevant: true,
        lgpdRelevant: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (WhatsApp Business API)'
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: users[0].id,
        organizationId: hospital.id,
        action: 'CREATE',
        entity: 'HealthData',
        entityId: healthDataEntries[0].id,
        description: 'Health condition added',
        newValues: {
          type: 'CONDITION',
          category: 'CARDIOLOGY'
        },
        riskLevel: 'MEDIUM',
        sensitiveData: true,
        hipaaRelevant: true,
        requiresReview: false
      }
    })
  ])

  console.log('✅ Audit logs created')

  console.log('🌱 Database seeding completed successfully!')
  console.log(`
  📊 Summary:
  - Organizations: 2
  - Providers: 3
  - Users: 3
  - Health Data Entries: 4
  - Missions: 3
  - Conversations: 2
  - Messages: 3
  - Documents: 1
  - Onboarding Progress: 3
  - Point Transactions: 3
  - Audit Logs: 2
  
  🔐 Test Users:
  - Carlos Mendes: +5511987654321 (Hospital)
  - Ana Costa: +5511876543210 (Hospital)
  - Pedro Lima: +5511765432109 (Clinic)
  
  🏥 Organizations:
  - Hospital São Paulo (HOSPITAL)
  - Clínica Vida Saudável (CLINIC)
  `)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })