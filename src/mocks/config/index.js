// Mock Services Configuration
const path = require('path');

module.exports = {
  // Enable/disable mocks
  enabled: process.env.USE_MOCKS === 'true' || process.env.NODE_ENV === 'development',
  
  // Mock delays to simulate network latency
  delays: {
    whatsapp: {
      sendMessage: { min: 100, max: 500 },
      webhook: { min: 50, max: 200 },
      mediaUpload: { min: 500, max: 2000 }
    },
    aws: {
      s3: { min: 100, max: 300 },
      sqs: { min: 50, max: 150 },
      sns: { min: 50, max: 100 },
      secrets: { min: 20, max: 50 }
    },
    external: {
      tasy: { min: 200, max: 800 },
      openai: { min: 1000, max: 3000 },
      ocr: { min: 2000, max: 5000 }
    }
  },
  
  // Error rates for testing (0-1)
  errorRates: {
    whatsapp: 0.05, // 5% error rate
    aws: 0.02,      // 2% error rate
    external: 0.1   // 10% error rate
  },
  
  // Local storage paths
  localStorage: {
    s3: path.join(__dirname, '../../../.mock-storage/s3'),
    secrets: path.join(__dirname, '../../../.mock-storage/secrets.json'),
    mediaUploads: path.join(__dirname, '../../../.mock-storage/media')
  },
  
  // Mock data settings
  mockData: {
    maxHistoryItems: 100,
    defaultPageSize: 20,
    seedData: true
  }
};