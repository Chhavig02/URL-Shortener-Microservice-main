/**
 * Utility functions for URL shortening
 */

// Base62 character set for URL-friendly encoding
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Converts a number to base62 string
 * @param {number} num - The number to convert
 * @returns {string} Base62 encoded string
 */
function encodeBase62(num) {
  if (num === 0) return '0';
  let result = '';
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

/**
 * Converts a base62 string back to number
 * @param {string} str - Base62 encoded string
 * @returns {number} Decoded number
 */
function decodeBase62(str) {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    num = num * 62 + BASE62.indexOf(str[i]);
  }
  return num;
}

/**
 * Generates a random short code
 * @param {number} length - Length of the code (default: 6)
 * @returns {string} Random short code
 */
function generateRandomCode(length = 6) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return result;
}

/**
 * Validates if a string is a valid custom alias
 * @param {string} alias - The alias to validate
 * @returns {boolean} True if valid
 */
function isValidAlias(alias) {
  // Alias should be 3-20 characters, alphanumeric and hyphens only
  const aliasRegex = /^[a-zA-Z0-9-]{3,20}$/;
  return aliasRegex.test(alias);
}

module.exports = {
  encodeBase62,
  decodeBase62,
  generateRandomCode,
  isValidAlias
};

