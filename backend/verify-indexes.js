/**
 * Script para verificar y crear índices necesarios en MongoDB
 * Especialmente el índice único para comisiones directas
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');
const logger = require('./src/utils/logger');

async function verifyIndexes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Conectado a MongoDB para verificación de índices');

    // Obtener la colección de comisiones
    const collection = mongoose.connection.db.collection('commissions');
    
    // Listar índices existentes
    const existingIndexes = await collection.listIndexes().toArray();
    logger.info('Índices existentes:', existingIndexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Verificar si existe el índice único requerido
    const requiredIndexName = 'unique_direct_referral_commission';
    const requiredIndexKey = { commissionType: 1, userId: 1, fromUserId: 1, purchaseId: 1 };
    
    const indexExists = existingIndexes.find(idx => idx.name === requiredIndexName);
    
    if (indexExists) {
      logger.info('✅ Índice único encontrado:', {
        name: indexExists.name,
        key: indexExists.key,
        unique: indexExists.unique
      });
    } else {
      logger.warn('❌ Índice único NO encontrado. Creando...');
      
      try {
        await collection.createIndex(
          requiredIndexKey,
          { 
            name: requiredIndexName,
            unique: true,
            background: true
          }
        );
        logger.info('✅ Índice único creado exitosamente:', requiredIndexName);
      } catch (error) {
        logger.error('❌ Error creando índice único:', error.message);
      }
    }

    // Verificar índices del modelo Commission
    logger.info('Verificando índices del modelo Commission...');
    await Commission.ensureIndexes();
    logger.info('✅ Índices del modelo verificados');

    // Listar índices finales
    const finalIndexes = await collection.listIndexes().toArray();
    logger.info('Índices finales:', finalIndexes.map(idx => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique || false 
    })));

  } catch (error) {
    logger.error('Error verificando índices:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyIndexes()
    .then(() => {
      logger.info('Verificación de índices completada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en verificación de índices:', error);
      process.exit(1);
    });
}

module.exports = verifyIndexes;