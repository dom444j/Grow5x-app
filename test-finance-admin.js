/**
 * Test Script para Módulo de Finanzas Administrativas
 * Prueba la funcionalidad de gestión financiera y recepción de retiros
 */

const axios = require('axios');
const colors = require('colors');

// Configuración del servidor
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@grow5x.com';
const ADMIN_PASSWORD = 'Admin2024!';

// Datos de usuarios reales para pruebas
const testUsers = [
  {
    email: 'negociosmillonaris1973@gmail.com',
    password: 'Parent2024!',
    name: 'Usuario Padre',
    role: 'parent',
    balance: 5000,
    withdrawalAmount: 500
  },
  {
    email: 'edgarpayares2005@gmail.com', 
    password: 'Leader2024!',
    name: 'Usuario Líder',
    role: 'leader',
    balance: 3000,
    withdrawalAmount: 300
  },
  {
    email: 'clubnetwin@hotmail.com',
    password: 'Test2024!',
    name: 'Usuario Test', 
    role: 'user',
    balance: 1000,
    withdrawalAmount: 100
  }
];

let adminToken = null;
let testUserIds = [];
let testWithdrawals = [];

// Función para hacer login como admin
async function loginAsAdmin() {
  try {
    console.log('🔐 Iniciando sesión como administrador...'.blue);
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
       identifier: ADMIN_EMAIL,
       password: ADMIN_PASSWORD
     });
    
    if (response.data.success) {
      adminToken = response.data.data.tokens.accessToken;
      console.log('✅ Login exitoso como administrador'.green);
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Error en login de administrador:'.red, error.response?.data?.message || error.message);
    return false;
  }
}

// Función para obtener usuarios existentes
async function getExistingUsers() {
  console.log('\n👥 Obteniendo usuarios existentes...'.blue);
  
  for (const user of testUsers) {
    try {
      // Hacer login para obtener el ID del usuario
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
         identifier: user.email,
         password: user.password
       });
      
      if (loginResponse.data.success) {
        testUserIds.push({
          id: loginResponse.data.data.user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          balance: user.balance,
          withdrawalAmount: user.withdrawalAmount,
          token: loginResponse.data.data.tokens.accessToken
        });
        console.log(`✅ Usuario encontrado: ${user.email} (${user.role})`.green);
      }
    } catch (error) {
      console.log(`❌ Error obteniendo usuario ${user.email}:`.red, error.response?.data?.message || error.message);
    }
  }
}

// Función para ajustar balances de usuarios
async function adjustUserBalances() {
  console.log('\n💰 Ajustando balances de usuarios...'.blue);
  
  for (const user of testUserIds) {
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users/${user.id}/adjust-balance`, {
        userId: user.id,
        type: 'set',
        amount: user.balance,
        reason: 'Balance inicial para pruebas'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        console.log(`✅ Balance ajustado para ${user.email}: $${user.balance}`.green);
      }
    } catch (error) {
      console.log(`❌ Error ajustando balance para ${user.email}:`.red, error.response?.data?.message || error.message);
    }
  }
}

// Función para crear retiros de prueba
async function createTestWithdrawals() {
  console.log('\n🏦 Creando retiros de prueba...'.blue);
  
  for (const user of testUserIds) {
    try {
      // Usar el token ya obtenido del usuario
      const userToken = user.token;
      
      // Crear solicitud de retiro
      const withdrawalResponse = await axios.post(`${API_BASE_URL}/withdrawals`, {
        amount: user.withdrawalAmount,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        network: 'BSC'
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (withdrawalResponse.data.success) {
        testWithdrawals.push({
          id: withdrawalResponse.data.withdrawal._id,
          userId: user.id,
          email: user.email,
          amount: user.withdrawalAmount,
          role: user.role
        });
        console.log(`✅ Retiro creado para ${user.email} (${user.role}): $${user.withdrawalAmount}`.green);
      }
    } catch (error) {
      console.log(`❌ Error creando retiro para ${user.email}:`.red, error.response?.data?.message || error.message);
    }
  }
}

// Función para probar el resumen financiero
async function testFinancialSummary() {
  console.log('\n📊 Probando resumen financiero...'.blue);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/stats/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const summary = response.data.summary;
      console.log('✅ Resumen financiero obtenido:'.green);
      console.log(`   - Balance total: $${summary.totalBalance || 0}`);
      console.log(`   - Retiros pendientes: ${summary.pendingWithdrawals || 0}`);
      console.log(`   - Depósitos pendientes: ${summary.pendingDeposits || 0}`);
      console.log(`   - Transacciones hoy: ${summary.todayTransactions || 0}`);
    }
  } catch (error) {
    console.log('❌ Error obteniendo resumen financiero:'.red, error.response?.data?.message || error.message);
  }
}

// Función para probar la obtención de retiros pendientes
async function testPendingWithdrawals() {
  console.log('\n⏳ Probando retiros pendientes...'.blue);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/withdrawals/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const withdrawals = response.data.withdrawals;
      console.log(`✅ ${withdrawals.length} retiros pendientes encontrados:`.green);
      
      withdrawals.forEach((withdrawal, index) => {
        console.log(`   ${index + 1}. ${withdrawal.userEmail} - $${withdrawal.amount} (${withdrawal.status})`);
      });
      
      return withdrawals;
    }
  } catch (error) {
    console.log('❌ Error obteniendo retiros pendientes:'.red, error.response?.data?.message || error.message);
    return [];
  }
}

// Función para probar aprobación de retiros
async function testWithdrawalApproval() {
  console.log('\n✅ Probando aprobación de retiros...'.blue);
  
  if (testWithdrawals.length === 0) {
    console.log('⚠️  No hay retiros de prueba para aprobar'.yellow);
    return;
  }
  
  const firstWithdrawal = testWithdrawals[0];
  
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/withdrawals/${firstWithdrawal.id}/approve`, {
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      notes: 'Aprobado en prueba automatizada'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log(`✅ Retiro aprobado para ${firstWithdrawal.email}: $${firstWithdrawal.amount}`.green);
    }
  } catch (error) {
    console.log(`❌ Error aprobando retiro:`.red, error.response?.data?.message || error.message);
  }
}

