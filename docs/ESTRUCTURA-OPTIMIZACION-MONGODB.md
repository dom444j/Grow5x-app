# ESTRUCTURA Y ORDEN DE CARGA PARA OPTIMIZACIONES - GROW5X

**Fecha:** 31 de Julio, 2025  
**Propósito:** Documentar la estructura de archivos y orden de carga para optimizaciones con MongoDB  
**Estado:** Documentación completa para despliegue optimizado  

## 📁 ESTRUCTURA DE ARCHIVOS PARA OPTIMIZACIÓN

### 1. ORDEN DE PRIORIDAD DE CARGA

#### **FASE 1: Configuración Base**
```
1. .env.production (Variables de entorno)
2. package.json (Dependencias)
3. ecosystem.config.js (PM2 configuración)
4. nginx.conf (Configuración del servidor web)
```

#### **FASE 2: Base de Datos MongoDB**
```
1. backend/config/database.js (Configuración de conexión)
2. backend/models/ (Modelos de datos)
   ├── User.model.js
   ├── License.model.js
   ├── Package.model.js
   ├── Product.model.js
   ├── Purchase.model.js
   └── Ticket.js
3. backend/scripts/migrate-special-users.js (Migración de usuarios)
4. backend/scripts/seed-packages.js (Datos iniciales)
```

#### **FASE 3: Backend API**
```
1. backend/server.js (Servidor principal)
2. backend/routes/ (Rutas de API)
   ├── auth.routes.js
   ├── license.routes.js
   ├── package.routes.js
   ├── products.js
   └── support.routes.js
3. backend/controllers/ (Controladores)
4. backend/middleware/ (Middleware de autenticación)
```

#### **FASE 4: Frontend**
```
1. frontend/dist/ (Aplicación compilada)
2. frontend/public/ (Recursos estáticos)
3. frontend/src/config/ (Configuración del cliente)
```

## 🗄️ CONFIGURACIÓN MONGODB CORRECTA

### Variables de Entorno Requeridas

```bash
# MongoDB Configuración
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
MONGODB_HOST=cluster0.nufwbrc.mongodb.net
MONGODB_PORT=27017
MONGODB_DATABASE=grow5x_production
MONGODB_USER=grow5x_user
MONGODB_PASSWORD=secure_password_2025

# Configuración de Conexión
MONGODB_MAX_POOL_SIZE=10
MONGODB_TIMEOUT=30000
MONGODB_RETRY_WRITES=true
```

### Archivo de Configuración MongoDB

**Ubicación:** `backend/config/database.js`

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE || 10,
      serverSelectionTimeoutMS: process.env.MONGODB_TIMEOUT || 30000,
      retryWrites: process.env.MONGODB_RETRY_WRITES === 'true'
    });
    
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

## 🚀 SECUENCIA DE INICIALIZACIÓN OPTIMIZADA

### 1. Script de Inicialización

**Archivo:** `scripts/init-production.sh`

```bash
#!/bin/bash
echo "🚀 Iniciando Grow5X en modo producción..."

# 1. Verificar MongoDB
echo "📊 Verificando conexión MongoDB..."
systemctl status mongod

# 2. Instalar dependencias backend
echo "📦 Instalando dependencias backend..."
cd /var/www/grow5x/backend
npm install --production

# 3. Ejecutar migraciones
echo "🔄 Ejecutando migraciones de base de datos..."
node scripts/migrate-special-users.js
node scripts/seed-packages.js

# 4. Instalar dependencias frontend
echo "🎨 Instalando dependencias frontend..."
cd /var/www/grow5x/frontend
npm install --production
npm run build

# 5. Iniciar servicios
echo "⚡ Iniciando servicios..."
cd /var/www/grow5x/backend
pm2 start ecosystem.config.js

echo "✅ Grow5X iniciado correctamente"
```

### 2. Verificación de Conexión MongoDB

