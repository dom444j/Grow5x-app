const nodemailer = require('nodemailer');

// Cargar variables de entorno
require('dotenv').config();

// Función para verificar configuración de una cuenta
async function verificarCuentaEmail(nombre, config) {
  console.log(`\n🔍 VERIFICANDO CUENTA: ${nombre}`);
  console.log(`📧 Email: ${config.user}`);
  console.log(`🔑 Password: ${config.pass ? '***configurada***' : '❌ NO CONFIGURADA'}`);
  
  try {
    // Crear transportador
    const transporter = nodemailer.createTransport({
      host: 'smtp.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass
      },
      debug: true, // Habilitar debug
      logger: true // Habilitar logging
    });

    // Verificar conexión
    console.log('⏳ Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP exitosa');
    
    return { success: true, error: null };
  } catch (error) {
    console.log(`❌ Error en ${nombre}:`);
    console.log(`   Código: ${error.code}`);
    console.log(`   Mensaje: ${error.message}`);
    
    // Analizar tipo de error
    if (error.code === 'EAUTH') {
      console.log('   🔍 PROBLEMA: Credenciales incorrectas');
      console.log('   💡 SOLUCIÓN: Verificar usuario/contraseña en Namecheap');
    } else if (error.code === 'ECONNECTION') {
      console.log('   🔍 PROBLEMA: No se puede conectar al servidor');
      console.log('   💡 SOLUCIÓN: Verificar configuración de red/firewall');
    } else {
      console.log('   🔍 PROBLEMA: Error desconocido');
    }
    
    return { success: false, error: error.message };
  }
}

// Configuraciones de las cuentas
const cuentas = {
  noreply: {
    user: process.env.SMTP_USER || 'noreply@grow5x.app',
    pass: process.env.SMTP_PASS || '300400Jd14'
  },
  welcome: {
    user: process.env.WELCOME_EMAIL_USER || 'welcome@grow5x.app',
    pass: process.env.WELCOME_EMAIL_PASS || '300400Jd14'
  },
  recovery: {
    user: process.env.RECOVERY_EMAIL_USER || 'recovery@grow5x.app',
    pass: process.env.RECOVERY_EMAIL_PASS || '300400Jd14'
  },
  support: {
    user: 'support@grow5x.app',
    pass: '300400Jd14'
  }
};

async function main() {
  console.log('🔧 VERIFICADOR DE CONFIGURACIÓN DE EMAIL NAMECHEAP');
  console.log('=' .repeat(60));
  
  const resultados = {};
  
  for (const [nombre, config] of Object.entries(cuentas)) {
    const resultado = await verificarCuentaEmail(nombre, config);
    resultados[nombre] = resultado;
    
    // Esperar un poco entre verificaciones
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN DE VERIFICACIÓN');
  console.log('=' .repeat(60));
  
  let exitosas = 0;
  let fallidas = 0;
  
  for (const [nombre, resultado] of Object.entries(resultados)) {
    if (resultado.success) {
      console.log(`✅ ${nombre}@grow5x.app: Configuración correcta`);
      exitosas++;
    } else {
      console.log(`❌ ${nombre}@grow5x.app: ${resultado.error}`);
      fallidas++;
    }
  }
  
  console.log(`\n📈 ESTADÍSTICAS:`);
  console.log(`   ✅ Cuentas configuradas correctamente: ${exitosas}/${Object.keys(cuentas).length}`);
  console.log(`   ❌ Cuentas con problemas: ${fallidas}/${Object.keys(cuentas).length}`);
  
  if (fallidas > 0) {
    console.log('\n🔧 PASOS PARA RESOLVER PROBLEMAS:');
    console.log('1. Ir al panel de Namecheap Private Email');
    console.log('2. Verificar que las cuentas estén creadas y activas');
    console.log('3. Verificar que las contraseñas sean correctas');
    console.log('4. Habilitar SMTP para cada cuenta');
    console.log('5. Verificar que no haya restricciones de IP');
  } else {
    console.log('\n🎉 ¡Todas las cuentas están configuradas correctamente!');
    console.log('   Ahora puedes probar el envío de emails.');
  }
}

// Ejecutar verificación
main().catch(console.error);