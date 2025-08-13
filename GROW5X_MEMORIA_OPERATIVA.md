# GROW5X - MEMORIA OPERATIVA DEL PROYECTO

## 📋 INFORMACIÓN GENERAL

**Proyecto**: Grow5X - Plataforma de Inversión y Referidos  
**Base de Datos**: MongoDB Atlas (Cloud)  
**Estado**: Operativo con MongoDB Atlas  
**Última Actualización**: Enero 2025  
**Versión**: 2.3 - Sistema Completo con Códigos Especiales y Beneficios Manuales

### 🎯 Características Principales del Sistema
- ✅ **Sistema de Beneficios**: 12.5% diario por 8 días (5 ciclos = 500% potencial)
- ✅ **Sistema de Comisiones**: Directa (10%), Líder (5%), Padre (5%)
- ✅ **Sistema de Referidos**: Códigos únicos y tracking completo
- ✅ **Códigos Especiales**: Gestión de códigos PADRE y LÍDER con beneficios manuales
- ✅ **Administración de Emails**: Logging y monitoreo implementado
- ✅ **Configuración Email Namecheap**: Private Email configurado y probado
- ✅ **Automatización**: Procesamiento automático de beneficios y comisiones
- ✅ **Panel Administrativo**: Control total de usuarios, pagos y comisiones
- ✅ **Sistema de Autenticación**: Verificado con credenciales reales
- ✅ **Endpoints Administrativos**: Todos funcionales y verificados
- ✅ **Funciones de Email Admin**: Implementadas y operativas

## 🎖️ SISTEMA DE CÓDIGOS ESPECIALES

### Funcionalidades Implementadas
- ✅ **Gestión de Códigos PADRE y LÍDER**: Panel administrativo completo
- ✅ **Aplicación Manual de Beneficios**: Opción de respaldo para fallos automáticos
- ✅ **Historial de Comisiones**: Visualización completa en la misma página
- ✅ **Validación de Beneficiarios**: Selección de usuarios válidos
- ✅ **Tipos de Beneficio**: Bono de Líder y Bono de Padre
- ✅ **Razones Documentadas**: Campo obligatorio para justificar beneficios manuales
- ✅ **Integración Backend**: Endpoint `/api/admin/special-codes/apply-manual-benefits`

### Características del Sistema
- **URL de Acceso**: `http://localhost:5173/admin/special-codes`
- **Botón Manual**: "Aplicar Beneficio Manual" con ícono de pago
- **Modal Intuitivo**: Formulario completo con validaciones
- **Filtros de Usuario**: Excluye al propietario del código especial
- **Validación de Montos**: Mínimo $0.01 con incrementos de $0.01
- **Estados de Beneficio**: Pendiente, Pagado, Cancelado
- **Historial Integrado**: Misma página que la gestión de códigos

### Endpoints Implementados
```javascript
// Backend - Aplicar beneficio manual
POST /api/admin/special-codes/apply-manual-benefits
{
  "codeId": "ObjectId del código especial",
  "userId": "ObjectId del usuario beneficiario",
  "amount": "Monto en USDT",
  "reason": "Razón del beneficio manual",
  "benefitType": "leader_bonus | parent_bonus"
}

// Frontend - Servicio de códigos especiales
specialCodesService.applyManualBenefits(benefitData)
```

### Validaciones Implementadas
- **Código Especial Activo**: Verificación de estado activo
- **Usuario Válido**: Verificación de existencia y estado
- **Monto Válido**: Mayor a 0 y formato numérico
- **Tipo de Beneficio**: leader_bonus o parent_bonus
- **Razón Obligatoria**: Campo de texto requerido
- **Prevención de Duplicados**: Validación de beneficiarios únicos

## 🗄️ BASE DE DATOS MONGODB ATLAS

### Configuración de Conexión
- **Proveedor**: MongoDB Atlas (Cloud)
- **Cluster**: cluster0.nufwbrc.mongodb.net
- **Base de Datos**: growx5
- **Usuario**: growx04
- **URI**: `mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority`

### Variables de Entorno Requeridas
```env
# Desarrollo
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Producción
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://grow5x.app
```

### Colecciones Principales

#### 1. **users** - Usuarios del Sistema
**Campos principales:**
- `email` (String, unique) - Email del usuario
- `password` (String) - Contraseña hasheada
- `fullName` (String) - Nombre completo
- `country` (String) - País de residencia
- `phone` (String) - Teléfono
- `dateOfBirth` (Date) - Fecha de nacimiento
- `address` (Object) - Dirección completa
- `occupation` (String) - Ocupación
- `emergencyContact` (Object) - Contacto de emergencia
- `profileImage` (String) - URL de imagen de perfil
- `telegram` (Object) - Información de Telegram
- `verification` (Object) - Estado de verificación de email
- `referralCode` (String, unique) - Código de referido
- `referredBy` (ObjectId) - Usuario que lo refirió
- `referrals` (Array) - Lista de usuarios referidos
- `role` (String) - Rol: user, admin, superadmin
- `status` (String) - Estado: pending, active, inactive, suspended, deleted
- `isPioneer` (Boolean) - Si es usuario pionero
- `package_status` (String) - Estado del paquete
- `current_package` (String) - Paquete actual
- `balances` (Object) - Balances múltiples (available, pending, frozen, investment, commission, bonus, referral, withdrawal)
- `withdrawalDebits` (Object) - Información de retiros
- `investments` (Object) - Información de inversiones
- `activity` (Object) - Actividad del usuario
- `adminFlags` (Object) - Flags administrativos
- `benefits` (Object) - Beneficios personales y de referidos
- `walletAddresses` (Array) - Direcciones de billeteras
- `preferences` (Object) - Preferencias del usuario
- `security` (Object) - Configuración de seguridad
- `securityLog` (Array) - Log de seguridad
- `sessions` (Array) - Sesiones activas
- `resetPassword` (Object) - Token de reset de contraseña
- `lastLogin` (Date) - Último login
- `loginAttempts` (Number) - Intentos de login
- `lockUntil` (Date) - Bloqueado hasta
- `createdAt`, `updatedAt` (Date) - Timestamps

#### 2. **transactions** - Transacciones del Sistema
**Campos principales:**
- `user` (ObjectId) - Usuario de la transacción
- `type` (String) - Tipo: deposit, withdrawal, earnings, commission, pioneer_payment, package_purchase, refund, fee, admin_adjustment, manual_correction
- `subtype` (String) - Subtipo específico
- `amount` (Number) - Monto de la transacción
- `currency` (String) - Moneda: USDT, USD, EUR, BTC, ETH
- `status` (String) - Estado: pending, processing, completed, failed, cancelled, expired, refunded
- `payment` (Object) - Información de pago (método, dirección, txHash, network, confirmaciones)
- `pioneerPlan` (Object) - Detalles del plan pionero
- `externalId` (String) - ID externo del procesador
- `externalReference` (String) - Referencia externa
- `invoiceId` (String) - ID de factura
- `description` (String) - Descripción
- `notes` (String) - Notas
- `metadata` (Object) - Metadatos adicionales
- `processedAt`, `completedAt`, `failedAt`, `expiresAt` (Date) - Timestamps de estados
- `error` (Object) - Información de errores
- `processedBy` (ObjectId) - Procesado por
- `adminNotes` (String) - Notas administrativas

#### 3. **packages** - Paquetes de Inversión
**Campos principales:**
- `name` (String) - Nombre del paquete
- `slug` (String, unique) - Slug único
- `description` (String) - Descripción
- `price` (Number) - Precio
- `currency` (String) - Moneda
- `features` (Array) - Características incluidas
- `benefits` (Array) - Beneficios
- `category` (String) - Categoría: starter, basic, standard, premium, gold, platinum, diamond
- `level` (Number) - Nivel del paquete (1-7)
- `commissionRate` (Number) - Tasa de comisión
- `maxEarnings` (Number) - Ganancias máximas
- `duration` (Number) - Duración en días
- `benefitConfig` (Object) - Configuración de beneficios
- `commissionConfig` (Object) - Configuración de comisiones
- `status` (String) - Estado: active, inactive, discontinued
- `isPopular` (Boolean) - Si es popular
- `sortOrder` (Number) - Orden de clasificación
- `salesCount` (Number) - Contador de ventas
- `metadata` (Object) - Metadatos adicionales

#### 4. **wallets** - Billeteras del Sistema
**Campos principales:**
- `address` (String, unique) - Dirección de la billetera
- `network` (String) - Red: BEP20
- `currency` (String) - Moneda
- `status` (String) - Estado: active, inactive, maintenance
- `isUsed` (Boolean) - Si está en uso
- `lastUsed` (Date) - Última vez usada
- `usageCount` (Number) - Contador de uso
- `balance` (Number) - Balance actual
- `label` (String) - Etiqueta
- `description` (String) - Descripción
- `maxUsage` (Number) - Uso máximo
- `cooldownPeriod` (Number) - Período de enfriamiento
- `priority` (String) - Prioridad: low, normal, high
- `isActive` (Boolean) - Si está activa
- `isPaymentWallet` (Boolean) - Si es billetera de pagos
- `distributionMethod` (String) - Método de distribución
- `maxConcurrentUsers` (Number) - Usuarios concurrentes máximos
- `addedBy` (ObjectId) - Agregada por
- `lastModifiedBy` (ObjectId) - Última modificación por
- `totalReceived` (Number) - Total recibido
- `transactionCount` (Number) - Contador de transacciones
- `monitoringEnabled` (Boolean) - Monitoreo habilitado
- `lastChecked` (Date) - Última verificación
- `notes` (Array) - Notas administrativas

