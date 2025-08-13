const UserStatusService = require('../services/UserStatusService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * UserStatus Controller - Controlador para el Sistema de Estados Unificado
 * 
 * Maneja todas las rutas API relacionadas con el estado de usuarios,
 * beneficios, ciclos y gestión administrativa.
 */
class UserStatusController {

  /**
   * Obtener estado completo de un usuario
   * GET /api/user-status/:userId
   */
  static async getUserStatus(req, res) {
    try {
      const { userId } = req.params;
      
      // Verificar que el usuario puede acceder a este estado
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este estado de usuario'
        });
      }
      
      const userStatus = await UserStatusService.getOrCreateUserStatus(userId);
      
      res.json({
        success: true,
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al obtener estado de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener estado del usuario actual (autenticado)
   * GET /api/user-status/me
   */
  static async getMyStatus(req, res) {
    try {
      const userStatus = await UserStatusService.getOrCreateUserStatus(req.user.id);
      
      res.json({
        success: true,
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al obtener mi estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Activar paquete de suscripción
   * POST /api/user-status/activate-package
   */
  static async activatePackage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }
      
      const { userId, packageType, amount } = req.body;
      
      // Solo admins pueden activar paquetes para otros usuarios
      const targetUserId = req.user.role === 'admin' ? (userId || req.user.id) : req.user.id;
      
      const userStatus = await UserStatusService.activatePackage(targetUserId, packageType, amount);
      
      logger.info(`Paquete ${packageType} activado para usuario ${targetUserId}`, {
        userId: targetUserId,
        packageType,
        amount,
        activatedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Paquete activado exitosamente',
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al activar paquete:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar beneficios diarios para un usuario
   * POST /api/user-status/process-benefits
   */
  static async processBenefits(req, res) {
    try {
      const { userId } = req.body;
      
      // Solo admins pueden procesar beneficios manualmente
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden procesar beneficios manualmente'
        });
      }
      
      const result = await UserStatusService.processDailyBenefits(userId);
      
      logger.info(`Beneficios procesados para usuario ${userId}`, {
        userId,
        result,
        processedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: result.processed ? 'Beneficios procesados exitosamente' : 'No se procesaron beneficios',
        data: result
      });
    } catch (error) {
      logger.error('Error al procesar beneficios:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Activar usuario Pioneer
   * POST /api/user-status/activate-pioneer
   */
  static async activatePioneer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }
      
      const { userId, level, duration } = req.body;
      
      // Solo admins pueden activar Pioneer para otros usuarios
      const targetUserId = req.user.role === 'admin' ? (userId || req.user.id) : req.user.id;
      
      const userStatus = await UserStatusService.activatePioneer(targetUserId, level, duration);
      
      logger.info(`Usuario Pioneer activado: ${targetUserId}`, {
        userId: targetUserId,
        level,
        duration,
        activatedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Usuario Pioneer activado. Período de espera de 48 horas iniciado.',
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al activar Pioneer:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Completar período de espera Pioneer
   * POST /api/user-status/complete-pioneer-waiting
   */
  static async completePioneerWaiting(req, res) {
    try {
      const { userId } = req.body;
      
      // Solo admins pueden completar períodos de espera
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden completar períodos de espera'
        });
      }
      
      const userStatus = await UserStatusService.completePioneerWaitingPeriod(userId);
      
      logger.info(`Período de espera Pioneer completado para usuario ${userId}`, {
        userId,
        completedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Período de espera Pioneer completado. Usuario activado.',
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al completar período Pioneer:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar solicitud de retiro
   * POST /api/user-status/withdrawal-request
   */
  static async processWithdrawalRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }
      
      const { amount } = req.body;
      
      const result = await UserStatusService.processWithdrawalRequest(req.user.id, amount);
      
      logger.info(`Solicitud de retiro procesada para usuario ${req.user.id}`, {
        userId: req.user.id,
        amount,
        result
      });
      
      res.json({
        success: true,
        message: 'Solicitud de retiro procesada exitosamente',
        data: result
      });
    } catch (error) {
      logger.error('Error al procesar solicitud de retiro:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Marcar usuario para atención administrativa
   * POST /api/user-status/flag-attention
   */
  static async flagForAttention(req, res) {
    try {
      const { userId, reason, priority } = req.body;
      
      // Solo admins pueden marcar usuarios
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden marcar usuarios para atención'
        });
      }
      
      const userStatus = await UserStatusService.getOrCreateUserStatus(userId);
      await userStatus.flagForAttention(reason, priority);
      
      logger.info(`Usuario marcado para atención: ${userId}`, {
        userId,
        reason,
        priority,
        flaggedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Usuario marcado para atención administrativa',
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al marcar usuario para atención:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Agregar nota administrativa
   * POST /api/user-status/add-admin-note
   */
  static async addAdminNote(req, res) {
    try {
      const { userId, note, category } = req.body;
      
      // Solo admins pueden agregar notas
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden agregar notas'
        });
      }
      
      const userStatus = await UserStatusService.getOrCreateUserStatus(userId);
      await userStatus.addAdminNote(note, req.user.id, category);
      
      logger.info(`Nota administrativa agregada para usuario ${userId}`, {
        userId,
        note,
        category,
        addedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Nota administrativa agregada exitosamente',
        data: userStatus
      });
    } catch (error) {
      logger.error('Error al agregar nota administrativa:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  // === ENDPOINTS ADMINISTRATIVOS ===

  /**
   * Obtener usuarios que necesitan atención
   * GET /api/user-status/admin/attention-needed
   */
  static async getUsersNeedingAttention(req, res) {
    try {
      // Solo admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }
      
      const { priority } = req.query;
      const users = await UserStatusService.getUsersNeedingAttention(priority);
      
      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error al obtener usuarios que necesitan atención:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuarios en período de espera Pioneer
   * GET /api/user-status/admin/pioneer-waiting
   */
  static async getUsersInPioneerWaiting(req, res) {
    try {
      // Solo admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }
      
      const users = await UserStatusService.getUsersInPioneerWaiting();
      
      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error al obtener usuarios en espera Pioneer:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuarios para procesamiento de beneficios
   * GET /api/user-status/admin/benefit-processing
   */
  static async getUsersForBenefitProcessing(req, res) {
    try {
      // Solo admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }
      
      const users = await UserStatusService.getUsersForBenefitProcessing();
      
      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error al obtener usuarios para beneficios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas del dashboard administrativo
   * GET /api/user-status/admin/dashboard-metrics
   */
  static async getDashboardMetrics(req, res) {
    try {
      // Solo admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }
      
      const metrics = await UserStatusService.getAdminDashboardMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error al obtener métricas del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar beneficios masivos (todos los usuarios elegibles)
   * POST /api/user-status/admin/process-all-benefits
   */
  static async processAllBenefits(req, res) {
    try {
      // Solo admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }
      
      const users = await UserStatusService.getUsersForBenefitProcessing();
      const results = [];
      
      for (const userStatus of users) {
        try {
          const result = await UserStatusService.processDailyBenefits(userStatus.user._id);
          results.push({
            userId: userStatus.user._id,
            email: userStatus.user.email,
            result
          });
        } catch (error) {
          results.push({
            userId: userStatus.user._id,
            email: userStatus.user.email,
            error: error.message
          });
        }
      }
      
      logger.info(`Procesamiento masivo de beneficios completado`, {
        totalUsers: users.length,
        processedBy: req.user.id,
        results: results.length
      });
      
      res.json({
        success: true,
        message: `Procesamiento completado para ${users.length} usuarios`,
        data: {
          totalProcessed: users.length,
          results
        }
      });
    } catch (error) {
      logger.error('Error en procesamiento masivo de beneficios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = UserStatusController;