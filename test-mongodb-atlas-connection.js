const { MongoClient } = require('mongodb');

// Credenciales exactas del archivo .env local
const MONGODB_URI = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function testMongoDBConnection() {
    console.log('=== DIAGNÓSTICO DE CONEXIÓN MONGODB ATLAS ===');
    console.log('URI:', MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@'));
    
    let client;
    
    try {
        console.log('\n1. Intentando conectar a MongoDB Atlas...');
        
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        });
        
        await client.connect();
        console.log('✅ Conexión exitosa a MongoDB Atlas');
        
        console.log('\n2. Verificando base de datos...');
        const db = client.db('growx5');
        const collections = await db.listCollections().toArray();
        console.log('✅ Base de datos accesible');
        console.log('Colecciones encontradas:', collections.map(c => c.name));
        
        console.log('\n3. Verificando colección de usuarios...');
        const usersCollection = db.collection('users');
        const userCount = await usersCollection.countDocuments();
        console.log(`✅ Colección users encontrada con ${userCount} documentos`);
        
        // Buscar el usuario específico
        console.log('\n4. Buscando usuario específico...');
        const user = await usersCollection.findOne({
            email: 'negociosmillonaris1973@gmail.com'
        });
        
        if (user) {
            console.log('✅ Usuario encontrado:');
            console.log('- ID:', user._id);
            console.log('- Email:', user.email);
            console.log('- Status:', user.status || 'no definido');
            console.log('- Verificado:', user.isVerified || false);
            console.log('- Fecha creación:', user.createdAt || 'no definida');
        } else {
            console.log('❌ Usuario NO encontrado en la base de datos');
            
            // Buscar usuarios similares
            const similarUsers = await usersCollection.find({
                email: { $regex: 'negociosmillonaris', $options: 'i' }
            }).toArray();
            
            if (similarUsers.length > 0) {
                console.log('\nUsuarios similares encontrados:');
                similarUsers.forEach(u => {
                    console.log(`- ${u.email} (ID: ${u._id})`);
                });
            }
        }
        
        console.log('\n✅ DIAGNÓSTICO COMPLETADO - CONEXIÓN EXITOSA');
        
    } catch (error) {
        console.error('\n❌ ERROR DE CONEXIÓN:');
        console.error('Tipo:', error.name);
        console.error('Mensaje:', error.message);
        
        if (error.code) {
            console.error('Código:', error.code);
        }
        
        if (error.cause) {
            console.error('Causa:', error.cause);
        }
        
        // Diagnósticos específicos
        if (error.message.includes('ENOTFOUND')) {
            console.error('\n🔍 DIAGNÓSTICO: Problema de DNS');
            console.error('- El servidor no puede resolver cluster0.nufwbrc.mongodb.net');
            console.error('- Verificar configuración DNS del VPS');
            console.error('- Verificar conectividad a internet');
        }
        
        if (error.message.includes('authentication')) {
            console.error('\n🔍 DIAGNÓSTICO: Problema de autenticación');
            console.error('- Verificar usuario y contraseña');
            console.error('- Verificar permisos en MongoDB Atlas');
        }
        
        if (error.message.includes('timeout')) {
            console.error('\n🔍 DIAGNÓSTICO: Problema de timeout');
            console.error('- Verificar firewall del VPS');
            console.error('- Verificar IP whitelist en MongoDB Atlas');
        }
        
        console.error('\n❌ DIAGNÓSTICO COMPLETADO - CONEXIÓN FALLIDA');
        
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar diagnóstico
testMongoDBConnection().catch(console.error);