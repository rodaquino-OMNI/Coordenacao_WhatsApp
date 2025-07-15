// Utility functions for mock services

/**
 * Simulate network delay
 * @param {Object} delayConfig - Object with min and max delay values
 * @returns {Promise} Promise that resolves after delay
 */
async function simulateDelay(delayConfig) {
  const delay = Math.floor(
    Math.random() * (delayConfig.max - delayConfig.min) + delayConfig.min
  );
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate random errors based on error rate
 * @param {number} errorRate - Error rate between 0 and 1
 * @param {string} errorMessage - Custom error message
 * @returns {void} Throws error if random check fails
 */
function simulateError(errorRate, errorMessage = 'Mock service error') {
  if (Math.random() < errorRate) {
    const error = new Error(errorMessage);
    error.mockError = true;
    throw error;
  }
}

/**
 * Generate random ID
 * @param {string} prefix - ID prefix
 * @returns {string} Random ID
 */
function generateId(prefix = 'mock') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random phone number
 * @returns {string} Random phone number in WhatsApp format
 */
function generatePhoneNumber() {
  const countryCode = ['55', '1', '44', '34'][Math.floor(Math.random() * 4)];
  const number = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${countryCode}${number}`;
}

/**
 * Pick random item from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random item from array
 */
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
  simulateDelay,
  simulateError,
  generateId,
  generatePhoneNumber,
  pickRandom
};