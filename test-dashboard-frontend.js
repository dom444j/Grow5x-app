const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:3000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzY5ZjNkNzJkNzE5YzNjNzJjNzE1YzciLCJlbWFpbCI6ImFkbWluQGdyb3c1eC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzUwMjE1NzIsImV4cCI6MTczNTEwNzk3Mn0.8K9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F';

async function testDashboardAPI() {
  console.log('🔍 PROBANDO API DEL DASHBOARD FRONTEND');
  console.log('=====================================');
  
  try {
    console.log('\n📡 Haciendo petición a /admin/dashboard/stats...');
    
    const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Status:', response.status);
    console.log('\n📊 ESTRUCTURA COMPLETA DE DATOS:');
    console.log('================================');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Analizar estructura específica
    const data = response.data;
    
    console.log('\n🔍 ANÁLISIS DE ESTRUCTURA:');
    console.log('==========================');
    
    if (data.users) {
      console.log('👥 USUARIOS:');
      console.log('- totalUsers:', data.users.totalUsers);
      console.log('- activeUsers:', data.users.activeUsers);
      console.log('- verifiedUsers:', data.users.verifiedUsers);
    } else {
      console.log('❌ No se encontró data.users');
    }
    
    if (data.userStatus) {
      console.log('\n📋 USER STATUS:');
      console.log('- usersNeedingAttention:', data.userStatus.usersNeedingAttention);
      console.log('- benefitsToProcess:', data.userStatus.benefitsToProcess);
    } else {
      console.log('❌ No se encontró data.userStatus');
    }
    
    if (data.transactions) {
      console.log('\n💰 TRANSACCIONES:');
      console.log('- totalTransactions:', data.transactions.totalTransactions);
      console.log('- totalVolume:', data.transactions.totalVolume);
    } else {
      console.log('❌ No se encontró data.transactions');
    }
    
    if (data.wallets) {
      console.log('\n👛 WALLETS:');
      console.log('- total:', data.wallets.total);
      console.log('- active:', data.wallets.active);
    } else {
      console.log('❌ No se encontró data.wallets');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('❌ ERROR COMPLETO:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

// Ejecutar test
testDashboardAPI().catch(console.error);