const mongoose = require('mongoose');
const Document = require('../models/Document.model');
const path = require('path');
const fs = require('fs');

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Documentos a insertar
const documentsToSeed = [
  {
    title: 'Plan de Monetización GrowX5',
    description: 'Documento completo que explica el sistema de beneficios automatizado, comisiones de referidos y bonos de liderazgo de la plataforma GrowX5.',
    fileName: 'plan-monetizacion-grow5x.md',
    originalName: 'plan-monetizacion-grow5x.md',
    filePath: path.join(__dirname, '../../uploads/documents/plan-monetizacion-grow5x.md'),
    mimeType: 'text/markdown',
    category: 'plan_monetizacion',
    status: 'active',
    isPublic: true,
    version: '1.0',
    tags: ['monetización', 'beneficios', 'comisiones', 'referidos', 'bonos'],
    uploadedBy: new mongoose.Types.ObjectId(), // ID temporal
    metadata: {
      language: 'es',
      targetAudience: 'new_users',
      priority: 'high'
    }
  },
  {
    title: 'Guía Completa del Usuario',
    description: 'Manual detallado para usuarios que explica paso a paso cómo utilizar todas las funcionalidades de la plataforma GrowX5.',
    fileName: 'guia-usuario-completa.md',
    originalName: 'guia-usuario-completa.md',
    filePath: path.join(__dirname, '../../uploads/documents/guia-usuario-completa.md'),
    mimeType: 'text/markdown',
    category: 'guias_usuario',
    status: 'active',
    isPublic: true,
    version: '1.0',
    tags: ['guía', 'tutorial', 'usuario', 'manual', 'instrucciones'],
    uploadedBy: new mongoose.Types.ObjectId(), // ID temporal
    metadata: {
      language: 'es',
      targetAudience: 'all',
      priority: 'high'
    }
  },
  {
    title: 'Términos y Condiciones Legales',
    description: 'Documento legal que establece los términos, condiciones, derechos y obligaciones para el uso de la plataforma GrowX5.',
    fileName: 'terminos-condiciones-legales.md',
    originalName: 'terminos-condiciones-legales.md',
    filePath: path.join(__dirname, '../../uploads/documents/terminos-condiciones-legales.md'),
    mimeType: 'text/markdown',
    category: 'documentos_legales',
    status: 'active',
    isPublic: true,
    version: '2.0',
    tags: ['términos', 'condiciones', 'legal', 'políticas', 'privacidad'],
    uploadedBy: new mongoose.Types.ObjectId(), // ID temporal
    metadata: {
      language: 'es',
      targetAudience: 'all',
      priority: 'high'
    }
  }
];

// Función para obtener el tamaño del archivo
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener el tamaño del archivo: ${filePath}`);
    return 0;
  }
};

// Función para insertar documentos
const seedDocuments = async () => {
  try {
    console.log('🌱 Iniciando inserción de documentos...');
    
    // Limpiar documentos existentes (opcional)
    await Document.deleteMany({});
    console.log('🗑️ Documentos existentes eliminados');
    
    // Insertar nuevos documentos
    for (const docData of documentsToSeed) {
      // Agregar tamaño del archivo
      docData.fileSize = getFileSize(docData.filePath);
      
      // Crear documento
      const document = new Document(docData);
      await document.save();
      
      console.log(`✅ Documento creado: ${document.title}`);
      console.log(`   - ID: ${document._id}`);
      console.log(`   - Categoría: ${document.category}`);
      console.log(`   - Tamaño: ${(document.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   - Público: ${document.isPublic ? 'Sí' : 'No'}`);
      console.log('');
    }
    
    console.log('🎉 Todos los documentos han sido insertados exitosamente');
    
    // Mostrar estadísticas
    const totalDocs = await Document.countDocuments();
    const publicDocs = await Document.countDocuments({ isPublic: true });
    const activeDocs = await Document.countDocuments({ status: 'active' });
    
    console.log('📊 Estadísticas:');
    console.log(`   - Total de documentos: ${totalDocs}`);
    console.log(`   - Documentos públicos: ${publicDocs}`);
    console.log(`   - Documentos activos: ${activeDocs}`);
    
  } catch (error) {
    console.error('❌ Error insertando documentos:', error);
  }
};

// Función principal
const main = async () => {
  await connectDB();
  await seedDocuments();
  
  console.log('\n✨ Proceso completado. Cerrando conexión...');
  await mongoose.connection.close();
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error en el proceso principal:', error);
    process.exit(1);
  });
}

module.exports = { seedDocuments, connectDB };