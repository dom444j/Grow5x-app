const mongoose = require('mongoose');
const Wallet = require('../src/models/Wallet.model');
const User = require('../src/models/User');
const UserWalletRole = require('../src/models/UserWalletRole.model');
const AdminLog = require('../src/models/AdminLog.model');
const { validateWalletAddress, generateValidationReport } = require('../src/utils/walletValidator');
const logger = require('../src/utils/logger');
require('dotenv').config();

/**
 * Script de auditoría de seguridad para wallets
 * Ejecuta verificaciones diarias de seguridad y genera reportes
 */

class WalletSecurityAuditor {
  constructor() {
    this.report = {
      timestamp: new Date(),
      totalWallets: 0,
      suspiciousWallets: [],
      invalidWallets: [],
      duplicateAddresses: [],
      unusualActivity: [],
      roleViolations: [],
      recommendations: [],
      summary: {}
    };
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      process.exit(1);
    }
  }

  async auditWalletAddresses() {
    console.log('🔍 Auditando direcciones de wallets...');
    
    const wallets = await Wallet.find({}).populate('userId', 'email role');
    this.report.totalWallets = wallets.length;
    
    const validationResults = [];
    const addressCounts = {};
    
    for (const wallet of wallets) {
      // Validar dirección
      const validation = validateWalletAddress(wallet.address, wallet.network, {
        strictChecksum: true,
        checkLength: true
      });
      
      validationResults.push(validation);
      
      // Verificar direcciones duplicadas
      if (addressCounts[wallet.address]) {
        addressCounts[wallet.address].push(wallet);
      } else {
        addressCounts[wallet.address] = [wallet];
      }
      
      // Identificar wallets sospechosas
      if (!validation.isValid || validation.security.riskLevel === 'high') {
        this.report.suspiciousWallets.push({
          walletId: wallet._id,
          address: wallet.address,
          network: wallet.network,
          userId: wallet.userId?._id,
          userEmail: wallet.userId?.email,
          errors: validation.errors,
          warnings: validation.warnings,
          riskScore: validation.security.riskScore,
          riskLevel: validation.security.riskLevel
        });
      }
      
      // Identificar wallets inválidas
      if (!validation.isValid) {
        this.report.invalidWallets.push({
          walletId: wallet._id,
          address: wallet.address,
          network: wallet.network,
          errors: validation.errors
        });
      }
    }
    
    // Identificar direcciones duplicadas
    Object.entries(addressCounts).forEach(([address, wallets]) => {
      if (wallets.length > 1) {
        this.report.duplicateAddresses.push({
          address,
          count: wallets.length,
          wallets: wallets.map(w => ({
            id: w._id,
            userId: w.userId?._id,
            userEmail: w.userId?.email,
            createdAt: w.createdAt
          }))
        });
      }
    });
    
    // Generar reporte de validación
    this.report.validationReport = generateValidationReport(validationResults);
    
    console.log(`✅ Auditadas ${wallets.length} wallets`);
    console.log(`⚠️  Encontradas ${this.report.suspiciousWallets.length} wallets sospechosas`);
    console.log(`❌ Encontradas ${this.report.invalidWallets.length} wallets inválidas`);
    console.log(`🔄 Encontradas ${this.report.duplicateAddresses.length} direcciones duplicadas`);
  }

  async auditUserActivity() {
    console.log('👥 Auditando actividad de usuarios...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Buscar actividad inusual en creación de wallets
    const recentWallets = await Wallet.find({
      createdAt: { $gte: yesterday }
    }).populate('userId', 'email role');
    
    const userWalletCounts = {};
    
    recentWallets.forEach(wallet => {
      const userId = wallet.userId?._id?.toString();
      if (userId) {
        if (!userWalletCounts[userId]) {
          userWalletCounts[userId] = {
            count: 0,
            user: wallet.userId,
            wallets: []
          };
        }
        userWalletCounts[userId].count++;
        userWalletCounts[userId].wallets.push(wallet);
      }
    });
    
    // Identificar usuarios con actividad inusual
    Object.values(userWalletCounts).forEach(userData => {
      if (userData.count > 5) { // Más de 5 wallets en 24 horas
        this.report.unusualActivity.push({
          userId: userData.user._id,
          userEmail: userData.user.email,
          userRole: userData.user.role,
          walletsCreated: userData.count,
          timeframe: '24 hours',
          wallets: userData.wallets.map(w => ({
            id: w._id,
            address: w.address,
            network: w.network,
            createdAt: w.createdAt
          }))
        });
      }
    });
    
    console.log(`⚠️  Encontrados ${this.report.unusualActivity.length} usuarios con actividad inusual`);
  }

  async auditRoleCompliance() {
    console.log('🔐 Auditando cumplimiento de roles...');
    
    const userWalletRoles = await UserWalletRole.find({ isActive: true })
      .populate('userId', 'email role');
    
    for (const userRole of userWalletRoles) {
      // Verificar si el rol ha expirado
      if (userRole.isExpired()) {
        this.report.roleViolations.push({
          type: 'expired_role',
          userId: userRole.userId._id,
          userEmail: userRole.userId.email,
          walletRole: userRole.walletRole,
          expiresAt: userRole.expiresAt,
          message: 'Wallet role has expired but is still active'
        });
      }
      
      // Verificar límites de actividad
      const today = new Date();
      const dailyLimit = userRole.activityLimits.dailyWalletCreations.limit;
      const dailyCount = userRole.activityLimits.dailyWalletCreations.count;
      const dailyDate = userRole.activityLimits.dailyWalletCreations.date;
      
      if (dailyDate.toDateString() === today.toDateString() && dailyCount > dailyLimit) {
        this.report.roleViolations.push({
          type: 'daily_limit_exceeded',
          userId: userRole.userId._id,
          userEmail: userRole.userId.email,
          walletRole: userRole.walletRole,
          dailyCount,
          dailyLimit,
          message: 'Daily wallet creation limit exceeded'
        });
      }
      
      // Verificar actividad reciente sospechosa
      const recentActivity = userRole.activityHistory.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        const hoursDiff = (today - activityDate) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });
      
      if (recentActivity.length > 50) { // Más de 50 acciones en 24 horas
        this.report.roleViolations.push({
          type: 'excessive_activity',
          userId: userRole.userId._id,
          userEmail: userRole.userId.email,
          walletRole: userRole.walletRole,
          activityCount: recentActivity.length,
          timeframe: '24 hours',
          message: 'Excessive wallet-related activity detected'
        });
      }
    }
    
    console.log(`⚠️  Encontradas ${this.report.roleViolations.length} violaciones de roles`);
  }

  async generateRecommendations() {
    console.log('💡 Generando recomendaciones...');
    
    // Recomendaciones basadas en wallets sospechosas
    if (this.report.suspiciousWallets.length > 0) {
      this.report.recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Revisar wallets sospechosas',
        description: `Se encontraron ${this.report.suspiciousWallets.length} wallets con patrones sospechosos`,
        action: 'Revisar manualmente y considerar bloquear o eliminar',
        affectedCount: this.report.suspiciousWallets.length
      });
    }
    
    // Recomendaciones basadas en direcciones duplicadas
    if (this.report.duplicateAddresses.length > 0) {
      this.report.recommendations.push({
        priority: 'medium',
        category: 'data_integrity',
        title: 'Resolver direcciones duplicadas',
        description: `Se encontraron ${this.report.duplicateAddresses.length} direcciones duplicadas`,
        action: 'Investigar y eliminar duplicados, mantener solo la wallet más reciente',
        affectedCount: this.report.duplicateAddresses.length
      });
    }
    
    // Recomendaciones basadas en actividad inusual
    if (this.report.unusualActivity.length > 0) {
      this.report.recommendations.push({
        priority: 'high',
        category: 'user_behavior',
        title: 'Investigar actividad inusual',
        description: `${this.report.unusualActivity.length} usuarios muestran patrones de creación inusuales`,
        action: 'Contactar usuarios y verificar legitimidad de la actividad',
        affectedCount: this.report.unusualActivity.length
      });
    }
    
    // Recomendaciones basadas en violaciones de roles
    if (this.report.roleViolations.length > 0) {
      this.report.recommendations.push({
        priority: 'medium',
        category: 'role_management',
        title: 'Corregir violaciones de roles',
        description: `${this.report.roleViolations.length} violaciones de roles detectadas`,
        action: 'Actualizar roles expirados y ajustar límites según sea necesario',
        affectedCount: this.report.roleViolations.length
      });
    }
    
    // Recomendaciones generales
    if (this.report.totalWallets > 1000) {
      this.report.recommendations.push({
        priority: 'low',
        category: 'performance',
        title: 'Considerar archivado de wallets antiguas',
        description: 'Gran número de wallets puede afectar el rendimiento',
        action: 'Implementar archivado automático de wallets inactivas',
        affectedCount: this.report.totalWallets
      });
    }
  }

  async generateSummary() {
    this.report.summary = {
      totalWallets: this.report.totalWallets,
      securityIssues: this.report.suspiciousWallets.length + this.report.invalidWallets.length,
      dataIntegrityIssues: this.report.duplicateAddresses.length,
      behaviorIssues: this.report.unusualActivity.length,
      roleIssues: this.report.roleViolations.length,
      totalRecommendations: this.report.recommendations.length,
      riskLevel: this.calculateOverallRiskLevel(),
      auditScore: this.calculateAuditScore()
    };
  }

  calculateOverallRiskLevel() {
    const issues = this.report.suspiciousWallets.length + 
                  this.report.invalidWallets.length + 
                  this.report.unusualActivity.length;
    
    if (issues === 0) return 'low';
    if (issues <= 5) return 'medium';
    return 'high';
  }

  calculateAuditScore() {
    const totalIssues = this.report.suspiciousWallets.length + 
                       this.report.invalidWallets.length + 
                       this.report.duplicateAddresses.length + 
                       this.report.unusualActivity.length + 
                       this.report.roleViolations.length;
    
    const score = Math.max(0, 100 - (totalIssues * 5));
    return Math.round(score);
  }

  async saveAuditLog() {
    try {
      const auditLog = new AdminLog({
        adminId: null, // Sistema automático
        action: 'wallet_security_audit',
        targetType: 'system',
        targetId: null,
        details: {
          summary: this.report.summary,
          issuesFound: {
            suspicious: this.report.suspiciousWallets.length,
            invalid: this.report.invalidWallets.length,
            duplicates: this.report.duplicateAddresses.length,
            unusual: this.report.unusualActivity.length,
            roleViolations: this.report.roleViolations.length
          },
          recommendations: this.report.recommendations.length
        },
        severity: this.report.summary.riskLevel,
        timestamp: new Date()
      });
      
      await auditLog.save();
      console.log('✅ Log de auditoría guardado');
    } catch (error) {
      console.error('❌ Error guardando log de auditoría:', error);
    }
  }

  async generateReport() {
    console.log('📊 Generando reporte final...');
    
    const reportPath = `./reports/wallet-security-audit-${Date.now()}.json`;
    const fs = require('fs');
    const path = require('path');
    
    // Crear directorio de reportes si no existe
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Guardar reporte completo
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    console.log(`📄 Reporte guardado en: ${reportPath}`);
    return reportPath;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE AUDITORÍA DE SEGURIDAD DE WALLETS');
    console.log('='.repeat(60));
    console.log(`🕒 Fecha: ${this.report.timestamp.toLocaleString()}`);
    console.log(`💳 Total de wallets: ${this.report.summary.totalWallets}`);
    console.log(`🔒 Puntuación de auditoría: ${this.report.summary.auditScore}/100`);
    console.log(`⚠️  Nivel de riesgo: ${this.report.summary.riskLevel.toUpperCase()}`);
    console.log('\n📊 PROBLEMAS DETECTADOS:');
    console.log(`   🚨 Wallets sospechosas: ${this.report.suspiciousWallets.length}`);
    console.log(`   ❌ Wallets inválidas: ${this.report.invalidWallets.length}`);
    console.log(`   🔄 Direcciones duplicadas: ${this.report.duplicateAddresses.length}`);
    console.log(`   👤 Actividad inusual: ${this.report.unusualActivity.length}`);
    console.log(`   🔐 Violaciones de roles: ${this.report.roleViolations.length}`);
    console.log('\n💡 RECOMENDACIONES:');
    
    this.report.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${priority} ${rec.title} (${rec.affectedCount} afectados)`);
    });
    
    console.log('\n' + '='.repeat(60));
  }

  async run() {
    try {
      console.log('🚀 Iniciando auditoría de seguridad de wallets...');
      
      await this.connectToDatabase();
      await this.auditWalletAddresses();
      await this.auditUserActivity();
      await this.auditRoleCompliance();
      await this.generateRecommendations();
      await this.generateSummary();
      await this.saveAuditLog();
      
      this.printSummary();
      
      const reportPath = await this.generateReport();
      
      console.log('\n✅ Auditoría completada exitosamente');
      
      // Enviar alertas si hay problemas críticos
      if (this.report.summary.riskLevel === 'high') {
        console.log('🚨 ALERTA: Se detectaron problemas de seguridad críticos');
        // Aquí se podría implementar envío de notificaciones
      }
      
    } catch (error) {
      console.error('❌ Error durante la auditoría:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Desconectado de MongoDB');
    }
  }
}

// Ejecutar auditoría si se llama directamente
if (require.main === module) {
  const auditor = new WalletSecurityAuditor();
  auditor.run();
}

module.exports = WalletSecurityAuditor;