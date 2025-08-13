const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test directo del endpoint
async function testEndpoint() {
  try {
    console.log('🔍 Probando endpoint /api/admin/users...');
    
    const response = await axios.get('http://localhost:3000/api/admin/users', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiYjZlYzY3MDQzMmYxZTFmZTQ2NTQiLCJpYXQiOjE3NTQ2MzA2MjksImV4cCI6MTc1NTIzNTQyOX0.d6G3rlCk_cQv2m0bgvyqQSh_whblbl5sdOpBDv-aQyA',
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('✅ Status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.users) {
      console.log(`👥 Total usuarios encontrados: ${response.data.users.length}`);
      console.log('📋 Primeros usuarios:');
      response.data.users.slice(0, 3).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.fullName} (${user.email}) - Status: ${user.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en el endpoint:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Test directo de MongoDB
async function testMongoDB() {
  try {
    console.log('\n🔍 Probando conexión directa a MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}).limit(5);
    
    console.log(`👥 Usuarios en MongoDB: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.fullName} (${user.email})`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error en MongoDB:', error.message);
  }
}

async function runTests() {
  await testMongoDB();
  await testEndpoint();
}

runTests();