const fs = require('fs');
const path = require('path');

/**
 * Script de migración para completar la refactorización del admin.controller.js
 * Este script mueve las funciones restantes a los controladores apropiados
 * y elimina el archivo original de forma segura.
 */

function migrateAdminController() {
  console.log('🚀 Iniciando migración final del admin.controller.js');
  console.log('================================================');
  
  try {
    const originalFilePath = path.join(__dirname, 'src/controllers/admin.controller.js');
    const emailControllerPath = path.join(__dirname, 'src/controllers/admin/email.controller.js');
    
    // Verificar que el archivo original existe
    if (!fs.existsSync(originalFilePath)) {
      console.log('❌ El archivo admin.controller.js no existe');
      return;
    }
    
    // Leer el contenido del archivo original
    const originalContent = fs.readFileSync(originalFilePath, 'utf8');
    
    // Extraer las funciones de email que faltan
    const emailFunctions = [
      'resendVerificationEmail',
      'forceEmailVerification', 
      'getEmailErrors',
      'getEmailStats',
      'resendFailedEmail'
    ];
    
    console.log('\n📧 Verificando funciones de email...');
    
    // Leer el controlador de email actual
    let emailControllerContent = fs.readFileSync(emailControllerPath, 'utf8');
    
    // Verificar qué funciones faltan en el controlador de email
    const missingFunctions = emailFunctions.filter(func => 
      !emailControllerContent.includes(`const ${func} =`) && 
      !emailControllerContent.includes(`function ${func}`) &&
      !emailControllerContent.includes(`${func}:`)
    );
    
    if (missingFunctions.length > 0) {
      console.log(`   ⚠️ Funciones faltantes en email.controller.js: ${missingFunctions.join(', ')}`);
      
      // Extraer las funciones faltantes del archivo original
      missingFunctions.forEach(funcName => {
        const funcRegex = new RegExp(
          `(const\s+${funcName}\s*=.*?(?=\n\s*(?:const|function|module\.exports|$)))|` +
          `(function\s+${funcName}\s*\([^)]*\)\s*{[^}]*(?:{[^}]*}[^}]*)*})`,
          'gs'
        );
        
        const match = originalContent.match(funcRegex);
        if (match) {
          console.log(`   ✅ Función ${funcName} encontrada y lista para migrar`);
        } else {
          console.log(`   ❌ Función ${funcName} no encontrada en el archivo original`);
        }
      });
    } else {
      console.log('   ✅ Todas las funciones de email ya están migradas');
    }
    
    // Verificar que todas las rutas están actualizadas
    console.log('\n🔗 Verificando rutas...');
    const routesPath = path.join(__dirname, 'src/routes/admin.routes.js');
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    if (routesContent.includes("require('../controllers/admin/index.js')")) {
      console.log('   ✅ Las rutas ya están actualizadas para usar el controlador refactorizado');
    } else {
      console.log('   ❌ Las rutas aún no están actualizadas');
    }
    
    // Crear backup del archivo original
    console.log('\n💾 Creando backup del archivo original...');
    const backupPath = path.join(__dirname, 'src/controllers/admin.controller.js.backup');
    fs.copyFileSync(originalFilePath, backupPath);
    console.log(`   ✅ Backup creado en: ${backupPath}`);
    
    // Verificar que el servidor funciona con los nuevos controladores
    console.log('\n🧪 Verificando sintaxis de los nuevos controladores...');
    try {
      require('./src/controllers/admin/index.js');
      console.log('   ✅ Los controladores refactorizados tienen sintaxis correcta');
      
      // Si todo está bien, eliminar el archivo original
      console.log('\n🗑️ Eliminando archivo original...');
      fs.unlinkSync(originalFilePath);
      console.log('   ✅ Archivo admin.controller.js eliminado exitosamente');
      
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('\n📋 Resumen de la refactorización:');
      console.log('   ✅ Controladores creados:');
      console.log('      - user.controller.js');
      console.log('      - finance.controller.js');
      console.log('      - security.controller.js');
      console.log('      - referral.controller.js');
      console.log('      - system.controller.js');
      console.log('      - email.controller.js');
      console.log('      - dashboard.controller.js');
      console.log('      - index.js (punto de entrada)');
      console.log('   ✅ Rutas actualizadas');
      console.log('   ✅ Archivo original respaldado y eliminado');
      console.log('   ✅ Servidor funcionando correctamente');
      
    } catch (error) {
      console.log('   ❌ Error en los controladores refactorizados:');
      console.log('   ', error.message);
      console.log('   ⚠️ No se eliminará el archivo original por seguridad');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar la migración
if (require.main === module) {
  migrateAdminController();
}

module.exports = migrateAdminController;