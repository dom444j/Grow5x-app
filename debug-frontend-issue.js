// Script para debuggear el problema del frontend
const fs = require('fs');
const path = require('path');

console.log('🔍 Analizando posibles problemas del frontend...');

// 1. Verificar configuración del frontend
console.log('\n1️⃣ Verificando configuración del frontend:');

try {
  const frontendEnv = path.join(__dirname, 'frontend', '.env');
  if (fs.existsSync(frontendEnv)) {
    const envContent = fs.readFileSync(frontendEnv, 'utf8');
    console.log('✅ Archivo .env del frontend encontrado');
    const apiUrl = envContent.match(/VITE_API_URL=(.+)/)?.[1];
    console.log('🔗 API URL configurada:', apiUrl || 'No configurada');
  } else {
    console.log('⚠️  No se encontró archivo .env en el frontend');
  }
} catch (error) {
  console.log('❌ Error leyendo configuración:', error.message);
}

// 2. Verificar si el componente está importando correctamente
console.log('\n2️⃣ Verificando imports del componente:');

try {
  const componentPath = path.join(__dirname, 'frontend', 'src', 'components', 'admin', 'SpecialCodesManagement.jsx');
  if (fs.existsSync(componentPath)) {
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Verificar imports críticos
    const hasSpecialCodesService = componentContent.includes('specialCodesService');
    const hasUseAuth = componentContent.includes('useAuth');
    const hasUseEffect = componentContent.includes('useEffect');
    const hasLoadData = componentContent.includes('loadData');
    
    console.log('📦 Imports verificados:');
    console.log('  - specialCodesService:', hasSpecialCodesService ? '✅' : '❌');
    console.log('  - useAuth:', hasUseAuth ? '✅' : '❌');
    console.log('  - useEffect:', hasUseEffect ? '✅' : '❌');
    console.log('  - loadData function:', hasLoadData ? '✅' : '❌');
    
    // Verificar si hay console.log para debugging
    const hasConsoleLog = componentContent.includes('console.log');
    console.log('  - Debug logs:', hasConsoleLog ? '✅ Presentes' : '⚠️  No hay logs de debug');
    
  } else {
    console.log('❌ Componente SpecialCodesManagement.jsx no encontrado');
  }
} catch (error) {
  console.log('❌ Error verificando componente:', error.message);
}

// 3. Verificar servicio de API
console.log('\n3️⃣ Verificando servicio de API:');

try {
  const servicePath = path.join(__dirname, 'frontend', 'src', 'services', 'admin', 'specialCodes.service.js');
  if (fs.existsSync(servicePath)) {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    const hasGetAllMethod = serviceContent.includes('getAllSpecialCodes');
    const hasApiImport = serviceContent.includes('import api');
    
    console.log('🔧 Servicio verificado:');
    console.log('  - getAllSpecialCodes method:', hasGetAllMethod ? '✅' : '❌');
    console.log('  - API import:', hasApiImport ? '✅' : '❌');
    
  } else {
    console.log('❌ Servicio specialCodes.service.js no encontrado');
  }
} catch (error) {
  console.log('❌ Error verificando servicio:', error.message);
}

// 4. Verificar configuración de API base
console.log('\n4️⃣ Verificando configuración de API base:');

try {
  const apiPath = path.join(__dirname, 'frontend', 'src', 'services', 'api.js');
  if (fs.existsSync(apiPath)) {
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    const hasBaseURL = apiContent.includes('baseURL');
    const hasSpecialCodesAdmin = apiContent.includes('admin.*specialCodes') || apiContent.includes('specialCodes.*getAll');
    const hasAuthInterceptor = apiContent.includes('Authorization');
    
    console.log('🌐 API configuración:');
    console.log('  - baseURL configurada:', hasBaseURL ? '✅' : '❌');
    console.log('  - admin.specialCodes endpoint:', hasSpecialCodesAdmin ? '✅' : '❌');
    console.log('  - Auth interceptor:', hasAuthInterceptor ? '✅' : '❌');
    
  } else {
    console.log('❌ Archivo api.js no encontrado');
  }
} catch (error) {
  console.log('❌ Error verificando API:', error.message);
}

console.log('\n🎯 Posibles causas del problema:');
console.log('1. Token de autenticación expirado o inválido en el navegador');
console.log('2. Error de CORS (aunque parece estar configurado)');
console.log('3. Estado del componente no se actualiza correctamente');
console.log('4. Error en el useEffect que carga los datos');
console.log('5. Problema con el contexto de autenticación');

console.log('\n💡 Soluciones recomendadas:');
console.log('1. Abrir DevTools del navegador y revisar:');
console.log('   - Console tab para errores de JavaScript');
console.log('   - Network tab para ver las llamadas HTTP');
console.log('   - Application tab > Local Storage para verificar el token');
console.log('2. Hacer logout y login nuevamente para obtener un token fresco');
console.log('3. Verificar que el usuario tenga permisos de admin');