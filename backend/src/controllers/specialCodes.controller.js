const SpecialCode = require('../models/SpecialCode.model');
const Commission = require('../models/Commission.model');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Controlador para la gestión de códigos especiales (Líder y Padre)
 */
class SpecialCodesController {
  
  /**
   * Obtener todos los códigos especiales
   */
  async getAllSpecialCodes(req, res) {
    try {
      const { active, type } = req.query;
      
      const query = {};
      if (active !== undefined) query.isActive = active === 'true';
      if (type) {
        // Mapear los tipos del frontend a los tipos de la base de datos
        const typeMapping = {
          'leader': 'LIDER',
          'parent': 'PADRE',
          'LEADER': 'LIDER',
          'FATHER': 'PADRE',
          'LIDER': 'LIDER',
          'PADRE': 'PADRE'
        };
        query.type = typeMapping[type] || type;
      }
      
      const specialCodes = await SpecialCode.find(query)
        .populate('userId', 'email fullName referralCode createdAt')
        .populate('assignedBy', 'email fullName')
        .sort({ 'metadata.priority': 1, createdAt: -1 });
      
      res.json({
        success: true,
        data: specialCodes
      });
    } catch (error) {
      logger.error('Error getting special codes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener códigos especiales'
      });
    }
  }
  
  /**
   * Obtener código especial por ID
   */
  async getSpecialCodeById(req, res) {
    try {
      const { id } = req.params;
      
      const specialCode = await SpecialCode.findById(id)
        .populate('userId', 'email fullName referralCode createdAt')
        .populate('assignedBy', 'email fullName')
        .populate('commissionHistory.userId', 'email fullName')
        .populate('commissionHistory.transactionId');
      
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: specialCode
      });
    } catch (error) {
      logger.error('Error getting special code by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener código especial'
      });
    }
  }
  
  /**
   * Crear nuevo código especial
   */
  async createSpecialCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }
      
      const { type, userId, notes } = req.body;
      const adminId = req.user.id;
      
      // Verificar que el usuario existe
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Verificar que el usuario no tenga ya un código especial
      const existingUserCode = await SpecialCode.userHasSpecialCode(userId);
      if (existingUserCode) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya tiene un código especial asignado'
        });
      }
      
      // Verificar disponibilidad del tipo de código
      const isTypeAvailable = await SpecialCode.isCodeTypeAvailable(type);
      if (!isTypeAvailable) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un código ${type} activo. Solo puede haber uno de cada tipo.`
        });
      }
      
      // Generar código único
      const codeValue = `${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear el código especial
      const specialCode = new SpecialCode({
        type: type,
        code: codeValue,
        userId,
        referralCode: user.referralCode,
        assignedBy: adminId,
        notes,
        metadata: {
          assignmentReason: notes || `Asignación de código ${type}`,
          priority: type === 'leader' ? 1 : 2
        }
      });
      
      await specialCode.save();
      
      // Poblar los datos para la respuesta
      await specialCode.populate('userId', 'email fullName referralCode');
      await specialCode.populate('assignedBy', 'email fullName');
      
      logger.info(`Special code ${type} assigned to user ${userId} by admin ${adminId}`);
      
      res.status(201).json({
        success: true,
        message: `Código ${type} asignado exitosamente - Sin bono de asignación`,
        data: specialCode
      });
    } catch (error) {
      logger.error('Error creating special code:', error);
      
      if (error.code === 'DUPLICATE_SPECIAL_CODE') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al crear código especial'
      });
    }
  }
  
  /**
   * Actualizar código especial
   */
  async updateSpecialCode(req, res) {
    try {
      const { id } = req.params;
      const { active, notes } = req.body;
      const adminId = req.user.id;
      
      const specialCode = await SpecialCode.findById(id);
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      // Actualizar campos permitidos
      if (active !== undefined) {
        specialCode.isActive = active;
        if (active) {
          specialCode.activatedAt = new Date();
          specialCode.deactivatedAt = undefined;
        } else {
          specialCode.deactivatedAt = new Date();
        }
      }
      
      if (notes !== undefined) {
        specialCode.notes = notes;
      }
      
      await specialCode.save();
      
      // Poblar los datos para la respuesta
      await specialCode.populate('userId', 'email fullName referralCode');
      await specialCode.populate('assignedBy', 'email fullName');
      
      logger.info(`Special code ${id} updated by admin ${adminId}`);
      
      res.json({
        success: true,
        message: 'Código especial actualizado exitosamente',
        data: specialCode
      });
    } catch (error) {
      logger.error('Error updating special code:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar código especial'
      });
    }
  }
  
  /**
   * Eliminar código especial
   */
  async deleteSpecialCode(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      
      const specialCode = await SpecialCode.findById(id);
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      // En lugar de eliminar, desactivar el código
      specialCode.isActive = false;
      specialCode.deactivatedAt = new Date();
      await specialCode.save();
      
      logger.info(`Special code ${id} deactivated by admin ${adminId}`);
      
      res.json({
        success: true,
        message: 'Código especial desactivado exitosamente'
      });
    } catch (error) {
      logger.error('Error deleting special code:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar código especial'
      });
    }
  }
  
  /**
   * Transferir código especial a otro usuario
   */
  async transferSpecialCode(req, res) {
    try {
      const { id } = req.params;
      const { newUserId, reason } = req.body;
      const adminId = req.user.id;
      
      const specialCode = await SpecialCode.findById(id);
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      // Verificar que el nuevo usuario existe
      const newUser = await User.findById(newUserId);
      if (!newUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario destino no encontrado'
        });
      }
      
      // Verificar que el nuevo usuario no tenga ya un código especial
      const existingUserCode = await SpecialCode.userHasSpecialCode(newUserId);
      if (existingUserCode) {
        return res.status(400).json({
          success: false,
          message: 'El usuario destino ya tiene un código especial asignado'
        });
      }
      
      const oldUserId = specialCode.userId;
      
      // Transferir el código
      specialCode.userId = newUserId;
      specialCode.referralCode = newUser.referralCode;
      specialCode.notes = `${specialCode.notes || ''} | Transferido desde usuario ${oldUserId} por: ${reason || 'Sin razón especificada'}`;
      specialCode.metadata.lastUpdated = new Date();
      
      await specialCode.save();
      
      // Poblar los datos para la respuesta
      await specialCode.populate('userId', 'email fullName referralCode');
      await specialCode.populate('assignedBy', 'email fullName');
      
      logger.info(`Special code ${id} transferred from ${oldUserId} to ${newUserId} by admin ${adminId}`);
      
      res.json({
        success: true,
        message: 'Código especial transferido exitosamente',
        data: specialCode
      });
    } catch (error) {
      logger.error('Error transferring special code:', error);
      res.status(500).json({
        success: false,
        message: 'Error al transferir código especial'
      });
    }
  }
  
  /**
   * Obtener estadísticas de códigos especiales
   */
  async getSpecialCodesStatistics(req, res) {
    try {
      const statistics = await SpecialCode.getStatistics();
      const activeCodes = await SpecialCode.getAllActive();
      
      const stats = statistics[0] || {
        totalCodes: 0,
        totalCommissions: 0,
        totalUsersAffected: 0,
        leaderCommissions: 0,
        parentCommissions: 0
      };
      
      res.json({
        success: true,
        data: {
          ...stats,
          activeCodes: activeCodes.length,
          hasLeaderCode: activeCodes.some(code => code.type === 'LIDER'),
        hasParentCode: activeCodes.some(code => code.type === 'PADRE'),
          codes: activeCodes
        }
      });
    } catch (error) {
      logger.error('Error getting special codes statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de códigos especiales'
      });
    }
  }
  
  /**
   * Obtener historial de comisiones de un código especial
   */
  async getCommissionHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      
      const specialCode = await SpecialCode.findById(id);
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      let commissions = specialCode.commissionHistory;
      
      // Filtrar por estado si se especifica
      if (status) {
        commissions = commissions.filter(c => c.status === status);
      }
      
      // Paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedCommissions = commissions.slice(startIndex, endIndex);
      
      // Poblar datos de usuario
      await SpecialCode.populate(paginatedCommissions, {
        path: 'userId',
        select: 'email fullName referralCode'
      });
      
      res.json({
        success: true,
        data: {
          commissions: paginatedCommissions,
          pagination: {
            total: commissions.length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(commissions.length / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting commission history:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial de comisiones'
      });
    }
  }
  
  /**
   * Procesar pago de comisiones pendientes
   */
  async processCommissionPayments(req, res) {
    try {
      const { commissionIds } = req.body;
      const adminId = req.user.id;
      
      if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere una lista de IDs de comisiones'
        });
      }
      
      const results = [];
      
      for (const commissionId of commissionIds) {
        try {
          // Buscar el código especial que contiene esta comisión
          const specialCode = await SpecialCode.findOne({
            'commissionHistory._id': commissionId
          });
          
          if (specialCode) {
            await specialCode.markCommissionAsPaid(commissionId);
            results.push({
              commissionId,
              status: 'success',
              message: 'Comisión marcada como pagada'
            });
          } else {
            results.push({
              commissionId,
              status: 'error',
              message: 'Comisión no encontrada'
            });
          }
        } catch (error) {
          results.push({
            commissionId,
            status: 'error',
            message: error.message
          });
        }
      }
      
      const successCount = results.filter(r => r.status === 'success').length;
      
      logger.info(`Processed ${successCount}/${commissionIds.length} commission payments by admin ${adminId}`);
      
      res.json({
        success: true,
        message: `${successCount} comisiones procesadas exitosamente`,
        data: {
          processed: successCount,
          total: commissionIds.length,
          results
        }
      });
    } catch (error) {
      logger.error('Error processing commission payments:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar pagos de comisiones'
      });
    }
  }
  
  // Función de procesamiento de bonos de asignación eliminada
  // Solo se mantienen las comisiones del 5% para segunda semana

  /**
   * Procesar bonos de líder/padre automáticamente (5% en segunda semana)
   */
  async processLeaderBonuses(req, res) {
    try {
      const adminId = req.user.id;
      const results = [];

      // Obtener todos los códigos especiales de tipo 'leader' o 'parent' activos
      const leaderCodes = await SpecialCode.find({
        type: { $in: ['LIDER', 'PADRE'] },
        isActive: true,
        userId: { $exists: true }
      }).populate('userId', 'username email referralCode');

      for (const code of leaderCodes) {
        try {
          // Buscar usuarios que usen este código y estén en su segunda semana
          const usersWithCode = await User.find({
            'referralInfo.specialCode': code.code
          }).populate('userStatus');

          for (const user of usersWithCode) {
            if (user.userStatus && 
                user.userStatus.benefitCycle.weeksCompleted >= 1 && 
                user.userStatus.benefitCycle.currentDay === 1) {
              
              // Calcular el 5% del monto de la licencia del usuario
              const userInvestment = user.userStatus.totalInvested || 0;
              if (userInvestment > 0) {
                const leaderBonusAmount = userInvestment * 0.05;
                
                // Verificar si ya se pagó este bono para esta semana
                const existingBonus = await Commission.findOne({
                  userId: code.userId._id,
                  commissionType: 'leader_bonus',
                  'metadata.sourceUserId': user._id,
                  'metadata.weekNumber': user.userStatus.benefitCycle.weeksCompleted + 1
                });

                if (!existingBonus) {
                  // Crear registro de comisión de bono de líder
                  const commission = new Commission({
                    userId: code.userId._id,
                    fromUserId: user._id,
                    commissionType: 'leader_bonus',
                    amount: leaderBonusAmount,
                    currency: 'USDT',
                    status: 'paid',
                    specialCodeId: code._id,
                    paymentInfo: {
                      paidAt: new Date(),
                      paidBy: adminId,
                      paymentMethod: 'automatic',
                      notes: `Bono automático de ${code.type} 5% - Usuario: ${user.username}`
                    },
                    metadata: {
                      description: `Bono de ${code.type} 5% - Semana 2 - Usuario: ${user.username}`,
                      sourceUserId: user._id,
                      sourceUserInvestment: userInvestment,
                      bonusRate: 0.05,
                      weekNumber: user.userStatus.benefitCycle.weeksCompleted + 1,
                      calculatedAt: new Date()
                    },
                    createdBy: adminId
                  });

                  await commission.save();

                  // Actualizar historial de comisiones en el código especial
                  code.commissionHistory.push({
                    userId: user._id,
                    amount: leaderBonusAmount,
                    commissionType: 'leader_bonus',
                    status: 'paid',
                    paidAt: new Date(),
                    transactionId: commission._id,
                    metadata: {
                      weekNumber: user.userStatus.benefitCycle.weeksCompleted + 1,
                      sourceInvestment: userInvestment
                    }
                  });
                  await code.save();

                  // Actualizar el capital del líder/padre
                  await User.findByIdAndUpdate(code.userId._id, {
                    $inc: { 'capital.available': leaderBonusAmount }
                  });

                  results.push({
                    codeId: code._id,
                    codeType: code.type,
                    leaderId: code.userId._id,
                    sourceUserId: user._id,
                    bonusAmount: leaderBonusAmount,
                    status: 'success'
                  });

                  logger.info(`Bono de ${code.type} procesado`, {
                    leaderId: code.userId._id,
                    sourceUserId: user._id,
                    bonusAmount: leaderBonusAmount,
                    codeType: code.type
                  });
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Error processing bonuses for code ${code._id}:`, error);
          results.push({
            codeId: code._id,
            status: 'error',
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;

      res.json({
        success: true,
        message: `${successCount} bonos de líder/padre procesados exitosamente`,
        data: {
          processed: successCount,
          total: results.length,
          results
        }
      });
    } catch (error) {
      logger.error('Error processing leader bonuses:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar bonos de líder/padre'
      });
    }
  }

  /**
   * Aplicar beneficios manualmente para códigos PADRE y LIDER
   */
  async applyManualBenefits(req, res) {
    try {
      const { codeId, userId, amount, reason, benefitType } = req.body;
      const adminId = req.user.id;
      
      // Validar datos de entrada
      if (!codeId || !userId || !amount || !reason || !benefitType) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: codeId, userId, amount, reason, benefitType'
        });
      }
      
      if (!['leader_bonus', 'parent_bonus'].includes(benefitType)) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de beneficio debe ser "leader_bonus" o "parent_bonus"'
        });
      }
      
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }
      
      // Verificar que el código especial existe y está activo
      const specialCode = await SpecialCode.findById(codeId).populate('userId');
      if (!specialCode) {
        return res.status(404).json({
          success: false,
          message: 'Código especial no encontrado'
        });
      }
      
      if (!specialCode.isActive) {
        return res.status(400).json({
          success: false,
          message: 'El código especial no está activo'
        });
      }
      
      // Verificar que el usuario beneficiario existe
      const beneficiaryUser = await User.findById(userId);
      if (!beneficiaryUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario beneficiario no encontrado'
        });
      }
      
      // Crear registro de comisión manual
      const commission = new Commission({
        userId: specialCode.userId._id,
        fromUserId: userId,
        commissionType: benefitType,
        amount: parseFloat(amount),
        currency: 'USDT',
        status: 'paid',
        specialCodeId: specialCode._id,
        paymentInfo: {
          paidAt: new Date(),
          paidBy: adminId,
          paymentMethod: 'manual',
          notes: `Aplicación manual de beneficio - Razón: ${reason}`
        },
        metadata: {
          description: `Beneficio manual de ${specialCode.type} - ${reason}`,
          sourceUserId: userId,
          isManualApplication: true,
          appliedBy: adminId,
          reason: reason,
          calculatedAt: new Date()
        },
        createdBy: adminId
      });
      
      await commission.save();
      
      // Actualizar historial de comisiones en el código especial
      specialCode.commissionHistory.push({
        userId: userId,
        amount: parseFloat(amount),
        commissionType: benefitType,
        status: 'paid',
        paidAt: new Date(),
        transactionId: commission._id,
        metadata: {
          isManualApplication: true,
          appliedBy: adminId,
          reason: reason
        }
      });
      await specialCode.save();
      
      // Actualizar el capital del beneficiario
      await User.findByIdAndUpdate(specialCode.userId._id, {
        $inc: { 'capital.available': parseFloat(amount) }
      });
      
      logger.info(`Beneficio manual aplicado`, {
        codeId: specialCode._id,
        codeType: specialCode.type,
        beneficiaryId: specialCode.userId._id,
        sourceUserId: userId,
        amount: parseFloat(amount),
        reason: reason,
        appliedBy: adminId
      });
      
      res.json({
        success: true,
        message: 'Beneficio aplicado exitosamente',
        data: {
          commissionId: commission._id,
          codeType: specialCode.type,
          beneficiaryUser: {
            id: specialCode.userId._id,
            email: specialCode.userId.email,
            fullName: specialCode.userId.fullName
          },
          sourceUser: {
            id: beneficiaryUser._id,
            email: beneficiaryUser.email,
            fullName: beneficiaryUser.fullName
          },
          amount: parseFloat(amount),
          reason: reason
        }
      });
    } catch (error) {
      logger.error('Error applying manual benefits:', error);
      res.status(500).json({
        success: false,
        message: 'Error al aplicar beneficio manual'
      });
    }
  }
  
  /**
   * Obtener estadísticas de comisiones de segunda semana
   */
  async getSecondWeekCommissionStats(req, res) {
    try {
      // Estadísticas de comisiones de segunda semana desde el modelo Commission
      const totalPaid = await Commission.aggregate([
        {
          $match: {
            commissionType: { $in: ['leader_bonus', 'parent_bonus'] },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Comisiones pendientes de segunda semana
      const pendingCommissions = await Commission.countDocuments({
         commissionType: { $in: ['leader_bonus', 'parent_bonus'] },
         status: 'pending'
       });

       // Comisiones por tipo de código
       const commissionsByType = await Commission.aggregate([
         {
           $match: {
             commissionType: { $in: ['leader_bonus', 'parent_bonus'] },
             status: 'paid'
           }
         },
         {
           $lookup: {
             from: 'specialcodes',
             localField: 'specialCodeId',
             foreignField: '_id',
             as: 'specialCode'
           }
         },
         {
           $unwind: '$specialCode'
         },
         {
           $group: {
             _id: '$specialCode.type',
             totalAmount: { $sum: '$amount' },
             count: { $sum: 1 }
           }
         }
       ]);

      res.json({
        success: true,
        data: {
          totalPaid: totalPaid[0] || { totalAmount: 0, count: 0 },
          pendingCount: pendingCommissions,
          byType: commissionsByType
        }
      });
    } catch (error) {
      logger.error('Error getting second week commission statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de comisiones de segunda semana'
      });
    }
  }

  /**
   * Obtener configuración del sistema de códigos especiales
   */
  async getConfiguration(req, res) {
    try {
      // Configuración básica del sistema
      const configuration = {
        codeTypes: {
          PADRE: {
            name: 'PADRE',
            description: 'Código padre con beneficios de comisión',
            commissionRate: 0.10, // 10%
            features: ['commission', 'transfer', 'benefits']
          },
          LIDER: {
            name: 'LIDER',
            description: 'Código líder con beneficios especiales',
            commissionRate: 0.05, // 5%
            features: ['commission', 'transfer', 'leader_bonus']
          },
          ADMIN: {
            name: 'ADMIN',
            description: 'Código administrativo con acceso completo',
            commissionRate: 0.00,
            features: ['full_access', 'management']
          },
          TEST: {
            name: 'TEST',
            description: 'Código de prueba para testing',
            commissionRate: 0.00,
            features: ['testing']
          }
        },
        limits: {
          maxTransferAmount: 10000,
          minTransferAmount: 1,
          maxCodesPerUser: 10,
          commissionProcessingDays: [1, 15] // Días del mes para procesar comisiones
        },
        settings: {
          autoProcessCommissions: true,
          requireApprovalForTransfers: false,
          enableBenefitSystem: true,
          maxBenefitAmount: 5000
        }
      };

      res.json({
        success: true,
        data: configuration
      });
    } catch (error) {
      logger.error('Error getting configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración del sistema'
      });
    }
  }
}

// Crear instancia del controlador
const specialCodesController = new SpecialCodesController();

// Exportar las funciones individuales para compatibilidad con las rutas
module.exports = {
  getAllSpecialCodes: specialCodesController.getAllSpecialCodes.bind(specialCodesController),
  getSpecialCodeById: specialCodesController.getSpecialCodeById.bind(specialCodesController),
  createSpecialCode: specialCodesController.createSpecialCode.bind(specialCodesController),
  updateSpecialCode: specialCodesController.updateSpecialCode.bind(specialCodesController),
  deleteSpecialCode: specialCodesController.deleteSpecialCode.bind(specialCodesController),
  transferSpecialCode: specialCodesController.transferSpecialCode.bind(specialCodesController),
  getSpecialCodesStatistics: specialCodesController.getSpecialCodesStatistics.bind(specialCodesController),
  getCommissionHistory: specialCodesController.getCommissionHistory.bind(specialCodesController),
  processCommissionPayments: specialCodesController.processCommissionPayments.bind(specialCodesController),
  processLeaderBonuses: specialCodesController.processLeaderBonuses.bind(specialCodesController),
  getSecondWeekCommissionStats: specialCodesController.getSecondWeekCommissionStats.bind(specialCodesController),
  applyManualBenefits: specialCodesController.applyManualBenefits.bind(specialCodesController),
  getConfiguration: specialCodesController.getConfiguration.bind(specialCodesController)
};