/**
 * Script para validar las correcciones implementadas
 * Verifica que las inconsistencias reportadas han sido corregidas
 */

const fs = require('fs');
const path = require('path');

const frontendPath = path.join(__dirname, 'frontend', 'src');

// Función para leer archivo
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error leyendo archivo ${filePath}:`, error.message);
    return null;
  }
}

// Función para verificar correcciones
function validateFixes() {
  console.log('🔍 Validando correcciones implementadas...');
  
  const fixes = {
    dayNineConsistency: false,
    serviceStructureConsistency: false,
    adminServiceConsistency: false,
    duplicateFileRemoved: false
  };
  
  // 1. Verificar consistencia del día 9/8
  console.log('\n📅 Verificando consistencia del día 9/8...');
  
  const userStatusMgmt = readFile(path.join(frontendPath, 'pages', 'admin', 'UserStatusManagement.jsx'));
  if (userStatusMgmt) {
    const hasPauseLogic = userStatusMgmt.includes('isPause ? \'Pausa (día 9)\' : `${currentDay}/8`');
    if (hasPauseLogic) {
      console.log('✅ UserStatusManagement.jsx: Lógica de día 9 corregida');
      fixes.dayNineConsistency = true;
    } else {
      console.log('❌ UserStatusManagement.jsx: Lógica de día 9 no encontrada');
    }
  }
  
  const userStatusDashboard = readFile(path.join(frontendPath, 'components', 'admin', 'UserStatusDashboard.jsx'));
  if (userStatusDashboard) {
    const hasPauseLogic = userStatusDashboard.includes('currentDay === 9');
    if (hasPauseLogic) {
      console.log('✅ UserStatusDashboard.jsx: Lógica de día 9 corregida');
    } else {
      console.log('❌ UserStatusDashboard.jsx: Lógica de día 9 no encontrada');
    }
  }
  
  // 2. Verificar estructura consistente de servicios
  console.log('\n🔧 Verificando estructura de servicios...');
  
  const userStatusService = readFile(path.join(frontendPath, 'services', 'userStatus.service.js'));
  if (userStatusService) {
    const hasConsistentStructure = userStatusService.includes('return { success: true, data };') && 
                                  userStatusService.includes('return { success: false, data: [] };');
    if (hasConsistentStructure) {
      console.log('✅ userStatus.service.js: Estructura de respuesta normalizada');
      fixes.serviceStructureConsistency = true;
    } else {
      console.log('❌ userStatus.service.js: Estructura de respuesta no normalizada');
    }
  }
  
  // 3. Verificar consistencia de adminService
  console.log('\n🔐 Verificando consistencia de adminService...');
  
  const adminDashboard = readFile(path.join(frontendPath, 'pages', 'admin', 'AdminDashboard.jsx'));
  if (adminDashboard) {
    const usesInstanceImport = adminDashboard.includes('import { adminService } from');
    const doesNotCreateInstance = !adminDashboard.includes('new AdminService()');
    
    if (usesInstanceImport && doesNotCreateInstance) {
      console.log('✅ AdminDashboard.jsx: Usa instancia exportada de adminService');
      fixes.adminServiceConsistency = true;
    } else {
      console.log('❌ AdminDashboard.jsx: No usa instancia exportada consistentemente');
    }
  }
  
  // 4. Verificar que archivo duplicado fue eliminado
  console.log('\n🗑️ Verificando eliminación de archivos duplicados...');
  
  const duplicateExists = fs.existsSync(path.join(frontendPath, 'pages', 'admin', 'UsersManagement.jsx'));
  if (!duplicateExists) {
    console.log('✅ UsersManagement.jsx duplicado eliminado correctamente');
    fixes.duplicateFileRemoved = true;
  } else {
    console.log('❌ UsersManagement.jsx duplicado aún existe');
  }
  
  // Resumen
  console.log('\n📊 RESUMEN DE CORRECCIONES:');
  console.log('================================');
  
  const fixedCount = Object.values(fixes).filter(Boolean).length;
  const totalFixes = Object.keys(fixes).length;
  
  Object.entries(fixes).forEach(([fix, status]) => {
    const emoji = status ? '✅' : '❌';
    const fixName = {
      dayNineConsistency: 'Consistencia día 9/8',
      serviceStructureConsistency: 'Estructura de servicios',
      adminServiceConsistency: 'Consistencia adminService',
      duplicateFileRemoved: 'Archivo duplicado eliminado'
    }[fix];
    
    console.log(`${emoji} ${fixName}`);
  });
  
  console.log(`\n🎯 Correcciones aplicadas: ${fixedCount}/${totalFixes}`);
  
  if (fixedCount === totalFixes) {
    console.log('\n🎉 ¡Todas las correcciones han sido aplicadas exitosamente!');
    console.log('\n📋 PRÓXIMOS PASOS RECOMENDADOS:');
    console.log('1. Ejecutar tests de frontend para verificar funcionalidad');
    console.log('2. Probar el dashboard de User Status en el navegador');
    console.log('3. Verificar que los contadores y métricas se muestran correctamente');
    console.log('4. Confirmar que el día 9 se muestra como "Pausa (día 9)"');
  } else {
    console.log('\n⚠️ Algunas correcciones necesitan atención adicional.');
  }
  
  return fixes;
}

// Ejecutar validación
if (require.main === module) {
  validateFixes();
}

module.exports = { validateFixes };