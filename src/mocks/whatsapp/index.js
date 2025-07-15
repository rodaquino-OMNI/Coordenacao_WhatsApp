// WhatsApp Business API Mock
const EventEmitter = require('events');
const config = require('../config');
const { simulateDelay, simulateError, generateId, generatePhoneNumber } = require('../utils/delay');
const dataGenerator = require('../data/generator');

class WhatsAppMock extends EventEmitter {
  constructor() {
    super();
    this.messages = new Map();
    this.webhookCallbacks = new Map();
    this.media = new Map();
    this.contacts = new Map();
    this.messageStatuses = ['sent', 'delivered', 'read', 'failed'];
    
    // Initialize with some mock contacts
    this.initializeMockContacts();
  }

  initializeMockContacts() {
    const mockContacts = dataGenerator.generateContacts(20);
    mockContacts.forEach(contact => {
      this.contacts.set(contact.wa_id, contact);
    });
  }

  /**
   * Send message mock
   * @param {Object} messageData - Message data object
   * @returns {Promise<Object>} Message response
   */
  async sendMessage(messageData) {
    await simulateDelay(config.delays.whatsapp.sendMessage);
    simulateError(config.errorRates.whatsapp, 'WhatsApp API temporarily unavailable');

    const messageId = generateId('wamid');
    const message = {
      messaging_product: 'whatsapp',
      contacts: [{
        input: messageData.to,
        wa_id: messageData.to
      }],
      messages: [{
        id: messageId
      }]
    };

    // Store message
    this.messages.set(messageId, {
      ...messageData,
      id: messageId,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });

    // Simulate status updates
    this.simulateMessageStatusUpdates(messageId, messageData.to);

    // Simulate reply for interactive messages
    if (messageData.type === 'interactive') {
      this.simulateInteractiveReply(messageId, messageData);
    }

    return message;
  }

  /**
   * Send template message mock
   * @param {Object} templateData - Template message data
   * @returns {Promise<Object>} Message response
   */
  async sendTemplate(templateData) {
    return this.sendMessage({
      ...templateData,
      type: 'template'
    });
  }

  /**
   * Upload media mock
   * @param {Buffer} mediaBuffer - Media file buffer
   * @param {Object} metadata - Media metadata
   * @returns {Promise<Object>} Media upload response
   */
  async uploadMedia(mediaBuffer, metadata) {
    await simulateDelay(config.delays.whatsapp.mediaUpload);
    simulateError(config.errorRates.whatsapp, 'Media upload failed');

    const mediaId = generateId('media');
    this.media.set(mediaId, {
      id: mediaId,
      ...metadata,
      size: mediaBuffer.length,
      uploadedAt: new Date().toISOString()
    });

    return { id: mediaId };
  }

