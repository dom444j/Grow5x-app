const express = require('express');
const router = express.Router();
const { sendWelcomeEmail } = require('../utils/email');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

/**
 * @route   POST /api/emails/send-welcome
 * @desc    Send welcome email to new user
 * @access  Public (used internally after registration)
 */
router.post('/send-welcome', [
  body('email').isEmail().withMessage('Email válido es requerido'),
  body('fullName').notEmpty().withMessage('Nombre completo es requerido'),
  body('referralCode').optional().isString()
], async (req, res) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { email, fullName, referralCode } = req.body;
    const language = req.body.language || 'es';

    // Enviar email de bienvenida
    await sendWelcomeEmail(email, fullName, language);

    logger.info(`Welcome email sent to: ${email}`);

    res.json({
      success: true,
      message: 'Email de bienvenida enviado exitosamente'
    });

  } catch (error) {
    logger.error('Error sending welcome email:', error);
    
    // No fallar el registro si el email no se puede enviar
    res.status(200).json({
      success: false,
      message: 'Email service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/emails/test-config
 * @desc    Test email configuration
 * @access  Private (Admin only)
 */
router.post('/test-config', async (req, res) => {
  try {
    const { testEmailConfiguration } = require('../utils/email');
    const result = await testEmailConfiguration();
    
    res.json({
      success: true,
      message: 'Email configuration test completed',
      result
    });
  } catch (error) {
    logger.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing email configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;