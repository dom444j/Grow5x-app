require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Purchase = require('./src/models/Purchase.model');

// Configuración
const API_BASE = 'http://localhost:3000';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function testPurchaseCreation() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar el último User B creado
    let userB = await User.findOne({
      email: { $regex: /userb.*@test\.com$/ }
    }).sort({ createdAt: -1 });

    if (!userB) {
      console.log('❌ No se encontró User B');
      return;
    }

    console.log(`👤 User B encontrado: ${userB.email} (${userB._id})`);
    console.log(`🔑 Token: ${userB.token}`);
    
    // Si no tiene token, generar uno
    if (!userB.token) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
          { 
            userId: userB._id,
            _id: userB._id, 
            id: userB._id,
            email: userB.email,
            role: userB.role || 'user'
          },
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
          { expiresIn: '24h' }
        );
      
      userB.token = token;
      await userB.save();
      console.log('🔑 Token generado y guardado');
    }

    // Crear compra con metadata de prueba
    const purchaseData = {
      productId: '6889d06c4762c770cb1fa463',
      paymentMethod: 'usdt-bep20',
      metadata: { 
        isTest: true, 
        runId: 'test-' + Date.now(), 
        testType: 'purchase_user_b' 
      }
    };

    console.log('\n📦 Creando compra con datos:', purchaseData);

    const response = await axios.post(`${API_BASE}/api/purchases`, purchaseData, {
      headers: {
        'Authorization': `Bearer ${userB.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Respuesta de la API:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);

    // Verificar la compra en la base de datos
    const savedPurchase = await Purchase.findOne({
      userId: userB._id.toString()
    }).sort({ createdAt: -1 });

    if (savedPurchase) {
      console.log('\n📦 Compra guardada en DB:');
      console.log('ID:', savedPurchase._id);
      console.log('Estado:', savedPurchase.status);
      console.log('Metadata:', savedPurchase.metadata);
      console.log('Creada:', savedPurchase.createdAt);
    } else {
      console.log('\n❌ No se encontró la compra en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

testPurchaseCreation();