  /**
   * Download media mock
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object>} Media data
   */
  async downloadMedia(mediaId) {
    await simulateDelay(config.delays.whatsapp.sendMessage);
    
    const media = this.media.get(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    // Return mock media data
    return {
      url: `https://mock-media.whatsapp.com/${mediaId}`,
      mime_type: media.mime_type || 'image/jpeg',
      sha256: 'mock_sha256_hash',
      file_size: media.size
    };
  }

  /**
   * Register webhook mock
   * @param {string} url - Webhook URL
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Registration response
   */
  async registerWebhook(url, token) {
    await simulateDelay(config.delays.whatsapp.webhook);
    
    const webhookId = generateId('webhook');
    this.webhookCallbacks.set(webhookId, { url, token });
    
    return {
      success: true,
      webhook_id: webhookId
    };
  }

  /**
   * Simulate incoming message
   * @param {Object} options - Message options
   * @returns {Object} Incoming message object
   */
  simulateIncomingMessage(options = {}) {
    const from = options.from || generatePhoneNumber();
    const contact = this.contacts.get(from) || dataGenerator.generateContact();
    
    const message = {
      id: generateId('wamid'),
      from,
      timestamp: new Date().toISOString(),
      type: options.type || 'text',
      ...this.generateMessageContent(options.type || 'text', options)
    };

    const webhookPayload = {
      entry: [{
        id: generateId('entry'),
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550555555',
              phone_number_id: generateId('phone')
            },
            contacts: [contact],
            messages: [message]
          },
          field: 'messages'
        }]
      }]
    };

    // Emit webhook event
    this.emit('webhook', webhookPayload);
    
    return webhookPayload;
  }

  /**
   * Generate message content based on type
   * @param {string} type - Message type
   * @param {Object} options - Content options
   * @returns {Object} Message content
   */
  generateMessageContent(type, options = {}) {
    switch (type) {
      case 'text':
        return {
          text: {
            body: options.text || dataGenerator.generateMessageText()
          }
        };
      
      case 'image':
        return {
          image: {
            mime_type: 'image/jpeg',
            sha256: 'mock_sha256',
            id: generateId('media'),
            caption: options.caption || 'Mock image'
          }
        };
      
      case 'document':
        return {
          document: {
            mime_type: 'application/pdf',
            sha256: 'mock_sha256',
            id: generateId('media'),
            filename: options.filename || 'document.pdf',
            caption: options.caption || 'Mock document'
          }
        };
      
      case 'location':
        return {
          location: {
            longitude: options.longitude || -46.6333,
            latitude: options.latitude || -23.5505,
            name: options.name || 'Mock Location',
            address: options.address || 'São Paulo, Brazil'
          }
        };
      
      case 'button':
        return {
          interactive: {
            type: 'button',
            body: {
              text: options.body || 'Please select an option'
            },
            action: {
              buttons: options.buttons || [
                { type: 'reply', reply: { id: 'btn1', title: 'Option 1' } },
                { type: 'reply', reply: { id: 'btn2', title: 'Option 2' } }
              ]
            }
          }
        };
      
      default:
        return { text: { body: 'Unknown message type' } };
    }
  }

  /**
   * Simulate message status updates
   * @param {string} messageId - Message ID
   * @param {string} recipient - Recipient phone number
   */
  simulateMessageStatusUpdates(messageId, recipient) {
    const statuses = ['sent', 'delivered', 'read'];
    let currentIndex = 0;

    const sendStatusUpdate = () => {
      if (currentIndex >= statuses.length) return;

      const status = statuses[currentIndex];
      const statusPayload = {
        entry: [{
          id: generateId('entry'),
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550555555',
                phone_number_id: generateId('phone')
              },
              statuses: [{
                id: messageId,
                status,
                timestamp: new Date().toISOString(),
                recipient_id: recipient
              }]
            },
            field: 'messages'
          }]
        }]
      };

      this.emit('webhook', statusPayload);
      
      // Update stored message status
      const message = this.messages.get(messageId);
      if (message) {
        message.status = status;
      }

      currentIndex++;
      
      // Schedule next status update
      if (currentIndex < statuses.length) {
        setTimeout(sendStatusUpdate, Math.random() * 3000 + 1000);
      }
    };

    // Start status updates after a delay
    setTimeout(sendStatusUpdate, Math.random() * 2000 + 500);
  }

  /**
   * Simulate interactive reply
   * @param {string} originalMessageId - Original message ID
   * @param {Object} messageData - Original message data
   */
  simulateInteractiveReply(originalMessageId, messageData) {
    setTimeout(() => {
      // 70% chance of getting a reply
      if (Math.random() < 0.7) {
        const buttonReply = {
          from: messageData.to,
          type: 'interactive',
          interactive: {
            type: 'button_reply',
            button_reply: {
              id: 'btn1',
              title: 'Option 1'
            }
          },
          context: {
            from: '15550555555',
            id: originalMessageId
          }
        };

        this.simulateIncomingMessage(buttonReply);
      }
    }, Math.random() * 5000 + 2000);
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message ID
   * @returns {Object} Message object
   */
  getMessage(messageId) {
    return this.messages.get(messageId);
  }

  /**
   * Get all messages for a contact
   * @param {string} contactId - Contact ID
   * @returns {Array} Messages array
   */
  getMessagesForContact(contactId) {
    return Array.from(this.messages.values())
      .filter(msg => msg.to === contactId || msg.from === contactId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Clear all mock data
   */
  clearMockData() {
    this.messages.clear();
    this.media.clear();
    this.webhookCallbacks.clear();
  }
}

// Export singleton instance
module.exports = new WhatsAppMock();