const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('🔄 Intentando conectar a MongoDB Atlas...');
        console.log('URI:', process.env.MONGODB_URI?.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@'));
        
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Conexión exitosa a MongoDB Atlas');
        
        // Test básico de consulta
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
        
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        if (error.code) {
            console.error('Código de error:', error.code);
        }
        process.exit(1);
    }
}

testConnection();