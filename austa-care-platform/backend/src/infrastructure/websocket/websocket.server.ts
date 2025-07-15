import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';
import { redisCluster } from '../redis/redis.cluster';
import { verifyToken } from '../../middleware/auth';
import Redis from 'ioredis';

export interface SocketUser {
  userId: string;
  organizationId: string;
  role: string;
  socketId: string;
}

export interface RoomSubscription {
  room: string;
  userId: string;
  joinedAt: Date;
}

export class WebSocketServer {
  private static instance: WebSocketServer;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private roomSubscriptions: Map<string, Set<string>> = new Map(); // room -> Set of userIds

  private constructor() {}

  static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  // Initialize WebSocket server
  async initialize(httpServer: HttpServer): Promise<void> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e8, // 100 MB
      allowEIO3: true,
    });

    // Setup Redis adapter for horizontal scaling
    if (config.redis?.cluster?.enabled) {
      const pubClient = new Redis.Cluster(config.redis.cluster.nodes);
      const subClient = pubClient.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info('WebSocket server using Redis cluster adapter');
    }

    // Setup authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = await verifyToken(token);
        socket.data.user = decoded;
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Invalid authentication'));
      }
    });

    // Setup connection handlers
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('WebSocket server initialized successfully');
  }

  // Handle new socket connection
  private async handleConnection(socket: Socket): Promise<void> {
    const user = socket.data.user;
    
    logger.info('New WebSocket connection', {
      socketId: socket.id,
      userId: user.userId,
      organizationId: user.organizationId,
    });

    // Register user
    this.registerUser(socket.id, user);

    // Join default rooms
    await this.joinDefaultRooms(socket, user);

    // Setup event handlers
    this.setupEventHandlers(socket);

    // Send connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnection', {
        socketId: socket.id,
        userId: user.userId,
        reason,
      });

      this.unregisterUser(socket.id, user.userId);
    });
  }

  // Register connected user
  private registerUser(socketId: string, user: any): void {
    const socketUser: SocketUser = {
      userId: user.userId,
      organizationId: user.organizationId,
      role: user.role,
      socketId,
    };

    this.connectedUsers.set(socketId, socketUser);

    // Track multiple connections per user
    if (!this.userSockets.has(user.userId)) {
      this.userSockets.set(user.userId, new Set());
    }
    this.userSockets.get(user.userId)!.add(socketId);

    // Store in Redis for distributed tracking
    redisCluster.setCache(`ws:user:${user.userId}:${socketId}`, socketUser, 3600);
  }

  // Unregister disconnected user
  private unregisterUser(socketId: string, userId: string): void {
    this.connectedUsers.delete(socketId);

    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Remove from Redis
    redisCluster.deleteCache(`ws:user:${userId}:${socketId}`);
  }

  // Join default rooms
  private async joinDefaultRooms(socket: Socket, user: any): Promise<void> {
    // Join user-specific room
    await socket.join(`user:${user.userId}`);

    // Join organization room
    await socket.join(`org:${user.organizationId}`);

    // Join role-based room
    await socket.join(`role:${user.role}`);

    logger.debug('Socket joined default rooms', {
      socketId: socket.id,
      rooms: [`user:${user.userId}`, `org:${user.organizationId}`, `role:${user.role}`],
    });
  }

  // Setup event handlers
  private setupEventHandlers(socket: Socket): void {
    const user = socket.data.user;

    // Handle conversation events
    socket.on('conversation:join', async (data: { conversationId: string }) => {
      const room = `conversation:${data.conversationId}`;
      await socket.join(room);
      
      this.trackRoomSubscription(room, user.userId);
      
      socket.emit('conversation:joined', {
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });

      // Notify others in the conversation
      socket.to(room).emit('conversation:user-joined', {
        userId: user.userId,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('conversation:leave', async (data: { conversationId: string }) => {
      const room = `conversation:${data.conversationId}`;
      await socket.leave(room);
      
      this.untrackRoomSubscription(room, user.userId);
      
      socket.to(room).emit('conversation:user-left', {
        userId: user.userId,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('conversation:typing', (data: { conversationId: string; isTyping: boolean }) => {
      const room = `conversation:${data.conversationId}`;
      socket.to(room).emit('conversation:typing-indicator', {
        userId: user.userId,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle real-time health monitoring
    socket.on('health:subscribe', async (data: { userId: string }) => {
      if (user.userId === data.userId || user.role === 'provider') {
        const room = `health:${data.userId}`;
        await socket.join(room);
        
        socket.emit('health:subscribed', {
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle authorization updates
    socket.on('authorization:subscribe', async (data: { authorizationId: string }) => {
      const room = `auth:${data.authorizationId}`;
      await socket.join(room);
      
      socket.emit('authorization:subscribed', {
        authorizationId: data.authorizationId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle presence updates
    socket.on('presence:update', (data: { status: 'online' | 'away' | 'busy' }) => {
      const presence = {
        userId: user.userId,
        status: data.status,
        lastSeen: new Date().toISOString(),
      };

      // Broadcast to user's contacts
      this.io?.to(`user:${user.userId}:contacts`).emit('presence:updated', presence);

      // Store in Redis
      redisCluster.setCache(`presence:${user.userId}`, presence, 300);
    });

    // Handle custom events
    socket.on('custom:event', async (data: { event: string; payload: any; target?: string }) => {
      if (data.target) {
        // Send to specific target
        this.io?.to(data.target).emit(data.event, {
          ...data.payload,
          from: user.userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Track room subscriptions
  private trackRoomSubscription(room: string, userId: string): void {
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)!.add(userId);
  }

  // Untrack room subscriptions
  private untrackRoomSubscription(room: string, userId: string): void {
    const roomUsers = this.roomSubscriptions.get(room);
    if (roomUsers) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }
  }

  // Public methods for emitting events

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit to organization
  emitToOrganization(organizationId: string, event: string, data: any): void {
    this.io?.to(`org:${organizationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit to conversation
  emitToConversation(conversationId: string, event: string, data: any): void {
    this.io?.to(`conversation:${conversationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit to role
  emitToRole(role: string, event: string, data: any): void {
    this.io?.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any): void {
    this.io?.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Get user's active connections
  getUserConnections(userId: string): string[] {
    return Array.from(this.userSockets.get(userId) || []);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get room participants
  getRoomParticipants(room: string): string[] {
    return Array.from(this.roomSubscriptions.get(room) || []);
  }

  // Disconnect specific user
  disconnectUser(userId: string, reason?: string): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io?.sockets.sockets.get(socketId)?.disconnect(true);
      });
    }
  }

  // Get server instance
  getServer(): SocketIOServer | null {
    return this.io;
  }

  // Shutdown server
  async shutdown(): Promise<void> {
    if (this.io) {
      // Disconnect all clients
      this.io.disconnectSockets(true);
      
      // Close server
      this.io.close();
      
      this.io = null;
      this.connectedUsers.clear();
      this.userSockets.clear();
      this.roomSubscriptions.clear();
      
      logger.info('WebSocket server shut down');
    }
  }
}

// Export singleton instance
export const websocketServer = WebSocketServer.getInstance();