const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate random referral code
const generateReferralCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate secure random token
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID();
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Encrypt sensitive data
const encrypt = (text) => {
  if (!text) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAutoPadding(true);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
};

// Decrypt sensitive data
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAutoPadding(true);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Format currency amount
const formatCurrency = (amount, currency = 'USDT', decimals = 2) => {
  if (typeof amount !== 'number') return '0.00';
  
  const formatted = amount.toFixed(decimals);
  
  switch (currency) {
    case 'USD':
    case 'EUR':
      return `${currency === 'USD' ? '$' : '€'}${formatted}`;
    case 'USDT':
    case 'BTC':
    case 'ETH':
      return `${formatted} ${currency}`;
    default:
      return `${formatted} ${currency}`;
  }
};

// Format percentage
const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number') return '0.00%';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Calculate percentage
const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return (part / total) * 100;
};

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate telegram username
const isValidTelegram = (telegram) => {
  const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
  return telegramRegex.test(telegram);
};

// Validate wallet address (BEP20 only)
const isValidWalletAddress = (address, network = 'BEP20') => {
  if (!address) return false;
  
  // Only validate BEP20 addresses (Binance Smart Chain - same format as Ethereum)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>"'&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
};

// Generate random number between min and max
const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sleep function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Remove sensitive fields from user object
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const sanitized = { ...userObj };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.verification;
  delete sanitized.loginAttempts;
  delete sanitized.lockUntil;
  delete sanitized.__v;
  
  return sanitized;
};

// Calculate time difference in human readable format
const getTimeDifference = (date1, date2 = new Date()) => {
  const diff = Math.abs(date2 - date1);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
};

// Check if date is expired
const isExpired = (date) => {
  return new Date() > new Date(date);
};

// Generate expiration date
const generateExpirationDate = (days = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Validate country code (ISO 3166-1 alpha-2)
const isValidCountryCode = (code) => {
  const countryCodes = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
    'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
    'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
    'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
    'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
    'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
    'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
    'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
    'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
    'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
    'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
    'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
    'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
    'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
    'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
    'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
    'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
    'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
    'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
    'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
    'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
  ];
  
  return countryCodes.includes(code.toUpperCase());
};

// Generate API response format
const createResponse = (success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  
  return response;
};

// Rate limiting key generator
const generateRateLimitKey = (ip, endpoint, userId = null) => {
  const base = `${ip}:${endpoint}`;
  return userId ? `${base}:${userId}` : base;
};

// Mask sensitive information
const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 
    ? username.substring(0, 2) + '*'.repeat(username.length - 2)
    : username;
  return `${maskedUsername}@${domain}`;
};

const maskTelegram = (telegram) => {
  if (!telegram) return '';
  const cleaned = telegram.replace('@', '');
  return cleaned.length > 4
    ? cleaned.substring(0, 2) + '*'.repeat(cleaned.length - 4) + cleaned.slice(-2)
    : cleaned;
};

// Convert string to slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Validate and parse JSON
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

// Check if object is empty
const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

module.exports = {
  generateReferralCode,
  generateSecureToken,
  generateUUID,
  hashPassword,
  comparePassword,
  encrypt,
  decrypt,
  formatCurrency,
  formatPercentage,
  calculatePercentage,
  getPaginationInfo,
  isValidEmail,
  isValidTelegram,
  isValidWalletAddress,
  sanitizeInput,
  randomBetween,
  sleep,
  deepClone,
  sanitizeUser,
  getTimeDifference,
  isExpired,
  generateExpirationDate,
  isValidCountryCode,
  createResponse,
  generateRateLimitKey,
  maskEmail,
  maskTelegram,
  slugify,
  safeJsonParse,
  isEmpty
};