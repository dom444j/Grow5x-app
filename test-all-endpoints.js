const axios = require('axios');
const fs = require('fs');

// Configuración de endpoints a probar
const LOCALHOST_BASE = 'http://localhost:5000';
const PRODUCTION_BASE = 'https://grow5x.app';

// Credenciales de prueba
const TEST_CREDENTIALS = {
  identifier: 'admin@grow5x.com',
  password: 'Admin2024!'
};

// Lista de endpoints clave a probar
const ENDPOINTS_TO_TEST = [
  // Endpoints públicos
  { path: '/api/public/health', method: 'GET', public: true },
  { path: '/api/public/stats', method: 'GET', public: true },
  { path: '/api/public/info', method: 'GET', public: true },
  
  // Endpoints de autenticación
  { path: '/api/auth/login', method: 'POST', public: true, body: TEST_CREDENTIALS },
  
  // Endpoints que requieren autenticación
  { path: '/api/user/profile', method: 'GET', requiresAuth: true },
  { path: '/api/wallets', method: 'GET', requiresAuth: true },
  { path: '/api/users/:userId/referrals', method: 'GET', requiresAuth: true },
  { path: '/api/referrals/stats', method: 'GET', requiresAuth: true },
  { path: '/api/payments/history', method: 'GET', requiresAuth: true },
  { path: '/api/user-settings', method: 'GET', requiresAuth: true },
  { path: '/api/notifications', method: 'GET', requiresAuth: true },
  { path: '/api/news', method: 'GET', requiresAuth: true },
  
  // Endpoints de administrador
  { path: '/api/admin/users', method: 'GET', requiresAdmin: true },
  { path: '/api/admin/system/stats', method: 'GET', requiresAdmin: true },
  { path: '/api/admin/system/health', method: 'GET', requiresAdmin: true },
  { path: '/api/reports/dashboard', method: 'GET', requiresAdmin: true },
  
  // Endpoints de recursos
  { path: '/api/packages', method: 'GET', public: true },
  { path: '/api/licenses', method: 'GET', public: true },
  { path: '/api/products', method: 'GET', public: true },
  { path: '/api/downloads', method: 'GET', requiresAuth: true },
  { path: '/api/purchases', method: 'GET', requiresAuth: true },
  { path: '/api/finance/balance', method: 'GET', requiresAuth: true },
  { path: '/api/arbitrage/opportunities', method: 'GET', requiresAuth: true },
  { path: '/api/support/tickets', method: 'GET', requiresAuth: true },
  { path: '/api/documents', method: 'GET', requiresAuth: true }
];

class EndpointTester {
  constructor() {
    this.results = {
      localhost: [],
      production: []
    };
    this.tokens = {
      localhost: null,
      production: null
    };
    this.userIds = {
      localhost: null,
      production: null
    };
  }

