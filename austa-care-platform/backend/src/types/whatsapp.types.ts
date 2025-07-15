/**
 * WhatsApp Types
 * 
 * Type definitions for WhatsApp integration and messaging
 */

import { MessageId, ConversationId, SessionId, UserId, PatientId, PhoneNumber } from './core/branded.types';

// WhatsApp message types
export enum WhatsAppMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
  VOICE = 'voice',
  INTERACTIVE = 'interactive',
  TEMPLATE = 'template'
}

// WhatsApp message status
export enum WhatsAppMessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// WhatsApp conversation status
export enum WhatsAppConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
  CLOSED = 'closed'
}

// WhatsApp session status
export enum WhatsAppSessionStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  AUTHENTICATED = 'authenticated',
  DISCONNECTED = 'disconnected',
  DESTROYED = 'destroyed'
}

// Base WhatsApp message interface
export interface WhatsAppMessage {
  id: MessageId;
  conversationId: ConversationId;
  sessionId: SessionId;
  type: WhatsAppMessageType;
  status: WhatsAppMessageStatus;
  direction: 'inbound' | 'outbound';
  fromNumber: PhoneNumber;
  toNumber: PhoneNumber;
  content: WhatsAppMessageContent;
  timestamp: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
}

// WhatsApp message content (union type based on message type)
export type WhatsAppMessageContent = 
  | TextMessageContent
  | MediaMessageContent
  | LocationMessageContent
  | ContactMessageContent
  | InteractiveMessageContent
  | TemplateMessageContent;

// Text message content
export interface TextMessageContent {
  type: 'text';
  text: string;
}

// Media message content (image, audio, video, document, sticker, voice)
export interface MediaMessageContent {
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'voice';
  mediaUrl: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  duration?: number; // for audio/video
}

// Location message content
export interface LocationMessageContent {
  type: 'location';
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// Contact message content
export interface ContactMessageContent {
  type: 'contact';
  contacts: {
    name: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      formattedName: string;
    };
    phones?: {
      phone: string;
      type?: string;
    }[];
    emails?: {
      email: string;
      type?: string;
    }[];
    organization?: {
      company?: string;
      department?: string;
      title?: string;
    };
  }[];
}

// Interactive message content (buttons, lists)
export interface InteractiveMessageContent {
  type: 'interactive';
  interactiveType: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    mediaUrl?: string;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: ButtonAction | ListAction;
}

// Button action for interactive messages
export interface ButtonAction {
  buttons: {
    id: string;
    title: string;
    type: 'reply';
  }[];
}

// List action for interactive messages
export interface ListAction {
  buttonText: string;
  sections: {
    title?: string;
    rows: {
      id: string;
      title: string;
      description?: string;
    }[];
  }[];
}

// Template message content
export interface TemplateMessageContent {
  type: 'template';
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

// Template component
export interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: {
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: {
      fallback_value: string;
      code: string;
      amount_1000: number;
    };
    date_time?: {
      fallback_value: string;
    };
    image?: {
      link: string;
    };
    document?: {
      link: string;
      filename: string;
    };
    video?: {
      link: string;
    };
  }[];
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  url?: string;
}

// WhatsApp conversation
export interface WhatsAppConversation {
  id: ConversationId;
  sessionId: SessionId;
  patientId?: PatientId;
  contactNumber: PhoneNumber;
  contactName?: string;
  status: WhatsAppConversationStatus;
  lastMessageId?: MessageId;
  lastMessageAt?: Date;
  unreadCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// WhatsApp session
export interface WhatsAppSession {
  id: SessionId;
  name: string;
  status: WhatsAppSessionStatus;
  phoneNumber?: PhoneNumber;
  qrCode?: string;
  deviceInfo?: {
    pushname: string;
    platform: string;
    version: string;
  };
  batteryInfo?: {
    battery: number;
    plugged: boolean;
  };
  connectedAt?: Date;
  lastSeen?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// WhatsApp webhook event
export interface WhatsAppWebhookEvent {
  eventType: 'message' | 'status' | 'session' | 'qr' | 'ready' | 'disconnected';
  sessionId: SessionId;
  timestamp: Date;
  data: any;
}

// WhatsApp template
export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  status: 'approved' | 'pending' | 'rejected';
  components: TemplateComponent[];
}

// Type guards
export const isWhatsAppMessageType = (value: any): value is WhatsAppMessageType => {
  return Object.values(WhatsAppMessageType).includes(value);
};

export const isWhatsAppMessageStatus = (value: any): value is WhatsAppMessageStatus => {
  return Object.values(WhatsAppMessageStatus).includes(value);
};

export const isWhatsAppConversationStatus = (value: any): value is WhatsAppConversationStatus => {
  return Object.values(WhatsAppConversationStatus).includes(value);
};

export const isWhatsAppSessionStatus = (value: any): value is WhatsAppSessionStatus => {
  return Object.values(WhatsAppSessionStatus).includes(value);
};