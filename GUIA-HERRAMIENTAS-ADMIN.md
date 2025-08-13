# 🛠️ Guía de Herramientas de Administración Manual - Grow5X

## ✅ Estado Actual del Sistema

**Frontend actualizado:** ✅ Publicado el 2025-08-11 15:41:44  
**Backend funcionando:** ✅ API disponible  
**Nginx configurado:** ✅ Proxy funcionando correctamente  
**Botón "Verificar Usuario":** ✅ Disponible en producción  

---

## 🎯 Acceso al Panel de Administración

1. **Abrir en navegador (modo incógnito recomendado):**
   ```
   https://grow5x.app/admin/login
   ```

2. **Hacer login con credenciales de administrador**

3. **Ir a "Gestión de Usuarios"**

4. **El botón "Verificar Usuario" aparecerá para usuarios que:**
   - Status = 'pending', 'inactive' o 'Pendiente'
   - No están verificados (`verification.isVerified = false`)
   - No tienen `emailVerified = true`

---

## 🔧 Herramientas de Gestión Manual

### 1. Script de Herramientas Administrativas

**Archivo:** `manual-admin-tools.js`

#### Activar Usuario Manualmente
```bash
node manual-admin-tools.js activate-user <userId>
```
**Efecto:** `emailVerified=true`, `status='active'`, `verification.isVerified=true`

#### Asignar Paquete/Licencia
```bash
node manual-admin-tools.js assign-package <userId> [packageSlug] [amount]
```
**Ejemplo:**
```bash
node manual-admin-tools.js assign-package 66b8f123456789abcdef0001 starter 100
```
**Efecto:** Crea `Purchase` + activa `License` asociada

#### Crear Comisión Directa
```bash
node manual-admin-tools.js create-commission <sponsorId> <fromUserId> <purchaseId> [amount] [percentage]
```
**Ejemplo:**
```bash
node manual-admin-tools.js create-commission 66b8f123456789abcdef0002 66b8f123456789abcdef0001 66b8f123456789abcdef0003 10 10
```
**Efecto:** Crea `Commission` type `direct_referral`

#### Listar Usuarios que Necesitan Atención
```bash
node manual-admin-tools.js list-attention
```

---

## 🚨 Soluciones de Emergencia (MongoDB Directo)

Si necesitas hacer cambios **inmediatos** sin esperar a la UI:

### Activar Usuario
```javascript
// Conectar a MongoDB
mongosh "$MONGODB_URI" --quiet --eval '
db.users.updateOne(
  {_id:ObjectId("USER_ID")},
  {$set:{
    emailVerified:true,
    status:"active",
    "verification.isVerified":true,
    "verification.verifiedAt":new Date(),
    updatedAt:new Date()
  }}
)'
```

### Asignar Compra/Paquete Básico
```javascript
mongosh "$MONGODB_URI" --quiet --eval '
db.purchases.insertOne({
  userId:ObjectId("USER_ID"),
  productId:ObjectId("PACKAGE_ID"),
  amount:100,
  paymentMethod:"manual",
  status:"completed",
  createdAt:new Date()
})'
```

### Crear Comisión Directa
```javascript
mongosh "$MONGODB_URI" --quiet --eval '
db.commissions.insertOne({
  userId:ObjectId("SPONSOR_ID"),
  fromUserId:ObjectId("REFERRED_ID"),
  commissionType:"direct_referral",
  amount:10,
  currency:"USDT",
  status:"pending",
  purchaseId:ObjectId("PURCHASE_ID"),
  metadata:{percentage:10, baseAmount:100}
})'
```

---

## 🔍 Verificación del Sistema

### Script de Verificación
```bash
node verify-frontend-update.js
```

### Verificación Manual del Endpoint
```powershell
Invoke-WebRequest -Uri "https://grow5x.app/api/admin/users/test/verify" -Method POST -Headers @{"Authorization"="Bearer test"}
```
**Respuesta esperada:** `401 Unauthorized` (confirma que el endpoint existe)

### Verificar Salud del Backend
```powershell
Invoke-WebRequest -Uri "https://grow5x.app/api/health" -Method GET
```
**Respuesta esperada:** `{"status":"OK"}`

---

## 📋 Checklist de Publicación de Frontend (Sin Afectar Backend)

1. **Construir frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Publicar solo el dist:**
   ```bash
   scp -r dist/* root@grow5x.app:/var/www/grow5x/frontend/dist/
   ```

3. **Forzar cache-bust:**
   ```bash
   ssh root@grow5x.app "date +%F-%T | tee /var/www/grow5x/frontend/dist/version.txt && nginx -t && systemctl reload nginx"
   ```

4. **Verificar en navegador (Ctrl+F5 o modo incógnito)**

> ⚠️ **IMPORTANTE:** Esto **NO** reinicia PM2, **NO** toca el backend, **NO** rompe sesiones activas.

---

## 🎯 Endpoints de Admin Disponibles

- `POST /api/admin/users/:id/verify` - Verificar usuario
- `GET /api/admin/users` - Listar usuarios
- `PATCH /api/admin/users/:id` - Actualizar usuario
- `GET /api/health` - Salud del sistema

---

## 🆘 Contacto de Emergencia

Si algo falla:
1. **Backend sigue funcionando** (no se tocó)
2. **Login de admin sigue activo**
3. **Usar herramientas manuales** de este documento
4. **Verificar logs:** `ssh root@grow5x.app "pm2 logs grow5x-backend"`

---

**Última actualización:** 2025-08-11 15:41:44  
**Estado:** ✅ Operacional