/**
 * Monitor de Duplicados en Comisiones
 * Detecta y alerta sobre comisiones duplicadas
 * Integración con alertas Telegram
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');
const axios = require('axios');

class DuplicateMonitor {
  constructor() {
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    this.alertsEnabled = this.telegramBotToken && this.telegramChatId;
  }

  async sendTelegramAlert(message) {
    if (!this.alertsEnabled) {
      console.log('⚠️ Alertas Telegram no configuradas');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: `🚨 GROW5X ALERT\n\n${message}`,
        parse_mode: 'HTML'
      });
      console.log('✅ Alerta Telegram enviada');
    } catch (error) {
      console.error('❌ Error enviando alerta Telegram:', error.message);
    }
  }

  async checkDirectReferralDuplicates() {
    console.log('🔍 Verificando duplicados en direct_referral...');
    
    try {
      const duplicates = await Commission.aggregate([
        {
          $match: { type: 'direct_referral' }
        },
        {
          $group: {
            _id: {
              purchaseId: '$metadata.purchaseId',
              userId: '$userId',
              fromUserId: '$fromUserId'
            },
            count: { $sum: 1 },
            commissions: { $push: '$_id' }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      if (duplicates.length > 0) {
        const alertMessage = `❌ DUPLICADOS DETECTADOS - Direct Referral\n\n` +
          `Cantidad de grupos duplicados: ${duplicates.length}\n\n` +
          duplicates.map(dup => 
            `PurchaseId: ${dup._id.purchaseId}\n` +
            `UserId: ${dup._id.userId}\n` +
            `Cantidad: ${dup.count} comisiones\n` +
            `IDs: ${dup.commissions.join(', ')}\n`
          ).join('\n') +
          `\n⚠️ Acción requerida: Revisar y limpiar duplicados`;

        await this.sendTelegramAlert(alertMessage);
        console.log(`❌ ${duplicates.length} grupos de duplicados encontrados en direct_referral`);
        return duplicates;
      }

      console.log('✅ No se encontraron duplicados en direct_referral');
      return [];

    } catch (error) {
      console.error('❌ Error verificando duplicados direct_referral:', error.message);
      return [];
    }
  }

  async checkPoolBonusDuplicates() {
    console.log('🔍 Verificando duplicados en pool_bonus...');
    
    try {
      const duplicates = await Commission.aggregate([
        {
          $match: { type: 'pool_bonus' }
        },
        {
          $group: {
            _id: {
              purchaseId: '$metadata.purchaseId',
              cycleNumber: '$metadata.cycleNumber',
              adminId: '$adminId',
              userId: '$userId'
            },
            count: { $sum: 1 },
            commissions: { $push: '$_id' }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      if (duplicates.length > 0) {
        const alertMessage = `❌ DUPLICADOS DETECTADOS - Pool Bonus\n\n` +
          `Cantidad de grupos duplicados: ${duplicates.length}\n\n` +
          duplicates.map(dup => 
            `PurchaseId: ${dup._id.purchaseId}\n` +
            `Ciclo: ${dup._id.cycleNumber}\n` +
            `AdminId: ${dup._id.adminId}\n` +
            `UserId: ${dup._id.userId}\n` +
            `Cantidad: ${dup.count} comisiones\n` +
            `IDs: ${dup.commissions.join(', ')}\n`
          ).join('\n') +
          `\n⚠️ Acción requerida: Revisar y limpiar duplicados`;

        await this.sendTelegramAlert(alertMessage);
        console.log(`❌ ${duplicates.length} grupos de duplicados encontrados en pool_bonus`);
        return duplicates;
      }

      console.log('✅ No se encontraron duplicados en pool_bonus');
      return [];

    } catch (error) {
      console.error('❌ Error verificando duplicados pool_bonus:', error.message);
      return [];
    }
  }

  async checkGeneralDuplicates() {
    console.log('🔍 Verificando duplicados generales...');
    
    try {
      // Buscar comisiones con misma purchaseId y tipo
      const duplicates = await Commission.aggregate([
        {
          $group: {
            _id: {
              purchaseId: '$metadata.purchaseId',
              type: '$type',
              userId: '$userId'
            },
            count: { $sum: 1 },
            commissions: { $push: {
              id: '$_id',
              amount: '$amount',
              createdAt: '$createdAt'
            }}
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      if (duplicates.length > 0) {
        const alertMessage = `⚠️ POSIBLES DUPLICADOS DETECTADOS\n\n` +
          `Cantidad de grupos: ${duplicates.length}\n\n` +
          duplicates.slice(0, 5).map(dup => 
            `Tipo: ${dup._id.type}\n` +
            `PurchaseId: ${dup._id.purchaseId}\n` +
            `UserId: ${dup._id.userId}\n` +
            `Cantidad: ${dup.count}\n`
          ).join('\n') +
          (duplicates.length > 5 ? `\n... y ${duplicates.length - 5} más` : '') +
          `\n🔍 Revisar manualmente para confirmar`;

        await this.sendTelegramAlert(alertMessage);
        console.log(`⚠️ ${duplicates.length} posibles duplicados encontrados`);
        return duplicates;
      }

      console.log('✅ No se encontraron duplicados generales');
      return [];

    } catch (error) {
      console.error('❌ Error verificando duplicados generales:', error.message);
      return [];
    }
  }

  async generateDuplicateReport() {
    console.log('📊 Generando reporte de duplicados...');
    
    try {
      const totalCommissions = await Commission.countDocuments();
      const directReferrals = await Commission.countDocuments({ type: 'direct_referral' });
      const poolBonuses = await Commission.countDocuments({ type: 'pool_bonus' });
      const dailyBenefits = await Commission.countDocuments({ type: 'daily_benefit' });
      
      const report = {
        timestamp: new Date().toISOString(),
        totalCommissions,
        byType: {
          direct_referral: directReferrals,
          pool_bonus: poolBonuses,
          daily_benefit: dailyBenefits,
          others: totalCommissions - directReferrals - poolBonuses - dailyBenefits
        }
      };
      
      console.log('📊 Reporte de comisiones:');
      console.log(`Total: ${report.totalCommissions}`);
      console.log(`Direct Referral: ${report.byType.direct_referral}`);
      console.log(`Pool Bonus: ${report.byType.pool_bonus}`);
      console.log(`Daily Benefit: ${report.byType.daily_benefit}`);
      console.log(`Otros: ${report.byType.others}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error.message);
      return null;
    }
  }

  async runMonitoring() {
    console.log('🚀 MONITOR DE DUPLICADOS - INICIANDO\n');
    
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
      
      // Generar reporte general
      await this.generateDuplicateReport();
      
      // Verificar duplicados específicos
      const directDuplicates = await this.checkDirectReferralDuplicates();
      const poolDuplicates = await this.checkPoolBonusDuplicates();
      const generalDuplicates = await this.checkGeneralDuplicates();
      
      const totalIssues = directDuplicates.length + poolDuplicates.length + generalDuplicates.length;
      
      console.log('\n📋 RESUMEN DEL MONITOREO:');
      console.log('=' .repeat(40));
      console.log(`Direct Referral duplicados: ${directDuplicates.length}`);
      console.log(`Pool Bonus duplicados: ${poolDuplicates.length}`);
      console.log(`Duplicados generales: ${generalDuplicates.length}`);
      console.log(`Total problemas: ${totalIssues}`);
      
      if (totalIssues === 0) {
        console.log('\n✅ SISTEMA LIMPIO - No se detectaron duplicados');
        
        // Enviar reporte de estado OK (opcional, solo una vez al día)
        const now = new Date();
        if (now.getHours() === 9 && now.getMinutes() < 5) { // Solo a las 9 AM
          await this.sendTelegramAlert('✅ Monitor de duplicados: Sistema limpio, no se detectaron problemas');
        }
      } else {
        console.log('\n⚠️ PROBLEMAS DETECTADOS - Revisar alertas Telegram');
      }
      
      return totalIssues === 0;
      
    } catch (error) {
      console.error('❌ Error en monitoreo:', error.message);
      await this.sendTelegramAlert(`❌ Error en monitor de duplicados: ${error.message}`);
      return false;
    } finally {
      await mongoose.disconnect();
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const monitor = new DuplicateMonitor();
  monitor.runMonitoring().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = DuplicateMonitor;