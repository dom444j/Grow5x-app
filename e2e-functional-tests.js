// PRUEBAS E2E FUNCIONALES COMPLETAS - GROW5X
// Script automatizado para validar el flujo completo de usuario

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuración de pruebas
const CONFIG = {
  baseUrl: 'https://grow5x.app',
  apiUrl: 'https://grow5x.app/api',
  testEmail: `test.e2e.${Date.now()}@example.com`,
  testPassword: 'TestPassword123!',
  referralCode: '04ZABST6', // Código de referido existente
  screenshotsDir: './e2e-screenshots',
  resultsFile: './e2e-results.json'
};

// Resultados de las pruebas
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Función para agregar resultado de prueba
function addTestResult(name, status, details = {}) {
  const test = {
    name,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
  results.tests.push(test);
  results.summary.total++;
  if (status === 'PASSED') results.summary.passed++;
  else results.summary.failed++;
  
  console.log(`${status === 'PASSED' ? '✅' : '❌'} ${name}`);
  if (details.error) console.log(`   Error: ${details.error}`);
}

// Función para tomar screenshot
async function takeScreenshot(page, name) {
  if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
  }
  const filename = `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.png`;
  const filepath = path.join(CONFIG.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

// Función para hacer petición API
async function apiRequest(endpoint, method = 'GET', data = null, headers = {}) {
  const url = `${CONFIG.apiUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    return {
      status: response.status,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

async function runE2ETests() {
  console.log('🚀 Iniciando Pruebas E2E Funcionales Completas - Grow5x');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // PRUEBA 1: Registro con enlace de referido
    console.log('\n📝 PRUEBA 1: Registro con enlace de referido');
    try {
      // Navegar a la página de registro con referido
      const registerUrl = `${CONFIG.baseUrl}/register?ref=${CONFIG.referralCode}`;
      await page.goto(registerUrl);
      await page.waitForLoadState('networkidle');
      
      // Verificar que el código de referido se carga automáticamente
      const referralInput = await page.locator('input[name="referralCode"], input[placeholder*="referido"], input[placeholder*="referral"]').first();
      const referralValue = await referralInput.inputValue();
      
      if (referralValue === CONFIG.referralCode) {
        addTestResult('Carga automática de código de referido', 'PASSED', {
          referralCode: CONFIG.referralCode,
          screenshot: await takeScreenshot(page, 'registro_con_referido')
        });
      } else {
        addTestResult('Carga automática de código de referido', 'FAILED', {
          expected: CONFIG.referralCode,
          actual: referralValue,
          screenshot: await takeScreenshot(page, 'registro_referido_error')
        });
      }
      
      // Llenar formulario de registro
      await page.fill('input[name="name"], input[placeholder*="nombre"]', 'Usuario Test E2E');
      await page.fill('input[name="fullName"], input[placeholder*="nombre completo"]', 'Usuario Test E2E Completo');
      await page.fill('input[name="email"], input[type="email"]', CONFIG.testEmail);
      await page.fill('input[name="password"], input[type="password"]', CONFIG.testPassword);
      await page.fill('input[name="confirmPassword"], input[placeholder*="confirmar"]', CONFIG.testPassword);
      
      // Seleccionar país
      const countrySelect = page.locator('select[name="country"], select[placeholder*="país"]').first();
      if (await countrySelect.count() > 0) {
        await countrySelect.selectOption('España');
      }
      
      // Aceptar términos
      const termsCheckbox = page.locator('input[name="acceptedTerms"], input[type="checkbox"]').first();
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
      }
      
      const riskCheckbox = page.locator('input[name="acceptedRisk"]').first();
      if (await riskCheckbox.count() > 0) {
        await riskCheckbox.check();
      }
      
      await takeScreenshot(page, 'formulario_registro_completo');
      
      // Enviar formulario
      await page.click('button[type="submit"], button:has-text("Registrar"), button:has-text("Crear cuenta")');
      await page.waitForTimeout(3000);
      
      // Verificar respuesta
      const currentUrl = page.url();
      if (currentUrl.includes('verify') || currentUrl.includes('confirmation')) {
        addTestResult('Registro de usuario exitoso', 'PASSED', {
          email: CONFIG.testEmail,
          redirectUrl: currentUrl,
          screenshot: await takeScreenshot(page, 'registro_exitoso')
        });
      } else {
        addTestResult('Registro de usuario exitoso', 'FAILED', {
          currentUrl,
          screenshot: await takeScreenshot(page, 'registro_fallido')
        });
      }
      
    } catch (error) {
      addTestResult('Registro con enlace de referido', 'FAILED', {
        error: error.message,
        screenshot: await takeScreenshot(page, 'registro_error')
      });
    }
    
    // PRUEBA 2: Verificación en base de datos
    console.log('\n🗄️ PRUEBA 2: Verificación en base de datos');
    try {
      const dbResponse = await apiRequest('/admin/users', 'GET');
      if (dbResponse.status === 200) {
        const users = dbResponse.data.users || dbResponse.data;
        const testUser = users.find(u => u.email === CONFIG.testEmail);
        
        if (testUser) {
          addTestResult('Usuario creado en base de datos', 'PASSED', {
            userId: testUser._id,
            referralCode: testUser.referralCode,
            referredBy: testUser.referredBy
          });
          
          // Verificar relación de referido
          if (testUser.referredBy) {
            addTestResult('Relación de referido establecida', 'PASSED', {
              referredBy: testUser.referredBy,
              referralCode: CONFIG.referralCode
            });
          } else {
            addTestResult('Relación de referido establecida', 'FAILED', {
              error: 'No se estableció la relación de referido'
            });
          }
        } else {
          addTestResult('Usuario creado en base de datos', 'FAILED', {
            error: 'Usuario no encontrado en la base de datos'
          });
        }
      } else {
        addTestResult('Verificación en base de datos', 'FAILED', {
          error: `Error de API: ${dbResponse.status}`,
          response: dbResponse.data
        });
      }
    } catch (error) {
      addTestResult('Verificación en base de datos', 'FAILED', {
        error: error.message
      });
    }
    
    // PRUEBA 3: Login y persistencia de sesión
    console.log('\n🔐 PRUEBA 3: Login y persistencia de sesión');
    try {
      await page.goto(`${CONFIG.baseUrl}/login`);
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[name="email"], input[type="email"]', CONFIG.testEmail);
      await page.fill('input[name="password"], input[type="password"]', CONFIG.testPassword);
      
      await takeScreenshot(page, 'formulario_login');
      
      await page.click('button[type="submit"], button:has-text("Iniciar"), button:has-text("Login")');
      await page.waitForTimeout(3000);
      
      // Verificar redirección al dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('panel')) {
        addTestResult('Login exitoso', 'PASSED', {
          redirectUrl: currentUrl,
          screenshot: await takeScreenshot(page, 'login_exitoso')
        });
        
        // Verificar persistencia de sesión
        await page.reload();
        await page.waitForTimeout(2000);
        
        if (page.url().includes('dashboard') || page.url().includes('panel')) {
          addTestResult('Persistencia de sesión', 'PASSED', {
            screenshot: await takeScreenshot(page, 'sesion_persistente')
          });
        } else {
          addTestResult('Persistencia de sesión', 'FAILED', {
            error: 'Sesión no persistente tras reload'
          });
        }
      } else {
        addTestResult('Login exitoso', 'FAILED', {
          currentUrl,
          screenshot: await takeScreenshot(page, 'login_fallido')
        });
      }
    } catch (error) {
      addTestResult('Login y persistencia de sesión', 'FAILED', {
        error: error.message,
        screenshot: await takeScreenshot(page, 'login_error')
      });
    }
    
    // PRUEBA 4: Validación de campos del panel
    console.log('\n📊 PRUEBA 4: Validación de campos del panel');
    try {
      // Navegar al perfil/configuración
      const profileLinks = ['a[href*="profile"]', 'a[href*="perfil"]', 'a[href*="config"]', 'button:has-text("Perfil")', 'button:has-text("Profile")'];
      
      for (const selector of profileLinks) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          break;
        }
      }
      
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'panel_usuario');
      
      // Verificar campos editables
      const editableFields = [
        'input[name="name"]',
        'input[name="fullName"]', 
        'input[name="phone"]',
        'select[name="country"]',
        'textarea[name="bio"]'
      ];
      
      let fieldsFound = 0;
      for (const field of editableFields) {
        if (await page.locator(field).count() > 0) {
          fieldsFound++;
        }
      }
      
      if (fieldsFound >= 2) {
        addTestResult('Campos del panel accesibles', 'PASSED', {
          fieldsFound,
          screenshot: await takeScreenshot(page, 'campos_panel')
        });
      } else {
        addTestResult('Campos del panel accesibles', 'FAILED', {
          fieldsFound,
          error: 'Pocos campos editables encontrados'
        });
      }
    } catch (error) {
      addTestResult('Validación de campos del panel', 'FAILED', {
        error: error.message
      });
    }
    
    // PRUEBA 5: Árbol de referidos
    console.log('\n🌳 PRUEBA 5: Árbol de referidos');
    try {
      // Navegar a referidos
      const referralLinks = ['a[href*="referral"]', 'a[href*="referido"]', 'button:has-text("Referidos")', 'button:has-text("Referrals")'];
      
      for (const selector of referralLinks) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          break;
        }
      }
      
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'arbol_referidos');
      
      // Verificar elementos del árbol
      const treeElements = [
        '.referral-tree',
        '.tree-node',
        '[data-testid="referral-tree"]',
        '.referidos-tree'
      ];
      
      let treeFound = false;
      for (const selector of treeElements) {
        if (await page.locator(selector).count() > 0) {
          treeFound = true;
          break;
        }
      }
      
      if (treeFound) {
        addTestResult('Árbol de referidos visible', 'PASSED', {
          screenshot: await takeScreenshot(page, 'arbol_referidos_ok')
        });
      } else {
        addTestResult('Árbol de referidos visible', 'FAILED', {
          error: 'Árbol de referidos no encontrado',
          screenshot: await takeScreenshot(page, 'arbol_referidos_error')
        });
      }
    } catch (error) {
      addTestResult('Árbol de referidos', 'FAILED', {
        error: error.message
      });
    }
    
    // PRUEBA 6: Recuperación de contraseña
    console.log('\n🔑 PRUEBA 6: Recuperación de contraseña');
    try {
      // Logout primero
      await page.goto(`${CONFIG.baseUrl}/logout`);
      await page.waitForTimeout(1000);
      
      // Ir a login y buscar "Olvidé mi contraseña"
      await page.goto(`${CONFIG.baseUrl}/login`);
      await page.waitForLoadState('networkidle');
      
      const forgotLinks = ['a:has-text("Olvidé")', 'a:has-text("Forgot")', 'a[href*="forgot"]', 'a[href*="recover"]'];
      
      let forgotLinkFound = false;
      for (const selector of forgotLinks) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          forgotLinkFound = true;
          break;
        }
      }
      
      if (forgotLinkFound) {
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'recuperacion_password');
        
        // Llenar email
        await page.fill('input[type="email"]', CONFIG.testEmail);
        await page.click('button[type="submit"], button:has-text("Enviar"), button:has-text("Recuperar")');
        await page.waitForTimeout(2000);
        
        addTestResult('Flujo de recuperación de contraseña', 'PASSED', {
          screenshot: await takeScreenshot(page, 'recuperacion_enviada')
        });
      } else {
        addTestResult('Flujo de recuperación de contraseña', 'FAILED', {
          error: 'Enlace de recuperación no encontrado'
        });
      }
    } catch (error) {
      addTestResult('Recuperación de contraseña', 'FAILED', {
        error: error.message
      });
    }
    
    // PRUEBA 7: Verificación de logs sin errores
    console.log('\n📋 PRUEBA 7: Verificación de logs');
    try {
      const logsResponse = await apiRequest('/admin/logs', 'GET');
      if (logsResponse.status === 200) {
        const logs = logsResponse.data;
        const errorLogs = logs.filter(log => log.level === 'error' && 
          new Date(log.timestamp) > new Date(Date.now() - 10 * 60 * 1000)); // Últimos 10 minutos
        
        if (errorLogs.length === 0) {
          addTestResult('Logs sin errores críticos', 'PASSED', {
            totalLogs: logs.length,
            errorLogs: errorLogs.length
          });
        } else {
          addTestResult('Logs sin errores críticos', 'FAILED', {
            errorLogs: errorLogs.length,
            errors: errorLogs.slice(0, 3) // Primeros 3 errores
          });
        }
      } else {
        addTestResult('Verificación de logs', 'FAILED', {
          error: `No se pudieron obtener los logs: ${logsResponse.status}`
        });
      }
    } catch (error) {
      addTestResult('Verificación de logs', 'FAILED', {
        error: error.message
      });
    }
    
  } finally {
    await browser.close();
  }
  
  // Guardar resultados
  fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
  
  // Mostrar resumen final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMEN FINAL DE PRUEBAS E2E');
  console.log('=' .repeat(60));
  console.log(`✅ Pruebas exitosas: ${results.summary.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.summary.failed}`);
  console.log(`📊 Total de pruebas: ${results.summary.total}`);
  console.log(`📈 Tasa de éxito: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  console.log(`\n📁 Resultados guardados en: ${CONFIG.resultsFile}`);
  console.log(`📸 Screenshots guardados en: ${CONFIG.screenshotsDir}`);
  
  if (results.summary.failed === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS E2E FUNCIONALES PASARON EXITOSAMENTE!');
  } else {
    console.log(`\n⚠️ ${results.summary.failed} pruebas fallaron. Revisar detalles en ${CONFIG.resultsFile}`);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  runE2ETests().catch(console.error);
}

module.exports = { runE2ETests, CONFIG };