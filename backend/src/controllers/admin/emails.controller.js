const User = require('../../models/User');
const AdminLog = require('../../models/AdminLog.model');
const AdminLoggerService = require('../../services/admin/adminLogger.service');
const AdminValidationService = require('../../services/admin/validation.service');
const AdminUtilsService = require('../../services/admin/utils.service');
const { sendVerificationEmail } = require('../../utils/email');

/**
 * Controlador para gestión de correos electrónicos
 * Maneja todas las operaciones relacionadas con emails del sistema
 */

// Reenviar email de verificación
const resendVerificationEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { force = false } = req.body;

    if (!AdminValidationService.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si ya está verificado (a menos que sea forzado)
    if (user.verification?.isVerified && !force) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya tiene el email verificado'
      });
    }

    // Verificar límite de reenvíos (máximo 5 por día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentResends = await AdminLog.countDocuments({
      action: 'RESEND_VERIFICATION_EMAIL',
      'details.userId': userId,
      createdAt: { $gte: today }
    });

    if (recentResends >= 5 && !force) {
      return res.status(429).json({
        success: false,
        message: 'Límite de reenvíos alcanzado para hoy (máximo 5)'
      });
    }

    // Generar nuevo token de verificación
    const verificationToken = AdminUtilsService.generateSecureToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Actualizar usuario
    user.verification.token = verificationToken;
    user.verification.expires = verificationExpires;
    await user.save();

    // Enviar email
    try {
      await sendVerificationEmail(
        user.email,
        verificationToken,
        user.fullName || user.username,
        user.preferences?.language || 'es',
        user._id
      );

      // Log de la acción
      await AdminLoggerService.logAction(
        req.user._id,
        'RESEND_VERIFICATION_EMAIL',
        'user',
        userId,
        {
          userEmail: user.email,
          force,
          resendCount: recentResends + 1
        }
      );

      res.json({
        success: true,
        message: 'Email de verificación reenviado exitosamente',
        data: {
          userId,
          email: user.email,
          tokenExpires: verificationExpires
        }
      });

    } catch (emailError) {
      console.error('Error enviando email de verificación:', emailError);
      
      // Log del error
      await AdminLoggerService.logAction(
        req.user._id,
        'RESEND_VERIFICATION_EMAIL_FAILED',
        'user',
        userId,
        {
          userEmail: user.email,
          error: emailError.message
        }
      );

      res.status(500).json({
        success: false,
        message: 'Error enviando el email de verificación',
        error: emailError.message
      });
    }

  } catch (error) {
    console.error('Error reenviando email de verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Forzar verificación de email
const forceEmailVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!AdminValidationService.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Razón requerida (mínimo 5 caracteres)'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const wasVerified = user.verification?.isVerified || false;

    // Forzar verificación
    user.verification = user.verification || {};
    user.verification.isVerified = true;
    user.verification.verifiedAt = new Date();
    user.verification.verifiedBy = 'admin';
    user.verification.adminId = req.user._id;
    user.verification.method = 'admin_force';
    user.verification.token = null;
    user.verification.expires = null;

    await user.save();

    // Log de la acción
    await AdminLoggerService.logAction(
      req.user._id,
      'FORCE_EMAIL_VERIFICATION',
      'user',
      userId,
      {
        userEmail: user.email,
        reason: reason.trim(),
        wasAlreadyVerified: wasVerified
      }
    );

    res.json({
      success: true,
      message: 'Email verificado forzosamente por administrador',
      data: {
        userId,
        email: user.email,
        verifiedAt: user.verification.verifiedAt,
        wasAlreadyVerified: wasVerified
      }
    });

  } catch (error) {
    console.error('Error forzando verificación de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener errores de email
const getEmailErrors = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity = 'all' } = req.query;

    const query = {
      action: { $in: ['EMAIL_ERROR', 'RESEND_VERIFICATION_EMAIL_FAILED', 'EMAIL_SEND_FAILED'] }
    };

    if (severity !== 'all') {
      query.severity = severity;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'admin',
        select: 'username email'
      }
    };

    const result = await AdminLog.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error obteniendo errores de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de emails
const getEmailStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const [emailLogs, userStats] = await Promise.all([
      // Logs de emails
      AdminLog.aggregate([
        {
          $match: {
            action: {
              $in: [
                'RESEND_VERIFICATION_EMAIL',
                'RESEND_VERIFICATION_EMAIL_FAILED',
                'FORCE_EMAIL_VERIFICATION',
                'EMAIL_SENT',
                'EMAIL_ERROR'
              ]
            },
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ]),
      // Estadísticas de usuarios
      User.aggregate([
        {
          $facet: {
            totalUsers: [{ $count: 'count' }],
            verifiedUsers: [
              { $match: { 'verification.email.verified': true } },
              { $count: 'count' }
            ],
            unverifiedUsers: [
              {
                $match: {
                  $or: [
                    { 'verification.email.verified': { $ne: true } },
                    { 'verification.email.verified': { $exists: false } }
                  ]
                }
              },
              { $count: 'count' }
            ],
            recentVerifications: [
              {
                $match: {
                  'verification.email.verified': true,
                  'verification.email.verifiedAt': dateFilter
                }
              },
              { $count: 'count' }
            ]
          }
        }
      ])
    ]);

    const emailStats = emailLogs.reduce((acc, log) => {
      acc[log._id] = log.count;
      return acc;
    }, {});

    const userStatsData = userStats[0];
    const totalUsers = userStatsData.totalUsers[0]?.count || 0;
    const verifiedUsers = userStatsData.verifiedUsers[0]?.count || 0;
    const unverifiedUsers = userStatsData.unverifiedUsers[0]?.count || 0;
    const recentVerifications = userStatsData.recentVerifications[0]?.count || 0;

    const stats = {
      period,
      emailActivity: {
        verificationEmailsSent: emailStats.RESEND_VERIFICATION_EMAIL || 0,
        verificationEmailsFailed: emailStats.RESEND_VERIFICATION_EMAIL_FAILED || 0,
        forceVerifications: emailStats.FORCE_EMAIL_VERIFICATION || 0,
        totalEmailsSent: emailStats.EMAIL_SENT || 0,
        emailErrors: emailStats.EMAIL_ERROR || 0
      },
      userVerification: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
        recentVerifications
      },
      performance: {
        successRate: (
          emailStats.RESEND_VERIFICATION_EMAIL > 0
            ? ((
                emailStats.RESEND_VERIFICATION_EMAIL - (emailStats.RESEND_VERIFICATION_EMAIL_FAILED || 0)
              ) / emailStats.RESEND_VERIFICATION_EMAIL * 100).toFixed(2)
            : 100
        ),
        errorRate: (
          (emailStats.EMAIL_SENT || 0) > 0
            ? ((emailStats.EMAIL_ERROR || 0) / (emailStats.EMAIL_SENT || 1) * 100).toFixed(2)
            : 0
        )
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Reenviar email fallido
const resendFailedEmail = async (req, res) => {
  try {
    const { logId } = req.params;
    const { emailType, recipientEmail, templateData } = req.body;

    if (!AdminValidationService.isValidObjectId(logId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de log inválido'
      });
    }

    if (!emailType || !recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de email y destinatario requeridos'
      });
    }

    // Verificar que el log existe y es de un error de email
    const emailLog = await AdminLog.findById(logId);
    if (!emailLog) {
      return res.status(404).json({
        success: false,
        message: 'Log de email no encontrado'
      });
    }

    if (!emailLog.action.includes('FAILED') && !emailLog.action.includes('ERROR')) {
      return res.status(400).json({
        success: false,
        message: 'El log seleccionado no corresponde a un error de email'
      });
    }

    // Validar email
    if (!AdminValidationService.isValidEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email del destinatario inválido'
      });
    }

    try {
      let emailSent = false;

      // Enviar según el tipo de email
      switch (emailType) {
        case 'verification':
          if (!templateData?.verificationToken || !templateData?.userId) {
            return res.status(400).json({
              success: false,
              message: 'Token de verificación y ID de usuario requeridos'
            });
          }
          await emailService.sendVerificationEmail(recipientEmail, templateData);
          emailSent = true;
          break;

        case 'password_reset':
          if (!templateData?.resetToken) {
            return res.status(400).json({
              success: false,
              message: 'Token de reset requerido'
            });
          }
          await emailService.sendPasswordResetEmail(recipientEmail, templateData);
          emailSent = true;
          break;

        case 'welcome':
          await emailService.sendWelcomeEmail(recipientEmail, templateData || {});
          emailSent = true;
          break;

        case 'notification':
          if (!templateData?.subject || !templateData?.message) {
            return res.status(400).json({
              success: false,
              message: 'Asunto y mensaje requeridos para notificaciones'
            });
          }
          await emailService.sendNotificationEmail(recipientEmail, templateData);
          emailSent = true;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de email no soportado'
          });
      }

      if (emailSent) {
        // Log del reenvío exitoso
        await AdminLoggerService.logAction(
          req.user._id,
          'EMAIL_RESENT_SUCCESS',
          'email',
          logId,
          {
            emailType,
            recipientEmail,
            resentAt: new Date()
          }
        );

        res.json({
          success: true,
          message: 'Email reenviado exitosamente',
          data: {
            emailType,
            recipientEmail,
            originalLogId: logId,
            resentAt: new Date()
          }
        });
      }

    } catch (emailError) {
      console.error('Error reenviando email:', emailError);
      
      // Log del error en el reenvío
      await AdminLoggerService.logAction(
        req.user._id,
        'EMAIL_RESENT_FAILED',
        'email',
        logId,
        {
          emailType,
          recipientEmail,
          error: emailError.message
        }
      );

      res.status(500).json({
        success: false,
        message: 'Error reenviando el email',
        error: emailError.message
      });
    }

  } catch (error) {
    console.error('Error en reenvío de email fallido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener plantillas de email disponibles
const getEmailTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'verification',
        name: 'Verificación de Email',
        description: 'Email para verificar la dirección de correo del usuario',
        requiredFields: ['verificationToken', 'userId', 'name'],
        optionalFields: ['expiresIn']
      },
      {
        id: 'password_reset',
        name: 'Restablecimiento de Contraseña',
        description: 'Email para restablecer la contraseña del usuario',
        requiredFields: ['resetToken', 'name'],
        optionalFields: ['expiresIn']
      },
      {
        id: 'welcome',
        name: 'Bienvenida',
        description: 'Email de bienvenida para nuevos usuarios',
        requiredFields: ['name'],
        optionalFields: ['referralCode', 'bonusAmount']
      },
      {
        id: 'notification',
        name: 'Notificación General',
        description: 'Email de notificación personalizable',
        requiredFields: ['subject', 'message', 'name'],
        optionalFields: ['actionUrl', 'actionText']
      },
      {
        id: 'commission_payment',
        name: 'Pago de Comisión',
        description: 'Notificación de pago de comisión',
        requiredFields: ['amount', 'currency', 'name'],
        optionalFields: ['transactionId', 'description']
      },
      {
        id: 'withdrawal_processed',
        name: 'Retiro Procesado',
        description: 'Confirmación de procesamiento de retiro',
        requiredFields: ['amount', 'currency', 'name'],
        optionalFields: ['transactionId', 'processingTime']
      }
    ];

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error obteniendo plantillas de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Enviar email personalizado
const sendCustomEmail = async (req, res) => {
  try {
    const {
      recipients,
      subject,
      message,
      template = 'notification',
      templateData = {},
      priority = 'normal'
    } = req.body;

    // Validaciones
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de destinatarios requerida'
      });
    }

    if (recipients.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 100 destinatarios por envío'
      });
    }

    if (!subject || subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Asunto requerido (mínimo 3 caracteres)'
      });
    }

    if (!message || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Mensaje requerido (mínimo 10 caracteres)'
      });
    }

    // Validar emails
    const invalidEmails = recipients.filter(email => !AdminValidationService.isValidEmail(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Emails inválidos encontrados',
        invalidEmails
      });
    }

    const results = {
      sent: [],
      failed: [],
      total: recipients.length
    };

    // Enviar emails
    for (const email of recipients) {
      try {
        const emailData = {
          subject: subject.trim(),
          message: message.trim(),
          name: templateData.name || 'Usuario',
          ...templateData
        };

        await emailService.sendNotificationEmail(email, emailData);
        results.sent.push(email);

      } catch (emailError) {
        console.error(`Error enviando email a ${email}:`, emailError);
        results.failed.push({
          email,
          error: emailError.message
        });
      }
    }

    // Log de la acción
    await AdminLoggerService.logAction(
      req.user._id,
      'CUSTOM_EMAIL_SENT',
      'email',
      'bulk',
      {
        subject,
        template,
        recipientCount: recipients.length,
        successCount: results.sent.length,
        failureCount: results.failed.length,
        priority
      }
    );

    res.json({
      success: true,
      message: `Emails enviados: ${results.sent.length}/${results.total}`,
      data: results
    });

  } catch (error) {
    console.error('Error enviando email personalizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  resendVerificationEmail,
  forceEmailVerification,
  getEmailErrors,
  getEmailStats,
  resendFailedEmail,
  getEmailTemplates,
  sendCustomEmail
};