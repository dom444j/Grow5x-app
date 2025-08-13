const Joi = require('joi');
const logger = require('../utils/logger');
const { createResponse } = require('../utils/helpers');

// Validation middleware factory
const validateRequest = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    allowUnknown: false, // Don't allow unknown fields
    stripUnknown: true, // Remove unknown fields
    ...options
  };

  return (req, res, next) => {
    try {
      // Determine what to validate based on HTTP method
      let dataToValidate = {};
      
      if (req.method === 'GET' || req.method === 'DELETE') {
        // For GET and DELETE, validate query parameters and URL parameters
        dataToValidate = {
          ...req.query,
          ...req.params
        };
      } else {
        // For POST, PUT, PATCH, validate body, query, and params
        dataToValidate = {
          ...req.body,
          ...req.query,
          ...req.params
        };
      }

      // Validate the data
      const { error, value } = schema.validate(dataToValidate, defaultOptions);

      if (error) {
        // Format validation errors
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));

        logger.logSecurityEvent('validation_failed', {
          errors: validationErrors,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id
        });

        return res.status(400).json(
          createResponse(
            false,
            'Validation failed',
            {
              errors: validationErrors,
              errorCount: validationErrors.length
            },
            'VALIDATION_ERROR'
          )
        );
      }

      // Replace request data with validated and sanitized data
      if (req.method === 'GET' || req.method === 'DELETE') {
        req.query = { ...req.query, ...value };
      } else {
        req.body = { ...req.body, ...value };
      }

      next();
    } catch (validationError) {
      logger.error('Validation middleware error:', validationError);
      
      return res.status(500).json(
        createResponse(
          false,
          'Validation processing error',
          null,
          'VALIDATION_PROCESSING_ERROR'
        )
      );
    }
  };
};

// Validate file uploads
const validateFileUpload = (options = {}) => {
  const defaultOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB default
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFiles: 1,
    required: false,
    ...options
  };

  return (req, res, next) => {
    try {
      const files = req.files;

      // Check if files are required
      if (defaultOptions.required && (!files || Object.keys(files).length === 0)) {
        return res.status(400).json(
          createApiResponse(
            false,
            'File upload is required',
            null,
            'FILE_REQUIRED'
          )
        );
      }

      // If no files and not required, continue
      if (!files || Object.keys(files).length === 0) {
        return next();
      }

      // Convert single file to array for consistent processing
      const fileArray = Array.isArray(files.file) ? files.file : [files.file];

      // Check number of files
      if (fileArray.length > defaultOptions.maxFiles) {
        return res.status(400).json(
          createApiResponse(
            false,
            `Maximum ${defaultOptions.maxFiles} files allowed`,
            null,
            'TOO_MANY_FILES'
          )
        );
      }

      // Validate each file
      for (const file of fileArray) {
        // Check file size
        if (file.size > defaultOptions.maxSize) {
          return res.status(400).json(
            createApiResponse(
              false,
              `File size must be less than ${Math.round(defaultOptions.maxSize / 1024 / 1024)}MB`,
              null,
              'FILE_TOO_LARGE'
            )
          );
        }

        // Check file type
        if (!defaultOptions.allowedTypes.includes(file.mimetype)) {
          return res.status(400).json(
            createApiResponse(
              false,
              `File type ${file.mimetype} is not allowed`,
              {
                allowedTypes: defaultOptions.allowedTypes
              },
              'INVALID_FILE_TYPE'
            )
          );
        }

        // Check for malicious file names
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
          logger.logSecurityEvent('malicious_filename_detected', {
            filename: file.name,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
          });

          return res.status(400).json(
            createApiResponse(
              false,
              'Invalid file name',
              null,
              'INVALID_FILENAME'
            )
          );
        }
      }

      logger.logSecurityEvent('file_upload_validated', {
        fileCount: fileArray.length,
        totalSize: fileArray.reduce((sum, file) => sum + file.size, 0),
        fileTypes: fileArray.map(file => file.mimetype),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });

      next();
    } catch (error) {
      logger.error('File validation error:', error);
      
      return res.status(500).json(
        createApiResponse(
          false,
          'File validation error',
          null,
          'FILE_VALIDATION_ERROR'
        )
      );
    }
  };
};

