const crypto = require('crypto');
const logger = require('./logger');

/**
 * Lista de direcciones conocidas como sospechosas o de alto riesgo
 * En producción, esto debería venir de una base de datos o servicio externo
 */
const SUSPICIOUS_ADDRESSES = [
  // Direcciones de ejemplo - en producción cargar desde base de datos
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Tether Treasury
  'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', // Binance Hot Wallet
  // Agregar más direcciones según sea necesario
];

/**
 * Lista de direcciones conocidas como legítimas (whitelist)
 */
const WHITELISTED_ADDRESSES = [
  // Direcciones de exchanges conocidos y servicios legítimos
  'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', // Binance
  'TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS', // Huobi
  // Agregar más direcciones según sea necesario
];

/**
 * Patrones de direcciones por red
 */
const ADDRESS_PATTERNS = {
  BEP20: /^0x[a-fA-F0-9]{40}$/, // Ethereum-like addresses
  ERC20: /^0x[a-fA-F0-9]{40}$/, // Ethereum addresses
  TRC20: /^T[A-Za-z1-9]{33}$/, // TRON addresses
  POLYGON: /^0x[a-fA-F0-9]{40}$/, // Polygon addresses (same as Ethereum)
  BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/, // Bitcoin addresses
  LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/, // Litecoin addresses
};

/**
 * Validar formato de dirección según la red
 * @param {string} address - Dirección a validar
 * @param {string} network - Red blockchain
 * @returns {object} Resultado de validación
 */
function validateAddressFormat(address, network) {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      error: 'Address is required and must be a string'
    };
  }

  if (!network || !ADDRESS_PATTERNS[network]) {
    return {
      isValid: false,
      error: `Unsupported network: ${network}`
    };
  }

  const pattern = ADDRESS_PATTERNS[network];
  const isValid = pattern.test(address);

  return {
    isValid,
    error: isValid ? null : `Invalid ${network} address format`
  };
}

/**
 * Validar checksum para direcciones Ethereum/BEP20/Polygon
 * @param {string} address - Dirección a validar
 * @returns {boolean} True si el checksum es válido
 */
