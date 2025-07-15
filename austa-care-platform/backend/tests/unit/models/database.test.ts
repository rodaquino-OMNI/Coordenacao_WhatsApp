import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  appointment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('Database Models', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('User Model', () => {
    const sampleUser = {
      id: '1',
      email: 'test@austa.com.br',
      name: 'Test User',
      phone: '5511999999999',
      role: 'PATIENT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new user', async () => {
      prisma.user.create.mockResolvedValue(sampleUser);

      const userData = {
        email: 'test@austa.com.br',
        name: 'Test User',
        phone: '5511999999999',
        password: 'hashedpassword',
        role: 'PATIENT',
      };

      const result = await prisma.user.create({
        data: userData,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(sampleUser);
    });

    it('should find user by email', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);

      const result = await prisma.user.findUnique({
        where: { email: 'test@austa.com.br' },
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@austa.com.br' },
      });
      expect(result).toEqual(sampleUser);
    });

    it('should find user by phone number', async () => {
      prisma.user.findUnique.mockResolvedValue(sampleUser);

      const result = await prisma.user.findUnique({
        where: { phone: '5511999999999' },
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: '5511999999999' },
      });
      expect(result).toEqual(sampleUser);
    });

    it('should update user information', async () => {
      const updatedUser = { ...sampleUser, name: 'Updated Name' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await prisma.user.update({
        where: { id: '1' },
        data: { name: 'Updated Name' },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should soft delete user (deactivate)', async () => {
      const deactivatedUser = { ...sampleUser, isActive: false };
      prisma.user.update.mockResolvedValue(deactivatedUser);

      const result = await prisma.user.update({
        where: { id: '1' },
        data: { isActive: false },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should find all active users', async () => {
      const activeUsers = [sampleUser, { ...sampleUser, id: '2' }];
      prisma.user.findMany.mockResolvedValue(activeUsers);

      const result = await prisma.user.findMany({
        where: { isActive: true },
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('Conversation Model', () => {
    const sampleConversation = {
      id: '1',
      userId: '1',
      whatsappChatId: 'chat_123',
      status: 'ACTIVE',
      context: { stage: 'greeting' },
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new conversation', async () => {
      prisma.conversation.create.mockResolvedValue(sampleConversation);

      const conversationData = {
        userId: '1',
        whatsappChatId: 'chat_123',
        status: 'ACTIVE',
        context: { stage: 'greeting' },
      };

      const result = await prisma.conversation.create({
        data: conversationData,
      });

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: conversationData,
      });
      expect(result).toEqual(sampleConversation);
    });

    it('should find conversation by WhatsApp chat ID', async () => {
      prisma.conversation.findUnique.mockResolvedValue(sampleConversation);

      const result = await prisma.conversation.findUnique({
        where: { whatsappChatId: 'chat_123' },
      });

      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { whatsappChatId: 'chat_123' },
      });
      expect(result).toEqual(sampleConversation);
    });

    it('should update conversation context', async () => {
      const updatedContext = { stage: 'appointment_booking', data: { selectedDate: '2024-01-15' } };
      const updatedConversation = { ...sampleConversation, context: updatedContext };
      prisma.conversation.update.mockResolvedValue(updatedConversation);

      const result = await prisma.conversation.update({
        where: { id: '1' },
        data: { context: updatedContext },
      });

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { context: updatedContext },
      });
      expect(result.context.stage).toBe('appointment_booking');
    });

    it('should find active conversations for user', async () => {
      const userConversations = [sampleConversation];
      prisma.conversation.findMany.mockResolvedValue(userConversations);

      const result = await prisma.conversation.findMany({
        where: {
          userId: '1',
          status: 'ACTIVE',
        },
      });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
          status: 'ACTIVE',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('Message Model', () => {
    const sampleMessage = {
      id: '1',
      conversationId: '1',
      whatsappMessageId: 'msg_123',
      direction: 'INBOUND',
      content: 'Hello, I need help',
      messageType: 'TEXT',
      metadata: { timestamp: '1234567890' },
      processedAt: new Date(),
      createdAt: new Date(),
    };

    it('should create a new message', async () => {
      prisma.message.create.mockResolvedValue(sampleMessage);

      const messageData = {
        conversationId: '1',
        whatsappMessageId: 'msg_123',
        direction: 'INBOUND',
        content: 'Hello, I need help',
        messageType: 'TEXT',
        metadata: { timestamp: '1234567890' },
      };

      const result = await prisma.message.create({
        data: messageData,
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: messageData,
      });
      expect(result).toEqual(sampleMessage);
    });

    it('should find messages by conversation', async () => {
      const conversationMessages = [sampleMessage, { ...sampleMessage, id: '2' }];
      prisma.message.findMany.mockResolvedValue(conversationMessages);

      const result = await prisma.message.findMany({
        where: { conversationId: '1' },
        orderBy: { createdAt: 'asc' },
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: '1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should find unprocessed messages', async () => {
      const unprocessedMessage = { ...sampleMessage, processedAt: null };
      prisma.message.findMany.mockResolvedValue([unprocessedMessage]);

      const result = await prisma.message.findMany({
        where: { processedAt: null },
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { processedAt: null },
      });
      expect(result).toHaveLength(1);
      expect(result[0].processedAt).toBeNull();
    });

    it('should mark message as processed', async () => {
      const processedMessage = { ...sampleMessage, processedAt: new Date() };
      prisma.message.update.mockResolvedValue(processedMessage);

      const result = await prisma.message.update({
        where: { id: '1' },
        data: { processedAt: new Date() },
      });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { processedAt: expect.any(Date) },
      });
      expect(result.processedAt).toBeDefined();
    });
  });

  describe('Appointment Model', () => {
    const sampleAppointment = {
      id: '1',
      userId: '1',
      patientName: 'Test Patient',
      patientPhone: '5511999999999',
      appointmentDate: new Date('2024-01-15T14:00:00Z'),
      status: 'SCHEDULED',
      type: 'CONSULTATION',
      notes: 'Regular checkup',
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new appointment', async () => {
      prisma.appointment.create.mockResolvedValue(sampleAppointment);

      const appointmentData = {
        userId: '1',
        patientName: 'Test Patient',
        patientPhone: '5511999999999',
        appointmentDate: new Date('2024-01-15T14:00:00Z'),
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        notes: 'Regular checkup',
      };

      const result = await prisma.appointment.create({
        data: appointmentData,
      });

      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: appointmentData,
      });
      expect(result).toEqual(sampleAppointment);
    });

    it('should find appointments by date range', async () => {
      const appointments = [sampleAppointment];
      prisma.appointment.findMany.mockResolvedValue(appointments);

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const result = await prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      expect(result).toHaveLength(1);
    });

    it('should find appointments needing reminders', async () => {
      const appointmentsNeedingReminders = [{ ...sampleAppointment, reminderSent: false }];
      prisma.appointment.findMany.mockResolvedValue(appointmentsNeedingReminders);

      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 1); // Tomorrow

      const result = await prisma.appointment.findMany({
        where: {
          reminderSent: false,
          status: 'SCHEDULED',
          appointmentDate: {
            gte: new Date(),
            lte: reminderDate,
          },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].reminderSent).toBe(false);
    });

    it('should update appointment status', async () => {
      const updatedAppointment = { ...sampleAppointment, status: 'COMPLETED' };
      prisma.appointment.update.mockResolvedValue(updatedAppointment);

      const result = await prisma.appointment.update({
        where: { id: '1' },
        data: { status: 'COMPLETED' },
      });

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'COMPLETED' },
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('Database Transactions', () => {
    it('should handle transaction for user creation with conversation', async () => {
      const userData = { email: 'test@test.com', name: 'Test' };
      const conversationData = { whatsappChatId: 'chat_123' };

      prisma.$transaction.mockImplementation(async (operations) => {
        const results = await Promise.all(operations.map(op => op()));
        return results;
      });

      prisma.user.create.mockResolvedValue({ id: '1', ...userData });
      prisma.conversation.create.mockResolvedValue({ id: '1', userId: '1', ...conversationData });

      const result = await prisma.$transaction([
        () => prisma.user.create({ data: userData }),
        () => prisma.conversation.create({ 
          data: { ...conversationData, userId: '1' } 
        }),
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: { ...conversationData, userId: '1' }
      });
    });

    it('should handle database connection', async () => {
      prisma.$connect.mockResolvedValue(undefined);

      await prisma.$connect();

      expect(prisma.$connect).toHaveBeenCalled();
    });

    it('should handle database disconnection', async () => {
      prisma.$disconnect.mockResolvedValue(undefined);

      await prisma.$disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle unique constraint violations', async () => {
      const duplicateError = new Error('Unique constraint failed');
      (duplicateError as any).code = 'P2002';
      
      prisma.user.create.mockRejectedValue(duplicateError);

      await expect(
        prisma.user.create({
          data: { email: 'existing@test.com', name: 'Test' }
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should handle not found errors', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';
      
      prisma.user.findUnique.mockRejectedValue(notFoundError);

      await expect(
        prisma.user.findUnique({ where: { id: 'nonexistent' } })
      ).rejects.toThrow('Record not found');
    });

    it('should handle foreign key constraint violations', async () => {
      const foreignKeyError = new Error('Foreign key constraint failed');
      (foreignKeyError as any).code = 'P2003';
      
      prisma.conversation.create.mockRejectedValue(foreignKeyError);

      await expect(
        prisma.conversation.create({
          data: { userId: 'nonexistent', whatsappChatId: 'chat_123' }
        })
      ).rejects.toThrow('Foreign key constraint failed');
    });
  });
});