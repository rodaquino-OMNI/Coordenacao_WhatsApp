# WhatsApp Integration with Z-API

## Overview

This document provides comprehensive information about the WhatsApp integration using Z-API for the AUSTA Care Platform. The integration includes message sending, webhook handling, media support, and robust error handling with retry mechanisms.

## Features

### Core Functionality
- ✅ **Text Messages**: Send and receive text messages
- ✅ **Media Messages**: Support for images, documents, audio, and video
- ✅ **Interactive Messages**: Buttons and list menus
- ✅ **Location Sharing**: Send and receive location data
- ✅ **Contact Sharing**: Exchange contact information
- ✅ **Template Messages**: WhatsApp Business templates
- ✅ **Message Status**: Delivery and read receipts

### Advanced Features
- ✅ **Webhook Validation**: Signature verification and IP filtering
- ✅ **Rate Limiting**: Intelligent rate limiting with exponential backoff
- ✅ **Retry Mechanism**: Automatic retry for failed messages
- ✅ **Message Queue**: Reliable message delivery with queue management
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Security**: Input validation and sanitization

## Architecture

### Service Layer Structure
```
src/
├── types/whatsapp.ts              # TypeScript interfaces
├── services/
│   ├── whatsapp.service.ts        # Core Z-API service
│   └── webhook-processor.service.ts # Webhook event processing
├── controllers/whatsapp.ts        # REST API endpoints
├── utils/webhook.ts               # Security utilities
└── tests/                         # Comprehensive test suite
```

### Key Components

#### 1. WhatsApp Service (`whatsapp.service.ts`)
- **Purpose**: Core Z-API integration service
- **Features**:
  - Axios client with interceptors
  - Automatic retry with exponential backoff
  - Rate limiting management
  - Message queue for failed messages
  - Phone number formatting
  - Error handling and logging

#### 2. Webhook Processor (`webhook-processor.service.ts`)
- **Purpose**: Process incoming Z-API webhooks
- **Features**:
  - Event-driven architecture with EventEmitter
  - Message type detection and routing
  - Auto-reply functionality
  - Message status tracking
  - Custom event handlers

#### 3. Webhook Security (`webhook.ts`)
- **Purpose**: Security utilities for webhook validation
- **Features**:
  - HMAC-SHA256 signature validation
  - IP address whitelisting
  - Rate limiting for webhooks
  - Payload sanitization
  - Timing attack prevention

## Configuration

### Environment Variables

```bash
# Z-API Configuration
ZAPI_BASE_URL="https://api.z-api.io"
ZAPI_INSTANCE_ID="your-instance-id"
ZAPI_TOKEN="your-api-token"
ZAPI_WEBHOOK_SECRET="your-webhook-secret"
ZAPI_WEBHOOK_VERIFY_TOKEN="your-verify-token"

# Rate Limiting
ZAPI_RATE_LIMIT_REQUESTS="20"
ZAPI_RATE_LIMIT_WINDOW_MS="60000"

# Retry Configuration
ZAPI_RETRY_ATTEMPTS="3"
ZAPI_RETRY_DELAY_MS="1000"
```

### Z-API Instance Setup

