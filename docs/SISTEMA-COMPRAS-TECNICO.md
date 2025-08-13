# Sistema de Compras - Documentación Técnica

## Arquitectura del Sistema de Compras

### Flujo de Compra de Paquetes

1. **Frontend (PackagesSection.jsx)**
   - Usuario selecciona paquete
   - Se ejecuta función `handlePurchase`
   - Envía POST a `/api/purchases`

2. **Backend (purchases.controller.js)**
   - Función `createPurchase` procesa la solicitud
   - Valida datos del usuario y paquete
   - Crea transacción en base de datos
   - Retorna detalles de pago

3. **Base de Datos**
   - Modelo `Transaction` almacena la transacción
   - Modelo `Purchase` registra la compra
   - Modelo `Package` contiene información del paquete

### Estructura de Datos

#### Modelo Transaction
```javascript
{
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'commission', 'bonus', 'purchase', 'package_purchase'],
    required: true
  },
  payment: {
    method: String,
    address: String,
    network: String,
    confirmations: Number
  },
  // ... otros campos
}
```

#### Respuesta de Compra (Crypto)
```javascript
{
  success: true,
  message: 'Compra creada exitosamente',
  purchase: { /* datos de compra */ },
  transaction: { /* datos de transacción */ },
  paymentDetails: {
    walletAddress: transaction.payment.address,
    network: transaction.payment.network,
    amount: totalAmount,
    currency: 'USDT'
  }
}
```

### Validaciones Críticas

#### 1. Validación de Tipo de Transacción
- **Ubicación:** `Transaction.model.js`
- **Propósito:** Asegurar que solo se permitan tipos válidos
- **Valores permitidos:** `['deposit', 'withdrawal', 'commission', 'bonus', 'purchase', 'package_purchase']`

#### 2. Validación de Estructura de Pago
- **Ubicación:** `purchases.controller.js`
- **Propósito:** Asegurar que los datos de pago estén correctamente estructurados
- **Campos requeridos:** `method`, `address`, `network`, `confirmations`

#### 3. Validación de Arrays en Frontend
- **Ubicación:** `PackagesSection.jsx`
- **Propósito:** Prevenir errores de map sobre undefined
- **Implementación:** Función `applyTranslations` con validación `Array.isArray()`

### Manejo de Errores

#### Errores Comunes y Soluciones

1. **ValidationError en Transaction**
   ```
   Error: 'package_purchase' is not a valid enum value
   Solución: Verificar enum en Transaction.model.js
   ```

2. **Cannot read properties of undefined**
   ```
   Error: Cannot read properties of undefined (reading 'walletAddress')
   Solución: Verificar estructura del objeto transaction
   ```

3. **TypeError: Cannot read properties of undefined (reading 'map')**
   ```
   Error: En PackagesSection.jsx
   Solución: Validar arrays antes de mapear
   ```

### Configuración de Pagos

#### Variables de Entorno Requeridas
```env
PAYMENT_WALLET_ADDRESS=0x...
PAYMENT_NETWORK=BSC
```

#### Redes Soportadas
- ✅ **BSC (Binance Smart Chain - BEP-20):** Red principal y única activa para USDT
- ⚠️ **TRC-20:** Visible pero deshabilitada temporalmente
- ❌ **ERC-20:** Deshabilitada
- ❌ **Bitcoin Network:** Deshabilitada
- **Configuración:** Definida en variables de entorno y controlador de pagos

### API Endpoints

#### POST /api/purchases
**Parámetros:**
```javascript
{
  packageId: String,
  paymentMethod: 'crypto' | 'balance'
}
```

**Respuesta Exitosa:**
```javascript
{
  success: true,
  message: String,
  purchase: Object,
  transaction: Object,
  paymentDetails: Object
}
```

**Respuesta de Error:**
```javascript
{
  success: false,
  message: String,
  error: String
}
```

### Funciones Críticas

#### applyTranslations (PackagesSection.jsx)
```javascript
const applyTranslations = (packages) => {
  if (!Array.isArray(packages)) {
    return [];
  }
  return packages.map(pkg => ({
    ...pkg,
    name: t(`packages.${pkg.slug}.name`, pkg.name),
    features: pkg.features?.map(feature => 
      t(`packages.${pkg.slug}.features.${feature}`, feature)
    ) || [],
    membershipDuration: t(`packages.${pkg.slug}.duration`, pkg.membershipDuration)
  }));
};
```

#### createPurchase (purchases.controller.js)
- **Validación de usuario y paquete**
- **Cálculo de montos**
- **Creación de transacción**
- **Manejo de diferentes métodos de pago**

### Monitoreo y Debugging

#### Logs Importantes
- **Backend:** Logs en `backend/logs/`
- **Frontend:** Console del navegador
- **Base de datos:** Logs de MongoDB

