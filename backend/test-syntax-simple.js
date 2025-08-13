// Script simple para verificar sintaxis
try {
  require('./src/controllers/admin/index.js');
  console.log('✅ admin controllers (refactored) syntax is correct');
} catch (error) {
  console.error('❌ Syntax error in admin controllers:');
  console.error(error.message);
  console.error('Stack:', error.stack);
}