  async login(baseUrl) {
    try {
      console.log(`\n🔐 Intentando login en ${baseUrl}...`);
      const response = await axios.post(`${baseUrl}/api/auth/login`, TEST_CREDENTIALS, {
        timeout: 10000
      });
      
      if (response.data.success && response.data.data.accessToken) {
        const environment = baseUrl.includes('localhost') ? 'localhost' : 'production';
        this.tokens[environment] = response.data.data.accessToken;
        this.userIds[environment] = response.data.data.user.id || response.data.data.user._id;
        console.log(`✅ Login exitoso en ${baseUrl}`);
        console.log(`   Token: ${this.tokens[environment].substring(0, 20)}...`);
        console.log(`   User ID: ${this.userIds[environment]}`);
        return true;
      } else {
        console.log(`❌ Login falló en ${baseUrl}: Respuesta inválida`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Login falló en ${baseUrl}: ${error.message}`);
      return false;
    }
  }

  async testEndpoint(baseUrl, endpoint) {
    const environment = baseUrl.includes('localhost') ? 'localhost' : 'production';
    const token = this.tokens[environment];
    const userId = this.userIds[environment];
    
    // Reemplazar parámetros dinámicos
    let path = endpoint.path;
    if (path.includes(':userId') && userId) {
      path = path.replace(':userId', userId);
    }
    
    const fullUrl = `${baseUrl}${path}`;
    
    try {
      const config = {
        method: endpoint.method,
        url: fullUrl,
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500; // Aceptar cualquier status < 500
        }
      };

      // Agregar headers de autenticación si es necesario
      if (endpoint.requiresAuth || endpoint.requiresAdmin) {
        if (!token) {
          return {
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'SKIP',
            message: 'No hay token de autenticación',
            url: fullUrl
          };
        }
        config.headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }

      // Agregar body si es necesario
      if (endpoint.body) {
        config.data = endpoint.body;
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json'
        };
      }

      const response = await axios(config);
      
      const result = {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        message: response.data?.message || response.statusText,
        url: fullUrl,
        responseSize: JSON.stringify(response.data || {}).length
      };

      // Verificar si es un error 404 específico
      if (response.status === 404 || (response.data && response.data.error === 'Route not found')) {
        result.routeNotFound = true;
      }

      return result;
    } catch (error) {
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'ERROR',
        success: false,
        message: error.message,
        url: fullUrl,
        error: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  async runTests() {
    console.log('🚀 Iniciando pruebas de endpoints...');
    console.log(`📊 Total de endpoints a probar: ${ENDPOINTS_TO_TEST.length}`);
    
    // Probar en localhost
    console.log('\n' + '='.repeat(60));
    console.log('🏠 PROBANDO EN LOCALHOST');
    console.log('='.repeat(60));
    
    const localhostLoginSuccess = await this.login(LOCALHOST_BASE);
    
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`\n🔍 Probando ${endpoint.method} ${endpoint.path}`);
      const result = await this.testEndpoint(LOCALHOST_BASE, endpoint);
      this.results.localhost.push(result);
      
      if (result.success) {
        console.log(`   ✅ ${result.status} - ${result.message}`);
      } else if (result.status === 'SKIP') {
        console.log(`   ⏭️  SKIP - ${result.message}`);
      } else {
        console.log(`   ❌ ${result.status} - ${result.message}`);
        if (result.routeNotFound) {
          console.log(`   🚨 RUTA NO ENCONTRADA: ${result.url}`);
        }
      }
    }
    
    // Probar en producción
    console.log('\n' + '='.repeat(60));
    console.log('🌐 PROBANDO EN PRODUCCIÓN');
    console.log('='.repeat(60));
    
    const productionLoginSuccess = await this.login(PRODUCTION_BASE);
    
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`\n🔍 Probando ${endpoint.method} ${endpoint.path}`);
      const result = await this.testEndpoint(PRODUCTION_BASE, endpoint);
      this.results.production.push(result);
      
      if (result.success) {
        console.log(`   ✅ ${result.status} - ${result.message}`);
      } else if (result.status === 'SKIP') {
        console.log(`   ⏭️  SKIP - ${result.message}`);
      } else {
        console.log(`   ❌ ${result.status} - ${result.message}`);
        if (result.routeNotFound) {
          console.log(`   🚨 RUTA NO ENCONTRADA: ${result.url}`);
        }
      }
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE FINAL DE PRUEBAS');
    console.log('='.repeat(80));
    
    const environments = ['localhost', 'production'];
    
    environments.forEach(env => {
      const results = this.results[env];
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success && r.status !== 'SKIP').length;
      const skipped = results.filter(r => r.status === 'SKIP').length;
      const routeNotFound = results.filter(r => r.routeNotFound).length;
      
      console.log(`\n🏷️  ${env.toUpperCase()}:`);
      console.log(`   ✅ Exitosos: ${successful}`);
      console.log(`   ❌ Fallidos: ${failed}`);
      console.log(`   ⏭️  Omitidos: ${skipped}`);
      console.log(`   🚨 Rutas no encontradas: ${routeNotFound}`);
      console.log(`   📈 Tasa de éxito: ${((successful / (successful + failed)) * 100).toFixed(1)}%`);
      
      if (routeNotFound > 0) {
        console.log(`\n   🚨 RUTAS NO ENCONTRADAS EN ${env.toUpperCase()}:`);
        results.filter(r => r.routeNotFound).forEach(r => {
          console.log(`      - ${r.method} ${r.endpoint}`);
        });
      }
    });
    
    // Guardar reporte detallado
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        localhost: this.getSummary('localhost'),
        production: this.getSummary('production')
      },
      details: this.results
    };
    
    fs.writeFileSync('endpoint-test-report.json', JSON.stringify(detailedReport, null, 2));
    console.log('\n💾 Reporte detallado guardado en: endpoint-test-report.json');
  }

  getSummary(environment) {
    const results = this.results[environment];
    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && r.status !== 'SKIP').length,
      skipped: results.filter(r => r.status === 'SKIP').length,
      routeNotFound: results.filter(r => r.routeNotFound).length
    };
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  const tester = new EndpointTester();
  tester.runTests().catch(error => {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  });
}

module.exports = EndpointTester;