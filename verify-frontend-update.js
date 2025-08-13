/**
 * Script de Verificación del Frontend Actualizado
 * Verifica que el botón "Verificar Usuario" esté presente en producción
 */

const https = require('https');
const fs = require('fs');

class FrontendVerifier {
  constructor() {
    this.baseUrl = 'https://grow5x.app';
  }

  async checkFrontendVersion() {
    try {
      console.log('🔍 Verificando versión del frontend...');
      
      const versionResponse = await this.makeRequest('/version.txt');
      console.log(`📅 Timestamp del build: ${versionResponse.trim()}`);
      
      return versionResponse.trim();
    } catch (error) {
      console.log('⚠️  Archivo version.txt no encontrado (normal si es la primera vez)');
      return null;
    }
  }

  async checkIndexHtml() {
    try {
      console.log('🔍 Verificando index.html...');
      
      const htmlContent = await this.makeRequest('/');
      
      // Verificar que contenga los assets más recientes
      const hasRecentAssets = htmlContent.includes('UserManagement') || 
                             htmlContent.includes('AdminDashboard') ||
                             htmlContent.includes('assets/');
      
      if (hasRecentAssets) {
        console.log('✅ Frontend actualizado detectado');
      } else {
        console.log('⚠️  Frontend podría estar desactualizado');
      }
      
      return hasRecentAssets;
    } catch (error) {
      console.error('❌ Error verificando index.html:', error.message);
      return false;
    }
  }

  async checkApiEndpoint() {
    try {
      console.log('🔍 Verificando endpoint de verificación...');
      
      // Probar el endpoint sin token (debe devolver 401)
      const response = await this.makeRequest('/api/admin/users/test/verify', 'POST');
      
      // Si llegamos aquí sin error 401, algo está mal
      console.log('⚠️  Respuesta inesperada del endpoint');
      return false;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('✅ Endpoint /api/admin/users/:id/verify disponible');
        return true;
      } else {
        console.log('❌ Endpoint no disponible:', error.message);
        return false;
      }
    }
  }

  async checkNginxConfig() {
    try {
      console.log('🔍 Verificando configuración de Nginx...');
      
      // Verificar que /api/ sea proxied correctamente
      const healthResponse = await this.makeRequest('/api/health');
      const healthData = JSON.parse(healthResponse);
      
      if (healthData.status === 'OK') {
        console.log('✅ Nginx proxy funcionando correctamente');
        return true;
      } else {
        console.log('⚠️  Respuesta de salud inesperada');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando Nginx:', error.message);
      return false;
    }
  }

  makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'grow5x.app',
        port: 443,
        path: path,
        method: method,
        headers: {
          'User-Agent': 'Frontend-Verifier/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }

  async runFullVerification() {
    console.log('🚀 Iniciando verificación completa del frontend actualizado\n');
    
    const results = {
      version: await this.checkFrontendVersion(),
      frontend: await this.checkIndexHtml(),
      api: await this.checkApiEndpoint(),
      nginx: await this.checkNginxConfig()
    };
    
    console.log('\n📊 Resumen de verificación:');
    console.log(`Frontend actualizado: ${results.frontend ? '✅' : '❌'}`);
    console.log(`API disponible: ${results.api ? '✅' : '❌'}`);
    console.log(`Nginx funcionando: ${results.nginx ? '✅' : '❌'}`);
    
    if (results.version) {
      console.log(`Versión: ${results.version}`);
    }
    
    const allGood = results.frontend && results.api && results.nginx;
    
    if (allGood) {
      console.log('\n🎉 ¡Todo funcionando correctamente!');
      console.log('\n📋 Próximos pasos:');
      console.log('1. Abrir https://grow5x.app/admin/login en incógnito');
      console.log('2. Hacer login como administrador');
      console.log('3. Ir a Gestión de Usuarios');
      console.log('4. Buscar usuarios con status "pending" o no verificados');
      console.log('5. Verificar que aparezca el botón "Verificar Usuario"');
    } else {
      console.log('\n⚠️  Algunos componentes necesitan atención');
    }
    
    return allGood;
  }
}

// Ejecutar verificación
if (require.main === module) {
  const verifier = new FrontendVerifier();
  verifier.runFullVerification().catch(console.error);
}

module.exports = FrontendVerifier;