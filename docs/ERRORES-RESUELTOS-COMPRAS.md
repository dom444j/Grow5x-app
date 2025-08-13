# Errores Resueltos - Sistema de Compras

## Fecha: 2024

### Error 1: Validación de Tipo de Transacción

**Problema:**
- Error 500 al intentar realizar compras de paquetes
- Mensaje: `ValidationError: Transaction validation failed: type: 'package_purchase' is not a valid enum value for path 'type'`

**Causa:**
- El enum de tipos válidos en `Transaction.model.js` no incluía `package_purchase`
- Solo tenía valores como `deposit`, `withdrawal`, `commission`, etc.

**Solución:**
- Agregado `package_purchase` al enum de tipos válidos en `Transaction.model.js`
- Línea modificada: `type: { type: String, enum: ['deposit', 'withdrawal', 'commission', 'bonus', 'purchase', 'package_purchase'], required: true }`

**Archivo afectado:**
- `backend/src/models/Transaction.model.js`

---

### Error 2: Acceso a Propiedades Indefinidas en Transacciones

**Problema:**
- Error 500 al crear transacciones de compra
- Mensaje: `Cannot read properties of undefined (reading 'walletAddress')`
- Ocurría en la línea 293 de `purchases.controller.js`

**Causa:**
- El objeto `transaction` no tenía la propiedad `paymentDetails` definida
- Se intentaba acceder a `transaction.paymentDetails.walletAddress` y `transaction.paymentDetails.network`
- Inconsistencia entre la estructura del objeto creado y el esquema del modelo

**Solución:**
- Reestructurado el objeto `transaction` para usar `payment` en lugar de `paymentDetails`
- Definidas variables `paymentWalletAddress` y `paymentNetwork` antes de crear la transacción
- Actualizada la respuesta JSON para usar `transaction.payment.address` y `transaction.payment.network`

**Cambios realizados:**
```javascript
// Antes:
paymentDetails: {
  walletAddress: process.env.PAYMENT_WALLET_ADDRESS || 'TBD',
  network: 'BSC'
}

// Después:
payment: {
  method: 'crypto',
  address: paymentWalletAddress,
  network: paymentNetwork,
  confirmations: 0
}
```

**Archivo afectado:**
- `backend/src/controllers/purchases.controller.js`

---

### Error 3: TypeError en PackagesSection - Map sobre Undefined

**Problema:**
- Error en frontend: `TypeError: Cannot read properties of undefined (reading 'map')`
- Ocurría en `PackagesSection.jsx` líneas 70 y 97
- Función `applyTranslations` intentaba mapear sobre un array indefinido

**Causa:**
- La función `applyTranslations` no validaba si el parámetro `packages` era un array válido
- Las llamadas a la función no manejaban casos donde la API devolviera datos indefinidos o nulos
- Falta de manejo defensivo de datos

**Solución:**
- Agregada validación en `applyTranslations` para asegurar que `packages` sea un array
- Implementado operador de coalescencia nula (`|| []`) en todas las llamadas
- Manejo defensivo para evitar errores con datos inesperados

**Cambios realizados:**
```javascript
// Función applyTranslations modificada:
const applyTranslations = (packages) => {
  if (!Array.isArray(packages)) {
    return [];
  }
  // ... resto de la función
};

// Llamadas protegidas:
const translatedPackages = applyTranslations(availablePackages) || [];
const translatedUserPackages = applyTranslations(userPackages) || [];
```

**Archivo afectado:**
- `frontend/src/components/dashboard/PackagesSection.jsx`

---

## Pasos para Reproducir Errores (si vuelven a ocurrir)

### Error de Validación de Transacción:
1. Intentar realizar una compra de paquete
2. Verificar logs del backend para mensaje de validación
3. Revisar enum en `Transaction.model.js`

### Error de Propiedades Indefinidas:
1. Intentar realizar una compra
2. Verificar estructura del objeto `transaction` en `purchases.controller.js`
3. Asegurar que coincida con el esquema del modelo

### Error de Map en Frontend:
1. Navegar a la sección de paquetes
2. Verificar consola del navegador para errores de TypeError
3. Revisar función `applyTranslations` y sus llamadas

## Notas Importantes

- Siempre reiniciar el servidor backend después de cambios en modelos
- Verificar que las estructuras de datos coincidan entre controladores y modelos
- Implementar validación defensiva en el frontend para datos de API
- Usar operadores de coalescencia nula para prevenir errores con datos indefinidos

## Archivos Críticos para Monitorear

- `backend/src/models/Transaction.model.js` - Esquemas y validaciones
- `backend/src/controllers/purchases.controller.js` - Lógica de compras
- `frontend/src/components/dashboard/PackagesSection.jsx` - Interfaz de paquetes

---

### Error 4: Ruta de Notificaciones No Encontrada

**Problema:**
- Error 404 al intentar crear notificaciones desde el frontend
- Mensaje: `POST http://localhost:3000/api/user/notifications 404 (Not Found)`
- El PaymentModal no podía crear notificaciones de estado de pago

**Causa:**
- La ruta `POST /api/user/notifications` no existía en el backend
- Solo existían rutas GET y PATCH para notificaciones de usuario
- Las rutas POST de notificaciones estaban limitadas a `/api/notifications` (solo admin)

**Solución:**
- Agregada ruta `POST /api/user/notifications` en `user.routes.js`
- Implementada validación de datos requeridos (title, message)
- Asignación automática del usuario autenticado como recipient
- Soporte para tipos de notificación y URL de acción opcional

**Cambios realizados:**
```javascript
// Nueva ruta agregada:
router.post('/notifications', async (req, res) => {
  try {
    const { title, message, type = 'info', actionUrl } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = new Notification({
      title,
      message,
      type,
      recipient: req.user.id,
      actionUrl
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Archivo afectado:**
- `backend/src/routes/user.routes.js`

---

**Documentado por:** Asistente AI  
**Estado:** Resuelto  
**Prioridad:** Alta (errores críticos del sistema de compras)