#### Puntos de Verificación
1. **Estado del servidor:** Verificar que backend esté ejecutándose
2. **Conexión a BD:** Verificar conexión a MongoDB
3. **Variables de entorno:** Verificar configuración de pagos
4. **Estructura de datos:** Verificar consistencia entre modelos y controladores

### Mejores Prácticas

1. **Validación Defensiva**
   - Siempre validar arrays antes de mapear
   - Usar operadores de coalescencia nula
   - Verificar existencia de propiedades antes de acceder

2. **Manejo de Errores**
   - Implementar try-catch en funciones críticas
   - Proporcionar mensajes de error descriptivos
   - Registrar errores para debugging

3. **Consistencia de Datos**
   - Mantener sincronización entre modelos y controladores
   - Validar estructura de datos en ambos extremos
   - Usar esquemas consistentes

### Dependencias Críticas

- **Backend:** mongoose, express, dotenv
- **Frontend:** react, i18next, axios
- **Base de datos:** MongoDB con esquemas definidos

---

## 🔧 CONFIGURACIÓN MÉTODOS DE PAGO USDT (Febrero 2025)

### ✅ Optimización Sistema de Compras

**Objetivo**: Configurar USDT BEP-20 como único método de pago funcional en el proceso de compra.

#### 🎯 Cambios en Componentes de Compra

**1. Purchase.jsx**
- ✅ **Método Predeterminado**: `usdt-bep20` establecido como selección por defecto
- ⚠️ **TRC-20 Deshabilitado**: Visible pero no seleccionable con estilo atenuado
- 🎨 **Interfaz Visual**: Indicadores claros de estado (activo/deshabilitado)
- 📝 **Texto Descriptivo**: "Temporalmente deshabilitado" para TRC-20

**2. PaymentCart.jsx**
- ✅ **Botón BEP-20**: Completamente funcional y predeterminado
- ❌ **Botón TRC-20**: Deshabilitado con `disabled={true}`
- 🎨 **Estilos Condicionales**: Diferenciación visual entre activo/inactivo
- 💡 **Feedback Usuario**: Texto explicativo para métodos deshabilitados

#### 🔄 Flujo de Compra Actualizado

**1. Selección de Método de Pago**
```javascript
// Solo BEP-20 es seleccionable
const [paymentMethod, setPaymentMethod] = useState('usdt-bep20');

// TRC-20 no puede ser seleccionado
const handlePaymentMethodChange = (method) => {
  if (method === 'usdt-trc20') {
    // Método deshabilitado, no cambiar selección
    return;
  }
  setPaymentMethod(method);
};
```

**2. Validación de Método**
```javascript
// Validación en frontend antes de envío
const validatePaymentMethod = () => {
  if (paymentMethod !== 'usdt-bep20') {
    toast.error('Solo USDT BEP-20 está disponible actualmente');
    return false;
  }
  return true;
};
```

**3. Procesamiento Backend**
```javascript
// Backend solo procesa BEP-20
if (paymentMethod !== 'usdt-bep20') {
  return res.status(400).json({
    success: false,
    message: 'Método de pago no disponible'
  });
}
```

#### 📋 Archivos Modificados en Sistema de Compras

| Archivo | Cambios Realizados | Impacto |
|---------|-------------------|----------|
| `Purchase.jsx` | Deshabilitación visual TRC-20 | Frontend compra |
| `PaymentCart.jsx` | Botón TRC-20 no funcional | Carrito de compra |
| `payment.controller.js` | Solo BEP-20 activo | Backend validación |
| `paymentAddresses.js` | Lógica solo BEP-20 | Generación direcciones |

#### 🎯 Resultado en Proceso de Compra

**✅ Experiencia Usuario BEP-20**:
- Selección automática por defecto
- Proceso de compra fluido
- Generación de direcciones wallet
- Códigos QR funcionales
- Validaciones completas

**⚠️ Experiencia Usuario TRC-20**:
- Visible pero claramente deshabilitado
- Mensaje explicativo
- No permite selección
- Redirección automática a BEP-20

#### 🔍 Validaciones Implementadas

**Frontend**:
- ✅ Validación de método antes de envío
- ✅ Prevención de selección de métodos deshabilitados
- ✅ Feedback visual inmediato
- ✅ Mensajes de error descriptivos

**Backend**:
- ✅ Validación de método en controlador
- ✅ Rechazo de métodos no permitidos
- ✅ Logging de intentos de uso de métodos deshabilitados
- ✅ Respuestas de error estructuradas

#### 🚀 Beneficios de la Optimización

1. **Simplicidad**: Un solo método activo reduce confusión
2. **Confiabilidad**: BEP-20 probado y estable
3. **Costos**: Menores fees de transacción
4. **Velocidad**: Confirmaciones más rápidas
5. **Mantenimiento**: Menos complejidad en el código

**Fecha de Implementación**: Febrero 2025  
**Estado**: ✅ COMPLETADO Y VERIFICADO

---

**Última actualización:** 2024  
**Mantenido por:** Equipo de desarrollo  
**Estado:** Activo y funcional