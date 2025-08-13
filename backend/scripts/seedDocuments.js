const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Importar el modelo de Document
const Document = require('../src/models/Document.model');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para crear documentos con uploadedBy
const createSampleDocuments = (adminUserId) => [
  {
    title: 'Guía de Usuario Completa',
    description: 'Guía completa para usuarios sobre cómo utilizar la plataforma GrowX5',
    fileName: 'guias-usuario.pdf',
    originalName: 'Guías de Usuario.pdf',
    filePath: path.join(__dirname, '../uploads/documents/guias-usuario.pdf'),
    fileSize: 1024000, // 1MB aproximado
    mimeType: 'application/pdf',
    category: 'guias_usuario',
    isPublic: true,
    status: 'active',
    version: '1.0',
    tags: ['guia', 'usuario', 'tutorial'],
    uploadedBy: adminUserId,
    metadata: {
      language: 'es',
      targetAudience: 'new_users',
      priority: 'high'
    },
    downloadCount: 0
  },
  {
    title: 'Preguntas Frecuentes',
    description: 'Respuestas a las preguntas más comunes sobre la plataforma',
    fileName: 'preguntas-frecuentes.pdf',
    originalName: 'Preguntas Frecuentes.pdf',
    filePath: path.join(__dirname, '../uploads/documents/preguntas-frecuentes.pdf'),
    fileSize: 512000, // 512KB aproximado
    mimeType: 'application/pdf',
    category: 'tutoriales',
    isPublic: true,
    status: 'active',
    version: '1.0',
    tags: ['faq', 'preguntas', 'soporte'],
    uploadedBy: adminUserId,
    metadata: {
      language: 'es',
      targetAudience: 'all',
      priority: 'medium'
    },
    downloadCount: 0
  },
  {
    title: 'Términos y Condiciones',
    description: 'Términos y condiciones legales de uso de la plataforma',
    fileName: 'terminos-condiciones.pdf',
    originalName: 'Términos y Condiciones.pdf',
    filePath: path.join(__dirname, '../uploads/documents/terminos-condiciones.pdf'),
    fileSize: 768000, // 768KB aproximado
    mimeType: 'application/pdf',
    category: 'terminos_condiciones',
    isPublic: true,
    status: 'active',
    version: '1.0',
    tags: ['legal', 'terminos', 'condiciones'],
    uploadedBy: adminUserId,
    metadata: {
      language: 'es',
      targetAudience: 'all',
      priority: 'high'
    },
    downloadCount: 0
  }
];

// Función para insertar documentos
const seedDocuments = async () => {
  try {
    console.log('🌱 Iniciando seed de documentos...');
    
    // Buscar o crear un usuario admin
    const User = require('../src/models/User');
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // Crear un usuario admin temporal para el seed
      adminUser = new User({
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@grow5x.app',
        password: 'temp123', // Será hasheado automáticamente
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      });
      await adminUser.save();
      console.log('👤 Usuario admin creado para el seed');
    }
    
    // Crear documentos con el ID del admin
    const sampleDocuments = createSampleDocuments(adminUser._id);
    
    // Limpiar documentos existentes (opcional)
    await Document.deleteMany({});
    console.log('🗑️  Documentos existentes eliminados');
    
    // Verificar que los archivos existen
    for (const doc of sampleDocuments) {
      if (!fs.existsSync(doc.filePath)) {
        console.warn(`⚠️  Archivo no encontrado: ${doc.filePath}`);
        // Actualizar el tamaño del archivo si existe
      } else {
        const stats = fs.statSync(doc.filePath);
        doc.fileSize = stats.size;
        console.log(`✅ Archivo encontrado: ${doc.fileName} (${doc.fileSize} bytes)`);
      }
    }
    
    // Insertar documentos
    const insertedDocs = await Document.insertMany(sampleDocuments);
    console.log(`✅ ${insertedDocs.length} documentos insertados exitosamente`);
    
    // Mostrar documentos insertados
    insertedDocs.forEach(doc => {
      console.log(`📄 ${doc.title} - ID: ${doc._id}`);
    });
    
  } catch (error) {
    console.error('❌ Error insertando documentos:', error);
  }
};

// Ejecutar el script
const main = async () => {
  await connectDB();
  await seedDocuments();
  
  console.log('🎉 Seed completado');
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { seedDocuments };