// Validate pagination parameters
const validatePagination = (options = {}) => {
  const defaultOptions = {
    maxLimit: 100,
    defaultLimit: 20,
    maxPage: 1000,
    ...options
  };

  const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).max(defaultOptions.maxPage).default(1),
    limit: Joi.number().integer().min(1).max(defaultOptions.maxLimit).default(defaultOptions.defaultLimit),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(100).optional()
  });

  return validateRequest(paginationSchema, { allowUnknown: true });
};

// Validate date range parameters
const validateDateRange = (options = {}) => {
  const defaultOptions = {
    maxRangeDays: 365, // Maximum 1 year range
    ...options
  };

  return (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      if (startDate || endDate) {
        // Validate date format
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && isNaN(start.getTime())) {
          return res.status(400).json(
            createApiResponse(
              false,
              'Invalid start date format',
              null,
              'INVALID_START_DATE'
            )
          );
        }

        if (end && isNaN(end.getTime())) {
          return res.status(400).json(
            createApiResponse(
              false,
              'Invalid end date format',
              null,
              'INVALID_END_DATE'
            )
          );
        }

        // Validate date range
        if (start && end && start > end) {
          return res.status(400).json(
            createResponse(
              false,
              'Start date must be before end date',
              null,
              'INVALID_DATE_RANGE'
            )
          );
        }

        // Check maximum range
        if (start && end) {
          const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          if (diffDays > defaultOptions.maxRangeDays) {
            return res.status(400).json(
              createResponse(
                false,
                `Date range cannot exceed ${defaultOptions.maxRangeDays} days`,
                null,
                'DATE_RANGE_TOO_LARGE'
              )
            );
          }
        }

        // Add parsed dates to request
        req.dateRange = {
          start,
          end,
          startDate,
          endDate
        };
      }

      next();
    } catch (error) {
      logger.error('Date range validation error:', error);
      
      return res.status(500).json(
        createResponse(
          false,
          'Date range validation error',
          null,
          'DATE_VALIDATION_ERROR'
        )
      );
    }
  };
};

// Sanitize HTML input
const sanitizeHtml = (req, res, next) => {
  try {
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        // Remove HTML tags and potentially dangerous characters
        return value
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove event handlers
          .trim();
      }
      return value;
    };

    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return sanitizeValue(obj);
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    logger.error('HTML sanitization error:', error);
    
    return res.status(500).json(
      createResponse(
        false,
        'Input sanitization error',
        null,
        'SANITIZATION_ERROR'
      )
    );
  }
};

// Validate IP address
const validateIpAddress = (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Check for suspicious IP patterns
    const suspiciousPatterns = [
      /^0\./, // Starts with 0.
      /^127\./, // Localhost (should be handled by proxy)
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
      /^255\./ // Broadcast
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(clientIp));
    
    if (isSuspicious && process.env.NODE_ENV === 'production') {
      logger.logSecurityEvent('suspicious_ip_detected', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
    }

    // Add IP info to request
    req.clientIp = clientIp;
    req.ipInfo = {
      address: clientIp,
      isSuspicious,
      timestamp: new Date().toISOString()
    };

    next();
  } catch (error) {
    logger.error('IP validation error:', error);
    next(); // Continue even if IP validation fails
  }
};

// Validate request size
const validateRequestSize = (maxSize = 1024 * 1024) => { // 1MB default
  return (req, res, next) => {
    try {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      
      if (contentLength > maxSize) {
        logger.logSecurityEvent('request_too_large', {
          contentLength,
          maxSize,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });

        return res.status(413).json(
          createResponse(
            false,
            'Request entity too large',
            {
              maxSize: Math.round(maxSize / 1024 / 1024) + 'MB',
              receivedSize: Math.round(contentLength / 1024 / 1024) + 'MB'
            },
            'REQUEST_TOO_LARGE'
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Request size validation error:', error);
      next();
    }
  };
};

module.exports = {
  validateRequest,
  validateFileUpload,
  validatePagination,
  validateDateRange,
  sanitizeHtml,
  validateIpAddress,
  validateRequestSize
};