**Archivo:** `scripts/verify-mongodb.js`

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function verifyMongoDB() {
  try {
    console.log('🔍 Verificando conexión MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado correctamente');
    
    // Verificar colecciones existentes
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar usuarios especiales
    const User = require('../backend/models/User.model');
    const specialUsers = await User.find({ role: { $in: ['LEADER', 'PARENT'] } });
    console.log('👥 Usuarios especiales encontrados:', specialUsers.length);
    
    await mongoose.disconnect();
    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en verificación MongoDB:', error);
    process.exit(1);
  }
}

verifyMongoDB();
```

## 📋 CHECKLIST DE OPTIMIZACIÓN

### Pre-Despliegue
- [ ] Variables de entorno configuradas
- [ ] MongoDB instalado y ejecutándose
- [ ] Credenciales de base de datos creadas
- [ ] Puertos 27017 (MongoDB) y 5000 (API) abiertos
- [ ] PM2 instalado globalmente

### Durante el Despliegue
- [ ] Archivos subidos en orden correcto
- [ ] Dependencias instaladas (backend primero)
- [ ] Migraciones ejecutadas
- [ ] Build de frontend generado
- [ ] Servicios iniciados con PM2

### Post-Despliegue
- [ ] Conexión MongoDB verificada
- [ ] API respondiendo en puerto 5000
- [ ] Frontend accesible
- [ ] Usuarios especiales funcionando
- [ ] Logs sin errores críticos

## 🔧 COMANDOS DE VERIFICACIÓN

### MongoDB
```bash
# Verificar estado del servicio
sudo systemctl status mongod

# Conectar a MongoDB
# Conectar usando MongoDB Compass o mongosh con la URI de Atlas
# mongosh "mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5"

# Verificar colecciones
show collections

# Contar usuarios
db.users.count()
```

### Aplicación
```bash
# Verificar procesos PM2
pm2 list

# Ver logs en tiempo real
pm2 logs

# Verificar API
curl http://localhost:5000/api/health

# Verificar frontend
curl http://localhost:3000
```

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### Error de Conexión MongoDB
```bash
# Reiniciar MongoDB
sudo systemctl restart mongod

# Verificar logs
sudo journalctl -u mongod -f

# Verificar configuración
sudo nano /etc/mongod.conf
```

### Error de Dependencias
```bash
# Limpiar cache npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error de Permisos
```bash
# Ajustar permisos
sudo chown -R www-data:www-data /var/www/grow5x
sudo chmod -R 755 /var/www/grow5x
```

## 📊 MONITOREO Y LOGS

### Ubicaciones de Logs
```
/var/www/grow5x/backend/logs/
├── combined.log (Logs generales)
├── error.log (Errores)
├── auth.log (Autenticación)
└── payments.log (Pagos)

/var/log/mongodb/mongod.log (MongoDB)
/var/log/nginx/ (Nginx)
```

### Comandos de Monitoreo
```bash
# Monitorear logs de aplicación
tail -f /var/www/grow5x/backend/logs/combined.log

# Monitorear MongoDB
tail -f /var/log/mongodb/mongod.log

# Monitorear recursos del sistema
htop
df -h
free -m
```

## ✅ VALIDACIÓN FINAL

### Script de Validación Completa

**Archivo:** `scripts/validate-deployment.sh`

```bash
#!/bin/bash
echo "🔍 Validando despliegue completo..."

# 1. MongoDB
echo "📊 Verificando MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB activo"
else
    echo "❌ MongoDB no está activo"
    exit 1
fi

# 2. API Backend
echo "🔌 Verificando API..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ API respondiendo"
else
    echo "❌ API no responde"
    exit 1
fi

# 3. Frontend
echo "🎨 Verificando Frontend..."
if [ -d "/var/www/grow5x/frontend/dist" ]; then
    echo "✅ Frontend compilado"
else
    echo "❌ Frontend no compilado"
    exit 1
fi

# 4. Usuarios especiales
echo "👥 Verificando usuarios especiales..."
cd /var/www/grow5x/backend
node scripts/verify-special-users.js

echo "✅ Validación completada exitosamente"
```

---

**Nota:** Esta documentación debe seguirse estrictamente para garantizar un despliegue optimizado y una conexión correcta con MongoDB.

*Documento actualizado: 31 de Julio, 2025*