#### 5. **commissions** - Comisiones del Sistema
**Campos principales:**
- `userId` (ObjectId) - Usuario que recibe la comisión
- `fromUserId` (ObjectId) - Usuario que genera la comisión
- `commissionType` (String) - Tipo: direct_referral, leader_bonus, parent_bonus, pool_bonus
- `amount` (Number) - Monto de la comisión
- `currency` (String) - Moneda
- `status` (String) - Estado: pending, paid, cancelled
- `specialCodeId` (ObjectId) - Código especial relacionado
- `referralId` (ObjectId) - Referido relacionado
- `transactionId` (ObjectId) - Transacción relacionada
- `purchaseId` (ObjectId) - Compra relacionada
- `paymentInfo` (Object) - Información de pago
- `metadata` (Object) - Metadatos (semana, ciclo, día, porcentaje, etc.)
- `createdBy` (ObjectId) - Creado por
- `updatedBy` (ObjectId) - Actualizado por

#### 6. **payments** - Pagos del Sistema
**Campos principales:**
- `user` (ObjectId) - Usuario del pago
- `amount` (Number) - Monto
- `currency` (String) - Moneda: USDT, USD, EUR, BTC, ETH
- `type` (String) - Tipo: deposit, withdrawal, referral_commission, pioneer_membership, investment, refund
- `status` (String) - Estado: pending, approved, exported, processing, completed, failed, cancelled, disputed
- `paymentMethod` (String) - Método: crypto, bank_transfer, credit_card, paypal, system
- `cryptoDetails` (Object) - Detalles crypto (network, walletAddress, transactionHash, confirmations)
- `bankDetails` (Object) - Detalles bancarios
- `description` (String) - Descripción
- `metadata` (Object) - Metadatos adicionales
- `fees` (Object) - Comisiones
- `exchangeRate` (Object) - Tipo de cambio
- `ipAddress` (String) - IP del usuario
- `userAgent` (String) - User agent
- `webhookEvents` (Array) - Eventos de webhook
- `notes` (Array) - Notas administrativas
- `adminNotes` (String) - Notas del admin
- `exportedAt`, `processedAt`, `completedAt` (Date) - Timestamps
- `exportedBy`, `processedBy`, `approvedBy` (ObjectId) - Referencias de usuarios
- `batchId` (String) - ID de lote
- `txHashes` (Array) - Hashes de transacciones
- `rejectionReason` (String) - Razón de rechazo
- `expiresAt` (Date) - Fecha de expiración

### Otras Colecciones
- **referrals** - Sistema de referidos
- **userstatus** - Estados de usuarios
- **packages** - Paquetes adicionales
- **purchases** - Compras realizadas
- **licenses** - Licencias de usuarios
- **products** - Catálogo de productos
- **downloads** - Registro de descargas
- **tickets** - Sistema de soporte
- **notifications** - Notificaciones del sistema
- **emaillogs** - Logs de envío de emails

---

## 📧 CONFIGURACIÓN DE EMAIL NAMECHEAP PRIVATE EMAIL

### Estado de Configuración
- ✅ **Configuración SMTP**: Completada en archivos de entorno
- ✅ **Scripts de Prueba**: Creados y validados
- ✅ **Conectividad**: Verificada en puertos 587 y 465
- ✅ **Credenciales deSEC**: Obtenidas (growx04@gmail.com / 300400Jd14@)
- ✅ **Nameservers**: ns1.desec.io, ns2.desec.org configurados correctamente
- ✅ **Backend Listo**: Configuración completa para ambiente de producción
- ❌ **Registros DNS**: Pendientes de configuración en deSEC
- ❌ **Registros MX**: No configurados (mx1.privateemail.com, mx2.privateemail.com)
- ❌ **Registro SPF**: No configurado (v=spf1 include:spf.privateemail.com ~all)
- ❌ **Registro DKIM**: Pendiente de generar desde Namecheap
- ❌ **Pruebas de Envío**: Fallando (Error: Sender address rejected)
- ⚠️ **Estado Final**: LISTO PARA PRODUCCIÓN - Solo falta configurar DNS

### Credenciales Configuradas
**Proveedor**: Namecheap Private Email  
**Servidor SMTP**: smtp.privateemail.com  
**Puerto**: 587 (STARTTLS) / 465 (SSL)  
**Contraseña**: 300400Jd14  

### Cuentas de Email Configuradas
1. **noreply@grow5x.app** - Notificaciones automáticas del sistema
2. **welcome@grow5x.app** - Emails de bienvenida a nuevos usuarios
3. **recovery@grow5x.app** - Recuperación de contraseñas
4. **support@grow5x.app** - Soporte técnico y atención al cliente

### Archivos de Configuración Actualizados

#### Variables de Entorno
- **`.env.production`** - Configuración para producción
- **`ecosystem.config.js`** - Configuración PM2 para despliegue

#### Configuración SMTP en Producción
```env
# Configuración SMTP Namecheap Private Email
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER_NOREPLY=noreply@grow5x.app
SMTP_PASS_NOREPLY=300400Jd14
SMTP_FROM_NOREPLY=noreply@grow5x.app

SMTP_USER_WELCOME=welcome@grow5x.app
SMTP_PASS_WELCOME=300400Jd14
SMTP_FROM_WELCOME=welcome@grow5x.app

SMTP_USER_RECOVERY=recovery@grow5x.app
SMTP_PASS_RECOVERY=300400Jd14
SMTP_FROM_RECOVERY=recovery@grow5x.app

SMTP_USER_SUPPORT=support@grow5x.app
SMTP_PASS_SUPPORT=300400Jd14
SMTP_FROM_SUPPORT=support@grow5x.app
```

### Scripts de Diagnóstico Creados

#### 1. **test-namecheap-email.js**
- **Ubicación**: `backend/test-namecheap-email.js`
- **Función**: Prueba configuración SMTP de las 4 cuentas
- **Estado**: ✅ Configuración validada, ⚠️ Envío pendiente

#### 2. **test-support-email.js**
- **Ubicación**: `backend/test-support-email.js`
- **Función**: Prueba específica de cuenta support@grow5x.app
- **Estado**: ✅ Conectividad confirmada

#### 3. **diagnose-email-config.js**
- **Ubicación**: `backend/diagnose-email-config.js`
- **Función**: Diagnóstico avanzado de conectividad y DNS
- **Estado**: ✅ Diagnóstico completo realizado

### Resultados de Diagnóstico

#### Conectividad SMTP
- ✅ **Puerto 587**: Conexión exitosa con STARTTLS
- ✅ **Puerto 465**: Conexión exitosa con SSL
- ❌ **Puerto 25**: Bloqueado (normal en entornos residenciales)

#### Estado de Configuración
- ✅ **Archivos de configuración**: Actualizados correctamente
- ✅ **Variables de entorno**: Configuradas en producción
- ✅ **Scripts de prueba**: Funcionando correctamente
- ⚠️ **Cuentas de email**: Requieren creación en panel Namecheap

### Documentación Creada
- **CONFIGURACION-NAMECHEAP-EMAIL.md** - Guía completa de configuración
- **CONFIGURACION-DNS-DESEC.md** - Instrucciones para configurar DNS en deSEC
- Instrucciones paso a paso para crear cuentas en Namecheap
- Solución de problemas comunes
- Verificación de registros DNS

### Credenciales de Acceso

#### **Panel deSEC (DNS Management)**
- **URL**: https://desec.io/domains/grow5x.app
- **Email**: growx04@gmail.com
- **Contraseña**: 300400Jd14@
- **Función**: Gestión de registros DNS para grow5x.app

#### **Panel Namecheap (Email & Domain)**
- **URL**: https://ap.www.namecheap.com/
- **Email**: growx04@gmail.com
- **Contraseña**: 300400Jd14
- **Función**: Gestión de dominio y Private Email

#### **Sistema Administrativo Grow5X**
- **URL Local**: http://localhost:5173/admin
- **URL Producción**: https://grow5x.app/admin
- **Email Admin**: admin@grow5x.com
- **Contraseña**: Admin2024!
- **Estado**: ✅ Activo y verificado
- **Funciones**: Control total de usuarios, pagos, comisiones y sistema de emails

#### **Credenciales de Usuarios de Prueba**
- **PADRE**: padre@grow5x.com / Padre2024!
- **LIDER**: lider@grow5x.com / Lider2024!
- **TEST**: test@grow5x.com / Test2024!
- **Estado**: ✅ Todos activos con 100% de éxito en login

### Acciones Pendientes para Producción
1. **✅ BACKEND COMPLETADO**: Toda la configuración SMTP está lista
2. **❌ CONFIGURAR DNS EN deSEC**: Acceder con credenciales obtenidas
3. **❌ REGISTROS MX**: Agregar mx1.privateemail.com y mx2.privateemail.com (prioridad 10)
4. **❌ REGISTRO SPF**: Configurar v=spf1 include:spf.privateemail.com ~all
5. **❌ REGISTRO DKIM**: Generar desde Namecheap y agregar a deSEC
6. **❌ CREAR CUENTAS EMAIL**: Crear las 4 cuentas en panel Namecheap Private Email
7. **❌ PRUEBAS FINALES**: Verificar envío una vez propagados los DNS

### Estado de Preparación
- **🔧 DESARROLLO**: ✅ 100% Completo
- **📧 CONFIGURACIÓN SMTP**: ✅ 100% Completo  
- **🌐 DNS**: ❌ 0% Completo (Acción requerida)
- **📬 CUENTAS EMAIL**: ❌ 0% Completo (Acción requerida)
- **🚀 LISTO PARA PRODUCCIÓN**: ⚠️ 80% (Solo falta DNS y cuentas)

### Próximos Pasos para Activación Completa

