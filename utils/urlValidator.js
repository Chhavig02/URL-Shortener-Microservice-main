/**
 * URL validation utilities
 */

const dns = require('dns');
const { promisify } = require('util');
const dnsLookup = promisify(dns.lookup);

/**
 * Validates URL format
 * @param {string} urlString - URL to validate
 * @returns {boolean} True if URL format is valid
 */
function isValidUrlFormat(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Validates URL by checking DNS resolution
 * @param {string} urlString - URL to validate
 * @returns {Promise<{valid: boolean, hostname: string|null, error: string|null}>}
 */
async function validateUrl(urlString) {
  if (!isValidUrlFormat(urlString)) {
    return {
      valid: false,
      hostname: null,
      error: 'Invalid URL format. Must include http:// or https://'
    };
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Skip DNS lookup for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        valid: true,
        hostname: hostname,
        error: null
      };
    }

    await dnsLookup(hostname);
    return {
      valid: true,
      hostname: hostname,
      error: null
    };
  } catch (err) {
    return {
      valid: false,
      hostname: null,
      error: 'URL hostname could not be resolved'
    };
  }
}

module.exports = {
  isValidUrlFormat,
  validateUrl
};