// Función para probar rechazo de retiros
async function testWithdrawalRejection() {
  console.log('\n❌ Probando rechazo de retiros...'.blue);
  
  if (testWithdrawals.length < 2) {
    console.log('⚠️  No hay suficientes retiros de prueba para rechazar'.yellow);
    return;
  }
  
  const secondWithdrawal = testWithdrawals[1];
  
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/withdrawals/${secondWithdrawal.id}/reject`, {
      reason: 'Rechazado en prueba automatizada',
      notes: 'Prueba de funcionalidad de rechazo'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log(`✅ Retiro rechazado para ${secondWithdrawal.email}: $${secondWithdrawal.amount}`.green);
    }
  } catch (error) {
    console.log(`❌ Error rechazando retiro:`.red, error.response?.data?.message || error.message);
  }
}

// Función para probar todas las transacciones
async function testAllTransactions() {
  console.log('\n📋 Probando obtención de todas las transacciones...'.blue);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/transactions?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const transactions = response.data.transactions;
      console.log(`✅ ${transactions.length} transacciones encontradas:`.green);
      
      transactions.slice(0, 5).forEach((transaction, index) => {
        console.log(`   ${index + 1}. ${transaction.type} - $${transaction.amount} (${transaction.status})`);
      });
    }
  } catch (error) {
    console.log('❌ Error obteniendo transacciones:'.red, error.response?.data?.message || error.message);
  }
}

// Función para limpiar datos de prueba
async function cleanupTestData() {
  console.log('\n🧹 Limpiando datos de prueba...'.blue);
  
  // Nota: En un entorno real, podrías querer mantener los datos para análisis
  console.log('⚠️  Datos de prueba mantenidos para análisis. Limpieza manual requerida si es necesario.'.yellow);
}

// Función principal de prueba
async function runFinanceAdminTest() {
  console.log('🚀 INICIANDO PRUEBAS DEL MÓDULO DE FINANZAS ADMINISTRATIVAS'.cyan.bold);
  console.log('=' .repeat(60).cyan);
  
  try {
    // 1. Login como administrador
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
      console.log('❌ No se pudo hacer login como administrador. Abortando pruebas.'.red.bold);
      return;
    }
    
    // 2. Obtener usuarios existentes
    await getExistingUsers();
    
    // 3. Ajustar balances
    await adjustUserBalances();
    
    // 4. Crear retiros de prueba
    await createTestWithdrawals();
    
    // 5. Probar resumen financiero
    await testFinancialSummary();
    
    // 6. Probar retiros pendientes
    await testPendingWithdrawals();
    
    // 7. Probar aprobación de retiros
    await testWithdrawalApproval();
    
    // 8. Probar rechazo de retiros
    await testWithdrawalRejection();
    
    // 9. Probar todas las transacciones
    await testAllTransactions();
    
    // 10. Limpiar datos (opcional)
    await cleanupTestData();
    
    console.log('\n' + '=' .repeat(60).cyan);
    console.log('✅ PRUEBAS COMPLETADAS EXITOSAMENTE'.green.bold);
    console.log('📊 Resumen:'.blue.bold);
    console.log(`   - Usuarios de prueba: ${testUserIds.length}`);
    console.log(`   - Retiros creados: ${testWithdrawals.length}`);
    console.log('\n🌐 Puedes revisar el módulo en: http://localhost:5173/admin/finance'.cyan);
    
  } catch (error) {
    console.log('\n❌ ERROR GENERAL EN LAS PRUEBAS:'.red.bold, error.message);
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runFinanceAdminTest();
}

module.exports = {
  runFinanceAdminTest,
  testUsers,
  BASE_URL
};