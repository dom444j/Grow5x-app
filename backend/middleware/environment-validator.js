/**
 * Middleware de Validación de Entorno
 * Bloquea automáticamente configuraciones incorrectas en runtime
 */

const mongoose = require('mongoose');

/**
 * Middleware para validar configuración de entorno en producción
 * Previene que la aplicación funcione con configuración incorrecta
 */
function validateProductionEnvironment(req, res, next) {
    try {
        // Solo validar en entorno de producción
        if (process.env.NODE_ENV === 'production') {
            const mongoUri = process.env.MONGODB_URI;
            
            // Verificar que existe MONGODB_URI
            if (!mongoUri) {
                console.error('🚨 ERROR CRÍTICO: MONGODB_URI no está definida en producción');
                return res.status(500).json({
                    success: false,
                    message: 'Error de configuración del servidor',
                    error: 'MISSING_DATABASE_CONFIG',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Bloquear si detecta configuración de staging en producción
            if (mongoUri.includes('staging')) {
                console.error('🚨 ERROR CRÍTICO: Base de datos de staging detectada en producción');
                console.error(`URI problemática: ${mongoUri}`);
                
                return res.status(500).json({
                    success: false,
                    message: 'Error de configuración: Base de datos de staging detectada en producción',
                    error: 'INVALID_PRODUCTION_CONFIG',
                    details: 'La aplicación no puede ejecutarse con configuración de staging en producción',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Verificar que apunta al cluster correcto
            if (!mongoUri.includes('cluster0.nufwbrc.mongodb.net')) {
                console.error('🚨 ERROR CRÍTICO: URI de MongoDB no apunta al cluster de producción');
                console.error(`URI problemática: ${mongoUri}`);
                
                return res.status(500).json({
                    success: false,
                    message: 'Error de configuración: Base de datos incorrecta',
                    error: 'WRONG_DATABASE_CLUSTER',
                    details: 'La URI de MongoDB no apunta al cluster de producción correcto',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Verificar JWT secrets en producción
            if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
                console.error('🚨 ERROR CRÍTICO: Secretos JWT no configurados en producción');
                
                return res.status(500).json({
                    success: false,
                    message: 'Error de configuración de seguridad',
                    error: 'MISSING_JWT_SECRETS',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Si todas las validaciones pasan, continuar
        next();
        
    } catch (error) {
        console.error('Error en validación de entorno:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: 'ENVIRONMENT_VALIDATION_ERROR',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Middleware para verificar estado de conexión a base de datos
 */
function validateDatabaseConnection(req, res, next) {
    try {
        const dbState = mongoose.connection.readyState;
        
        // Estados de conexión de Mongoose:
        // 0 = disconnected
        // 1 = connected
        // 2 = connecting
        // 3 = disconnecting
        
        if (dbState !== 1) {
            const stateNames = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };
            
            console.error(`🚨 Base de datos no conectada. Estado: ${stateNames[dbState]}`);
            
            return res.status(503).json({
                success: false,
                message: 'Servicio temporalmente no disponible',
                error: 'DATABASE_NOT_CONNECTED',
                details: `Estado de base de datos: ${stateNames[dbState]}`,
                timestamp: new Date().toISOString()
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Error verificando conexión de base de datos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: 'DATABASE_CHECK_ERROR',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Middleware combinado para validación completa
 */
function validateEnvironmentAndDatabase(req, res, next) {
    validateProductionEnvironment(req, res, (err) => {
        if (err) return next(err);
        validateDatabaseConnection(req, res, next);
    });
}

/**
 * Función para validar configuración al inicio de la aplicación
 */
function validateStartupConfiguration() {
    console.log('🔍 Validando configuración de inicio...');
    
    const errors = [];
    
    // Verificar variables críticas
    if (!process.env.MONGODB_URI) {
        errors.push('MONGODB_URI no está definida');
    }
    
    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET no está definido');
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET no está definido');
    }
    
    // En producción, verificaciones adicionales
    if (process.env.NODE_ENV === 'production') {
        const mongoUri = process.env.MONGODB_URI;
        
        if (mongoUri && mongoUri.includes('staging')) {
            errors.push('MONGODB_URI contiene referencias a staging en producción');
        }
        
        if (mongoUri && !mongoUri.includes('cluster0.nufwbrc.mongodb.net')) {
            errors.push('MONGODB_URI no apunta al cluster de producción correcto');
        }
    }
    
    if (errors.length > 0) {
        console.error('🚨 ERRORES CRÍTICOS DE CONFIGURACIÓN:');
        errors.forEach(error => console.error(`   ❌ ${error}`));
        console.error('\n🛑 La aplicación no puede iniciarse con esta configuración');
        process.exit(1);
    }
    
    console.log('✅ Configuración de inicio válida');
}

module.exports = {
    validateProductionEnvironment,
    validateDatabaseConnection,
    validateEnvironmentAndDatabase,
    validateStartupConfiguration
};