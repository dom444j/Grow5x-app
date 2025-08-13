# Configuración MongoDB Atlas - Grow5X

## 📋 Información General

Este documento detalla la configuración completa de MongoDB Atlas para el proyecto Grow5X, incluyendo todos los archivos configurados y la migración completa del sistema.

## 🔧 Configuración Actual

### Base de Datos Principal
- **Proveedor**: MongoDB Atlas (Cloud)
- **Cluster**: cluster0.nufwbrc.mongodb.net
- **Base de Datos**: growx5
- **Usuario**: growx04
- **URI Completa**: `mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority`

### Configuración de Entornos

#### Desarrollo (Development)
```env
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

#### Producción (Production)
```env
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://grow5x.app
```

## 📁 Archivos Configurados para MongoDB Atlas

### Backend Configuration

#### 1. Variables de Entorno
- **Archivo**: `backend/.env` ✅
- **Estado**: Configurado con MongoDB Atlas
- **Configuración**:
  ```env
  MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
  PORT=3000
  NODE_ENV=development
  ```

- **Archivo**: `backend/.env.production` ✅
- **Estado**: Configurado para producción con MongoDB Atlas
- **Configuración**:
  ```env
  MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
  PORT=5000
  NODE_ENV=production
  ```

#### 2. Configuración de Base de Datos
- **Archivo**: `backend/src/config/database.js` ✅
- **Estado**: Configurado con opciones optimizadas para MongoDB Atlas
- **Características**:
  - Conexión automática a MongoDB Atlas
  - Manejo de reconexión automática
  - Pool de conexiones optimizado
  - Timeouts configurados para cloud
  - Logging detallado de conexiones

#### 3. Servidor Principal
- **Archivo**: `backend/server.js` ✅
- **Estado**: Inicializa conexión a MongoDB Atlas automáticamente
- **Función**: Carga configuración y conecta a la base de datos

#### 4. Modelos de Base de Datos
Todos los modelos están configurados para MongoDB Atlas:

- ✅ `src/models/User.js` - Modelo de usuarios con esquema completo
- ✅ `src/models/Package.js` - Modelo de paquetes de inversión
- ✅ `src/models/Purchase.js` - Modelo de compras y transacciones
- ✅ `src/models/License.model.js` - Modelo de licencias
- ✅ `src/models/Product.model.js` - Modelo de productos
- ✅ `src/models/Download.model.js` - Modelo de descargas
- ✅ `src/models/Ticket.js` - Modelo de tickets de soporte

#### 5. Scripts de Base de Datos
Todos los scripts están configurados para MongoDB Atlas:

- ✅ `scripts/activate-pending-users.js` - Activación de usuarios pendientes
- ✅ `scripts/createadmin.js` - Creación de usuarios administradores
- ✅ `scripts/fix-user-status-pending.js` - Corrección de estados de usuario
- ✅ `scripts/migrate-mock-users.js` - Migración de usuarios de prueba
- ✅ `scripts/seed-packages.js` - Población de paquetes
- ✅ `scripts/seed-products.js` - Población de productos
- ✅ `scripts/verify-migration.js` - Verificación de migraciones

#### 6. Controladores y Rutas
Todos configurados para trabajar con MongoDB Atlas:

- ✅ `src/controllers/` - Todos los controladores
- ✅ `src/routes/` - Todas las rutas de API
- ✅ `src/middleware/` - Middleware de autenticación y validación
- ✅ `src/services/` - Servicios de negocio

### Frontend Configuration

#### Variables de Entorno Frontend
- **Archivo**: `frontend/.env` ✅
- **Estado**: Configurado para conectar con backend que usa MongoDB Atlas
- **Configuración**:
  ```env
  VITE_API_URL=http://localhost:3000
  VITE_APP_NAME=Grow5X
  VITE_NODE_ENV=development
  ```

- **Archivo**: `frontend/.env.production` ✅
- **Estado**: Configurado para producción
- **Configuración**:
  ```env
  VITE_API_URL=https://api.grow5x.app
  VITE_NODE_ENV=production
  ```
## 🔍 Verificación del Sistema

### Estado Actual de MongoDB Atlas
- ✅ **Conexión**: Establecida y funcionando
- ✅ **Autenticación**: Usuarios pueden autenticarse correctamente
- ✅ **Operaciones CRUD**: Todas las operaciones funcionan
- ✅ **Índices**: Configurados automáticamente por Mongoose
- ✅ **Transacciones**: Soporte completo para transacciones

### Comandos de Verificación

#### Verificar Conexión
```bash
# Desde el directorio backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Conexión exitosa')).catch(err => console.error('❌ Error:', err))"
```

#### Verificar Usuarios en Base de Datos
```bash
# Ejecutar script de verificación
node scripts/verify-migration.js
```

#### Verificar Estado del Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📊 Colecciones Principales

### Colecciones Activas en MongoDB Atlas
1. **users** - Usuarios del sistema
2. **packages** - Paquetes de inversión
3. **purchases** - Compras y transacciones
4. **licenses** - Licencias de usuario
5. **products** - Productos disponibles
6. **downloads** - Registro de descargas
7. **tickets** - Tickets de soporte

## 🚀 Proceso de Migración Completado

### Pasos Realizados
1. ✅ **Configuración de MongoDB Atlas**: Cluster creado y configurado
2. ✅ **Actualización de Variables de Entorno**: Todos los archivos .env actualizados
3. ✅ **Migración de Datos**: Usuarios y datos migrados exitosamente
4. ✅ **Verificación de Conexiones**: Todas las conexiones funcionando
5. ✅ **Pruebas de Funcionalidad**: Sistema completamente operativo
6. ✅ **Activación de Usuarios**: Usuarios inactivos activados

## 🔐 Credenciales de Seguridad

### Información de Acceso
- **Usuario MongoDB**: growx04
- **Cluster**: cluster0.nufwbrc.mongodb.net
- **Base de Datos**: growx5
- **Región**: Configurada para óptimo rendimiento

### Recomendaciones de Seguridad
- ✅ Credenciales almacenadas en variables de entorno
- ✅ Conexión encriptada (SSL/TLS)
- ✅ Acceso restringido por IP (configurado en Atlas)
- ✅ Autenticación de base de datos habilitada

## 📈 Rendimiento y Monitoreo

### Configuración Optimizada
- **Pool de Conexiones**: Máximo 10 conexiones
- **Timeouts**: Configurados para entorno cloud
- **Retry Logic**: Reconexión automática habilitada
- **Logging**: Registro detallado de operaciones

### Monitoreo Disponible
- MongoDB Atlas Dashboard
- Logs de aplicación en `backend/logs/`
- Métricas de rendimiento en tiempo real

## 🔄 Backup y Recuperación

### Backup Automático
- MongoDB Atlas realiza backups automáticos
- Retención configurable desde el dashboard
- Restauración point-in-time disponible

### Backup Manual
```bash
# Exportar colección específica
mongodump --uri="mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5" --collection=users
```

## 📝 Notas Importantes

### Para Desarrollo
- El sistema está completamente configurado para MongoDB Atlas
- No se requiere instalación local de MongoDB
- Todas las operaciones se realizan en la nube

### Para Producción
- Configuración lista para despliegue
- Variables de entorno de producción configuradas
- Monitoreo y alertas disponibles en MongoDB Atlas

### Mantenimiento
- Revisar logs regularmente
- Monitorear uso de recursos en Atlas Dashboard
- Actualizar credenciales periódicamente

---

**Última Actualización**: $(date)
**Estado**: ✅ Sistema completamente operativo con MongoDB Atlas
**Responsable**: Equipo de Desarrollo Grow5X
- ✅ `src/models/Product.model.js` - Productos disponibles
- ✅ `src/models/Download.model.js` - Descargas de archivos
- ✅ `models/Ticket.js` - Sistema de soporte

#### 4. Scripts de Base de Datos
Todos los scripts están actualizados para MongoDB Atlas:

- ✅ `scripts/seed-admin-data.js` - Datos iniciales de administrador
- ✅ `scripts/seed-packages.js` - Paquetes del sistema
- ✅ `scripts/seed-products.js` - Productos iniciales
- ✅ `scripts/migrateUserStatus.js` - Migración de estados
- ✅ `scripts/activate-pending-users.js` - Activación de usuarios

## 🔐 Seguridad y Acceso

### Credenciales de Acceso
- **Usuario de Base de Datos**: `growx04`
- **Contraseña**: `XIpmaH7nzwaOnDSK`
- **Permisos**: Lectura y escritura completa
- **IP Whitelist**: Configurada para acceso desde cualquier IP (0.0.0.0/0)

### Configuración de Seguridad
- ✅ Conexión SSL/TLS habilitada
- ✅ Autenticación por usuario y contraseña
- ✅ Retries automáticos habilitados
- ✅ Write concern configurado para mayoría

## 📊 Colecciones Principales

### Usuarios y Autenticación
- `users` - Información de usuarios registrados
- `userstatus` - Estados y configuraciones de usuario
- `usersessions` - Sesiones activas
- `userdevices` - Dispositivos registrados

### Sistema de Paquetes
- `packages` - Paquetes disponibles
- `purchases` - Historial de compras
- `licenses` - Licencias activas
- `products` - Catálogo de productos

### Transacciones y Pagos
- `payments` - Registro de pagos
- `transactions` - Transacciones blockchain
- `wallets` - Billeteras de usuarios

### Sistema de Soporte
- `tickets` - Tickets de soporte
- `notifications` - Notificaciones del sistema

## 🚀 Migración Completada

### Proceso de Migración
1. ✅ **Configuración de Atlas**: Cluster creado y configurado
2. ✅ **Migración de Datos**: Datos transferidos desde base local
3. ✅ **Actualización de Configuración**: Todos los archivos .env actualizados
4. ✅ **Verificación de Conexión**: Conexión probada y funcionando
5. ✅ **Activación de Usuarios**: Usuarios inactivos activados

### Verificación de Funcionamiento
- ✅ Backend conecta correctamente
- ✅ Autenticación de usuarios funcional
- ✅ Operaciones CRUD operativas
- ✅ Sistema de pagos activo
- ✅ Verificación de transacciones BSC funcional

## 🔧 Comandos de Verificación

### Verificar Conexión
```bash
# Desde el directorio backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority').then(() => console.log('✅ Conexión exitosa')).catch(err => console.error('❌ Error:', err))"
```

### Verificar Usuarios
```bash
# Contar usuarios en la base de datos
node -e "const mongoose = require('mongoose'); const User = require('./src/models/User'); mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority').then(async () => { const count = await User.countDocuments(); console.log('Usuarios:', count); process.exit(); })"
```

## 📝 Notas Importantes

### Rendimiento
- La conexión a MongoDB Atlas puede tener latencia adicional comparada con base de datos local
- Se recomienda usar connection pooling para optimizar rendimiento
- Configurado timeout de 30 segundos para operaciones

### Backup y Recuperación
- MongoDB Atlas realiza backups automáticos
- Retención de 7 días para el tier gratuito
- Se puede configurar backup adicional si es necesario

### Monitoreo
- MongoDB Atlas proporciona métricas en tiempo real
- Alertas configurables para uso de recursos
- Logs de conexión disponibles en el dashboard

## 🔄 Próximos Pasos

1. **Optimización**: Configurar índices adicionales si es necesario
2. **Monitoreo**: Implementar alertas de rendimiento
3. **Backup**: Configurar estrategia de backup adicional
4. **Escalabilidad**: Evaluar upgrade de cluster según crecimiento

---

**Fecha de Configuración**: Agosto 2025  
**Estado**: ✅ Completamente Operativo  
**Responsable**: Sistema Grow5X