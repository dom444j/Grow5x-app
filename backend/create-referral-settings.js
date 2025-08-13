const mongoose = require('mongoose');
require('dotenv').config();

// Configuraciones de referidos que necesita el frontend
const referralSettings = [
    {
        key: 'referral_commission_rate',
        value: '0.05',
        category: 'referral',
        isPublic: true,
        description: 'Tasa de comisión por referido (5%)'
    },
    {
        key: 'referral_leader_bonus',
        value: '0.02',
        category: 'referral',
        isPublic: true,
        description: 'Bono adicional para líderes (2%)'
    },
    {
        key: 'referral_parent_bonus',
        value: '0.01',
        category: 'referral',
        isPublic: true,
        description: 'Bono para referido padre (1%)'
    },
    {
        key: 'referral_system_enabled',
        value: 'true',
        category: 'referral',
        isPublic: true,
        description: 'Sistema de referidos habilitado'
    }
];

async function createReferralSettings() {
    try {
        console.log('🔄 Conectando a MongoDB Atlas...');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Conectado a MongoDB Atlas exitosamente');
        
        // Usar directamente la colección sin modelo
        const db = mongoose.connection.db;
        const systemSettingsCollection = db.collection('systemsettings');
        
        console.log('📊 Verificando configuraciones existentes...');
        
        for (const setting of referralSettings) {
            const existing = await systemSettingsCollection.findOne({ key: setting.key });
            
            if (existing) {
                console.log(`⚠️  Configuración '${setting.key}' ya existe:`, existing.value);
            } else {
                await systemSettingsCollection.insertOne({
                    ...setting,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`✅ Creada configuración '${setting.key}': ${setting.value}`);
            }
        }
        
        // Verificar todas las configuraciones de referidos
        console.log('\n📋 Configuraciones de referidos actuales:');
        const allReferralSettings = await systemSettingsCollection.find({ 
            category: 'referral',
            isPublic: true 
        }).toArray();
        
        allReferralSettings.forEach(setting => {
            console.log(`  ${setting.key}: ${setting.value}`);
        });
        
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
        console.log('🎉 Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createReferralSettings();