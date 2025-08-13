/**
 * Script de auditoría de seguridad para wallets
 * Ejecuta verificaciones diarias de integridad y seguridad
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { validateWalletAddress } = require('../utils/walletValidator');
const logger = require('../utils/logger');

// Configuración
require('dotenv').config();

class WalletSecurityAudit {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      summary: {
        total_wallets: 0,
        valid_wallets: 0,
        invalid_wallets: 0,
        suspicious_wallets: 0,
        duplicate_addresses: 0
      },
      findings: [],
      recommendations: []
    };
  }

  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Conectado a MongoDB para auditoría');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async auditWalletAddresses() {
    try {
      console.log('🔍 Auditando direcciones de wallets...');
      
      const Wallet = require('../models/Wallet.model');
      const wallets = await Wallet.find({}).select('address network status createdBy createdAt');
      
      this.auditResults.summary.total_wallets = wallets.length;
      
      const addressMap = new Map();
      
      for (const wallet of wallets) {
        // Verificar duplicados
        if (addressMap.has(wallet.address)) {
          this.auditResults.summary.duplicate_addresses++;
          this.auditResults.findings.push({
            type: 'DUPLICATE_ADDRESS',
            severity: 'HIGH',
            wallet_id: wallet._id.toString(),
            address: wallet.address,
            network: wallet.network,
            message: 'Dirección duplicada encontrada'
          });
        } else {
          addressMap.set(wallet.address, wallet._id);
        }
        
        // Validar dirección
        try {
          const validation = await validateWalletAddress(wallet.address, wallet.network);
          
          if (!validation.isValid) {
            this.auditResults.summary.invalid_wallets++;
            this.auditResults.findings.push({
              type: 'INVALID_ADDRESS',
              severity: 'HIGH',
              wallet_id: wallet._id.toString(),
              address: wallet.address,
              network: wallet.network,
              errors: validation.errors,
              message: 'Dirección inválida'
            });
          } else {
            this.auditResults.summary.valid_wallets++;
          }
          
          if (validation.warnings && validation.warnings.length > 0) {
            this.auditResults.summary.suspicious_wallets++;
            this.auditResults.findings.push({
              type: 'SUSPICIOUS_ADDRESS',
              severity: 'MEDIUM',
              wallet_id: wallet._id.toString(),
              address: wallet.address,
              network: wallet.network,
              warnings: validation.warnings,
              message: 'Dirección sospechosa'
            });
          }
        } catch (error) {
          this.auditResults.findings.push({
            type: 'VALIDATION_ERROR',
            severity: 'MEDIUM',
            wallet_id: wallet._id.toString(),
            address: wallet.address,
            network: wallet.network,
            error: error.message,
            message: 'Error en validación'
          });
        }
      }
      
      console.log(`✅ Auditoría de direcciones completada: ${wallets.length} wallets`);
    } catch (error) {
      console.error('❌ Error auditando direcciones:', error);
      throw error;
    }
  }

  async auditUserActivity() {
    try {
      console.log('👥 Auditando actividad de usuarios...');
      
      const UserWalletRole = require('../models/UserWalletRole.model');
      const AdminLog = require('../models/AdminLog.model');
      
      // Verificar roles expirados
      const expiredRoles = await UserWalletRole.find({
        expiresAt: { $lt: new Date() },
        isActive: true
      });
      
      for (const role of expiredRoles) {
        this.auditResults.findings.push({
          type: 'EXPIRED_ROLE',
          severity: 'MEDIUM',
          user_id: role.userId.toString(),
          role_id: role.walletRoleId.toString(),
          expired_at: role.expiresAt,
          message: 'Rol de wallet expirado pero aún activo'
        });
      }
      
      // Verificar actividad inusual en las últimas 24 horas
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = await AdminLog.find({
        createdAt: { $gte: yesterday },
        action: { $in: ['CREATE_WALLET', 'UPDATE_WALLET', 'DELETE_WALLET'] }
      });
      
      // Agrupar por usuario
      const activityByUser = {};
      recentActivity.forEach(log => {
        const userId = log.adminId.toString();
        if (!activityByUser[userId]) {
          activityByUser[userId] = [];
        }
        activityByUser[userId].push(log);
      });
      
      // Detectar actividad inusual
      for (const [userId, activities] of Object.entries(activityByUser)) {
        if (activities.length > 20) { // Más de 20 acciones en 24h
          this.auditResults.findings.push({
            type: 'UNUSUAL_ACTIVITY',
            severity: 'HIGH',
            user_id: userId,
            activity_count: activities.length,
            time_period: '24h',
            message: 'Actividad inusualmente alta detectada'
          });
        }
      }
      
      console.log('✅ Auditoría de actividad completada');
    } catch (error) {
      console.error('❌ Error auditando actividad:', error);
      throw error;
    }
  }

  async generateRecommendations() {
    console.log('💡 Generando recomendaciones...');
    
    // Recomendaciones basadas en hallazgos
    if (this.auditResults.summary.duplicate_addresses > 0) {
      this.auditResults.recommendations.push(
        `Eliminar ${this.auditResults.summary.duplicate_addresses} direcciones duplicadas`
      );
    }
    
    if (this.auditResults.summary.invalid_wallets > 0) {
      this.auditResults.recommendations.push(
        `Revisar y corregir ${this.auditResults.summary.invalid_wallets} direcciones inválidas`
      );
    }
    
    if (this.auditResults.summary.suspicious_wallets > 0) {
      this.auditResults.recommendations.push(
        `Investigar ${this.auditResults.summary.suspicious_wallets} direcciones sospechosas`
      );
    }
    
    const expiredRoles = this.auditResults.findings.filter(f => f.type === 'EXPIRED_ROLE').length;
    if (expiredRoles > 0) {
      this.auditResults.recommendations.push(
        `Desactivar ${expiredRoles} roles de wallet expirados`
      );
    }
    
    const unusualActivity = this.auditResults.findings.filter(f => f.type === 'UNUSUAL_ACTIVITY').length;
    if (unusualActivity > 0) {
      this.auditResults.recommendations.push(
        `Investigar actividad inusual de ${unusualActivity} usuarios`
      );
    }
    
    // Recomendaciones generales
    if (this.auditResults.findings.length === 0) {
      this.auditResults.recommendations.push('No se encontraron problemas de seguridad');
    }
    
    console.log(`✅ ${this.auditResults.recommendations.length} recomendaciones generadas`);
  }

  async saveAuditLog() {
    try {
      console.log('💾 Guardando log de auditoría...');
      
      const logsDir = path.join(__dirname, '../logs');
      
      // Crear directorio si no existe
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const logFile = path.join(logsDir, `wallet-audit-${timestamp}.json`);
      
      await fs.writeFile(logFile, JSON.stringify(this.auditResults, null, 2));
      
      console.log(`✅ Log guardado en: ${logFile}`);
    } catch (error) {
      console.error('❌ Error guardando log:', error);
      throw error;
    }
  }

  async run() {
    try {
      console.log('🚀 INICIANDO AUDITORÍA DE SEGURIDAD DE WALLETS');
      console.log('===============================================\n');
      
      await this.connectDatabase();
      await this.auditWalletAddresses();
      await this.auditUserActivity();
      await this.generateRecommendations();
      await this.saveAuditLog();
      
      console.log('\n📊 RESUMEN DE AUDITORÍA');
      console.log('========================');
      console.log(`📅 Fecha: ${this.auditResults.timestamp}`);
      console.log(`📊 Total wallets: ${this.auditResults.summary.total_wallets}`);
      console.log(`✅ Válidas: ${this.auditResults.summary.valid_wallets}`);
      console.log(`❌ Inválidas: ${this.auditResults.summary.invalid_wallets}`);
      console.log(`⚠️  Sospechosas: ${this.auditResults.summary.suspicious_wallets}`);
      console.log(`🔄 Duplicadas: ${this.auditResults.summary.duplicate_addresses}`);
      console.log(`🔍 Hallazgos: ${this.auditResults.findings.length}`);
      console.log(`💡 Recomendaciones: ${this.auditResults.recommendations.length}`);
      
      if (this.auditResults.recommendations.length > 0) {
        console.log('\n💡 RECOMENDACIONES:');
        this.auditResults.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      console.log('\n✅ Auditoría completada exitosamente');
      
      // Retornar resultados para uso programático
      return this.auditResults;
      
    } catch (error) {
      console.error('❌ Error en auditoría:', error);
      throw error;
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('🔌 Conexión a base de datos cerrada');
      }
    }
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  const audit = new WalletSecurityAudit();
  audit.run()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Auditoría falló:', error);
      process.exit(1);
    });
}

module.exports = WalletSecurityAudit;