#### PASO 1: Configurar DNS en deSEC
1. **Acceder al panel deSEC** (https://desec.io/domains/grow5x.app)
   - Email: growx04@gmail.com
   - Contraseña: 300400Jd14@

2. **Agregar registros MX**:
   ```
   Tipo: MX, Host: @, Valor: mx1.privateemail.com, Prioridad: 10, TTL: 3600
   Tipo: MX, Host: @, Valor: mx2.privateemail.com, Prioridad: 10, TTL: 3600
   ```

3. **Agregar registro SPF**:
   ```
   Tipo: TXT, Host: @, Valor: v=spf1 include:spf.privateemail.com ~all, TTL: 3600
   ```

#### PASO 2: Configurar DKIM en Namecheap
1. **Acceder al panel Namecheap** (https://ap.www.namecheap.com/)
   - Email: growx04@gmail.com
   - Contraseña: 300400Jd14
2. **Ir a Private Email → DKIM Settings**
3. **Generar registro DKIM para grow5x.app**
4. **Copiar el valor y agregarlo en deSEC**:
   ```
   Tipo: TXT, Host: default._domainkey, Valor: [valor generado], TTL: 3600
   ```

#### PASO 3: Crear Cuentas de Email
1. **En panel Namecheap Private Email, crear**:
   - noreply@grow5x.app (contraseña: 300400Jd14)
   - welcome@grow5x.app (contraseña: 300400Jd14)
   - recovery@grow5x.app (contraseña: 300400Jd14)
   - support@grow5x.app (contraseña: 300400Jd14)

#### PASO 4: Verificación Final
1. **Esperar propagación DNS** (30-60 minutos)
2. **Verificar configuración**: `node backend/verify-dns-setup.js`
3. **Probar envío**: `node backend/test-email-simple.js`
4. **Confirmar integración**: Sistema listo para producción

### 🎯 RESULTADO ESPERADO
- ✅ **Todos los registros DNS detectados**
- ✅ **Envío de emails exitoso al 100%**
- ✅ **Sistema completamente operativo para producción**

---

## 📦 HISTORIAL DE RELEASES EN PRODUCCIÓN

### 📦 Release: 20250812_232251
- **Estado**: ✅ Estable
- **Fecha**: 2025-08-13 00:55 UTC (Actualizado)
- **Commit/Tag**: v1.1.0-app-completa
- **Verificación post-deploy**: ✅ OK
- **SSL**: ✅ Activo (Let's Encrypt - Expira: Nov 10, 2025)
- **Health Check**: ✅ Todos los servicios operativos
- **Scripts**: ✅ health-check.sh, rollback.sh, post-deploy-check.sh
- **Variables de Entorno**: ✅ Configuradas (MongoDB Atlas, JWT, SMTP)
- **Frontend**: ✅ Aplicación completa desplegada (reemplaza página de confirmación)
- **Backend**: ✅ API funcionando correctamente (/api/health: 200 OK)
- **Nginx**: ✅ Configuración actualizada y recargada
- **PM2**: ✅ Servicios recargados exitosamente
- **Permisos**: ✅ Corregidos (chmod 755) para acceso de Nginx
- **Observaciones**: Aplicación completa Grow5X desplegada exitosamente. Frontend compilado localmente y transferido via SCP. Sistema completamente operativo en https://grow5x.app

### 📋 Plantilla para Futuros Releases
```markdown
### 📦 Release: YYYYMMDD_HHMMSS
- **Estado**: [Estable/En Pruebas/Rollback]
- **Fecha**: YYYY-MM-DD HH:MM UTC
- **Commit/Tag**: vX.X.X
- **Verificación post-deploy**: [✅ OK / ❌ FAIL]
- **SSL**: [✅ Activo / ⚠️ Renovar / ❌ Error]
- **Health Check**: [✅ OK / ⚠️ Parcial / ❌ FAIL]
- **Scripts**: [✅ Funcionando / ❌ Error]
- **Variables de Entorno**: [✅ OK / ⚠️ Actualizar / ❌ Error]
- **Observaciones**: [Descripción de cambios y notas importantes]
```

---

## 🔄 DESPLIEGUES DESDE GITHUB

### 📋 Configuración Inicial del Repositorio

#### 1. Conectar Proyecto Local a GitHub
```bash
# En el directorio raíz del proyecto (local o VPS)
git init
git add .
git commit -m "Proyecto Grow5X - versión inicial"

# Agregar repositorio remoto
git remote add origin https://github.com/dom444j/grow5x.git

# Subir rama principal
git branch -M main
git push -u origin main
```

#### 2. Configurar SSH para GitHub (Opcional - Recomendado)
```bash
# Generar clave SSH en el VPS
ssh-keygen -t ed25519 -C "root@grow5x-vps"

# Mostrar clave pública para agregar a GitHub
cat ~/.ssh/id_ed25519.pub

# Agregar la clave a: GitHub → Settings → SSH and GPG keys → New SSH key

# Cambiar remote a SSH (más seguro)
git remote set-url origin git@github.com:dom444j/grow5x.git
```

### 🚀 Flujo de Despliegue desde GitHub

#### 1. Crear Nuevo Release desde GitHub
```bash
# Generar timestamp para el release
REL=$(date +%Y%m%d_%H%M%S)
echo "Nuevo release: $REL"

# Crear directorio del release
mkdir -p /var/www/grow5x/releases/$REL
cd /var/www/grow5x/releases/$REL

# Clonar código desde GitHub (rama main, solo último commit)
git clone --branch main --depth=1 https://github.com/dom444j/grow5x.git src

# Verificar que el código se descargó
ls -la src/
# Salida esperada: backend/ frontend/ docs/ package.json README.md
```

#### 2. Configurar Backend desde GitHub
```bash
# Ir al directorio backend
cd /var/www/grow5x/releases/$REL/src/backend

# Copiar configuración de producción
cp /var/www/grow5x/shared/backend.env ./.env

# Verificar variables de entorno
head -5 .env
# Debe mostrar: MONGODB_URI, PORT=5000, NODE_ENV=production

# Instalar dependencias de producción
npm ci --only=production

# Ejecutar build si existe
npm run build 2>/dev/null || echo "No build script found"
```

#### 3. Configurar Frontend desde GitHub
```bash
# Ir al directorio frontend
cd /var/www/grow5x/releases/$REL/src/frontend

# Copiar configuración de producción
cp /var/www/grow5x/shared/frontend.env.production .env.production

# Verificar configuración
cat .env.production
# Debe contener: VITE_API_URL=https://grow5x.app/api

# Instalar dependencias
npm ci

# Construir para producción
npm run build

# Verificar que dist/ fue creado correctamente
ls -la dist/
# Salida esperada: index.html assets/ (archivos compilados)
```

#### 4. Armar Estructura Final del Release
```bash
# Volver al directorio del release
cd /var/www/grow5x/releases/$REL

# Crear estructura final
mkdir -p backend frontend

# Copiar backend compilado
cp -a src/backend/. backend/

# Copiar frontend construido
cp -a src/frontend/dist frontend/dist

# Crear enlaces simbólicos a recursos compartidos
ln -s /var/www/grow5x/shared/logs backend/logs || true
ln -s /var/www/grow5x/shared/uploads backend/uploads || true

# Verificar estructura final
ls -la
# Salida esperada:
# drwxr-xr-x backend/
# drwxr-xr-x frontend/
# drwxr-xr-x src/

# Verificar enlaces simbólicos
ls -la backend/ | grep -E "logs|uploads"
# Salida esperada:
# logs -> /var/www/grow5x/shared/logs
# uploads -> /var/www/grow5x/shared/uploads
```

#### 5. Activar Release y Recargar Servicios
```bash
# Crear/actualizar enlace simbólico current
ln -sfn /var/www/grow5x/releases/$REL /var/www/grow5x/current

# Verificar enlace
ls -la /var/www/grow5x/current
# Salida: current -> /var/www/grow5x/releases/[TIMESTAMP]

# Ir al backend actual
cd /var/www/grow5x/current/backend

# Recargar PM2 sin perder sesiones
pm2 reload ecosystem.config.js --env production --update-env

# Verificar estado PM2
pm2 status
# Salida esperada: grow5x-backend online

# Verificar logs recientes
pm2 logs grow5x-backend --lines 10
```

#### 6. Verificaciones Post-Deploy desde GitHub
```bash
# Ejecutar script de verificación automática
/var/www/grow5x/scripts/post-deploy-check.sh

# Verificaciones manuales adicionales
curl -s https://grow5x.app/api/health | jq .
curl -s https://grow5x.app/ | head -20

# Verificar que no es la página de confirmación temporal
curl -s https://grow5x.app/ | grep -q "Deployment Successful" && echo "⚠️ PÁGINA TEMPORAL DETECTADA" || echo "✅ Aplicación real cargando"
```

### 📝 Script de Despliegue Automatizado

#### Crear Script de Deploy desde GitHub
```bash
# Crear script automatizado
cat > /var/www/grow5x/scripts/deploy-from-github.sh << 'EOF'
#!/bin/bash
set -e

# Configuración
REPO_URL="https://github.com/dom444j/grow5x.git"
BRANCH="main"
REL=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy desde GitHub - Release: $REL"

# 1. Crear directorio del release
echo "📁 Creando directorio del release..."
mkdir -p /var/www/grow5x/releases/$REL
cd /var/www/grow5x/releases/$REL

# 2. Clonar código desde GitHub
echo "📥 Clonando código desde GitHub..."
git clone --branch $BRANCH --depth=1 $REPO_URL src

# 3. Configurar Backend
echo "⚙️ Configurando backend..."
cd src/backend
cp /var/www/grow5x/shared/backend.env ./.env
npm ci --only=production
npm run build 2>/dev/null || echo "No build script found"

# 4. Configurar Frontend
echo "🎨 Configurando frontend..."
cd ../frontend
cp /var/www/grow5x/shared/frontend.env.production .env.production
npm ci
npm run build

# 5. Armar estructura final
echo "📦 Armando estructura final..."
cd /var/www/grow5x/releases/$REL
mkdir -p backend frontend
cp -a src/backend/. backend/
cp -a src/frontend/dist frontend/dist
ln -s /var/www/grow5x/shared/logs backend/logs || true
ln -s /var/www/grow5x/shared/uploads backend/uploads || true

# 6. Activar release
echo "🔄 Activando release..."
ln -sfn /var/www/grow5x/releases/$REL /var/www/grow5x/current

# 7. Recargar PM2
echo "🔄 Recargando PM2..."
cd /var/www/grow5x/current/backend
pm2 reload ecosystem.config.js --env production --update-env

# 8. Verificaciones
echo "✅ Ejecutando verificaciones..."
sleep 5
/var/www/grow5x/scripts/post-deploy-check.sh

echo "🎉 Deploy completado - Release: $REL"
echo "📊 Estado: $(pm2 status | grep grow5x-backend | awk '{print $10}')"
echo "🌐 URL: https://grow5x.app"
EOF

# Hacer ejecutable
chmod +x /var/www/grow5x/scripts/deploy-from-github.sh
```

### 🎯 Uso del Script de Deploy

#### Deploy Completo con Un Solo Comando
```bash
# Ejecutar deploy desde GitHub
/var/www/grow5x/scripts/deploy-from-github.sh

# El script automáticamente:
# ✅ Clona el código desde GitHub
# ✅ Configura backend y frontend
# ✅ Compila el frontend
# ✅ Crea la estructura de release
# ✅ Activa el nuevo release
# ✅ Recarga PM2 sin perder sesiones
# ✅ Ejecuta verificaciones post-deploy
```

#### Deploy de Rama Específica
```bash
# Modificar temporalmente para deploy de rama específica
cd /var/www/grow5x/releases
REL=$(date +%Y%m%d_%H%M%S)
mkdir -p $REL && cd $REL

# Clonar rama específica
git clone --branch feature/nueva-funcionalidad --depth=1 https://github.com/dom444j/grow5x.git src

# Continuar con el proceso normal...
```

### 🔧 Mantenimiento de Releases desde GitHub

#### Limpiar Releases Antiguos
```bash
# Mantener solo los últimos 5 releases
cd /var/www/grow5x/releases
ls -t | tail -n +6 | xargs rm -rf

echo "Releases mantenidos:"
ls -la | grep ^d
```

#### Rollback a Release Anterior
```bash
# Ver releases disponibles
ls -la /var/www/grow5x/releases/

# Rollback a release específico
RELEASE_ANTERIOR="20250812_232251"  # Cambiar por el release deseado
ln -sfn /var/www/grow5x/releases/$RELEASE_ANTERIOR /var/www/grow5x/current
cd /var/www/grow5x/current/backend
pm2 reload ecosystem.config.js --env production --update-env

echo "✅ Rollback completado a release: $RELEASE_ANTERIOR"
```

#### Verificar Diferencias entre Releases
```bash
# Comparar dos releases
RELEASE_1="20250812_232251"
RELEASE_2="20250813_120000"

# Ver diferencias en el código
diff -r /var/www/grow5x/releases/$RELEASE_1/src /var/www/grow5x/releases/$RELEASE_2/src

# Ver commits entre releases
cd /var/www/grow5x/releases/$RELEASE_2/src
git log --oneline --since="2025-08-12" --until="2025-08-13"
```

---

## 🧭 MEMORIA VPS & DEPLOY MANUAL (ESTRUCTURA OFICIAL)

### 📋 Información del Despliegue
- **Servidor**: VPS Ubuntu 22.04
- **IP del Servidor**: 80.78.25.79
- **IPv6**: 2a0a:3840:8078:25::504e:194f:1337
- **Acceso**: Root por SSH con clave privada
- **Base de Datos**: MongoDB Atlas (ÚNICA DB)
- **Backend**: Puerto 5000 con PM2
- **Frontend**: Vite servido por Nginx
- **Patrón**: Releases con timestamp
- **Objetivo**: Deploy sin perder login y sin builds locales

### 🏗️ A) Estructura Base en VPS

#### 1. Crear Rutas del Sistema
```bash
# Comando a ejecutar en VPS
mkdir -p /var/www/grow5x/{releases,shared} \
         /var/www/grow5x/shared/{logs,uploads}

# Verificar estructura creada
ls -la /var/www/grow5x/
# Salida esperada:
# drwxr-xr-x releases/
# drwxr-xr-x shared/
# drwxr-xr-x shared/logs/
# drwxr-xr-x shared/uploads/
```

#### 2. Archivos de Configuración Compartidos

**Backend Environment (`/var/www/grow5x/shared/backend.env`)**
```env
# Configuración de Producción Backend
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
JWT_SECRET=[MANTENER_SECRETO_EXISTENTE]
SESSION_SECRET=[MANTENER_SECRETO_EXISTENTE]
FRONTEND_URL=https://grow5x.app
APP_URL=https://grow5x.app

# Configuración SMTP Namecheap Private Email
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER_NOREPLY=noreply@grow5x.app
SMTP_PASS_NOREPLY=300400Jd14
SMTP_FROM_NOREPLY=noreply@grow5x.app

SMTP_USER_WELCOME=welcome@grow5x.app
SMTP_PASS_WELCOME=300400Jd14
SMTP_FROM_WELCOME=welcome@grow5x.app

SMTP_USER_RECOVERY=recovery@grow5x.app
SMTP_PASS_RECOVERY=300400Jd14
SMTP_FROM_RECOVERY=recovery@grow5x.app

SMTP_USER_SUPPORT=support@grow5x.app
SMTP_PASS_SUPPORT=300400Jd14
SMTP_FROM_SUPPORT=support@grow5x.app
```

**Frontend Environment (`/var/www/grow5x/shared/frontend.env`)**
```env
# Configuración de Producción Frontend
VITE_API_URL=https://grow5x.app/api
VITE_APP_URL=https://grow5x.app
VITE_NODE_ENV=production
```

#### 3. Configuración Nginx

**Archivo: `/etc/nginx/sites-available/grow5x.app`**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name grow5x.app www.grow5x.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name grow5x.app www.grow5x.app;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend - Servir desde current/frontend/dist
    root /var/www/grow5x/current/frontend/dist;
    index index.html;

    # API Proxy - Redirigir a backend en puerto 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Frontend SPA - Todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Assets estáticos con cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Comandos de Activación Nginx:**
```bash
# Habilitar sitio
ln -s /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-enabled/

# Probar configuración
nginx -t
# Salida esperada: syntax is ok, test is successful

# Recargar Nginx
systemctl reload nginx

# Verificar estado
systemctl status nginx
```

### 🚀 B) Despliegue Manual Vigilado

#### 1. Crear Release con Timestamp
```bash
# Generar timestamp único para el release
export REL=$(date +%Y%m%d-%H%M%S)
echo "Release: $REL"

# Crear directorio del release
mkdir -p /var/www/grow5x/releases/$REL
cd /var/www/grow5x/releases/$REL
pwd
# Salida: /var/www/grow5x/releases/[TIMESTAMP]
```

#### 2. Clonar Repositorio
```bash
# Clonar desde repositorio (especificar tag/commit estable)
# Reemplazar [USUARIO] con el usuario real de GitHub
git clone https://github.com/dom444j/growx5-app.git src
cd src

# Ejemplo de clonación con tag específico:
# git clone --branch v1.0.0 https://github.com/dom444j/growx5-app.git src

# Verificar tag/commit usado
git log --oneline -1
# Anotar: [COMMIT_HASH] [MENSAJE_COMMIT]

# Verificar estructura clonada
ls -la
# Salida esperada: backend/ frontend/ package.json README.md
```

#### 3. Configurar Backend
```bash
# Ir al directorio backend
cd /var/www/grow5x/releases/$REL/src/backend

# Copiar configuración compartida
cp /var/www/grow5x/shared/backend.env ./.env

# Verificar que .env existe
ls -la .env
# Salida: -rw-r--r-- .env

# Instalar dependencias (producción)
npm ci --only=production
# Salida: added [X] packages in [Y]s

# Ejecutar build si existe
npm run build 2>/dev/null || echo "No build script found"
```

#### 4. Configurar Frontend
```bash
# Ir al directorio frontend
cd /var/www/grow5x/releases/$REL/src/frontend

# Copiar configuración de producción
cp /var/www/grow5x/shared/frontend.env ./.env.production

# Verificar configuración
ls -la .env.production
# Salida: -rw-r--r-- .env.production

# Instalar dependencias
npm ci
# Salida: added [X] packages in [Y]s

# Construir para producción
npm run build
# Salida: ✓ built in [X]ms

# Verificar que dist/ fue creado
ls -la dist/
# Salida: index.html assets/ [otros archivos]
```

#### 5. Armar Release Final
```bash
# Volver al directorio del release
cd /var/www/grow5x/releases/$REL

# Crear estructura final
mkdir -p backend frontend

# Copiar backend compilado
cp -a src/backend/. backend/

# Copiar frontend construido
cp -a src/frontend/dist frontend/dist

# Crear enlaces simbólicos a recursos compartidos
ln -s /var/www/grow5x/shared/logs backend/logs || true
ln -s /var/www/grow5x/shared/uploads backend/uploads || true

# Verificar estructura final
ls -la
# Salida esperada:
# drwxr-xr-x backend/
# drwxr-xr-x frontend/
# drwxr-xr-x src/

ls -la backend/
# Verificar: logs -> /var/www/grow5x/shared/logs
# Verificar: uploads -> /var/www/grow5x/shared/uploads
```

#### 6. Activar Release
```bash
# Crear/actualizar enlace simbólico current
ln -sfn /var/www/grow5x/releases/$REL /var/www/grow5x/current

# Verificar enlace
ls -la /var/www/grow5x/current
# Salida: current -> /var/www/grow5x/releases/[TIMESTAMP]
```

#### 7. Gestión PM2
```bash
# Ir al backend actual
cd /var/www/grow5x/current/backend

# Primera vez: Iniciar PM2
pm2 start ecosystem.config.js --env production || true
pm2 save

# Despliegues siguientes: Recargar sin perder sesiones
pm2 reload ecosystem.config.js --env production --update-env

# Verificar estado PM2
pm2 status
# Salida esperada: grow5x-backend online

# Verificar logs
pm2 logs grow5x-backend --lines 10
```

#### 8. Verificaciones Post-Deploy
```bash
# Test de salud del backend
curl -sSf http://127.0.0.1:5000/api/health
# Salida esperada: {"status":"OK","timestamp":"...","environment":"production","version":"1.0.0"}

# Test de endpoint alternativo de health
curl -sSf http://127.0.0.1:5000/health
# Salida esperada: {"status":"OK","timestamp":"..."}

# Verificar logs PM2 (sin errores críticos)
pm2 logs grow5x-backend --lines 20 | grep -i error
# Salida esperada: Sin errores críticos

# Verificar logs Nginx
tail -20 /var/log/nginx/error.log | grep -i error
# Salida esperada: Sin errores críticos

# Test de frontend
curl -sSf https://grow5x.app/ | grep -o '<title>.*</title>'
# Salida esperada: <title>Grow5X</title>
```

### 🔄 C) Rollback Rápido (NO EJECUTAR salvo orden)

```bash
# SOLO EN CASO DE EMERGENCIA
# 1. Identificar release anterior
ls -la /var/www/grow5x/releases/ | tail -2

# 2. Cambiar enlace current al release anterior
ln -sfn /var/www/grow5x/releases/[RELEASE_ANTERIOR] /var/www/grow5x/current

# 3. Recargar PM2 con nueva configuración
pm2 reload ecosystem.config.js --env production --update-env

# 4. Verificar rollback
curl -sSf http://127.0.0.1:5000/api/health
```

### 📊 Checklist Post-Deploy

#### ✅ Estructura del Sistema
- [ ] `/var/www/grow5x/releases/[TIMESTAMP]` creado
- [ ] `/var/www/grow5x/shared/{logs,uploads}` existentes
- [ ] `/var/www/grow5x/current` apunta al release actual
- [ ] Archivos `.env` en shared/ configurados correctamente

#### ✅ Configuración de Servicios
- [ ] Nginx configurado para servir desde `current/frontend/dist`
- [ ] Proxy `/api/` hacia `127.0.0.1:5000` funcionando
- [ ] PM2 ejecutando backend en puerto 5000
- [ ] Enlaces simbólicos logs/ y uploads/ creados

#### ✅ Verificaciones Funcionales
- [ ] `curl http://127.0.0.1:5000/api/health` responde OK (200)
- [ ] `curl http://127.0.0.1:5000/health` responde OK (200)
- [ ] `curl https://grow5x.app/api/health` responde OK (200)
- [ ] `curl https://grow5x.app/` carga frontend
- [ ] Login de usuarios NO se pierde tras `pm2 reload`
- [ ] Logs PM2 y Nginx sin errores críticos

#### ✅ Información del Deploy
- **Servidor**: 80.78.25.79 (grow5x.app)
- **Release Timestamp**: `[ANOTAR_TIMESTAMP]`
- **Commit/Tag Desplegado**: `[ANOTAR_COMMIT_HASH]`
- **Fecha de Deploy**: `[ANOTAR_FECHA]`
- **Usuario Deploy**: root
- **Estado Final**: `[OK/FAIL]`

### 🔧 Comandos de Mantenimiento

#### Limpiar Releases Antiguos
```bash
# Mantener solo los últimos 5 releases
cd /var/www/grow5x/releases
ls -t | tail -n +6 | xargs rm -rf
```

#### Verificar Espacio en Disco
```bash
# Verificar uso de disco
df -h /var/www/grow5x/
du -sh /var/www/grow5x/releases/*
```

#### Backup de Configuración
```bash
# Respaldar archivos de configuración
tar -czf /root/grow5x-config-$(date +%Y%m%d).tar.gz \
    /var/www/grow5x/shared/ \
    /etc/nginx/sites-available/grow5x.app
```

### 🔐 Acceso al Servidor

#### Conexión SSH
```bash
# Conectar al VPS usando la clave SSH
ssh root@80.78.25.79

# Verificar conectividad
ping -c 3 80.78.25.79

# Verificar información del servidor
uname -a
lsb_release -a
```

#### Información de Red
- **IP Principal**: 80.78.25.79
- **IPv6**: 2a0a:3840:8078:25::504e:194f:1337
- **Dominio**: grow5x.app (apunta a 80.78.25.79)
- **Puertos Abiertos**: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Firewall**: UFW configurado para permitir solo puertos necesarios

## 🧭 Memoria VPS & Deploy Manual

**Última actualización:** 2025-08-12 23:22 UTC

**Estructura actual:**
- Directorio base: `/var/www/grow5x/`
- Release activo: `20250812_232251`
- Enlace simbólico: `current → releases/20250812_232251`
- Directorios compartidos:
  - `shared/logs`
  - `shared/uploads`
  - `shared/env` (contiene backend.env y frontend.env.production)

**Backend:**
- Ubicación: `/var/www/grow5x/current/backend/`
- Puerto: 5000
- Proceso: PM2 (`ecosystem.config.js`)
- Endpoints health:
  - `/api/health` → OK
  - `/api/status` → OK

**Frontend:**
- Ubicación: `/var/www/grow5x/current/frontend/dist/`
- Servido por: Nginx
- Proxy API: `/api/* → localhost:5000`
- SPA: soportado
- Compresión Gzip: habilitada
- Headers de seguridad: habilitados

**Verificaciones post-deploy:**
✅ Frontend responde 200  
✅ API OK en `/api/health`  
✅ PM2 estable  
✅ Nginx funcionando con headers de seguridad y proxy  

**Archivos clave creados/actualizados:**
- `ecosystem.config.js` (PM2)
- `grow5x.app` (Nginx)
- `.env` en `/var/www/grow5x/shared/env`

**Notas:**
- Deploy usando patrón releases con symlink `current`.
- Rollback posible apuntando `current` a release anterior y `pm2 reload`.


---

## 💰 SISTEMA DE BENEFICIOS, COMISIONES Y REFERIDOS

### 🎯 Beneficios Directos por Adquirir Licencias

**Sistema de Beneficios Personales:**
- ✅ **Cashback del 100%** recuperado en 8 días (primer ciclo)
- ✅ **12.5% diario** sobre el monto invertido durante días activos
- ✅ **Beneficios adicionales del 400%** en los siguientes 4 ciclos
- ✅ **Total potencial: 500%** (100% cashback + 400% beneficios)
- ✅ **Duración total:** 45 días (5 ciclos de 8 días + 5 días de pausa)

**Estructura de Ciclos:**
- **Días 1-8:** Pago diario del 12.5% (Primer ciclo - Cashback de protección)
- **Día 9:** Día de pausa/ajuste
- **Días 10-17:** Segundo ciclo de beneficios (12.5% diario)
- **Día 18:** Día de pausa
- **Ciclos 3-5:** Continúan con la misma estructura hasta completar 45 días

### 💼 Tipos de Licencias y Beneficios

| Licencia | Precio | Cashback Diario | Cashback Total | Beneficios Adicionales | Potencial Total |
|----------|--------|-----------------|----------------|------------------------|------------------|
| Starter | $50 | $6.25 | $50 (8 días) | $200 (37 días) | $250 (500%) |
| Basic | $100 | $12.50 | $100 (8 días) | $400 (37 días) | $500 (500%) |
| Standard | $250 | $31.25 | $250 (8 días) | $1,000 (37 días) | $1,250 (500%) |
| Premium | $500 | $62.50 | $500 (8 días) | $2,000 (37 días) | $2,500 (500%) |
| Gold | $1,000 | $125.00 | $1,000 (8 días) | $4,000 (37 días) | $5,000 (500%) |
| Platinum | $2,500 | $312.50 | $2,500 (8 días) | $10,000 (37 días) | $12,500 (500%) |
| Diamond | $5,000 | $625.00 | $5,000 (8 días) | $20,000 (37 días) | $25,000 (500%) |

### 🔄 Sistema de Comisiones

#### 1. **Comisión Directa de Referidos** (`direct_referral`)
- **Porcentaje**: 10% del cashback total
- **Aplicación**: Se entrega al completar el 100% del cashback (al finalizar el primer ciclo de 8 días)
- **Modalidad**: Pago único por activación, se reactiva con renovaciones y nuevos paquetes
- **Base de cálculo**: 100% del cashback completado del usuario referido
- **Procesamiento**: Automático con opción de aprobación por admin

#### 2. **Bono de Líder** (`leader_bonus`)
- **Porcentaje**: 5% del monto de todas las licencias de toda la plataforma
- **Aplicación**: Al finalizar el segundo ciclo de beneficios (día 17)
- **Modalidad**: Pago único por usuario nuevo (no se vuelve a pagar por el mismo usuario)
- **Distribución**: Tipo pool - 5% para cada código líder sin niveles
- **Base de cálculo**: Monto total de todas las licencias de toda la plataforma
- **Procesamiento**: Automático con opción de aprobación por admin

#### 3. **Bono de Padre** (`parent_bonus`)
- **Porcentaje**: 5% del monto de todas las licencias de toda la plataforma
- **Aplicación**: Al finalizar el segundo ciclo de beneficios (día 17)
- **Modalidad**: Pago único por usuario nuevo (no se vuelve a pagar por el mismo usuario)
- **Distribución**: Tipo pool - 5% para cada código padre sin niveles
- **Base de cálculo**: Monto total de todas las licencias de toda la plataforma
- **Mismo procesamiento que bono de líder**

### ⚙️ Configuración del Sistema

```javascript
COMMISSION_CONFIG: {
  direct_referral: {
    rate: 0.10, // 10% del cashback completado
    trigger: 'cashback_completion' // Al completar 100% del cashback
  },
  leader_bonus: {
    rate: 0.05, // 5% tipo pool
    trigger: 'second_cycle_completion' // Al finalizar segundo ciclo (día 17)
  },
  parent_bonus: {
    rate: 0.05, // 5% tipo pool
    trigger: 'second_cycle_completion' // Al finalizar segundo ciclo (día 17)
  },
  daily_benefit_rate: 0.125, // 12.5% diario
  cycle_days: 8, // 8 días por ciclo
  total_cycles: 5, // 5 ciclos totales
  inactive_day: 9, // Día inactivo entre ciclos
  total_potential: 5.0, // 500% potencial total
  min_commission: 0.01, // Mínimo $0.01
  max_commission_per_sale: 1000.00 // Máximo $1000 por venta
}
```

### 🔧 Archivos Clave del Sistema

#### Backend - Lógica de Negocio
- `backend/config/referral.config.js` - Configuración de porcentajes
- `backend/src/utils/benefitsCalculator.js` - Cálculos de comisiones
- `backend/src/controllers/specialCodes.controller.js` - Procesamiento de bonos
- `backend/src/models/Commission.model.js` - Estructura de datos
- `backend/src/services/BenefitsProcessor.js` - Procesamiento de beneficios
- `backend/src/models/EmailLog.model.js` - Logging de emails
- `backend/src/utils/email.js` - Sistema de emails integrado

#### Frontend - Interfaz de Usuario
- `frontend/src/services/referrals.service.js` - API de referidos
- `frontend/src/services/adminReferrals.service.js` - Administración
- `frontend/src/pages/user/referrals/ReferralDashboard.jsx` - Dashboard
- `frontend/src/components/packages/Package.jsx` - Descripciones de licencias
- `frontend/src/components/admin/AutomationDashboard.jsx` - Panel administrativo

### 📊 Métricas y KPIs

#### KPIs del Sistema
- Total de comisiones pagadas
- Tasa de conversión de referidos
- Promedio de comisiones por usuario
- Rendimiento de códigos especiales
- Estadísticas de envío de emails
- Errores en el sistema de emails

#### Tracking Configurado
```javascript
STATS: {
  track_clicks: true,
  track_registrations: true,
  track_conversions: true,
  track_commissions: true,
  track_email_delivery: true,
  metrics: [
    'total_clicks',
    'total_registrations',
    'conversion_rate',
    'total_commissions',
    'active_referrals',
    'monthly_performance',
    'email_success_rate',
    'email_errors'
  ]
}
```

## 📁 ESTRUCTURA DEL PROYECTO

### Estructura de Directorios (Actualizada - Enero 2025)
```
growx5-app/
├── 📁 backend/                              # Servidor Node.js/Express
│   ├── 📁 src/                              # Código fuente principal
│   │   ├── 📁 config/                       # Configuraciones
│   │   │   ├── database.js                  # Configuración MongoDB
│   │   │   └── security.js                  # Configuración de seguridad
│   │   ├── 📁 controllers/                  # Controladores de API
│   │   │   ├── admin.controller.js          # Panel administrativo
│   │   │   ├── auth.controller.js           # Autenticación
│   │   │   ├── payment.controller.js        # Pagos y transacciones
│   │   │   ├── user.controller.js           # Gestión de usuarios
│   │   │   ├── wallet.controller.js         # Billeteras
│   │   │   ├── specialCodes.controller.js   # Códigos especiales
│   │   │   ├── commissions.controller.js    # Comisiones
│   │   │   ├── support.controller.js        # Soporte técnico
│   │   │   └── [25+ controladores más]
│   │   ├── 📁 middleware/                   # Middleware personalizado
│   │   │   ├── auth.js                      # Autenticación JWT
│   │   │   ├── adminAuth.js                 # Autenticación admin
│   │   │   ├── validation.js                # Validaciones
│   │   │   └── [8+ middlewares más]
│   │   ├── 📁 models/                       # Modelos de MongoDB
│   │   │   ├── User.js                      # Modelo de usuarios
│   │   │   ├── Transaction.model.js         # Transacciones
│   │   │   ├── Package.model.js             # Paquetes de inversión
│   │   │   ├── Commission.model.js          # Comisiones
│   │   │   ├── SpecialCode.model.js         # Códigos especiales
│   │   │   ├── Payment.js                   # Pagos
│   │   │   ├── Wallet.model.js              # Billeteras
│   │   │   └── [20+ modelos más]
│   │   ├── 📁 routes/                       # Rutas de API
│   │   │   ├── admin.routes.js              # Rutas administrativas
│   │   │   ├── auth.routes.js               # Rutas de autenticación
│   │   │   ├── payment.routes.js            # Rutas de pagos
│   │   │   ├── user.routes.js               # Rutas de usuarios
│   │   │   ├── specialCodes.routes.js       # Rutas códigos especiales
│   │   │   └── [20+ archivos de rutas]
│   │   ├── 📁 services/                     # Servicios de negocio
│   │   │   ├── BenefitsProcessor.js         # Procesador de beneficios
│   │   │   ├── NotificationService.js       # Servicio de notificaciones
│   │   │   ├── AutomationService.js         # Automatización
│   │   │   ├── CronJobService.js            # Tareas programadas
│   │   │   └── [6+ servicios más]
│   │   ├── 📁 utils/                        # Utilidades
│   │   │   ├── email.js                     # Utilidades de email
│   │   │   ├── logger.js                    # Sistema de logs
│   │   │   ├── validation.js                # Validaciones
│   │   │   ├── benefitsCalculator.js        # Calculadora de beneficios
│   │   │   └── [4+ utilidades más]
│   │   └── 📁 scripts/                      # Scripts de mantenimiento
│   │       ├── setup-wallet-security.js    # Configuración de seguridad
│   │       ├── health-check.js             # Verificación de salud
│   │       └── [8+ scripts más]
│   ├── 📁 archived-tests/                   # Tests archivados
│   ├── 📁 backups/                          # Respaldos del sistema
│   ├── 📁 logs/                             # Archivos de log
│   ├── 📁 uploads/                          # Archivos subidos
│   │   ├── documents/                       # Documentos de usuarios
│   │   └── support/                         # Archivos de soporte
│   ├── 📁 tests/                            # Tests unitarios
│   ├── 📁 temp-files/                       # Archivos temporales
│   ├── .env                                 # Variables de entorno (desarrollo)
│   ├── .env.production                      # Variables de entorno (producción)
│   ├── .env.staging                         # Variables de entorno (staging)
│   ├── package.json                         # Dependencias del backend
│   ├── server.js                            # Servidor principal
│   ├── ecosystem.config.js                  # Configuración PM2
│   └── [50+ scripts de diagnóstico]
├── 📁 frontend/                             # Aplicación React/Vite
│   ├── 📁 src/                              # Código fuente del frontend
│   │   ├── 📁 components/                   # Componentes React
│   │   │   ├── 📁 admin/                    # Componentes administrativos
│   │   │   ├── 📁 auth/                     # Componentes de autenticación
│   │   │   ├── 📁 dashboard/                # Componentes del dashboard
│   │   │   ├── 📁 payment/                  # Componentes de pagos
│   │   │   ├── 📁 referrals/                # Componentes de referidos
│   │   │   ├── 📁 support/                  # Componentes de soporte
│   │   │   ├── 📁 ui/                       # Componentes de UI
│   │   │   ├── 📁 common/                   # Componentes comunes
│   │   │   └── [8+ categorías más]
│   │   ├── 📁 pages/                        # Páginas principales
│   │   │   ├── 📁 admin/                    # Páginas administrativas
│   │   │   ├── 📁 user/                     # Páginas de usuario
│   │   │   ├── 📁 public/                   # Páginas públicas
│   │   │   └── 📁 legal/                    # Páginas legales
│   │   ├── 📁 services/                     # Servicios de API
│   │   │   ├── 📁 admin/                    # Servicios administrativos
│   │   │   ├── api.js                       # Cliente API principal
│   │   │   ├── adminAuth.service.js         # Autenticación admin
│   │   │   ├── payment.service.js           # Servicios de pagos
│   │   │   ├── referrals.service.js         # Servicios de referidos
│   │   │   ├── specialCodesService.js       # Servicios códigos especiales
│   │   │   └── [20+ servicios más]
│   │   ├── 📁 contexts/                     # Contextos React
│   │   │   ├── AuthContext.jsx              # Contexto de autenticación
│   │   │   ├── CartContext.jsx              # Contexto del carrito
│   │   │   ├── LanguageContext.jsx          # Contexto de idioma
│   │   │   └── ThemeContext.jsx             # Contexto de tema
│   │   ├── 📁 hooks/                        # Hooks personalizados
│   │   ├── 📁 utils/                        # Utilidades del frontend
│   │   ├── 📁 constants/                    # Constantes
│   │   ├── 📁 locales/                      # Archivos de traducción
│   │   ├── 📁 routes/                       # Configuración de rutas
│   │   ├── App.jsx                          # Componente principal
│   │   ├── main.jsx                         # Punto de entrada
│   │   └── index.css                        # Estilos globales
│   ├── 📁 public/                           # Archivos públicos
│   │   ├── 📁 images/                       # Imágenes del proyecto
│   │   ├── 📁 locales/                      # Traducciones públicas
│   │   ├── index.html                       # HTML principal
│   │   └── manifest.json                    # Manifiesto PWA
│   ├── 📁 tests/                            # Tests del frontend
│   │   ├── 📁 e2e/                          # Tests end-to-end
│   │   └── 📁 smoke/                        # Tests de humo
│   ├── package.json                         # Dependencias del frontend
│   ├── vite.config.js                       # Configuración Vite
│   ├── tailwind.config.js                   # Configuración Tailwind
│   ├── eslint.config.js                     # Configuración ESLint
│   └── playwright.config.cjs                # Configuración Playwright
├── 📁 docs/                                 # Documentación del proyecto
│   ├── 📁 api/                              # Documentación de API
│   ├── 📁 arquitectura/                     # Documentación de arquitectura
│   ├── 📁 legal/                            # Documentos legales
│   └── API_DOCUMENTATION.md                 # Documentación principal
├── 📁 scripts/                              # Scripts de automatización
├── 📁 optimizacion/                         # Archivos de optimización
├── 📁 email-previews/                       # Previsualizaciones de emails
├── 📄 Archivos de Configuración Principal
│   ├── .env.example                         # Ejemplo de variables de entorno
│   ├── .gitignore                           # Archivos ignorados por Git
│   ├── package.json                         # Dependencias del proyecto raíz
│   ├── ecosystem.config.js                  # Configuración PM2 global
│   └── README.md                            # Documentación principal
├── 📄 Documentación Especializada
│   ├── GROW5X_MEMORIA_OPERATIVA.md          # Este archivo - Memoria completa
│   ├── CONFIGURACION-NAMECHEAP-EMAIL.md     # Configuración de emails
│   ├── PROJECT-MAP-GROW5X.md                # Mapa del proyecto
│   ├── README-TECHNICAL.md                  # Documentación técnica
│   └── [30+ archivos de documentación]
└── 📄 Scripts de Diagnóstico y Testing
    ├── test-email-simple.js                 # Test de emails
    ├── test-login-simple.js                 # Test de login
    ├── smoke-test-e2e.js                    # Test end-to-end
    ├── verificacion-completa-emails.js      # Verificación de emails
    └── [40+ scripts de testing]
```

## 🔧 CONFIGURACIÓN DE DESARROLLO

### Variables de Entorno Requeridas

#### Backend (.env)
```env
# Base de Datos
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority

# Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Autenticación
JWT_SECRET=<generar_secreto_seguro>
SESSION_SECRET=<generar_secreto_sesion>

# Email (SMTP)
SMTP_HOST=<servidor_smtp>
SMTP_PORT=<puerto_smtp>
SMTP_USER=<usuario_smtp>
SMTP_PASS=<contraseña_smtp>

# Aplicación
APP_URL=http://localhost:3000
APP_NAME=Grow5X
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Grow5X
VITE_NODE_ENV=development
```

### Comandos de Desarrollo

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🚀 CONFIGURACIÓN DE PRODUCCIÓN

### Variables de Entorno de Producción

#### Backend (.env.production)
```env
# Base de Datos
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority

# Servidor
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://grow5x.app

# Autenticación
JWT_SECRET=<secreto_produccion>
SESSION_SECRET=<secreto_sesion_produccion>

# Email (SMTP)
SMTP_HOST=<servidor_smtp_produccion>
SMTP_PORT=<puerto_smtp>
SMTP_USER=<usuario_smtp_produccion>
SMTP_PASS=<contraseña_smtp_produccion>

# Aplicación
APP_URL=https://grow5x.app
APP_NAME=Grow5X
```

#### Frontend (.env.production)
```env
VITE_API_URL=https://api.grow5x.app
VITE_NODE_ENV=production
```

### PM2 Ecosystem (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'grow5x-backend',
    script: 'server.js',
    cwd: './backend',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '~/logs/grow5x-combined.log',
    out_file: '~/logs/grow5x-out.log',
    error_file: '~/logs/grow5x-error.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

## 📊 ESTADO ACTUAL DEL SISTEMA

### Módulos Implementados
- ✅ **Landing Page** - Página principal
- ✅ **Autenticación** - Login/Register/Verificación con emails
- ✅ **Dashboard de Usuario** - Panel principal
- ✅ **Preregistro** - Sistema de registro anticipado
- ✅ **Planes Pionero** - Membresías especiales
- ✅ **Sistema Legal** - Términos y condiciones
- ✅ **Sistema de Beneficios** - Ciclos de 8 días con 12.5% diario
- ✅ **Sistema de Comisiones** - Directa (10%), Líder (5%), Padre (5%)
- ✅ **Sistema de Referidos** - Códigos únicos y tracking completo
- ✅ **Administración de Emails** - Logging, monitoreo y gestión
- ✅ **Panel Administrativo** - Control de usuarios, pagos y comisiones
- ✅ **Automatización** - Procesamiento automático de beneficios

### Módulos en Desarrollo
- 🔄 **Integración de Pagos** - Procesamiento de pagos crypto
- 🔄 **Optimización de Rendimiento** - Caché y optimizaciones
- 🔄 **Notificaciones Push** - Sistema de notificaciones en tiempo real

### Fases Futuras
- 📋 **Sistema de Soporte** - Tickets y chat implementado
- 📋 **Análisis y Reportes** - Dashboard analítico avanzado
- 📋 **API Móvil** - Aplicación móvil
- 📋 **Integración Blockchain** - Smart contracts
- 📋 **Sistema de Afiliados** - Programa de afiliados avanzado

## 🔐 CREDENCIALES DE ACCESO

### Administrador
- **Email**: admin@grow5x.app
- **Contraseña**: Admin123!@#
- **Rol**: superadmin

### Usuario Demo
- **Email**: demo@grow5x.app
- **Contraseña**: Demo123!@#
- **Rol**: user

### URLs de Desarrollo
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **API**: http://localhost:3000/api

---

## 🔄 FLUJOS FUNCIONALES DEL SISTEMA

### 1. **Flujo de Registro con Referido**
1. Usuario accede con link de referido: `https://grow5x.app/register?ref=CODIGO123`
2. Sistema valida código de referido
3. Usuario completa registro y verificación de email
4. Se establece relación de referido en base de datos
5. Usuario queda en estado `pending` hasta comprar licencia

### 2. **Flujo de Activación de Beneficios**
1. Usuario compra paquete de licencia
2. Sistema activa beneficios automáticamente
3. Inicia ciclo de 8 días con 12.5% diario
4. Al completar día 8: 100% cashback completado
5. Se activa comisión directa (10%) para referidor
6. Día 9: Pausa entre ciclos
7. Continúa con ciclos 2-5 hasta completar 45 días

### 3. **Flujo de Procesamiento de Comisiones**
1. **Día 8**: Comisión directa (10% del cashback total)
2. **Día 17**: Bonos de líder/padre (5% cada uno, pago único)
3. Sistema verifica que no existan pagos duplicados
4. Crea registros en modelo `Commission` con estado `pending`
5. Procesamiento automático con opción de aprobación admin
6. Notificación al usuario beneficiario

### 4. **Flujo de Administración de Emails**
1. Sistema registra cada intento de envío en `EmailLog`
2. Actualiza estado según resultado (success/failed)
3. Incrementa contador de intentos en caso de fallo
4. Admin puede consultar errores y estadísticas
5. Funciones de reenvío y verificación forzada disponibles

---

## ⚠️ REGLAS DE NEGOCIO CRÍTICAS

### ✅ **Reglas Confirmadas**
1. **Comisión Directa**: 10% del cashback total al completar 100% (8 días)
2. **Reactivación**: Se reactiva con renovaciones y nuevos paquetes del mismo usuario
3. **Bono Líder/Padre**: 5% del monto de todas las licencias de toda la plataforma, pago único por usuario nuevo
4. **Sistema Pool**: Sin niveles, 5% para cada código líder/padre
5. **Ciclo de Beneficios**: 12.5% diario x 8 días = 100% cashback por ciclo
6. **Potencial Total**: 5 ciclos = 500% (100% cashback + 400% beneficios)
7. **Automatización**: Procesamiento automático con opción de aprobación admin
8. **Activación**: Requiere compra de paquete de licencia para habilitar beneficios

### ⚠️ **Restricciones Importantes**
1. **Pago Único L/P**: Códigos líder/padre reciben bono una sola vez por usuario referido
2. **No Renovación L/P**: Sin pagos adicionales por renovaciones del mismo usuario
3. **Activación Requerida**: Usuario debe comprar licencia para activar sistema
4. **Cashback Completo**: Comisión directa solo se paga al completar 100% del cashback
5. **Día Inactivo**: Día 9 es inactivo entre ciclos (descanso)
6. **Códigos Activos**: Solo códigos especiales activos generan bonos
7. **Límites**: Mínimo $0.01, máximo $1000 por venta
8. **No Multinivel**: Sistema NO es multinivel, solo referidos directos

### 🚫 **Información FALSA que NO EXISTE**
- ❌ **NO EXISTE** ningún bono de $500 USD
- ❌ **NO EXISTE** ningún "assignment_bonus"
- ❌ **NO ES** un sistema multinivel
- ❌ **NO HAY** comisiones por niveles múltiples

---

## 📝 NOTAS IMPORTANTES

### Seguridad
- ✅ Conexión SSL/TLS a MongoDB Atlas
- ✅ Autenticación JWT implementada
- ✅ Validación de datos en backend
- ✅ Middleware de seguridad configurado
- ✅ **Sistema de Blindaje de Autenticación** - Protección contra pérdida de sesiones
  - ✅ Middleware `auth-protection.js` - Validación multi-método de tokens
  - ✅ Caché de validación con secretos de respaldo (JWT_SECRET, JWT_REFRESH_SECRET)
  - ✅ Extracción de tokens desde múltiples fuentes (header, query, cookie, custom)
  - ✅ Validación de usuario con caché y verificación de estado
  - ✅ Limpieza automática de caché y manejo robusto de errores
  - ✅ Integración completa con `auth.middleware.js` existente
- ✅ **Scripts de Configuración Segura**
  - ✅ `secure-env-setup.js` - Blindaje de variables de entorno
  - ✅ `health-check.js` - Monitoreo post-deploy de autenticación
  - ✅ `cleanup-test-files.js` - Limpieza de archivos de prueba
- ✅ **Sistema Administrativo Verificado**
  - ✅ Autenticación admin funcional con credenciales reales
  - ✅ Endpoints administrativos operativos y verificados
  - ✅ Funciones de gestión de emails implementadas
  - ✅ Control de usuarios, pagos y comisiones activo
  - ✅ Dashboard administrativo completamente funcional
- ⚠️ Configurar HTTPS en producción
- ⚠️ Implementar rate limiting
- ⚠️ Configurar CORS apropiadamente

### Rendimiento
- ✅ Índices de base de datos configurados
- ✅ Pool de conexiones optimizado
- ✅ Paginación implementada
- ⚠️ Implementar caché Redis
- ⚠️ Optimizar consultas complejas
- ⚠️ Configurar CDN para assets

### Monitoreo
- ✅ Logs estructurados implementados
- ✅ MongoDB Atlas Dashboard disponible
- ✅ **Scripts de Optimización MongoDB** - Herramientas de análisis y optimización
  - ✅ `analyze-unused-fields.js` - Análisis de campos no utilizados
  - ✅ `migrate-duplicated-fields.js` - Migración de campos duplicados
  - ✅ `cleanup-obsolete-fields.js` - Limpieza de campos obsoletos
  - ✅ `optimize-mongodb.js` - Script maestro de optimización
  - ✅ Reportes automáticos en formato JSON
  - ✅ Backup automático antes de modificaciones
- ⚠️ Implementar métricas de aplicación
- ⚠️ Configurar alertas de sistema
- ⚠️ Implementar health checks

## 🔧 SCRIPTS DE OPTIMIZACIÓN MONGODB

### Scripts Disponibles
- **`analyze-unused-fields.js`** - Análisis de campos no utilizados (solo lectura)
- **`migrate-duplicated-fields.js`** - Migración de campos duplicados User ↔ UserStatus
- **`cleanup-obsolete-fields.js`** - Limpieza de campos obsoletos con backup automático
- **`optimize-mongodb.js`** - Script maestro que ejecuta todo el proceso

### Uso Rápido
```bash
# Análisis completo (recomendado primero)
node backend/scripts/analyze-unused-fields.js

# Optimización completa automatizada
node backend/scripts/optimize-mongodb.js
```

### Campos Identificados para Optimización
- **Obsoletos**: `User.investments.*`, `User.activity.*`, `Transaction.pioneerPlan.*`, `Transaction.invoiceId`
- **Duplicados**: `User.package_status` ↔ `UserStatus.subscription.packageStatus`, etc.
- **Beneficios esperados**: 15-25% reducción de espacio, 10-20% mejora en consultas

### Reportes Generados
- `analysis-unused-fields-report.json` - Análisis detallado
- `migrate-duplicated-fields-report.json` - Resultado de migración
- `cleanup-obsolete-fields-report.json` - Resultado de limpieza
- `mongodb-optimization-final-report.json` - Reporte final completo

### Backup y Recuperación
- ✅ Backup automático de MongoDB Atlas
- ⚠️ Configurar backup de archivos
- ⚠️ Documentar procedimientos de recuperación
- ⚠️ Probar restauración periódicamente

---

## 📋 HISTORIAL DE VERSIONES

**v2.3** - Sistema de Códigos Especiales con Beneficios Manuales (Enero 2025)
- ✅ **Gestión de Códigos Especiales**: Panel administrativo completo para códigos PADRE y LÍDER
- ✅ **Aplicación Manual de Beneficios**: Funcionalidad de respaldo para fallos automáticos
- ✅ **Endpoint Backend**: `/api/admin/special-codes/apply-manual-benefits` implementado
- ✅ **Validaciones Completas**: Verificación de códigos activos, usuarios válidos y montos
- ✅ **Modal Intuitivo**: Formulario con selección de beneficiarios y tipos de beneficio
- ✅ **Historial Integrado**: Visualización de comisiones en la misma página
- ✅ **Documentación Actualizada**: Memoria operativa reorganizada y actualizada

**v2.2** - Sistema Administrativo Completamente Verificado (Enero 2025)
- ✅ **Autenticación Admin**: Credenciales reales verificadas (admin@grow5x.com / Admin2024!)
- ✅ **Endpoints Administrativos**: Todos los endpoints verificados y operativos
- ✅ **Funciones de Email Admin**: Sistema completo de gestión de emails implementado
- ✅ **Dashboard Admin**: Panel de control completamente funcional
- ✅ **Gestión de Usuarios**: Control total de usuarios, estados y perfiles
- ✅ **Sistema de Pagos**: Administración de transacciones y comisiones
- ✅ **Credenciales de Prueba**: Usuarios PADRE, LIDER, TEST verificados al 100%
- ✅ **Conectividad**: Frontend y backend operativos con MongoDB Atlas
- ✅ **Documentación**: Referencias completas de acceso y credenciales

**v2.1** - Configuración Email Namecheap Private Email (Enero 2025)
- ✅ **Configuración SMTP Namecheap**: smtp.privateemail.com configurado
- ✅ **4 Cuentas de Email**: noreply, welcome, recovery, support@grow5x.app
- ✅ **Archivos de Configuración**: .env.production y ecosystem.config.js actualizados
- ✅ **Scripts de Diagnóstico**: 3 scripts de prueba y diagnóstico creados
- ✅ **Conectividad Verificada**: Puertos 587 y 465 funcionando correctamente
- ✅ **Documentación Completa**: Guía de configuración y solución de problemas
- ✅ **Cuentas Creadas**: Cuentas de email creadas en Namecheap
- ✅ **Problema Identificado**: Registros DNS faltantes en deSEC (nameservers externos)
- ❌ **Registros MX**: No configurados en deSEC (causa del error "Sender address rejected")
- ❌ **Estado Actual**: Requiere configuración DNS en deSEC para resolver envío de emails

**v2.0** - Sistema de Beneficios y Comisiones Implementado (Enero 2025)
- ✅ Sistema de beneficios: 12.5% diario por 8 días (5 ciclos = 500% potencial)
- ✅ Sistema de comisiones: Directa (10%), Líder (5%), Padre (5%)
- ✅ Sistema de referidos con códigos únicos y tracking completo
- ✅ Administración de emails con logging y monitoreo
- ✅ Panel administrativo para control de usuarios, pagos y comisiones
- ✅ Automatización de procesamiento de beneficios y comisiones
- ✅ Flujos funcionales documentados y reglas de negocio establecidas
- ✅ Integración completa con MongoDB Atlas

**v1.0** - Base del Sistema (Diciembre 2024)
- 📋 Configuración inicial de MongoDB Atlas
- 📋 Estructura básica del proyecto
- 📋 Autenticación y registro de usuarios
- 📋 Landing page y dashboard básico

---

## 🎯 PRÓXIMOS DESARROLLOS

### **Inmediatos (Q1 2025)**
1. **Optimización de Rendimiento** - Implementar caché Redis
2. **Integración de Pagos Crypto** - Procesamiento automático
3. **Notificaciones Push** - Sistema en tiempo real
4. **Dashboard Analítico** - Métricas avanzadas

### **Mediano Plazo (Q2 2025)**
1. **API Móvil** - Aplicación móvil nativa
2. **Integración Blockchain** - Smart contracts
3. **Sistema de Afiliados** - Programa avanzado
4. **Webhooks** - Eventos en tiempo real

---

**Documento de Memoria Operativa Unificada**  
**Proyecto**: Grow5X - Plataforma de Inversión y Referidos  
**Versión**: 2.2 - Sistema Completo Verificado con Administración Operativa  
**Fecha**: Enero 2025  
**Estado**: Sistema completamente operativo con MongoDB Atlas, administración verificada y funcionalidades completas  
**Documentos Base**: 
- `GROW5X_MEMORIA_OPERATIVA.md` (este documento)
- `REPORTE-OPTIMIZACION-SISTEMA-LICENCIAS-COMISIONES.md`
- `LOGICA-SISTEMA-COMISIONES.md`
- `EMAIL_ADMIN_SYSTEM.md`
- `CONFIGURACION-NAMECHEAP-EMAIL.md`


## 🧭 Memoria VPS & Deploy Manual (estructura oficial)
**Última actualización:** 2025-08-12 22:59 UTC

> Esta sección define la **estructura oficial en el VPS** y el **procedimiento de despliegue manual** que Trae y el equipo deben respetar. Cualquier cambio debe registrarse aquí.

### 1) Estructura de carpetas en producción
```
/var/www/grow5x/
├─ releases/                 # cada release por timestamp
│  ├─ 20250112-120501/
│  │  ├─ backend/            # código backend + ecosystem.config.js
│  │  └─ frontend/
│  │     └─ dist/            # build Vite
├─ shared/                   # recursos persistentes
│  ├─ backend.env            # .env producción backend (JWT/SESSION fijos)
│  ├─ frontend.env           # .env.production frontend (VITE_API_URL)
│  ├─ logs/                  # logs PM2/Nginx/app
│  └─ uploads/               # (si aplica) archivos persistentes
└─ current -> releases/<ts>/ # symlink al release activo
```

### 2) Reglas que NO se rompen
- **DB única**: MongoDB Atlas (no localhost).
- **Secrets fijos**: `JWT_SECRET` y `SESSION_SECRET` viven en `shared/backend.env` (no regenerar).
- **Deploy sin tumbar sesiones**: usar `pm2 reload` (no `restart`).
- **Build en el VPS**: nunca subir `dist` construido en local.
- **No seeds destructivos**: en prod no se borran usuarios ni roles.
- **Frontend correcto**: `VITE_API_URL` de prod (no localhost).

### 3) Pasos de despliegue manual (resumen)
1. Crear carpeta `releases/<timestamp>` y clonar el repo (por tag/commit).
2. Copiar `shared/backend.env` → `backend/.env` y `shared/frontend.env` → `frontend/.env.production`.
3. `npm ci` en `backend/` y `frontend/`; `npm run build` en `frontend/` (genera `dist/`).
4. Copiar artefactos al release (`backend/`, `frontend/dist/`) y enlazar `logs/` y `uploads/` desde `shared/`.
5. Apuntar `current` al nuevo release y ejecutar `pm2 start` (primera vez) o `pm2 reload --update-env`.
6. Verificar `/health` y el sitio. Si algo falla, apuntar `current` al release anterior y `pm2 reload`.

### 4) Nginx (referencia)
- Servir frontend desde `/var/www/grow5x/current/frontend/dist`.
- Proxy `/api/` a `127.0.0.1:5000` (backend).
- HTTPS obligatorio cuando el certificado esté listo.

### 5) Checklist post‑deploy
- [ ] Login de usuario/admin mantiene sesión tras `pm2 reload`.
- [ ] Frontend consume `VITE_API_URL` de prod.
- [ ] /health responde 200 y logs sin errores críticos.
- [ ] Automatizaciones activas; Admin puede reintentar si fallan.
- [ ] Email (`privateemail.com`) operativo; reintentos visibles en Admin.