1. **Create Z-API Account**: Sign up at [Z-API Console](https://developer.z-api.io/)
2. **Create Instance**: Generate a new WhatsApp instance
3. **Get Credentials**: Copy Instance ID and Token
4. **Configure Webhook**: Set webhook URL in Z-API console
5. **Connect WhatsApp**: Scan QR code to connect your WhatsApp

## API Endpoints

### Message Sending

#### Send Text Message
```http
POST /api/whatsapp/send-text
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Hello, World!",
  "delayMessage": 0
}
```

#### Send Image Message
```http
POST /api/whatsapp/send-image
Content-Type: application/json

{
  "phone": "5511999999999",
  "image": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "delayMessage": 0
}
```

#### Send Document Message
```http
POST /api/whatsapp/send-document
Content-Type: application/json

{
  "phone": "5511999999999",
  "document": "https://example.com/document.pdf",
  "fileName": "report.pdf",
  "caption": "Monthly report",
  "delayMessage": 0
}
```

#### Send Template Message
```http
POST /api/whatsapp/send-template
Content-Type: application/json

{
  "phone": "5511999999999",
  "templateName": "appointment_reminder",
  "language": "pt_BR",
  "variables": ["João", "15/07/2025", "14:30"]
}
```

### Instance Management

#### Get Instance Status
```http
GET /api/whatsapp/status
```

#### Get QR Code
```http
GET /api/whatsapp/qr-code
```

#### Health Check
```http
GET /api/whatsapp/health
```

### Data Retrieval

#### Get Contacts
```http
GET /api/whatsapp/contacts
```

#### Get Chats
```http
GET /api/whatsapp/chats
```

#### Get Rate Limit Info
```http
GET /api/whatsapp/rate-limit
```

### Queue Management

#### Clear Completed Messages
```http
POST /api/whatsapp/queue/clear
```

## Webhook Events

### Webhook URL Configuration
Set your webhook URL in the Z-API console:
```
https://your-domain.com/api/whatsapp/webhook
```

### Supported Events

#### Message Events
- `message.text` - Text message received
- `message.image` - Image message received
- `message.document` - Document message received
- `message.audio` - Audio message received
- `message.video` - Video message received
- `message.location` - Location message received
- `message.contact` - Contact message received
- `message.button_response` - Button interaction
- `message.list_response` - List menu selection

#### Status Events
- `message.status.delivered` - Message delivered
- `message.status.read` - Message read
- `message.status.failed` - Message failed

#### System Events
- `webhook.received` - Webhook received
- `webhook.processed` - Webhook processed
- `webhook.error` - Webhook processing error

### Event Handler Registration

```typescript
import { webhookProcessor } from '@/services/webhook-processor.service';

// Register custom text message handler
webhookProcessor.on('message.text', async (data) => {
  console.log(`Received message from ${data.phone}: ${data.message}`);
  
  // Add your business logic here
  // e.g., AI analysis, database storage, etc.
});

// Register custom error handler
webhookProcessor.on('webhook.error', async ({ error, payload }) => {
  console.error('Webhook error:', error.message);
  
  // Add error handling logic
  // e.g., alert administrators, retry logic, etc.
});
```

## Security

### Webhook Validation
All webhooks are validated using:
- **Signature Verification**: HMAC-SHA256 validation
- **IP Filtering**: Whitelist of allowed IP addresses
- **Rate Limiting**: Protection against webhook flooding
- **Payload Validation**: Structure and content validation

### Configuration Example
```typescript
// Webhook signature validation
const isValid = validateWebhookSignature(
  JSON.stringify(payload),
  req.headers['x-signature'],
  config.zapi.webhookSecret
);

// IP address validation
const isAllowed = validateRequestIP(
  req.ip,
  ['35.0.0.0/8', '18.0.0.0/8'] // Z-API IP ranges
);
```

## Error Handling

### Retry Mechanism
The service implements exponential backoff retry:
- **Max Attempts**: 3 (configurable)
- **Base Delay**: 1 second (configurable)
- **Exponential Factor**: 2x per attempt
- **No Retry**: Client errors (4xx) except 429

### Error Types
- **Network Errors**: Connection issues, timeouts
- **Rate Limit Errors**: API quota exceeded
- **Authentication Errors**: Invalid credentials
- **Validation Errors**: Invalid request format
- **Business Logic Errors**: Instance not connected

### Error Logging
All errors are logged with context:
```typescript
logger.error('Message sending failed', {
  messageId: 'msg_123',
  phone: '5511999999999',
  error: error.message,
  attempt: 2,
  maxAttempts: 3
});
```

## Rate Limiting

### API Rate Limits
Z-API enforces rate limits:
- **Default**: 20 requests per minute
- **Burst**: Short bursts allowed
- **Headers**: Rate limit info in response headers

### Implementation
```typescript
// Rate limit tracking
private rateLimitInfo: RateLimitInfo = {
  limit: 20,
  remaining: 19,
  reset: Date.now() + 60000,
  retryAfter: 60
};

// Wait for rate limit reset
private async waitForRateLimit(): Promise<void> {
  if (this.rateLimitInfo.remaining <= 0) {
    const waitTime = this.rateLimitInfo.reset - Date.now();
    if (waitTime > 0) {
      await this.delay(waitTime);
    }
  }
}
```

## Message Queue

### Queue Management
Failed messages are automatically queued for retry:
- **Automatic Queuing**: Failed messages added to queue
- **Retry Scheduling**: Exponential backoff scheduling
- **Status Tracking**: Pending, processing, sent, failed
- **Cleanup**: Automatic cleanup of completed messages

### Queue Operations
```typescript
// Add message to queue
const messageId = whatsappService.addToQueue({
  type: 'text',
  payload: { phone: '5511999999999', message: 'Hello' },
  phone: '5511999999999',
  attempts: 0,
  maxAttempts: 3,
  nextRetry: new Date(Date.now() + 1000),
  status: 'pending'
});

// Get queue statistics
const stats = whatsappService.getQueueStats();
console.log(`Queue: ${stats.pending} pending, ${stats.failed} failed`);

// Clear completed messages
const cleared = whatsappService.clearCompletedMessages();
console.log(`Cleared ${cleared} completed messages`);
```

## Phone Number Formatting

### Automatic Formatting
Phone numbers are automatically formatted:
- **Brazilian Numbers**: Add country code 55 if missing
- **Cleaning**: Remove non-digit characters
- **Validation**: Basic format validation

### Examples
```typescript
// Input formats (all become 5511999999999)
'11999999999'           // Add country code
'+55 (11) 99999-9999'   // Clean formatting
'5511999999999'         // Already formatted
```

## Testing

### Unit Tests
Comprehensive test suite covers:
- **Service Methods**: All WhatsApp service methods
- **Error Handling**: Various error scenarios
- **Retry Logic**: Exponential backoff testing
- **Rate Limiting**: Rate limit enforcement
- **Phone Formatting**: Number formatting logic
- **Webhook Validation**: Security utilities

### Test Commands
```bash
# Run all tests
npm test

# Run WhatsApp service tests
npm test -- --testPathPattern=whatsapp.service.test.ts

# Run webhook tests
npm test -- --testPathPattern=webhook.test.ts

# Run tests with coverage
npm run test:coverage
```

### Integration Testing
```typescript
// Example integration test
describe('WhatsApp Integration', () => {
  it('should send message and receive webhook', async () => {
    // Send message
    const result = await whatsappService.sendTextMessage({
      phone: '5511999999999',
      message: 'Test message'
    });
    
    expect(result.sent).toBe(true);
    
    // Simulate webhook
    const webhook = {
      instanceId: 'test-instance',
      messageId: result.messageId,
      phone: '5511999999999',
      type: 'DeliveryCallback'
    };
    
    await webhookProcessor.processWebhook(webhook);
    
    // Verify status update
    // ... assertions
  });
});
```

## Monitoring and Observability

### Health Check
The `/health` endpoint provides comprehensive status:
```json
{
  "success": true,
  "message": "WhatsApp service health check",
  "data": {
    "status": "ok",
    "timestamp": "2025-07-15T00:00:00.000Z",
    "instance": {
      "connected": true,
      "session": "active",
      "smartphoneConnected": true
    },
    "rateLimit": {
      "limit": 20,
      "remaining": 15,
      "reset": 1640995200
    },
    "queue": {
      "pending": 0,
      "processing": 0,
      "sent": 150,
      "failed": 2,
      "total": 152
    },
    "handlers": {
      "messageHandlers": ["text", "image", "document"],
      "statusHandlers": ["DeliveryCallback", "ReadCallback"]
    }
  }
}
```

### Metrics Collection
Key metrics to monitor:
- **Message Volume**: Messages sent/received per period
- **Success Rate**: Percentage of successful deliveries
- **Error Rate**: Failed message percentage
- **Response Time**: API response times
- **Queue Depth**: Number of queued messages
- **Rate Limit Usage**: API quota consumption

### Logging
Structured logging with context:
```typescript
logger.info('Text message sent successfully', {
  messageId: 'msg_123',
  phone: '5511***9999',
  messageLength: 150,
  responseTime: 250
});
```

## Production Deployment

### Prerequisites
- Node.js 18+ 
- Redis for caching/sessions
- PostgreSQL for data persistence
- SSL certificate for webhook HTTPS
- Firewall configured for Z-API IPs

### Environment Setup
1. **Configure Environment**: Set all required environment variables
2. **Database Migration**: Run database migrations
3. **SSL Certificate**: Configure HTTPS for webhooks
4. **Webhook URL**: Update Z-API console with production webhook URL
5. **Monitoring**: Setup monitoring and alerting

### Security Checklist
- [ ] Webhook secret configured
- [ ] IP whitelist enabled
- [ ] Rate limiting configured
- [ ] SSL/TLS enabled
- [ ] Input validation enabled
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring setup

## Troubleshooting

### Common Issues

#### Instance Not Connected
```bash
# Check instance status
curl -X GET "https://api.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/status"

# Get QR code if needed
curl -X GET "https://api.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/qr-code"
```

#### Webhook Not Receiving Messages
1. Check webhook URL in Z-API console
2. Verify HTTPS certificate
3. Check firewall rules
4. Validate webhook secret
5. Review server logs

#### Rate Limit Issues
1. Monitor rate limit headers
2. Implement exponential backoff
3. Consider message batching
4. Contact Z-API for limit increase

#### Message Delivery Failures
1. Check phone number format
2. Verify WhatsApp account status
3. Review error logs
4. Check message content compliance

### Debug Commands
```bash
# Check service health
curl -X GET "http://localhost:3000/api/whatsapp/health"

# Get rate limit info
curl -X GET "http://localhost:3000/api/whatsapp/rate-limit"

# Send test message
curl -X POST "http://localhost:3000/api/whatsapp/send-text" \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Test message"}'
```

## Best Practices

### Development
- Use TypeScript for type safety
- Implement comprehensive error handling
- Add extensive unit tests
- Use structured logging
- Follow security best practices

### Performance
- Implement connection pooling
- Use Redis for caching
- Optimize retry logic
- Monitor rate limits
- Batch operations when possible

### Security
- Validate all inputs
- Use webhook signature verification
- Implement IP whitelisting
- Rate limit all endpoints
- Sanitize logged data

### Reliability
- Implement retry mechanisms
- Use message queues
- Monitor service health
- Set up alerting
- Plan for failover

## Support and Resources

### Documentation
- [Z-API Official Documentation](https://docs.z-api.io/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [AUSTA Care Platform Documentation](../README.md)

### Contact
- Technical Support: [Insert contact information]
- Z-API Support: [Z-API support channels]
- Emergency Contact: [Emergency contact information]

---

This integration provides a robust, scalable, and secure WhatsApp messaging solution for the AUSTA Care Platform with comprehensive error handling, monitoring, and observability features.