function validateEthereumChecksum(address) {
  if (!address.startsWith('0x')) {
    return false;
  }

  const addr = address.slice(2).toLowerCase();
  const hash = crypto.createHash('keccak256').update(addr).digest('hex');
  
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    if (char >= '0' && char <= '9') continue;
    
    const shouldBeUppercase = parseInt(hash[i], 16) >= 8;
    const isUppercase = char === char.toUpperCase();
    
    if (shouldBeUppercase !== isUppercase) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validar checksum para direcciones TRON (TRC20)
 * @param {string} address - Dirección a validar
 * @returns {boolean} True si el checksum es válido
 */
function validateTronChecksum(address) {
  try {
    // Implementación simplificada - en producción usar librería específica de TRON
    if (!address.startsWith('T') || address.length !== 34) {
      return false;
    }
    
    // Verificación básica de caracteres válidos
    const validChars = /^[A-Za-z1-9]+$/;
    return validChars.test(address.slice(1));
  } catch (error) {
    return false;
  }
}

/**
 * Verificar si una dirección está en la lista de sospechosas
 * @param {string} address - Dirección a verificar
 * @returns {object} Resultado de verificación
 */
function checkSuspiciousAddress(address) {
  const isSuspicious = SUSPICIOUS_ADDRESSES.includes(address);
  const isWhitelisted = WHITELISTED_ADDRESSES.includes(address);
  
  return {
    isSuspicious,
    isWhitelisted,
    riskLevel: isWhitelisted ? 'low' : (isSuspicious ? 'high' : 'medium')
  };
}

/**
 * Análisis de patrones sospechosos en la dirección
 * @param {string} address - Dirección a analizar
 * @returns {object} Resultado del análisis
 */
function analyzeAddressPatterns(address) {
  const suspiciousPatterns = {
    tooManyZeros: (address.match(/0/g) || []).length > address.length * 0.7,
    tooManyRepeatedChars: /([a-fA-F0-9])\1{6,}/.test(address),
    suspiciousSequence: /123456|abcdef|fedcba|654321/.test(address.toLowerCase()),
    allSameChar: /^(.)\1*$/.test(address.replace(/^0x/, ''))
  };

  const suspiciousCount = Object.values(suspiciousPatterns).filter(Boolean).length;
  
  return {
    patterns: suspiciousPatterns,
    suspiciousCount,
    riskScore: suspiciousCount * 25 // 0-100 scale
  };
}

/**
 * Validación completa de dirección de wallet
 * @param {string} address - Dirección a validar
 * @param {string} network - Red blockchain
 * @param {object} options - Opciones adicionales
 * @returns {object} Resultado completo de validación
 */
function validateWalletAddress(address, network, options = {}) {
  const result = {
    isValid: false,
    address,
    network,
    errors: [],
    warnings: [],
    security: {
      riskLevel: 'unknown',
      riskScore: 0,
      isSuspicious: false,
      isWhitelisted: false
    },
    checksumValid: false,
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Validar formato básico
    const formatValidation = validateAddressFormat(address, network);
    if (!formatValidation.isValid) {
      result.errors.push(formatValidation.error);
      return result;
    }

    // 2. Validar checksum según la red
    let checksumValid = false;
    if (['BEP20', 'ERC20', 'POLYGON'].includes(network)) {
      checksumValid = validateEthereumChecksum(address);
    } else if (network === 'TRC20') {
      checksumValid = validateTronChecksum(address);
    } else {
      checksumValid = true; // Para otras redes, asumir válido si pasa formato
    }

    result.checksumValid = checksumValid;
    if (!checksumValid && options.strictChecksum) {
      result.errors.push('Invalid address checksum');
      return result;
    } else if (!checksumValid) {
      result.warnings.push('Address checksum could not be verified');
    }

    // 3. Verificar listas de direcciones conocidas
    const suspiciousCheck = checkSuspiciousAddress(address);
    result.security.isSuspicious = suspiciousCheck.isSuspicious;
    result.security.isWhitelisted = suspiciousCheck.isWhitelisted;
    result.security.riskLevel = suspiciousCheck.riskLevel;

    if (suspiciousCheck.isSuspicious) {
      result.errors.push('Address is flagged as suspicious');
      return result;
    }

    // 4. Análisis de patrones
    const patternAnalysis = analyzeAddressPatterns(address);
    result.security.riskScore = patternAnalysis.riskScore;
    
    if (patternAnalysis.suspiciousCount > 0) {
      result.warnings.push(`Address shows ${patternAnalysis.suspiciousCount} suspicious pattern(s)`);
      if (patternAnalysis.riskScore > 50) {
        result.security.riskLevel = 'high';
      }
    }

    // 5. Verificaciones adicionales según opciones
    if (options.checkLength) {
      const expectedLengths = {
        BEP20: 42,
        ERC20: 42,
        POLYGON: 42,
        TRC20: 34,
        BTC: [26, 35, 42, 62], // Variable length
        LTC: [27, 34]
      };
      
      const expected = expectedLengths[network];
      if (Array.isArray(expected)) {
        if (!expected.includes(address.length)) {
          result.warnings.push(`Unusual address length: ${address.length}`);
        }
      } else if (expected && address.length !== expected) {
        result.warnings.push(`Unusual address length: ${address.length}, expected: ${expected}`);
      }
    }

    // Si llegamos aquí, la dirección es válida
    result.isValid = true;

    // Log para auditoría
    logger.logSecurityEvent('wallet_address_validated', {
      address: address.substring(0, 10) + '...', // Log parcial por privacidad
      network,
      isValid: result.isValid,
      riskLevel: result.security.riskLevel,
      riskScore: result.security.riskScore,
      checksumValid: result.checksumValid,
      warningCount: result.warnings.length
    });

  } catch (error) {
    logger.error('Error validating wallet address:', error);
    result.errors.push('Internal validation error');
  }

  return result;
}

/**
 * Verificar si un usuario puede agregar más wallets
 * @param {object} user - Usuario
 * @param {number} currentWalletCount - Número actual de wallets
 * @returns {object} Resultado de verificación
 */
function checkWalletLimits(user, currentWalletCount) {
  const limits = {
    user: 3,
    admin: 10,
    superadmin: 50
  };

  const userLimit = limits[user.role] || limits.user;
  const canAdd = currentWalletCount < userLimit;

  return {
    canAdd,
    currentCount: currentWalletCount,
    limit: userLimit,
    remaining: Math.max(0, userLimit - currentWalletCount)
  };
}

/**
 * Generar reporte de validación para auditoría
 * @param {array} validationResults - Resultados de validaciones
 * @returns {object} Reporte de auditoría
 */
function generateValidationReport(validationResults) {
  const report = {
    totalValidated: validationResults.length,
    valid: 0,
    invalid: 0,
    suspicious: 0,
    whitelisted: 0,
    highRisk: 0,
    networks: {},
    commonErrors: {},
    timestamp: new Date().toISOString()
  };

  validationResults.forEach(result => {
    if (result.isValid) {
      report.valid++;
    } else {
      report.invalid++;
    }

    if (result.security.isSuspicious) {
      report.suspicious++;
    }

    if (result.security.isWhitelisted) {
      report.whitelisted++;
    }

    if (result.security.riskLevel === 'high') {
      report.highRisk++;
    }

    // Contar por red
    report.networks[result.network] = (report.networks[result.network] || 0) + 1;

    // Contar errores comunes
    result.errors.forEach(error => {
      report.commonErrors[error] = (report.commonErrors[error] || 0) + 1;
    });
  });

  return report;
}

module.exports = {
  validateWalletAddress,
  validateAddressFormat,
  validateEthereumChecksum,
  validateTronChecksum,
  checkSuspiciousAddress,
  analyzeAddressPatterns,
  checkWalletLimits,
  generateValidationReport,
  SUSPICIOUS_ADDRESSES,
  WHITELISTED_ADDRESSES,
  ADDRESS_PATTERNS
};