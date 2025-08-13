const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction.model');
const AdminLog = require('../src/models/AdminLog.model');
const UserStatus = require('../src/models/UserStatus');
const Wallet = require('../src/models/Wallet.model');
require('dotenv').config();

const seedAdminData = async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar usuario administrador
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario administrador. Ejecuta create-admin.js primero.');
      process.exit(1);
    }
    console.log(`👨‍💼 Administrador encontrado: ${adminUser.email} (ID: ${adminUser._id})`);

    // Buscar usuarios regulares para las operaciones administrativas
    const regularUsers = await User.find({ role: 'user' }).limit(20);
    if (regularUsers.length === 0) {
      console.log('❌ No se encontraron usuarios regulares para las operaciones administrativas.');
      process.exit(1);
    }
    console.log(`👥 Usuarios regulares encontrados: ${regularUsers.length}`);

    // Limpiar datos existentes de prueba
    console.log('🧹 Limpiando datos de prueba existentes...');
    await Transaction.deleteMany({ 
      type: { $in: ['admin_adjustment', 'manual_correction', 'balance_fix'] },
      description: { $regex: /\[SEED\]/ }
    });
    await AdminLog.deleteMany({ 
      details: { $regex: /\[SEED\]/ }
    });

    // Generar transacciones administrativas
    console.log('💰 Generando transacciones administrativas...');
    const adminTransactions = [];
    const adminLogs = [];
    
    // Ajustes de balance (admin_adjustment)
    for (let i = 0; i < 30; i++) {
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      const isPositive = Math.random() > 0.3; // 70% positivos, 30% negativos
      const amount = isPositive 
        ? Math.floor(Math.random() * 500) + 50  // +50 a +550
        : -(Math.floor(Math.random() * 200) + 25); // -25 a -225
      
      const transaction = {
        user: user._id,
        type: 'admin_adjustment',
        subtype: 'balance_adjustment',
        amount: Math.abs(amount), // Usar valor absoluto para cumplir con min: 0
        currency: 'USDT',
        status: 'completed',
        description: `[SEED] Ajuste administrativo de balance - ${isPositive ? 'Corrección positiva' : 'Corrección negativa'}`,
        metadata: {
          adminId: adminUser._id,
          reason: isPositive ? 'correction_positive' : 'correction_negative',
          originalBalance: user.balance || 0,
          adjustmentReason: isPositive 
            ? 'Corrección por error en cálculo de comisiones'
            : 'Corrección por transacción duplicada',
          approvedBy: adminUser._id,
          isNegativeAdjustment: !isPositive,
          originalAmount: amount // Guardar el monto original con signo
        },
        network: 'INTERNAL',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Últimos 30 días
        updatedAt: new Date()
      };
      
      adminTransactions.push(transaction);
      
      // Log administrativo correspondiente
      const adminLog = {
        adminId: adminUser._id,
        action: 'wallet_adjusted',
        targetType: 'user',
        targetId: user._id,
        details: `[SEED] Ajuste de balance: ${amount > 0 ? '+' : ''}${amount} USDT para usuario ${user.email}`,
        metadata: {
          transactionId: null, // Se actualizará después
          oldBalance: user.balance || 0,
          newBalance: (user.balance || 0) + amount,
          adjustmentAmount: amount,
          reason: transaction.metadata.adjustmentReason
        },
        severity: amount < 0 ? 'high' : 'medium',
        timestamp: transaction.createdAt
      };
      
      adminLogs.push(adminLog);
    }
    
    // Correcciones manuales
    for (let i = 0; i < 15; i++) {
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      const amount = Math.floor(Math.random() * 100) + 10; // +10 a +110
      
      const transaction = {
        user: user._id,
        type: 'manual_correction',
        subtype: 'system_error_fix',
        amount: amount,
        currency: 'USDT',
        status: 'completed',
        description: `[SEED] Corrección manual por error del sistema`,
        metadata: {
          adminId: adminUser._id,
          reason: 'system_error',
          errorType: Math.random() > 0.5 ? 'calculation_error' : 'display_error',
          ticketId: `TICKET-${Math.floor(Math.random() * 10000)}`,
          approvedBy: adminUser._id
        },
        network: 'INTERNAL',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 15 * 24 * 60 * 60 * 1000)), // Últimos 15 días
        updatedAt: new Date()
      };
      
      adminTransactions.push(transaction);
      
      const adminLog = {
        adminId: adminUser._id,
        action: 'transaction_approved',
        targetType: 'transaction',
        targetId: null, // Se actualizará después
        details: `[SEED] Corrección manual aprobada: +${amount} USDT para usuario ${user.email}`,
        metadata: {
          correctionType: transaction.metadata.errorType,
          ticketReference: transaction.metadata.ticketId,
          amount: amount
        },
        severity: 'medium',
        timestamp: transaction.createdAt
      };
      
      adminLogs.push(adminLog);
    }
    
    // Insertar transacciones
    console.log('📝 Insertando transacciones administrativas...');
    const insertedTransactions = await Transaction.insertMany(adminTransactions);
    console.log(`✅ ${insertedTransactions.length} transacciones administrativas creadas`);
    
    // Actualizar los logs con los IDs de transacciones
    for (let i = 0; i < adminLogs.length; i++) {
      if (adminLogs[i].action === 'wallet_adjusted' && i < 30) {
        adminLogs[i].metadata.transactionId = insertedTransactions[i]._id;
      } else if (adminLogs[i].action === 'transaction_approved' && i >= 30) {
        adminLogs[i].targetId = insertedTransactions[i]._id;
      }
    }
    
    // Generar logs adicionales de gestión de usuarios
    console.log('📋 Generando logs de gestión de usuarios...');
    
    // Logs de cambios de estado de usuario
    for (let i = 0; i < 20; i++) {
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      const actions = ['user_status_changed', 'user_verified', 'user_suspended', 'user_reactivated'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      const statusLog = {
        adminId: adminUser._id,
        action: action,
        targetType: 'user',
        targetId: user._id,
        details: `[SEED] ${getActionDescription(action)} para usuario ${user.email}`,
        metadata: {
          oldStatus: user.status,
          newStatus: getNewStatus(action, user.status),
          reason: getStatusChangeReason(action),
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Admin Panel v1.0'
        },
        severity: getSeverityForAction(action),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 20 * 24 * 60 * 60 * 1000))
      };
      
      adminLogs.push(statusLog);
    }
    
    // Logs de creación de usuarios especiales
    for (let i = 0; i < 5; i++) {
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      
      const creationLog = {
        adminId: adminUser._id,
        action: 'user_created',
        targetType: 'user',
        targetId: user._id,
        details: `[SEED] Usuario especial creado: ${user.email}`,
        metadata: {
          userType: 'special',
          creationMethod: 'admin_panel',
          initialBalance: Math.floor(Math.random() * 1000),
          assignedPackage: Math.random() > 0.5 ? 'premium' : 'basic'
        },
        severity: 'low',
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 25 * 24 * 60 * 60 * 1000))
      };
      
      adminLogs.push(creationLog);
    }
    
    // Insertar logs administrativos
    console.log('📝 Insertando logs administrativos...');
    const insertedLogs = await AdminLog.insertMany(adminLogs);
    console.log(`✅ ${insertedLogs.length} logs administrativos creados`);
    
    // Generar datos de UserStatus para algunos usuarios
    console.log('👤 Actualizando estados de usuarios...');
    
    for (let i = 0; i < 10; i++) {
      const user = regularUsers[i];
      
      const userStatusData = {
        userId: user._id,
        subscription: {
          currentPackage: Math.random() > 0.5 ? 'premium' : 'basic',
          status: 'active',
          startDate: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)),
          endDate: new Date(Date.now() + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
          benefitsCycle: {
            currentCycle: Math.floor(Math.random() * 10) + 1,
            totalCycles: 30,
            lastProcessed: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
          },
          accumulatedBenefits: {
            total: Math.floor(Math.random() * 500) + 100,
            pending: Math.floor(Math.random() * 50),
            processed: Math.floor(Math.random() * 450) + 50
          }
        },
        pioneer: {
          isActive: Math.random() > 0.7,
          level: Math.random() > 0.5 ? 'premium' : 'basic',
          activatedAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)),
          expiresAt: new Date(Date.now() + Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000))
        },
        adminFlags: {
          needsAttention: Math.random() > 0.8,
          attentionReason: Math.random() > 0.8 ? 'balance_discrepancy' : '',
          priority: Math.random() > 0.9 ? 'high' : 'normal',
          lastReviewed: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000))
        },
        adminNotes: [
          {
            note: `[SEED] Usuario requiere seguimiento especial - Balance ajustado`,
            addedBy: adminUser._id,
            addedAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
            category: 'balance'
          }
        ]
      };
      
      await UserStatus.findOneAndUpdate(
        { userId: user._id },
        userStatusData,
        { upsert: true, new: true }
      );
    }
    
    console.log(`✅ Estados de usuario actualizados para 10 usuarios`);
    
    // Calcular estadísticas finales
    const totalAdminTransactions = await Transaction.countDocuments({
      type: { $in: ['admin_adjustment', 'manual_correction'] },
      description: { $regex: /\[SEED\]/ }
    });
    
    const totalAdminLogs = await AdminLog.countDocuments({
      details: { $regex: /\[SEED\]/ }
    });
    
    const totalAdjustmentAmount = await Transaction.aggregate([
      {
        $match: {
          type: 'admin_adjustment',
          status: 'completed',
          description: { $regex: /\[SEED\]/ }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalCorrectionAmount = await Transaction.aggregate([
      {
        $match: {
          type: 'manual_correction',
          status: 'completed',
          description: { $regex: /\[SEED\]/ }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE DATOS ADMINISTRATIVOS GENERADOS');
    console.log('='.repeat(60));
    console.log(`💰 Transacciones administrativas: ${totalAdminTransactions}`);
    console.log(`📋 Logs administrativos: ${totalAdminLogs}`);
    console.log(`💵 Total ajustes de balance: ${totalAdjustmentAmount[0]?.total || 0} USDT`);
    console.log(`🔧 Total correcciones manuales: ${totalCorrectionAmount[0]?.total || 0} USDT`);
    console.log(`👤 Estados de usuario actualizados: 10`);
    console.log('\n✅ Datos de prueba administrativos generados exitosamente');
    
  } catch (error) {
    console.error('❌ Error generando datos administrativos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
};

// Funciones auxiliares
function getActionDescription(action) {
  const descriptions = {
    'user_status_changed': 'Estado de usuario modificado',
    'user_verified': 'Usuario verificado',
    'user_suspended': 'Usuario suspendido',
    'user_reactivated': 'Usuario reactivado'
  };
  return descriptions[action] || 'Acción administrativa';
}

function getNewStatus(action, currentStatus) {
  const statusMap = {
    'user_verified': 'active',
    'user_suspended': 'suspended',
    'user_reactivated': 'active',
    'user_status_changed': currentStatus === 'active' ? 'inactive' : 'active'
  };
  return statusMap[action] || currentStatus;
}

function getStatusChangeReason(action) {
  const reasons = {
    'user_verified': 'Documentación aprobada',
    'user_suspended': 'Actividad sospechosa detectada',
    'user_reactivated': 'Revisión completada - usuario rehabilitado',
    'user_status_changed': 'Cambio administrativo'
  };
  return reasons[action] || 'Gestión administrativa';
}

function getSeverityForAction(action) {
  const severityMap = {
    'user_verified': 'low',
    'user_suspended': 'high',
    'user_reactivated': 'medium',
    'user_status_changed': 'medium',
    'user_created': 'low'
  };
  return severityMap[action] || 'medium';
}

seedAdminData();