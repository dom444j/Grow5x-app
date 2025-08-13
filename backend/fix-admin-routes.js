const fs = require('fs');
const path = require('path');

function fixAdminRoutes() {
  console.log('🔧 Aplicando Correcciones a las Rutas de Administración');
  console.log('====================================================');
  
  try {
    // 1. Corregir admin.routes.js
    console.log('\n1. 📝 Corrigiendo admin.routes.js...');
    const adminRoutesPath = path.join(__dirname, 'src/routes/admin.routes.js');
    
    if (fs.existsSync(adminRoutesPath)) {
      let adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');
      
      // Corregir importaciones de modelos
      const originalContent = adminRoutesContent;
      adminRoutesContent = adminRoutesContent.replace(
        /require\('\.\.\.\/\.\.\.\/models\//g,
        "require('../models/"
      );
      
      if (originalContent !== adminRoutesContent) {
        fs.writeFileSync(adminRoutesPath, adminRoutesContent);
        console.log('   ✅ Rutas de importación corregidas en admin.routes.js');
      } else {
        console.log('   ℹ️ admin.routes.js ya tiene las rutas correctas');
      }
    } else {
      console.log('   ❌ admin.routes.js no encontrado');
    }
    
    // 2. Corregir adminPackage.controller.js
    console.log('\n2. 📝 Corrigiendo adminPackage.controller.js...');
    const adminPackageControllerPath = path.join(__dirname, 'src/controllers/adminPackage.controller.js');
    
    if (fs.existsSync(adminPackageControllerPath)) {
      let controllerContent = fs.readFileSync(adminPackageControllerPath, 'utf8');
      
      const originalControllerContent = controllerContent;
      
      // Corregir importación de User
      controllerContent = controllerContent.replace(
        /require\('\.\.\.\/src\/models\/User'\)/g,
        "require('../models/User.js')"
      );
      
      // Corregir importación de logger
      controllerContent = controllerContent.replace(
        /require\('\.\.\.\/src\/utils\/logger'\)/g,
        "require('../utils/logger')"
      );
      
      if (originalControllerContent !== controllerContent) {
        fs.writeFileSync(adminPackageControllerPath, controllerContent);
        console.log('   ✅ Rutas de importación corregidas en adminPackage.controller.js');
      } else {
        console.log('   ℹ️ adminPackage.controller.js ya tiene las rutas correctas');
      }
    } else {
      console.log('   ❌ adminPackage.controller.js no encontrado');
    }
    
    // 3. Verificar otros archivos que podrían tener problemas similares
    console.log('\n3. 🔍 Verificando otros controladores...');
    const controllersDir = path.join(__dirname, 'src/controllers');
    
    if (fs.existsSync(controllersDir)) {
      const controllerFiles = fs.readdirSync(controllersDir).filter(file => file.endsWith('.js'));
      
      controllerFiles.forEach(file => {
        const filePath = path.join(controllersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Buscar y corregir rutas problemáticas
        content = content.replace(
          /require\('\.\.\.\/src\//g,
          "require('../"
        );
        
        if (originalContent !== content) {
          fs.writeFileSync(filePath, content);
          console.log(`   ✅ Corregido: ${file}`);
        }
      });
    }
    
    // 4. Verificar rutas en el directorio routes
    console.log('\n4. 🔍 Verificando archivos de rutas...');
    const routesDir = path.join(__dirname, 'src/routes');
    
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
      
      routeFiles.forEach(file => {
        const filePath = path.join(routesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Buscar y corregir rutas problemáticas
        content = content.replace(
          /require\('\.\.\.\/\.\.\.\/models\//g,
          "require('../models/"
        );
        
        content = content.replace(
          /require\('\.\.\.\/\.\.\.\/controllers\//g,
          "require('../controllers/"
        );
        
        if (originalContent !== content) {
          fs.writeFileSync(filePath, content);
          console.log(`   ✅ Corregido: ${file}`);
        }
      });
    }
    
    console.log('\n✅ Correcciones aplicadas exitosamente');
    console.log('\n📋 Resumen de correcciones:');
    console.log('   - Rutas de importación de modelos: ../../models/ → ../models/');
    console.log('   - Rutas de importación de User: ../src/models/User → ../models/User.js');
    console.log('   - Rutas de importación de logger: ../src/utils/logger → ../utils/logger');
    console.log('\n🔄 Reinicia el servidor para aplicar los cambios');
    
  } catch (error) {
    console.error('\n❌ Error aplicando correcciones:', error.message);
    console.error('Stack completo:', error.stack);
    process.exit(1);
  }
}

fixAdminRoutes();