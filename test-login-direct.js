const axios = require('axios');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

// Credenciales exactas del archivo .env local
const MONGODB_URI = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function testLogin() {
    console.log('=== PRUEBA DE LOGIN DIRECTO ===');
    
    try {
        // 1. Verificar usuario en base de datos
        console.log('\n1. Conectando a MongoDB Atlas...');
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db('growx5');
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({
            email: 'negociosmillonaris1973@gmail.com'
        });
        
        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:');
        console.log('- ID:', user._id);
        console.log('- Email:', user.email);
        console.log('- Status:', user.status);
        console.log('- Verificado:', user.isVerified);
        console.log('- Password hash existe:', !!user.password);
        
        // 2. Verificar contraseña
        console.log('\n2. Verificando contraseña...');
        const passwordToTest = 'Parent2024!';
        
        if (user.password) {
            const isPasswordValid = await bcrypt.compare(passwordToTest, user.password);
            console.log('✅ Contraseña válida:', isPasswordValid);
            
            if (!isPasswordValid) {
                console.log('❌ La contraseña no coincide');
                console.log('Hash almacenado:', user.password.substring(0, 20) + '...');
            }
        } else {
            console.log('❌ No hay contraseña almacenada');
        }
        
        await client.close();
        
        // 3. Probar API de login
        console.log('\n3. Probando API de login...');
        
        const loginData = {
            identifier: 'negociosmillonaris1973@gmail.com',
            password: 'Parent2024!',
            userType: 'user'
        };
        
        try {
            const response = await axios.post('http://127.0.0.1:5000/api/auth/login', loginData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log('✅ Respuesta del servidor:');
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(response.data, null, 2));
            
        } catch (apiError) {
            console.log('❌ Error en API de login:');
            
            if (apiError.response) {
                console.log('Status:', apiError.response.status);
                console.log('Data:', JSON.stringify(apiError.response.data, null, 2));
            } else if (apiError.request) {
                console.log('No hay respuesta del servidor');
                console.log('Error:', apiError.message);
            } else {
                console.log('Error de configuración:', apiError.message);
            }
        }
        
        console.log('\n✅ PRUEBA COMPLETADA');
        
    } catch (error) {
        console.error('\n❌ ERROR GENERAL:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar prueba
testLogin().catch(console.error);