const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Wallet = require('../models/Wallet.model');
const DailyReport = require('../models/DailyReport');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

class ReportsGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.tempDir = path.join(__dirname, '../../temp');
    this.liquidityThresholds = {
      critical: 0.05,  // 5%
      warning: 0.15,   // 15%
      healthy: 0.30    // 30%
    };
  }

  /**
   * Generar reporte diario completo
   */
  async generateDailyReport(date = null) {
    const reportDate = date ? new Date(date) : new Date();
    const dateStr = reportDate.toISOString().split('T')[0];
    
    logger.info(`Generando reporte diario para: ${dateStr}`);

    try {
      // Verificar si ya existe un reporte para esta fecha
      let existingReport = await DailyReport.findOne({
        report_date: reportDate
      });

      const reportData = await this.collectDailyData(reportDate);
      
      if (existingReport) {
        // Actualizar reporte existente
        Object.assign(existingReport, reportData);
        await existingReport.save();
        logger.info(`Reporte diario actualizado para: ${dateStr}`);
      } else {
        // Crear nuevo reporte
        existingReport = new DailyReport({
          report_date: reportDate,
          ...reportData
        });
        await existingReport.save();
        logger.info(`Nuevo reporte diario creado para: ${dateStr}`);
      }

      // Generar archivo de reporte detallado
      const detailedReport = await this.generateDetailedReport(reportDate, reportData);
      await this.saveReportFile(dateStr, detailedReport);

      return {
        ...reportData,
        report_date: dateStr,
        file_path: path.join(this.reportsDir, `daily_report_${dateStr}.json`)
      };

    } catch (error) {
      logger.error(`Error generando reporte diario para ${dateStr}:`, error);
      throw error;
    }
  }

  /**
   * Recopilar datos diarios
   */
  async collectDailyData(date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const data = {
      total_benefits_processed: 0,
      total_users_processed: 0,
      total_withdrawals: 0,
      available_balance: 0,
      liquidity_status: 'healthy',
      processing_time_ms: 0,
      errors_count: 0
    };

    try {
      // Beneficios procesados (usando earnings en lugar de benefit)
      const benefitsData = await Transaction.aggregate([
        {
          $match: {
            type: 'earnings',
            status: 'completed',
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            unique_users: { $addToSet: '$user' }
          }
        },
        {
          $project: {
            total: 1,
            count: 1,
            unique_users: { $size: '$unique_users' }
          }
        }
      ]);

      if (benefitsData.length > 0) {
        data.total_benefits_processed = parseFloat(benefitsData[0].total) || 0;
        data.total_users_processed = parseInt(benefitsData[0].unique_users) || 0;
      }

      // Retiros del día
      const withdrawalsData = await Transaction.aggregate([
        {
          $match: {
            type: 'withdrawal',
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      if (withdrawalsData.length > 0) {
        data.total_withdrawals = parseFloat(withdrawalsData[0].total) || 0;
      }

      // Saldo disponible total (usando balance en lugar de available_balance)
      const balanceData = await Wallet.aggregate([
        {
          $match: {
            status: 'active'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$balance' }
          }
        }
      ]);

      if (balanceData.length > 0) {
        data.available_balance = parseFloat(balanceData[0].total) || 0;
      }

      // Determinar estado de liquidez
      data.liquidity_status = this.calculateLiquidityStatus(data.available_balance);

      return data;

    } catch (error) {
      logger.error('Error recopilando datos diarios:', error);
      throw error;
    }
  }

  /**
   * Generar reporte detallado
   */
  async generateDetailedReport(date, basicData) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const detailedReport = {
      date: date.toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      summary: basicData,
      details: {}
    };

    try {
      // Desglose por tipo de paquete
      detailedReport.details.benefits_by_package = await this.getBenefitsByPackage(startOfDay, endOfDay);
      
      // Estadísticas de usuarios
      detailedReport.details.user_stats = await this.getUserStats();
      
      // Transacciones por hora
      detailedReport.details.hourly_transactions = await this.getHourlyTransactions(startOfDay, endOfDay);
      
      // Top usuarios por beneficios
      detailedReport.details.top_users = await this.getTopUsersByBenefits(startOfDay, endOfDay);
      
      // Estado de billeteras
      detailedReport.details.wallet_status = await this.getWalletStatus();
      
      // Proyecciones
      detailedReport.details.projections = await this.generateProjections();

      return detailedReport;

    } catch (error) {
      logger.error('Error generando reporte detallado:', error);
      throw error;
    }
  }

  /**
   * Obtener beneficios por tipo de paquete
   */
  async getBenefitsByPackage(startDate, endDate) {
    try {
      const results = await Transaction.aggregate([
        {
          $match: {
            type: 'earnings',
            status: 'completed',
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $group: {
            _id: '$userInfo.package_type',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        },
        {
          $project: {
            package_type: '$_id',
            count: 1,
            total: 1,
            _id: 0
          }
        }
      ]);

      return results.map(result => ({
        package_type: result.package_type,
        count: parseInt(result.count),
        total: parseFloat(result.total)
      }));

    } catch (error) {
      logger.error('Error obteniendo beneficios por paquete:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: {
              status: '$status',
              package_type: '$package_type'
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id.status',
            package_type: '$_id.package_type',
            count: 1,
            _id: 0
          }
        }
      ]);

      return stats.map(stat => ({
        status: stat.status,
        package_type: stat.package_type,
        count: parseInt(stat.count)
      }));

    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener transacciones por hora
   */
  async getHourlyTransactions(startDate, endDate) {
    try {
      const results = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              type: '$type'
            },
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        },
        {
          $project: {
            hour: '$_id.hour',
            type: '$_id.type',
            count: 1,
            total: 1,
            _id: 0
          }
        },
        {
          $sort: { hour: 1 }
        }
      ]);

      return results.map(result => ({
        hour: parseInt(result.hour),
        type: result.type,
        count: parseInt(result.count),
        total: parseFloat(result.total)
      }));

    } catch (error) {
      logger.error('Error obteniendo transacciones por hora:', error);
      return [];
    }
  }

  /**
   * Obtener top usuarios por beneficios
   */
  async getTopUsersByBenefits(startDate, endDate, limit = 10) {
    try {
      const results = await Transaction.aggregate([
        {
          $match: {
            type: 'earnings',
            status: 'completed',
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: '$user',
            transactions_count: { $sum: 1 },
            total_benefits: { $sum: '$amount' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $project: {
            user_id: '$_id',
            email: '$userInfo.email',
            name: { $concat: ['$userInfo.first_name', ' ', '$userInfo.last_name'] },
            package_type: '$userInfo.package_type',
            transactions_count: 1,
            total_benefits: 1,
            _id: 0
          }
        },
        {
          $sort: { total_benefits: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return results.map(result => ({
        user_id: result.user_id,
        email: result.email,
        name: result.name,
        package_type: result.package_type,
        transactions_count: parseInt(result.transactions_count),
        total_benefits: parseFloat(result.total_benefits)
      }));

    } catch (error) {
      logger.error('Error obteniendo top usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener estado de billeteras
   */
  async getWalletStatus() {
    try {
      const stats = await Wallet.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_balance: { $sum: '$balance' },
            avg_balance: { $avg: '$balance' }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            total_balance: 1,
            avg_balance: 1,
            _id: 0
          }
        }
      ]);

      return stats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.count),
        total_balance: parseFloat(stat.total_balance) || 0,
        avg_balance: parseFloat(stat.avg_balance) || 0
      }));

    } catch (error) {
      logger.error('Error obteniendo estado de billeteras:', error);
      return [];
    }
  }

  /**
   * Generar proyecciones
   */
  async generateProjections() {
    try {
      // Obtener datos de los últimos 7 días
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const recentReports = await DailyReport.find({
        report_date: {
          $gte: sevenDaysAgo
        }
      }).sort({ report_date: -1 });

      if (recentReports.length === 0) {
        return {
          daily_benefits_avg: 0,
          daily_withdrawals_avg: 0,
          projected_7_days: {
            benefits: 0,
            withdrawals: 0,
            net_flow: 0
          }
        };
      }

      const avgBenefits = recentReports.reduce((sum, report) => sum + report.total_benefits_processed, 0) / recentReports.length;
      const avgWithdrawals = recentReports.reduce((sum, report) => sum + report.total_withdrawals, 0) / recentReports.length;

      return {
        daily_benefits_avg: avgBenefits,
        daily_withdrawals_avg: avgWithdrawals,
        projected_7_days: {
          benefits: avgBenefits * 7,
          withdrawals: avgWithdrawals * 7,
          net_flow: (avgBenefits - avgWithdrawals) * 7
        }
      };

    } catch (error) {
      logger.error('Error generando proyecciones:', error);
      return null;
    }
  }

  /**
   * Verificar estado de liquidez
   */
  async checkLiquidityStatus() {
    try {
      // Obtener saldo total disponible
      const totalBalanceResult = await Wallet.aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$balance' }
          }
        }
      ]);
      const totalBalance = totalBalanceResult.length > 0 ? totalBalanceResult[0].total : 0;

      // Obtener retiros pendientes
      const pendingWithdrawalsResult = await Transaction.aggregate([
        {
          $match: {
            type: 'withdrawal',
            status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      const pendingWithdrawals = pendingWithdrawalsResult.length > 0 ? pendingWithdrawalsResult[0].total : 0;

      // Calcular proyección de retiros para los próximos 3 días
      const projectedWithdrawals = await this.getProjectedWithdrawals(3);

      const availableAfterPending = totalBalance - pendingWithdrawals;
      const availableAfterProjected = availableAfterPending - projectedWithdrawals;

      const status = this.calculateLiquidityStatus(availableAfterProjected);

      return {
        total_balance: totalBalance,
        pending_withdrawals: pendingWithdrawals,
        projected_withdrawals_3d: projectedWithdrawals,
        available_balance: availableAfterPending,
        projected_balance_3d: availableAfterProjected,
        status,
        thresholds: this.liquidityThresholds,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error verificando estado de liquidez:', error);
      throw error;
    }
  }

  /**
   * Calcular estado de liquidez
   */
  calculateLiquidityStatus(availableBalance) {
    // Obtener el total de beneficios diarios promedio para calcular porcentajes
    const estimatedDailyBenefits = 10000; // Esto debería calcularse dinámicamente
    
    const ratio = availableBalance / estimatedDailyBenefits;
    
    if (ratio <= this.liquidityThresholds.critical) {
      return 'critical';
    } else if (ratio <= this.liquidityThresholds.warning) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Obtener proyección de retiros
   */
  async getProjectedWithdrawals(days) {
    try {
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const avgWithdrawals = await Transaction.aggregate([
        {
          $match: {
            type: 'withdrawal',
            status: 'completed',
            createdAt: {
              $gte: daysAgo
            }
          }
        },
        {
          $group: {
            _id: null,
            avg_amount: { $avg: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (avgWithdrawals.length > 0 && avgWithdrawals[0].count > 0) {
        const dailyAvg = (parseFloat(avgWithdrawals[0].avg_amount) * parseInt(avgWithdrawals[0].count)) / days;
        return dailyAvg * days;
      }

      return 0;

    } catch (error) {
      logger.error('Error calculando proyección de retiros:', error);
      return 0;
    }
  }

  /**
   * Guardar archivo de reporte
   */
  async saveReportFile(dateStr, reportData) {
    try {
      // Asegurar que el directorio existe
      await fs.mkdir(this.reportsDir, { recursive: true });
      
      const filePath = path.join(this.reportsDir, `daily_report_${dateStr}.json`);
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
      
      logger.info(`Archivo de reporte guardado: ${filePath}`);
      return filePath;

    } catch (error) {
      logger.error('Error guardando archivo de reporte:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de beneficios diarios
   */
  async generateDailyBenefitsReport(processingResult) {
    const dateStr = new Date().toISOString().split('T')[0];
    
    const report = {
      date: dateStr,
      processing_result: processingResult,
      generated_at: new Date().toISOString(),
      summary: {
        users_processed: processingResult.usersProcessed,
        total_amount: processingResult.totalAmount,
        errors_count: processingResult.errors.length,
        processing_time: processingResult.duration
      }
    };

    try {
      await this.saveReportFile(`benefits_${dateStr}`, report);
      return report;
    } catch (error) {
      logger.error('Error generando reporte de beneficios:', error);
      throw error;
    }
  }

  /**
   * Limpiar archivos temporales
   */
  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Eliminar archivos más antiguos de 24 horas
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Archivos temporales eliminados: ${deletedCount}`);
      return deletedCount;

    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error limpiando archivos temporales:', error);
      }
      return 0;
    }
  }

  /**
   * Obtener reportes por rango de fechas
   */
  async getReportsByDateRange(startDate, endDate) {
    try {
      return await DailyReport.find({
        report_date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ report_date: -1 });
    } catch (error) {
      logger.error('Error obteniendo reportes por rango de fechas:', error);
      throw error;
    }
  }
}

module.exports = ReportsGenerator;