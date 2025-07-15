/**
 * Z-API WhatsApp TypeScript Interfaces
 * Comprehensive type definitions for Z-API integration
 */

// Base message interface
export interface ZAPIMessage {
  messageId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  from: string;
  to: string;
  instanceId: string;
}

// Text message interface
export interface ZAPITextMessage extends ZAPIMessage {
  type: 'text';
  text: {
    body: string;
  };
}

// Image message interface
export interface ZAPIImageMessage extends ZAPIMessage {
  type: 'image';
  image: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
    mimeType?: string;
  };
}

// Document message interface
export interface ZAPIDocumentMessage extends ZAPIMessage {
  type: 'document';
  document: {
    id?: string;
    link?: string;
    caption?: string;
    filename: string;
    mimeType: string;
  };
}

// Audio message interface
export interface ZAPIAudioMessage extends ZAPIMessage {
  type: 'audio';
  audio: {
    id?: string;
    link?: string;
    mimeType?: string;
  };
}

// Video message interface
export interface ZAPIVideoMessage extends ZAPIMessage {
  type: 'video';
  video: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
    mimeType?: string;
  };
}

// Location message interface
export interface ZAPILocationMessage extends ZAPIMessage {
  type: 'location';
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// Contact message interface
export interface ZAPIContactMessage extends ZAPIMessage {
  type: 'contact';
  contact: {
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
    };
    phones?: Array<{
      phone: string;
      type?: string;
    }>;
    emails?: Array<{
      email: string;
      type?: string;
    }>;
  };
}

// Button message interface
export interface ZAPIButtonMessage extends ZAPIMessage {
  type: 'button';
  button: {
    text: string;
    buttons: Array<{
      id: string;
      title: string;
    }>;
  };
}

// List message interface
export interface ZAPIListMessage extends ZAPIMessage {
  type: 'list';
  list: {
    text: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
}

// Template message interface
export interface ZAPITemplateMessage extends ZAPIMessage {
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: 'header' | 'body' | 'footer' | 'button';
      parameters?: Array<{
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
      }>;
    }>;
  };
}

// Union type for all message types
export type ZAPIMessageType = 
  | ZAPITextMessage
  | ZAPIImageMessage
  | ZAPIDocumentMessage
  | ZAPIAudioMessage
  | ZAPIVideoMessage
  | ZAPILocationMessage
  | ZAPIContactMessage
  | ZAPIButtonMessage
  | ZAPIListMessage
  | ZAPITemplateMessage;

// Webhook payload interface
export interface ZAPIWebhookPayload {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  status: 'received' | 'sent' | 'delivered' | 'read';
  chatName: string;
  senderPhoto: string;
  senderName: string;
  participantPhone?: string;
  photo?: string;
  broadcast?: boolean;
  type: 'ReceivedCallback' | 'DeliveryCallback' | 'ReadCallback';
  text?: {
    message: string;
  };
  image?: {
    mimeType: string;
    imageUrl: string;
    caption?: string;
    thumbnailUrl?: string;
  };
  document?: {
    mimeType: string;
    fileName: string;
    title?: string;
    pageCount?: number;
    documentUrl: string;
    thumbnailUrl?: string;
  };
  audio?: {
    audioUrl: string;
    mimeType: string;
  };
  video?: {
    videoUrl: string;
    mimeType: string;
    caption?: string;
    thumbnailUrl?: string;
  };
  contact?: {
    displayName: string;
    vcard: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    url?: string;
  };
  buttonsResponseMessage?: {
    buttonId: string;
    buttonText: string;
    selectedButtonId: string;
    selectedButtonText: string;
  };
  listResponseMessage?: {
    listType: number;
    singleSelectReply: {
      selectedRowId: string;
      title: string;
      description?: string;
    };
  };
}

// Send message request interfaces
export interface SendTextMessageRequest {
  phone: string;
  message: string;
  delayMessage?: number;
}

export interface SendImageMessageRequest {
  phone: string;
  image: string; // URL or base64
  caption?: string;
  delayMessage?: number;
}

export interface SendDocumentMessageRequest {
  phone: string;
  document: string; // URL or base64
  fileName: string;
  caption?: string;
  delayMessage?: number;
}

export interface SendAudioMessageRequest {
  phone: string;
  audio: string; // URL or base64
  delayMessage?: number;
}

export interface SendVideoMessageRequest {
  phone: string;
  video: string; // URL or base64
  caption?: string;
  delayMessage?: number;
}

export interface SendLocationMessageRequest {
  phone: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  delayMessage?: number;
}

export interface SendContactMessageRequest {
  phone: string;
  contactName: string;
  contactPhone: string;
  contactOrganization?: string;
  delayMessage?: number;
}

export interface SendButtonMessageRequest {
  phone: string;
  message: string;
  buttonText: string;
  buttons: Array<{
    id: string;
    text: string;
  }>;
  footer?: string;
  delayMessage?: number;
}

export interface SendListMessageRequest {
  phone: string;
  message: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
  footer?: string;
  delayMessage?: number;
}

export interface SendTemplateMessageRequest {
  phone: string;
  templateName: string;
  language?: string;
  variables?: string[];
  delayMessage?: number;
}

// API response interfaces
export interface ZAPIResponse<T = any> {
  value: T;
  status: 'success' | 'error';
  message?: string;
  error?: string;
}

export interface SendMessageResponse {
  messageId: string;
  sent: boolean;
  message: string;
  phone: string;
}

export interface InstanceStatusResponse {
  connected: boolean;
  session: string;
  smartphoneConnected: boolean;
  error?: string;
}

export interface QRCodeResponse {
  value: string; // base64 QR code
  status: string;
}

// Error interfaces
export interface ZAPIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Rate limiting interface
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Message queue interfaces
export interface QueuedMessage {
  id: string;
  type: string;
  payload: any;
  phone: string;
  attempts: number;
  maxAttempts: number;
  nextRetry: Date;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error?: string;
}

export interface MessageQueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

// Webhook verification interface
export interface WebhookVerification {
  challenge: string;
  verify_token: string;
  mode: string;
}

// Message status tracking
export interface MessageStatus {
  messageId: string;
  phone: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  error?: string;
  retryCount?: number;
}

// Chat and contact interfaces
export interface ZAPIContact {
  phone: string;
  name?: string;
  pushName?: string;
  profilePictureUrl?: string;
  isGroup?: boolean;
  isBusiness?: boolean;
  lastSeen?: number;
}

export interface ZAPIChat {
  phone: string;
  name?: string;
  isGroup: boolean;
  participants?: ZAPIContact[];
  lastMessage?: {
    messageId: string;
    text: string;
    timestamp: number;
    fromMe: boolean;
  };
  unreadCount: number;
  archived: boolean;
  pinned: boolean;
}

// Instance management interfaces
export interface InstanceInfo {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qrCode?: string;
  phone?: string;
  name?: string;
  profilePicture?: string;
  connectedAt?: number;
}

// Webhook event types
export type WebhookEventType = 
  | 'message.received'
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'instance.connected'
  | 'instance.disconnected'
  | 'qrcode.updated'
  | 'battery.low'
  | 'phone.changed';

export interface WebhookEvent {
  type: WebhookEventType;
  instanceId: string;
  timestamp: number;
  data: ZAPIWebhookPayload;
}